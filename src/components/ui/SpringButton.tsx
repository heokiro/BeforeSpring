import { useAudioStore } from '../../stores/audioStore';

export function SpringButton() {
  const { isSpringMode, setSpringMode, isPlaying } = useAudioStore();

  // 재생 중일 때만 버튼 표시
  if (!isPlaying) return null;

  return (
    <button
      onClick={() => setSpringMode(!isSpringMode)}
      className={`
        absolute bottom-8 right-8 z-50
        px-6 py-3 rounded-full
        transition-all duration-500 ease-out
        backdrop-blur-sm border
        ${isSpringMode
          ? 'bg-pink-400/30 border-pink-300/50 text-pink-100 hover:bg-pink-400/40'
          : 'bg-white/10 border-white/30 text-white/80 hover:bg-white/20'
        }
      `}
    >
      <span className="text-sm font-light tracking-wider">
        {isSpringMode ? '겨울로' : '봄으로'}
      </span>
    </button>
  );
}
