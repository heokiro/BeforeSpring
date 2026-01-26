import { type ReactNode, useEffect, useCallback, useState } from 'react';

interface ExhibitionContainerProps {
  children: ReactNode;
}

export function ExhibitionContainer({ children }: ExhibitionContainerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // 커서 숨기기 (전시용)
    const timer = setTimeout(() => {
      document.body.style.cursor = 'none';
    }, 3000);

    const handleMouseMove = () => {
      document.body.style.cursor = 'default';
      clearTimeout(timer);
      setTimeout(() => {
        document.body.style.cursor = 'none';
      }, 3000);
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('mousemove', handleMouseMove);
      document.body.style.cursor = 'default';
    };
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {children}

      {/* 전체화면 버튼 (마우스 오버 시 표시) */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all opacity-0 hover:opacity-100 focus:opacity-100 z-50"
        title={isFullscreen ? '전체화면 종료' : '전체화면'}
      >
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isFullscreen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9h4.5M15 9V4.5M15 9l5.5-5.5M9 15H4.5M9 15v4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5m0-4.5l5.5 5.5"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5h-4m4 0v-4m0 4l-5-5"
            />
          )}
        </svg>
      </button>
    </div>
  );
}
