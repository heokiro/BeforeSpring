import { useEffect, useRef } from 'react';
import { useAudioStore } from '../stores/audioStore';
import { resetExhibition } from './useExhibitionSync';

/**
 * 전시 타이머 관리 훅
 * - 4단계 진입 시 5초 후 크레딧 표시
 * - 크레딧 표시 후 1분 뒤 전시 리셋 (0단계로 복귀)
 */
export function useExhibitionTimers() {
  const currentStep = useAudioStore((state) => state.currentStep);
  const showCredits = useAudioStore((state) => state.showCredits);
  const setShowCredits = useAudioStore((state) => state.setShowCredits);
  const setBgPlaybackTime = useAudioStore((state) => state.setBgPlaybackTime);

  const creditsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 4단계 진입 시 5초 후 크레딧 표시
  useEffect(() => {
    if (currentStep === 4) {
      // 기존 타이머 정리
      if (creditsTimerRef.current) {
        clearTimeout(creditsTimerRef.current);
      }

      // 5초 후 크레딧 표시
      creditsTimerRef.current = setTimeout(() => {
        setShowCredits(true);
        console.log('useExhibitionTimers: 크레딧 표시');
      }, 5000);
    } else {
      // 4단계가 아니면 크레딧 숨김 및 타이머 정리
      setShowCredits(false);
      if (creditsTimerRef.current) {
        clearTimeout(creditsTimerRef.current);
        creditsTimerRef.current = null;
      }
    }

    return () => {
      if (creditsTimerRef.current) {
        clearTimeout(creditsTimerRef.current);
      }
    };
  }, [currentStep, setShowCredits]);

  // 크레딧 표시 후 1분 뒤 전시 리셋
  useEffect(() => {
    if (showCredits) {
      // 기존 타이머 정리
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }

      // 1분 후 전시 리셋 (페이지 새로고침 없이)
      resetTimerRef.current = setTimeout(() => {
        console.log('useExhibitionTimers: 전시 리셋');
        // Firebase에 리셋 신호 전송
        resetExhibition();
        // 로컬 상태 리셋
        setBgPlaybackTime(0);
        setShowCredits(false);
      }, 60000);
    } else {
      // 크레딧이 숨겨지면 타이머 정리
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    }

    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, [showCredits, setBgPlaybackTime, setShowCredits]);
}
