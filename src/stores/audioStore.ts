import { create } from 'zustand';

export interface AuroraParams {
  speed: number;
  emissionStrength: number;
  offset: number;
  smoothness: number;
  distort: number;
  scale: number;
  step: number;
  baseDensity: number;
}

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
  auroraParams: AuroraParams;
}

interface AudioStore extends AudioState {
  setAudioData: (data: Partial<AudioState>) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setIsInitialized: (isInitialized: boolean) => void;
  setSpringMode: (isSpring: boolean) => void;
  setSpringValue: (value: number) => void;
  setAuroraParams: (params: Partial<AuroraParams>) => void;
}

// Godot 원본 기본값
const defaultAuroraParams: AuroraParams = {
  speed: 0.01,
  emissionStrength: 5.0,
  offset: 0.0,
  smoothness: 0.15,
  distort: 1.0,
  scale: 0.02,
  step: 0.01,
  baseDensity: 2.0,
};

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
  auroraParams: defaultAuroraParams,

  setAudioData: (data) => set((state) => ({ ...state, ...data })),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setIsInitialized: (isInitialized) => set({ isInitialized }),
  setSpringMode: (isSpringMode) => set({ isSpringMode }),
  setSpringValue: (springValue) => set({ springValue }),
  setAuroraParams: (params) => set((state) => ({
    auroraParams: { ...state.auroraParams, ...params }
  })),
}));
