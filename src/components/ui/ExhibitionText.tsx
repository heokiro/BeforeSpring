import { useAudioStore } from '../../stores/audioStore';

export function ExhibitionText() {
  const { energy, isPlaying, isSpringMode } = useAudioStore();

  // 봄 모드면 텍스트 숨김
  if (isSpringMode) return null;

  // 에너지에 따른 텍스트 투명도 조절
  const textOpacity = isPlaying ? Math.max(0.7, 1 - energy * 0.3) : 1;

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center px-8 z-10 pointer-events-none"
      style={{ opacity: textOpacity }}
    >
      <h1 className="text-center font-exhibition text-4xl md:text-5xl lg:text-6xl font-light text-white tracking-wider">
        차가운 손을 감싸주세요
      </h1>
    </div>
  );
}
