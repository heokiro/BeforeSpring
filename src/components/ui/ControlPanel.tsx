import { useState, useEffect, useRef } from 'react';
import { useAudioStore } from '../../stores/audioStore';

export interface ParticleSettings {
  size: number;          // 파티클 크기 (0.5 ~ 3)
  speed: number;         // 낙하/상승 속도 (0.2 ~ 2)
  rhythmStrength: number; // 리듬 반응 강도 (0 ~ 3)
  swayAmount: number;    // 좌우 흔들림 (0 ~ 2)
  beatPumpSize: number;  // 비트 펌프 크기 (0 ~ 2)
  beatPumpSpeed: number; // 비트 펌프 복귀 속도 (0.01 ~ 0.3)
  particleCount: number; // 파티클 수 (1000 ~ 10000)
  springScaleGrow: number; // 봄 모드: 위로 갈수록 커지는 정도 (0 ~ 3)
}

// 겨울 모드 (눈)
const WINTER_SETTINGS: ParticleSettings = {
  size: 2.5,
  speed: 0.2,
  rhythmStrength: 0.1,
  swayAmount: 0.1,
  beatPumpSize: 1.4,
  beatPumpSpeed: 0.01,
  particleCount: 5000,
  springScaleGrow: 0,
};

// 봄 모드 (벚꽃)
const SPRING_SETTINGS: ParticleSettings = {
  size: 1.4,
  speed: 0.3,
  rhythmStrength: 0.1,
  swayAmount: 0.1,
  beatPumpSize: 0.5,
  beatPumpSpeed: 0,
  particleCount: 5500,
  springScaleGrow: 1.8,
};

// 전역으로 설정 공유
export let particleSettings: ParticleSettings = { ...WINTER_SETTINGS };

// lerp 함수
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// 설정값 lerp
const lerpSettings = (current: ParticleSettings, target: ParticleSettings, t: number): ParticleSettings => ({
  size: lerp(current.size, target.size, t),
  speed: lerp(current.speed, target.speed, t),
  rhythmStrength: lerp(current.rhythmStrength, target.rhythmStrength, t),
  swayAmount: lerp(current.swayAmount, target.swayAmount, t),
  beatPumpSize: lerp(current.beatPumpSize, target.beatPumpSize, t),
  beatPumpSpeed: lerp(current.beatPumpSpeed, target.beatPumpSpeed, t),
  particleCount: Math.round(lerp(current.particleCount, target.particleCount, t)),
  springScaleGrow: lerp(current.springScaleGrow, target.springScaleGrow, t),
});

