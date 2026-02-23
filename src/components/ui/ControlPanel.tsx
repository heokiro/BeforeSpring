import { useState, useEffect, useRef } from 'react';
import { useAudioStore } from '../../stores/audioStore';
import { saveSettings, loadSettings } from '../../firebase/settingsSync';

export interface ParticleSettings {
  size: number;          // 파티클 크기 (0.5 ~ 6)
  speed: number;         // 낙하/상승 속도 (0.2 ~ 2)
  rhythmStrength: number; // 리듬 반응 강도 (0 ~ 3)
  swayAmount: number;    // 좌우 흔들림 (0 ~ 2)
  beatPumpSize: number;  // 비트 펌프 크기 (0 ~ 2)
  beatPumpSpeed: number; // 비트 펌프 복귀 속도 (0.01 ~ 0.3)
  particleCount: number; // 파티클 수 (1000 ~ 10000)
  springScaleGrow: number; // 봄 모드: 위로 갈수록 커지는 정도 (0 ~ 3)
}

// 비 설정 인터페이스
export interface RainSettings {
  speed: number;         // 낙하 속도 배수 (1.0 ~ 6.0)
  size: number;          // 크기 배수 (0.5 ~ 1.5)
  stretch: number;       // 세로 늘림 (0.1 ~ 0.5, 작을수록 더 길쭉)
  squeeze: number;       // 가로 좁힘 (1.0 ~ 2.0, 클수록 더 좁음)
  swayReduction: number; // 흔들림 감소 (0 ~ 1, 1이면 완전 직선)
}

// 겨울 모드 기본값 (눈)
const WINTER_DEFAULT: ParticleSettings = {
  size: 3,
  speed: 0.2,
  rhythmStrength: 0.1,
  swayAmount: 0.2,
  beatPumpSize: 0.3,
  beatPumpSpeed: 0.02,
  particleCount: 5000,
  springScaleGrow: 0,
};

// 봄 모드 기본값 (벚꽃)
const SPRING_DEFAULT: ParticleSettings = {
  size: 1.4,
  speed: 0.3,
  rhythmStrength: 0,
  swayAmount: 0.8,
  beatPumpSize: 0.5,
  beatPumpSpeed: 0,
  particleCount: 5500,
  springScaleGrow: 1.8,
};

// 비 모드 기본값
const RAIN_DEFAULT: RainSettings = {
  speed: 2.5,
  size: 0.8,
  stretch: 0.25,
  squeeze: 1.5,
  swayReduction: 0.8,
};

// 전역 설정 (분리된 겨울/봄/비)
export let winterSettings: ParticleSettings = { ...WINTER_DEFAULT };
export let springSettings: ParticleSettings = { ...SPRING_DEFAULT };
export let rainSettings: RainSettings = { ...RAIN_DEFAULT };

// 현재 적용 중인 설정 (ParticleSystem에서 사용)
export let particleSettings: ParticleSettings = { ...WINTER_DEFAULT };

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

// 슬라이더 설정
interface SliderConfig {
  key: keyof ParticleSettings;
  label: string;
  min: number;
  max: number;
  step: number;
  decimals: number;
}

const SLIDERS: SliderConfig[] = [
  { key: 'particleCount', label: '파티클 수', min: 1000, max: 10000, step: 500, decimals: 0 },
  { key: 'size', label: '크기', min: 0.5, max: 6, step: 0.1, decimals: 1 },
  { key: 'speed', label: '속도', min: 0.1, max: 2, step: 0.1, decimals: 1 },
  { key: 'rhythmStrength', label: '리듬 반응', min: 0, max: 3, step: 0.1, decimals: 1 },
  { key: 'swayAmount', label: '흔들림', min: 0, max: 2, step: 0.1, decimals: 1 },
  { key: 'beatPumpSize', label: '펌프 크기', min: 0, max: 2, step: 0.1, decimals: 1 },
  { key: 'beatPumpSpeed', label: '펌프 속도', min: 0.01, max: 0.3, step: 0.01, decimals: 2 },
  { key: 'springScaleGrow', label: '상승 크기', min: 0, max: 3, step: 0.1, decimals: 1 },
];

// 비 전용 슬라이더 설정
interface RainSliderConfig {
  key: keyof RainSettings;
  label: string;
  min: number;
  max: number;
  step: number;
  decimals: number;
}

