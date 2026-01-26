import { useAudioStore } from '../../stores/audioStore';

// 전시 안내 텍스트 설정 - 이 부분을 수정하여 텍스트 변경
const EXHIBITION_CONFIG = {
  title: '봄이 오기 전',
  subtitle: 'Before Spring',
  description: `눈이 녹아 봄이 되는 순간,
당신의 시선이 계절을 바꿉니다.`,
  artist: '',
  additionalInfo: '',
};

export function ExhibitionText() {
  const { energy, isPlaying } = useAudioStore();

  // 에너지에 따른 텍스트 투명도 조절 (너무 강하면 약간 투명해짐)
  const textOpacity = isPlaying ? Math.max(0.7, 1 - energy * 0.3) : 1;

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center px-8 z-10 pointer-events-none"
      style={{ opacity: textOpacity }}
    >
      <div className="text-center max-w-lg">
        {/* 메인 타이틀 */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-white mb-2 tracking-wider">
          {EXHIBITION_CONFIG.title}
        </h1>

        {/* 서브타이틀 (영문) */}
        {EXHIBITION_CONFIG.subtitle && (
          <p className="text-lg md:text-xl text-white/70 font-light tracking-widest mb-8">
            {EXHIBITION_CONFIG.subtitle}
          </p>
        )}

        {/* 설명 텍스트 */}
        {EXHIBITION_CONFIG.description && (
          <p className="text-base md:text-lg text-white/80 font-light leading-relaxed whitespace-pre-line mb-6">
            {EXHIBITION_CONFIG.description}
          </p>
        )}

        {/* 아티스트 정보 */}
        {EXHIBITION_CONFIG.artist && (
          <p className="text-sm text-white/60 font-light tracking-wide">
            {EXHIBITION_CONFIG.artist}
          </p>
        )}

        {/* 추가 정보 */}
        {EXHIBITION_CONFIG.additionalInfo && (
          <p className="text-xs text-white/40 mt-4">
            {EXHIBITION_CONFIG.additionalInfo}
          </p>
        )}
      </div>
    </div>
  );
}