export function ControlPanel() {
  const { isPlaying, isSpringMode } = useAudioStore();
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<ParticleSettings>(WINTER_SETTINGS);
  const targetSettingsRef = useRef<ParticleSettings>(WINTER_SETTINGS);
  const isTransitioningRef = useRef(false);

  // 모드 전환 시 부드러운 설정 변경
  useEffect(() => {
    const targetSettings = isSpringMode ? SPRING_SETTINGS : WINTER_SETTINGS;
    targetSettingsRef.current = targetSettings;

    // 이미 전환 중이면 목표만 변경
    if (isTransitioningRef.current) return;

    isTransitioningRef.current = true;
    const transitionSpeed = 0.02; // 전환 속도 (낮을수록 부드러움)

    const animate = () => {
      // 사용자가 직접 수정했으면 애니메이션 중지
      if (!isTransitioningRef.current) return;

      const current = particleSettings;
      const target = targetSettingsRef.current;

      // 목표에 거의 도달했는지 확인
      const diff = Math.abs(current.particleCount - target.particleCount);
      if (diff < 10) {
        particleSettings = { ...target };
        setSettings({ ...target });
        isTransitioningRef.current = false;
        return;
      }

      // lerp로 부드럽게 전환
      const newSettings = lerpSettings(current, target, transitionSpeed);
      particleSettings = newSettings;
      setSettings(newSettings);

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [isSpringMode]);

  const updateSetting = (key: keyof ParticleSettings, value: number) => {
    // 사용자가 직접 수정하면 자동 전환 중지
    isTransitioningRef.current = false;
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    particleSettings = newSettings;
  };

  if (!isPlaying) return null;

  return (
    <>
      {/* 설정 열기 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-4 left-4 z-50 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>
      </button>

      {/* 설정 패널 */}
      {isOpen && (
        <div className="absolute top-16 left-4 z-50 bg-black/80 backdrop-blur-md rounded-xl p-5 w-72 border border-white/20 max-h-[80vh] overflow-y-auto">
          <h3 className="text-white font-medium mb-4 text-sm tracking-wide">파티클 설정</h3>

          {/* 파티클 수 */}
          <div className="mb-4">
            <div className="flex justify-between text-white/70 text-xs mb-1">
              <span>파티클 수</span>
              <span>{settings.particleCount.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min="1000"
              max="10000"
              step="500"
              value={settings.particleCount}
              onChange={(e) => updateSetting('particleCount', parseInt(e.target.value))}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-pink-400"
            />
          </div>

          {/* 크기 */}
          <div className="mb-4">
            <div className="flex justify-between text-white/70 text-xs mb-1">
              <span>크기</span>
              <span>{settings.size.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={settings.size}
              onChange={(e) => updateSetting('size', parseFloat(e.target.value))}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-pink-400"
            />
          </div>

          {/* 속도 */}
          <div className="mb-4">
            <div className="flex justify-between text-white/70 text-xs mb-1">
              <span>속도</span>
              <span>{settings.speed.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              value={settings.speed}
              onChange={(e) => updateSetting('speed', parseFloat(e.target.value))}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-pink-400"
            />
          </div>

          {/* 리듬 반응 강도 */}
          <div className="mb-4">
            <div className="flex justify-between text-white/70 text-xs mb-1">
              <span>리듬 반응</span>
              <span>{settings.rhythmStrength.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="3"
              step="0.1"
              value={settings.rhythmStrength}
              onChange={(e) => updateSetting('rhythmStrength', parseFloat(e.target.value))}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-pink-400"
            />
          </div>

          {/* 흔들림 */}
          <div className="mb-4">
            <div className="flex justify-between text-white/70 text-xs mb-1">
              <span>흔들림</span>
              <span>{settings.swayAmount.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.swayAmount}
              onChange={(e) => updateSetting('swayAmount', parseFloat(e.target.value))}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-pink-400"
            />
          </div>

          {/* 구분선 */}
          <div className="border-t border-white/10 my-4"></div>
          <h4 className="text-white/60 text-xs mb-3">비트 펌프</h4>

          {/* 펌프 크기 */}
          <div className="mb-4">
            <div className="flex justify-between text-white/70 text-xs mb-1">
              <span>펌프 크기</span>
              <span>{settings.beatPumpSize.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.beatPumpSize}
              onChange={(e) => updateSetting('beatPumpSize', parseFloat(e.target.value))}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-pink-400"
            />
          </div>

          {/* 펌프 복귀 속도 */}
          <div className="mb-4">
            <div className="flex justify-between text-white/70 text-xs mb-1">
              <span>펌프 복귀 속도</span>
              <span>{settings.beatPumpSpeed.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.3"
              step="0.01"
              value={settings.beatPumpSpeed}
              onChange={(e) => updateSetting('beatPumpSpeed', parseFloat(e.target.value))}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-pink-400"
            />
          </div>

          {/* 구분선 */}
          <div className="border-t border-white/10 my-4"></div>
          <h4 className="text-white/60 text-xs mb-3">봄 모드</h4>

          {/* 상승 시 크기 증가 */}
          <div className="mb-4">
            <div className="flex justify-between text-white/70 text-xs mb-1">
              <span>상승 크기 증가</span>
              <span>{settings.springScaleGrow.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="3"
              step="0.1"
              value={settings.springScaleGrow}
              onChange={(e) => updateSetting('springScaleGrow', parseFloat(e.target.value))}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-pink-400"
            />
          </div>

          {/* 현재 설정값 복사 버튼 */}
          <button
            onClick={() => {
              const code = `// 파티클 설정값
const settings = {
  particleCount: ${settings.particleCount},
  size: ${settings.size},
  speed: ${settings.speed},
  rhythmStrength: ${settings.rhythmStrength},
  swayAmount: ${settings.swayAmount},
  beatPumpSize: ${settings.beatPumpSize},
  beatPumpSpeed: ${settings.beatPumpSpeed},
  springScaleGrow: ${settings.springScaleGrow},
};`;
              navigator.clipboard.writeText(code);
              alert('설정값이 클립보드에 복사되었습니다!');
            }}
            className="w-full mt-2 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/70 text-xs transition-all"
          >
            설정값 복사
          </button>
        </div>
      )}
    </>
  );
}