const RAIN_SLIDERS: RainSliderConfig[] = [
  { key: 'speed', label: '낙하 속도', min: 1, max: 6, step: 0.1, decimals: 1 },
  { key: 'size', label: '크기', min: 0.5, max: 1.5, step: 0.1, decimals: 1 },
  { key: 'stretch', label: '세로 길이', min: 0.1, max: 0.5, step: 0.05, decimals: 2 },
  { key: 'squeeze', label: '가로 좁힘', min: 1, max: 2, step: 0.1, decimals: 1 },
  { key: 'swayReduction', label: '직선도', min: 0, max: 1, step: 0.1, decimals: 1 },
];

// 설정 섹션 컴포넌트
function SettingsSection({
  title,
  settings,
  onUpdate,
  onSave,
  onLoad,
  isSaving,
  isLoading,
  accentColor,
}: {
  title: string;
  settings: ParticleSettings;
  onUpdate: (key: keyof ParticleSettings, value: number) => void;
  onSave: () => void;
  onLoad: () => void;
  isSaving: boolean;
  isLoading: boolean;
  accentColor: string;
}) {
  return (
    <div className="mb-6">
      <h4 className={`text-sm font-medium mb-3 ${accentColor}`}>{title}</h4>

      {SLIDERS.map((slider) => (
        <div key={slider.key} className="mb-3">
          <div className="flex justify-between text-white/70 text-xs mb-1">
            <span>{slider.label}</span>
            <span>
              {slider.decimals === 0
                ? settings[slider.key].toLocaleString()
                : settings[slider.key].toFixed(slider.decimals)}
            </span>
          </div>
          <input
            type="range"
            min={slider.min}
            max={slider.max}
            step={slider.step}
            value={settings[slider.key]}
            onChange={(e) => {
              const value = slider.decimals === 0
                ? parseInt(e.target.value)
                : parseFloat(e.target.value);
              onUpdate(slider.key, value);
            }}
            className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-pink-400"
          />
        </div>
      ))}

      {/* 저장/불러오기 버튼 */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex-1 py-2 bg-blue-500/30 hover:bg-blue-500/50 disabled:bg-blue-500/10 rounded-lg text-white/80 text-xs transition-all"
        >
          {isSaving ? '저장 중...' : 'DB 저장'}
        </button>
        <button
          onClick={onLoad}
          disabled={isLoading}
          className="flex-1 py-2 bg-green-500/30 hover:bg-green-500/50 disabled:bg-green-500/10 rounded-lg text-white/80 text-xs transition-all"
        >
          {isLoading ? '불러오는 중...' : 'DB 불러오기'}
        </button>
      </div>
    </div>
  );
}

// 비 설정 섹션 컴포넌트
function RainSettingsSection({
  title,
  settings,
  onUpdate,
  onSave,
  onLoad,
  isSaving,
  isLoading,
  accentColor,
}: {
  title: string;
  settings: RainSettings;
  onUpdate: (key: keyof RainSettings, value: number) => void;
  onSave: () => void;
  onLoad: () => void;
  isSaving: boolean;
  isLoading: boolean;
  accentColor: string;
}) {
  return (
    <div className="mb-6">
      <h4 className={`text-sm font-medium mb-3 ${accentColor}`}>{title}</h4>

      {RAIN_SLIDERS.map((slider) => (
        <div key={slider.key} className="mb-3">
          <div className="flex justify-between text-white/70 text-xs mb-1">
            <span>{slider.label}</span>
            <span>{settings[slider.key].toFixed(slider.decimals)}</span>
          </div>
          <input
            type="range"
            min={slider.min}
            max={slider.max}
            step={slider.step}
            value={settings[slider.key]}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              onUpdate(slider.key, value);
            }}
            className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>
      ))}

      {/* 저장/불러오기 버튼 */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex-1 py-2 bg-blue-500/30 hover:bg-blue-500/50 disabled:bg-blue-500/10 rounded-lg text-white/80 text-xs transition-all"
        >
          {isSaving ? '저장 중...' : 'DB 저장'}
        </button>
        <button
          onClick={onLoad}
          disabled={isLoading}
          className="flex-1 py-2 bg-green-500/30 hover:bg-green-500/50 disabled:bg-green-500/10 rounded-lg text-white/80 text-xs transition-all"
        >
          {isLoading ? '불러오는 중...' : 'DB 불러오기'}
        </button>
      </div>
    </div>
  );
}

