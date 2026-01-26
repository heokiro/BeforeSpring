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
}

interface AudioStore extends AudioState {
  setAudioData: (data: Partial<AudioState>) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setIsInitialized: (isInitialized: boolean) => void;
  setSpringMode: (isSpring: boolean) => void;
  setSpringValue: (value: number) => void;
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

  setAudioData: (data) => set((state) => ({ ...state, ...data })),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setIsInitialized: (isInitialized) => set({ isInitialized }),
  setSpringMode: (isSpringMode) => set({ isSpringMode }),
  setSpringValue: (springValue) => set({ springValue }),
}));
