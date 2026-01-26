import { useRef, useEffect, useCallback } from 'react';
import { useAudioAnalyzer } from '../../hooks/useAudioAnalyzer';
import { useAudioStore } from '../../stores/audioStore';

// 오디오 파일 경로 설정
const AUDIO_FILE = '/audio/background.wav';

export function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const { initialize, getAudioData, resume } = useAudioAnalyzer();
  const { setAudioData, setIsPlaying, setIsInitialized, isInitialized, isPlaying } = useAudioStore();

  const updateAudioData = useCallback(() => {
    const data = getAudioData();
    setAudioData(data);
    animationRef.current = requestAnimationFrame(updateAudioData);
  }, [getAudioData, setAudioData]);

  const handlePlay = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      if (!isInitialized) {
        initialize(audioRef.current);
        setIsInitialized(true);
      }

      await resume();
      await audioRef.current.play();
      setIsPlaying(true);
      updateAudioData();
    } catch (error) {
      console.error('오디오 재생 실패:', error);
    }
  }, [initialize, resume, isInitialized, setIsInitialized, setIsPlaying, updateAudioData]);

  const handlePause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [setIsPlaying]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  }, [isPlaying, handlePlay, handlePause]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // 오디오 끝났을 때 반복 재생
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      audio.currentTime = 0;
      audio.play();
    };

    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, []);

  return (
    <>
      <audio ref={audioRef} src={AUDIO_FILE} preload="auto" loop crossOrigin="anonymous" />

      {/* 재생 버튼 - 시작 전에만 표시 */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                     w-24 h-24 rounded-full bg-white/20 hover:bg-white/30
                     flex items-center justify-center transition-all duration-300
                     backdrop-blur-sm border border-white/30 hover:scale-110"
        >
          <svg
            className="w-12 h-12 text-white ml-1"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      )}

      {/* 재생 중 일시정지 버튼 (하단에 작게) */}
      {isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute bottom-4 left-4 z-50 p-3 rounded-full
                     bg-white/10 hover:bg-white/20 transition-all
                     opacity-0 hover:opacity-100"
        >
          <svg
            className="w-5 h-5 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        </button>
      )}
    </>
  );
}