export function ControlPanel() {
  const { isSpringMode } = useAudioStore();
  const [isOpen, setIsOpen] = useState(false);

  // 로컬 상태
  const [localWinter, setLocalWinter] = useState<ParticleSettings>({ ...WINTER_DEFAULT });
  const [localSpring, setLocalSpring] = useState<ParticleSettings>({ ...SPRING_DEFAULT });
  const [localRain, setLocalRain] = useState<RainSettings>({ ...RAIN_DEFAULT });

  // 저장/불러오기 상태
  const [savingWinter, setSavingWinter] = useState(false);
  const [savingSpring, setSavingSpring] = useState(false);
  const [savingRain, setSavingRain] = useState(false);
  const [loadingWinter, setLoadingWinter] = useState(false);
  const [loadingSpring, setLoadingSpring] = useState(false);
  const [loadingRain, setLoadingRain] = useState(false);

  // 모드 전환 애니메이션
  const isTransitioningRef = useRef(false);
  const targetSettingsRef = useRef<ParticleSettings>(WINTER_DEFAULT);

  // 앱 시작 시 Firebase에서 설정 불러오기
  useEffect(() => {
    const initSettings = async () => {
      const [winterData, springData, rainData] = await Promise.all([
        loadSettings('winter'),
        loadSettings('spring'),
        loadSettings('rain'),
      ]);

      if (winterData) {
        winterSettings = { ...winterData };
        setLocalWinter({ ...winterData });
      }
      if (springData) {
        springSettings = { ...springData };
        setLocalSpring({ ...springData });
      }
      if (rainData) {
        rainSettings = { ...rainData };
        setLocalRain({ ...rainData });
      }

      // 초기 적용
      particleSettings = isSpringMode ? { ...springSettings } : { ...winterSettings };
    };

    initSettings();
  }, []);

  // 모드 전환 시 부드러운 설정 변경
  useEffect(() => {
    const targetSettings = isSpringMode ? springSettings : winterSettings;
    targetSettingsRef.current = targetSettings;

    if (isTransitioningRef.current) return;

    isTransitioningRef.current = true;
    const transitionSpeed = 0.02;

    const animate = () => {
      if (!isTransitioningRef.current) return;

      const current = particleSettings;
      const target = targetSettingsRef.current;

      const diff = Math.abs(current.particleCount - target.particleCount);
      if (diff < 10) {
        particleSettings = { ...target };
        isTransitioningRef.current = false;
        return;
      }

      particleSettings = lerpSettings(current, target, transitionSpeed);
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [isSpringMode]);

  // 겨울 설정 업데이트
  const updateWinter = (key: keyof ParticleSettings, value: number) => {
    const newSettings = { ...localWinter, [key]: value };
    setLocalWinter(newSettings);
    winterSettings = newSettings;

    // 겨울 모드일 때만 즉시 적용
    if (!isSpringMode) {
      isTransitioningRef.current = false;
      particleSettings = newSettings;
    }
  };

  // 봄 설정 업데이트
  const updateSpring = (key: keyof ParticleSettings, value: number) => {
    const newSettings = { ...localSpring, [key]: value };
    setLocalSpring(newSettings);
    springSettings = newSettings;

    // 봄 모드일 때만 즉시 적용
    if (isSpringMode) {
      isTransitioningRef.current = false;
      particleSettings = newSettings;
    }
  };

  // 겨울 저장
  const saveWinter = async () => {
    setSavingWinter(true);
    const success = await saveSettings('winter', localWinter);
    setSavingWinter(false);
    if (success) {
      alert('겨울 설정이 저장되었습니다!');
    } else {
      alert('저장 실패');
    }
  };

  // 봄 저장
  const saveSpring = async () => {
    setSavingSpring(true);
    const success = await saveSettings('spring', localSpring);
    setSavingSpring(false);
    if (success) {
      alert('봄 설정이 저장되었습니다!');
    } else {
      alert('저장 실패');
    }
  };

  // 겨울 불러오기
  const loadWinter = async () => {
    setLoadingWinter(true);
    const data = await loadSettings('winter');
    setLoadingWinter(false);
    if (data) {
      setLocalWinter(data);
      winterSettings = data;
      if (!isSpringMode) {
        particleSettings = data;
      }
      alert('겨울 설정을 불러왔습니다!');
    } else {
      alert('저장된 설정이 없습니다');
    }
  };

  // 봄 불러오기
  const loadSpring = async () => {
    setLoadingSpring(true);
    const data = await loadSettings('spring');
    setLoadingSpring(false);
    if (data) {
      setLocalSpring(data);
      springSettings = data;
      if (isSpringMode) {
        particleSettings = data;
      }
      alert('봄 설정을 불러왔습니다!');
    } else {
      alert('저장된 설정이 없습니다');
    }
  };

  // 비 설정 업데이트
  const updateRain = (key: keyof RainSettings, value: number) => {
    const newSettings = { ...localRain, [key]: value };
    setLocalRain(newSettings);
    rainSettings = newSettings;
  };

  // 비 저장
  const saveRain = async () => {
    setSavingRain(true);
    const success = await saveSettings('rain', localRain);
    setSavingRain(false);
    if (success) {
      alert('비 설정이 저장되었습니다!');
    } else {
      alert('저장 실패');
    }
  };

  // 비 불러오기
  const loadRain = async () => {
    setLoadingRain(true);
    const data = await loadSettings('rain');
    setLoadingRain(false);
    if (data) {
      setLocalRain(data);
      rainSettings = data;
      alert('비 설정을 불러왔습니다!');
    } else {
      alert('저장된 설정이 없습니다');
    }
  };

  return (
    <>
      {/* 설정 열기 버튼 - 왼쪽 위 코너 투명 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-0 left-0 z-50 w-16 h-16 opacity-0 hover:opacity-10 bg-white transition-opacity cursor-pointer"
        aria-label="설정 열기"
      />

      {/* 설정 패널 */}
      {isOpen && (
        <div className="absolute top-16 left-4 z-50 bg-black/90 backdrop-blur-md rounded-xl p-5 w-80 border border-white/20 max-h-[85vh] overflow-y-auto">
          <h3 className="text-white font-medium mb-4 text-sm tracking-wide">
            파티클 설정
            <span className="ml-2 text-xs text-white/50">
              (현재: {isSpringMode ? '봄' : '겨울'})
            </span>
          </h3>

          {/* 겨울 설정 */}
          <div className="border-b border-white/10 pb-4 mb-4">
            <SettingsSection
              title="겨울 설정"
              settings={localWinter}
              onUpdate={updateWinter}
              onSave={saveWinter}
              onLoad={loadWinter}
              isSaving={savingWinter}
              isLoading={loadingWinter}
              accentColor="text-blue-300"
            />
          </div>

          {/* 봄 설정 */}
          <div className="border-b border-white/10 pb-4 mb-4">
            <SettingsSection
              title="봄 설정"
              settings={localSpring}
              onUpdate={updateSpring}
              onSave={saveSpring}
              onLoad={loadSpring}
              isSaving={savingSpring}
              isLoading={loadingSpring}
              accentColor="text-pink-300"
            />
          </div>

          {/* 비 설정 */}
          <RainSettingsSection
            title="비 설정"
            settings={localRain}
            onUpdate={updateRain}
            onSave={saveRain}
            onLoad={loadRain}
            isSaving={savingRain}
            isLoading={loadingRain}
            accentColor="text-cyan-300"
          />

          {/* 기본값으로 초기화 버튼 */}
          <div className="border-t border-white/10 pt-4 mt-2">
            <button
              onClick={() => {
                setLocalWinter({ ...WINTER_DEFAULT });
                setLocalSpring({ ...SPRING_DEFAULT });
                setLocalRain({ ...RAIN_DEFAULT });
                winterSettings = { ...WINTER_DEFAULT };
                springSettings = { ...SPRING_DEFAULT };
                rainSettings = { ...RAIN_DEFAULT };
                particleSettings = isSpringMode ? { ...SPRING_DEFAULT } : { ...WINTER_DEFAULT };
                alert('기본값으로 초기화되었습니다');
              }}
              className="w-full py-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg text-white/70 text-xs transition-all"
            >
              기본값으로 초기화
            </button>
          </div>
        </div>
      )}
    </>
  );
}
