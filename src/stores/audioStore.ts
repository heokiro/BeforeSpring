import { create } from 'zustand';

export interface AudioState {
  bass: number;
  mid: number;
  treble: number;
  isBeat: boolean;
  energy: number;
  isPlaying: boolean;
  isInitialized: boolean;
  isSpringMode: boolean; // 봄 모드 (벚꽃)
  springValue: number;   // 0~1 전환 값 (나중에 데이터로 조절 가능)
  // 전시 상태
  currentStep: number;   // 0-4 단계
  isTouch: boolean;      // 터치 감지 상태
  showCredits: boolean;  // 크레딧 표시 여부
  hasUserInteracted: boolean; // 사용자 상호작용 여부 (오디오 재생 허용)
  bgPlaybackTime: number; // background.mp3 재생 시간 (초)
}

interface AudioStore extends AudioState {
  setAudioData: (data: Partial<AudioState>) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setIsInitialized: (isInitialized: boolean) => void;
  setSpringMode: (isSpring: boolean) => void;
  setSpringValue: (value: number) => void;
  // 전시 상태 액션
  setCurrentStep: (step: number) => void;
  setIsTouch: (isTouch: boolean) => void;
  setShowCredits: (show: boolean) => void;
  setHasUserInteracted: (hasInteracted: boolean) => void;
  setBgPlaybackTime: (time: number) => void;
}

export const useAudioStore = create<AudioStore>((set) => ({
  bass: 0,
  mid: 0,
  treble: 0,
  isBeat: false,
  energy: 0,
  isPlaying: false,
  isInitialized: false,
  isSpringMode: false,
  springValue: 0,
  // 전시 상태 초기값
  currentStep: 0,
  isTouch: false,
  showCredits: false,
  hasUserInteracted: false,
  bgPlaybackTime: 0,

  setAudioData: (data) => set((state) => ({ ...state, ...data })),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setIsInitialized: (isInitialized) => set({ isInitialized }),
  setSpringMode: (isSpringMode) => set({ isSpringMode }),
  setSpringValue: (springValue) => set({ springValue }),
  // 전시 상태 액션
  setCurrentStep: (currentStep) => set({ currentStep }),
  setIsTouch: (isTouch) => set({ isTouch }),
  setShowCredits: (showCredits) => set({ showCredits }),
  setHasUserInteracted: (hasUserInteracted) => set({ hasUserInteracted }),
  setBgPlaybackTime: (bgPlaybackTime) => set({ bgPlaybackTime }),
}));
