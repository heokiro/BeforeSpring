import { useEffect } from 'react';
import { ref, onValue, set, update } from 'firebase/database';
import { database } from '../firebase/config';
import { useAudioStore } from '../stores/audioStore';

/**
 * Firebase에 step 값 업데이트
 */
export function updateStep(stepName: string, value: boolean) {
  const stepRef = ref(database, stepName);
  set(stepRef, value);
}

/**
 * 전시 리셋 - 모든 step을 false로, isEnding을 true로
 */
export function resetExhibition() {
  const updates = {
    step1: false,
    step2: false,
    step3: false,
    step4: false,
    isEnding: true,
  };
  update(ref(database), updates);
}

interface ExhibitionData {
  isTouch: boolean;
  step1: boolean;
  step2: boolean;
  step3: boolean;
  step4: boolean;
}

/**
 * Firebase Realtime Database와 전시 상태를 실시간 동기화하는 훅
 * DB의 isTouch, step1~4 값이 변경되면 즉시 앱 상태에 반영
 */
export function useExhibitionSync() {
  const setCurrentStep = useAudioStore((state) => state.setCurrentStep);
  const setIsTouch = useAudioStore((state) => state.setIsTouch);
  const setSpringMode = useAudioStore((state) => state.setSpringMode);

  useEffect(() => {
    // Firebase DB 루트 참조 (isTouch, step1~4가 루트에 있음)
    const exhibitionRef = ref(database);

    // 실시간 리스너 등록 (WebSocket 기반, 딜레이 최소화)
    const unsubscribe = onValue(exhibitionRef, (snapshot) => {
      const data: ExhibitionData = snapshot.val() || {};

      // 터치 상태 업데이트
      setIsTouch(Boolean(data.isTouch));

      // 현재 단계 계산 (step4 > step3 > step2 > step1 > 0 우선순위)
      let step = 0;
      if (data.step4) {
        step = 4;
      } else if (data.step3) {
        step = 3;
      } else if (data.step2) {
        step = 2;
      } else if (data.step1) {
        step = 1;
      }

      setCurrentStep(step);

      // 4단계면 봄 모드 활성화
      setSpringMode(step === 4);
    });

    // 컴포넌트 언마운트 시 리스너 해제
    return () => unsubscribe();
  }, [setCurrentStep, setIsTouch, setSpringMode]);
}
