import { useAudioStore } from '../../stores/audioStore';

export function StartOverlay() {
  const hasUserInteracted = useAudioStore((state) => state.hasUserInteracted);
  const setHasUserInteracted = useAudioStore((state) => state.setHasUserInteracted);

  const handleStart = () => {
    setHasUserInteracted(true);
  };

  if (hasUserInteracted) return null;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 cursor-pointer"
      onClick={handleStart}
    >
      <div className="text-center font-exhibition text-white">
        <p className="text-3xl md:text-4xl font-light tracking-wider mb-8">
          입춘(立春)
        </p>
        <p className="text-xl md:text-2xl font-light text-white/70 animate-pulse">
          화면을 터치하여 시작하세요
        </p>
      </div>
    </div>
  );
}
