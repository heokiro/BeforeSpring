import { useState, useEffect, useRef } from 'react';
import { useAudioStore } from '../../stores/audioStore';

// 안내 문구
const TOUCH_PROMPT = '차가운 손을 감싸주세요';

// 페이드 전환 시간 (ms)
const FADE_DURATION = 500;

// 전시 안내 컴포넌트 (0단계)
function ForewordText() {
  return (
    <div className="max-w-2xl mx-auto px-8 text-center font-exhibition text-white">
      {/* 전시 제목 */}
      <h1 className="text-6xl md:text-7xl font-light tracking-[0.3em]">
        입춘(立春)
      </h1>

      {/* 메인 서브타이틀 */}
      <p className="text-4xl md:text-5xl font-light" style={{ marginTop: '8rem' }}>
        관객의 참여로 완성되는 전시
      </p>

      {/* 무인/무료 안내 */}
      <p className="text-xl md:text-2xl font-light text-white/70" style={{ marginTop: '1.5rem' }}>
        무인으로 운영되며, 누구나 무료로 관람하실 수 있습니다.
      </p>

      {/* 운영 시간 1 블록 */}
      <div style={{ marginTop: '10rem' }}>
        <p className="text-3xl md:text-4xl tracking-[0.15em] font-light">
          2026. 2. 23 — 3. 8
        </p>
        <p className="text-xl md:text-2xl font-light text-white/70" style={{ marginTop: '1rem' }}>
          매일 오전 11시 — 오후 9시
        </p>
        <p className="text-xl md:text-2xl font-light text-white/70" style={{ marginTop: '0.25rem' }}>
          자유롭게 방문해 주세요.
        </p>
      </div>

      {/* 운영 시간 2 블록 */}
      <div style={{ marginTop: '8rem' }}>
        <p className="text-3xl md:text-4xl tracking-[0.15em] font-light">
          2026. 3. 9 — 3. 31
        </p>
        <p className="text-xl md:text-2xl font-light text-white/70" style={{ marginTop: '1rem' }}>
          네이버 예약 후 방문해 주세요.
        </p>
      </div>
    </div>
  );
}

// 안내 문구 컴포넌트 (1, 2, 3단계)
function PromptText() {
  return (
    <h1 className="text-center font-exhibition text-5xl md:text-6xl lg:text-7xl font-light text-white tracking-wider">
      {TOUCH_PROMPT}
    </h1>
  );
}

export function ExhibitionText() {
  const { currentStep, isTouch, energy, isPlaying } = useAudioStore();
  const [isVisible, setIsVisible] = useState(true);
  const [displayedStep, setDisplayedStep] = useState(currentStep);
  const [displayedTouch, setDisplayedTouch] = useState(isTouch);
  const prevStepRef = useRef(currentStep);
  const prevTouchRef = useRef(isTouch);

  // 단계 또는 터치 상태 변경 시 페이드 아웃 → 콘텐츠 변경 → 페이드 인
  useEffect(() => {
    const stepChanged = prevStepRef.current !== currentStep;
    const touchChanged = prevTouchRef.current !== isTouch;

    if (stepChanged || touchChanged) {
      // 페이드 아웃
      setIsVisible(false);

      // 페이드 아웃 완료 후 콘텐츠 변경 및 페이드 인
      const timer = setTimeout(() => {
        setDisplayedStep(currentStep);
        setDisplayedTouch(isTouch);
        setIsVisible(true);
      }, FADE_DURATION);

      prevStepRef.current = currentStep;
      prevTouchRef.current = isTouch;

      return () => clearTimeout(timer);
    }
  }, [currentStep, isTouch]);

  // 에너지에 따른 텍스트 투명도 조절
  const baseOpacity = isPlaying ? Math.max(0.7, 1 - energy * 0.3) : 1;
  const finalOpacity = isVisible ? baseOpacity : 0;

  // 단계별 렌더링
  const renderContent = () => {
    switch (displayedStep) {
      case 0:
        // 0단계: 전시 서문
        return <ForewordText />;
      case 1:
        // 1단계: 안내 문구
        return <PromptText />;
      case 2:
      case 3:
        // 2/3단계: isTouch 조건부 표시
        return displayedTouch ? null : <PromptText />;
      case 4:
        // 4단계: 텍스트 없음
        return null;
      default:
        return null;
    }
  };

  const content = renderContent();
  if (!content) return null;

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center px-8 z-10 pointer-events-none overflow-y-auto transition-opacity duration-500"
      style={{ opacity: finalOpacity }}
    >
      {content}
    </div>
  );
}
