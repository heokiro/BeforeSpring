import { useRef, useEffect, useCallback } from 'react';
import { useAudioAnalyzer } from '../../hooks/useAudioAnalyzer';
import { useAudioStore } from '../../stores/audioStore';
import { updateStep } from '../../hooks/useExhibitionSync';

// 오디오 파일 경로
const IDLE_AUDIO = '/audio/idle.mp3';
const BG_AUDIO = '/audio/background.mp3';

// 시간 기반 단계 진행 (초)
const STEP3_TIME = 30;
const STEP4_TIME = 93;

export function AudioPlayer() {
  const idleAudioRef = useRef<HTMLAudioElement>(null);
  const bgAudioRef = useRef<HTMLAudioElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const playbackTimeRef = useRef(0); // background.mp3 실제 재생 시간
  const lastTimeUpdateRef = useRef(0); // 마지막 timeupdate 시점
  const step3TriggeredRef = useRef(false);
  const step4TriggeredRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null); // 현재 분석 중인 오디오

  const { initialize, getAudioData, resume } = useAudioAnalyzer();
  const {
    setAudioData,
    setIsPlaying,
    setBgPlaybackTime,
    currentStep,
    isTouch,
    hasUserInteracted,
  } = useAudioStore();

  // 오디오 데이터 업데이트 루프
  const updateAudioData = useCallback(() => {
    const data = getAudioData();
    setAudioData(data);
    animationRef.current = requestAnimationFrame(updateAudioData);
  }, [getAudioData, setAudioData]);

  // 오디오 분석 시작 (공통)
  const startAudioAnalysis = useCallback(async (audioElement: HTMLAudioElement) => {
    try {
      // 오디오 소스 초기화/전환 (항상 호출 - 내부에서 전환 처리)
      initialize(audioElement);
      currentAudioRef.current = audioElement;
      await resume();

      // 애니메이션 루프 시작 (중복 방지)
      if (!animationRef.current) {
        updateAudioData();
      }
    } catch (error) {
      console.error('오디오 분석 시작 실패:', error);
    }
  }, [initialize, resume, updateAudioData]);

  // idle.mp3 재생
  const playIdle = useCallback(async () => {
    if (!idleAudioRef.current) return;

    try {
      // background.wav 정지
      if (bgAudioRef.current) {
        bgAudioRef.current.pause();
      }

      await startAudioAnalysis(idleAudioRef.current);
      await idleAudioRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('idle.mp3 재생 실패:', error);
    }
  }, [startAudioAnalysis, setIsPlaying]);

  // background.wav 재생
  const playBackground = useCallback(async () => {
    if (!bgAudioRef.current) return;

    try {
      // idle.mp3 정지
      if (idleAudioRef.current) {
        idleAudioRef.current.pause();
      }

      await startAudioAnalysis(bgAudioRef.current);
      await bgAudioRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('background.wav 재생 실패:', error);
    }
  }, [startAudioAnalysis, setIsPlaying]);

  // background.wav 일시정지
  const pauseBackground = useCallback(() => {
    if (bgAudioRef.current) {
      bgAudioRef.current.pause();
    }
  }, []);

  // background.wav 재개
  const resumeBackground = useCallback(async () => {
    if (!bgAudioRef.current) return;

    try {
      await startAudioAnalysis(bgAudioRef.current);
      await bgAudioRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('background.wav 재개 실패:', error);
    }
  }, [startAudioAnalysis, setIsPlaying]);

  // 클린업
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // background.wav 시간 추적 및 단계 진행
  useEffect(() => {
    const bgAudio = bgAudioRef.current;
    if (!bgAudio) return;

    const handleTimeUpdate = () => {
      // 재생 중일 때만 시간 누적
      if (!bgAudio.paused) {
        const currentTime = bgAudio.currentTime;
        const delta = currentTime - lastTimeUpdateRef.current;

        // 정상적인 시간 증가만 누적 (되감기나 점프 방지)
        if (delta > 0 && delta < 1) {
          playbackTimeRef.current += delta;
          setBgPlaybackTime(playbackTimeRef.current);

          // step3 트리거 (15초)
          if (!step3TriggeredRef.current && playbackTimeRef.current >= STEP3_TIME) {
            step3TriggeredRef.current = true;
            updateStep('step3', true);
            console.log('AudioPlayer: step3 트리거 (15초 경과)');
          }

          // step4 트리거 (48초)
          if (!step4TriggeredRef.current && playbackTimeRef.current >= STEP4_TIME) {
            step4TriggeredRef.current = true;
            updateStep('step4', true);
            console.log('AudioPlayer: step4 트리거 (48초 경과)');
          }
        }

        lastTimeUpdateRef.current = currentTime;
      }
    };

    bgAudio.addEventListener('timeupdate', handleTimeUpdate);
    return () => bgAudio.removeEventListener('timeupdate', handleTimeUpdate);
  }, [setBgPlaybackTime]);

  // 오디오 루프 처리
  useEffect(() => {
    const idleAudio = idleAudioRef.current;
    const bgAudio = bgAudioRef.current;

    const handleIdleEnded = () => {
      if (idleAudio) {
        idleAudio.currentTime = 0;
        idleAudio.play();
      }
    };

    const handleBgEnded = () => {
      if (bgAudio) {
        bgAudio.currentTime = 0;
        bgAudio.play();
      }
    };

    idleAudio?.addEventListener('ended', handleIdleEnded);
    bgAudio?.addEventListener('ended', handleBgEnded);

    return () => {
      idleAudio?.removeEventListener('ended', handleIdleEnded);
      bgAudio?.removeEventListener('ended', handleBgEnded);
    };
  }, []);

  // 전시 리셋 감지 (step이 0으로 돌아오면 refs 초기화)
  useEffect(() => {
    if (currentStep === 0) {
      // 재생 시간 및 트리거 리셋
      playbackTimeRef.current = 0;
      lastTimeUpdateRef.current = 0;
      step3TriggeredRef.current = false;
      step4TriggeredRef.current = false;

      // background.mp3 처음으로 되감기
      if (bgAudioRef.current) {
        bgAudioRef.current.pause();
        bgAudioRef.current.currentTime = 0;
      }

      // idle.mp3도 초기화 (리셋 후 다시 재생되도록)
      if (idleAudioRef.current) {
        idleAudioRef.current.pause();
        idleAudioRef.current.currentTime = 0;
      }

      console.log('AudioPlayer: 전시 리셋 - refs 초기화');
    }
  }, [currentStep]);

  // 단계별 오디오 제어
  useEffect(() => {
    if (!hasUserInteracted) return;

    // step4 이상: isTouch와 관계없이 background.mp3 계속 재생
    if (currentStep >= 4) {
      if (bgAudioRef.current?.paused) {
        resumeBackground();
      }
    }
    // step2, step3: isTouch에 따라 재생/일시정지
    else if (currentStep >= 2) {
      if (isTouch) {
        // isTouch=true → background.wav 재생
        if (bgAudioRef.current?.paused) {
          resumeBackground();
        }
      } else {
        // isTouch=false → background.wav 일시정지
        pauseBackground();
      }
    }
    // step0 또는 step1: idle.mp3 재생
    else {
      // background.wav가 재생 중이 아닐 때만 idle.mp3 재생
      if (bgAudioRef.current?.paused || !bgAudioRef.current) {
        if (idleAudioRef.current?.paused) {
          playIdle();
        }
      }
    }
  }, [currentStep, isTouch, hasUserInteracted, playIdle, resumeBackground, pauseBackground]);

  // step2로 처음 진입 시 idle → background 전환
  useEffect(() => {
    if (!hasUserInteracted) return;

    if (currentStep === 2 && isTouch) {
      // idle.mp3 정지하고 background.wav 시작
      playBackground();
    }
  }, [currentStep, isTouch, hasUserInteracted, playBackground]);

  return (
    <>
      <audio
        ref={idleAudioRef}
        src={IDLE_AUDIO}
        preload="auto"
        loop
        crossOrigin="anonymous"
      />
      <audio
        ref={bgAudioRef}
        src={BG_AUDIO}
        preload="auto"
        loop
        crossOrigin="anonymous"
      />
    </>
  );
}
