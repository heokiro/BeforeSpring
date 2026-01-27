import { useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../firebase/config';
import { useAudioStore } from '../stores/audioStore';

/**
 * Firebase Realtime Database와 계절 상태를 실시간 동기화하는 훅
 * DB의 season/isSpring 값이 변경되면 즉시 앱 상태에 반영
 */
export function useSeasonSync() {
  const setSpringMode = useAudioStore((state) => state.setSpringMode);

  useEffect(() => {
    // Firebase DB의 season/isSpring 경로 참조
    const seasonRef = ref(database, 'season/isSpring');

    // 실시간 리스너 등록 (WebSocket 기반, 딜레이 최소화)
    const unsubscribe = onValue(seasonRef, (snapshot) => {
      const isSpring = snapshot.val();

      // null이면 기본값 false (겨울)
      if (isSpring !== null) {
        setSpringMode(Boolean(isSpring));
      }
    });

    // 컴포넌트 언마운트 시 리스너 해제
    return () => unsubscribe();
  }, [setSpringMode]);
}
