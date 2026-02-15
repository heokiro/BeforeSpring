import { useAudioStore } from '../../stores/audioStore';

/**
 * 크레딧 오버레이 컴포넌트
 * step4 && showCredits 조건에서 표시
 * 배경은 투명하여 봄 파티클이 보임
 */
export function CreditsOverlay() {
  const currentStep = useAudioStore((state) => state.currentStep);
  const showCredits = useAudioStore((state) => state.showCredits);

  if (currentStep !== 4 || !showCredits) return null;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
      <div className="text-center font-exhibition text-white px-8 max-w-2xl mx-auto">
        {/* 참여작가 */}
        <div style={{ marginBottom: '6rem' }}>
          <p className="text-xl md:text-2xl text-white/60 mb-3">참여작가</p>
          <p className="text-2xl md:text-3xl font-light">
            D.cus(최재호, 허재혁), 이건웅
          </p>
        </div>

        {/* 포스터 */}
        <div style={{ marginBottom: '6rem' }}>
          <p className="text-xl md:text-2xl text-white/60 mb-3">포스터</p>
          <p className="text-2xl md:text-3xl font-light">김윤희</p>
        </div>

        {/* 조형모델 */}
        <div style={{ marginBottom: '6rem' }}>
          <p className="text-xl md:text-2xl text-white/60 mb-3">조형모델</p>
          <p className="text-2xl md:text-3xl font-light">오주영</p>
        </div>

        {/* 장소협찬 */}
        <div style={{ marginBottom: '8rem' }}>
          <p className="text-xl md:text-2xl text-white/60 mb-3">장소협찬</p>
          <p className="text-2xl md:text-3xl font-light">갤러리 잔느</p>
        </div>

        {/* QR 코드 */}
        <div className="flex flex-col items-center justify-center">
          <img
            src="/images/qr/qr.png"
            alt="전시 관람 리뷰 QR"
            className="w-40 h-40 md:w-48 md:h-48 mb-4"
          />
          <p className="text-xl md:text-2xl text-white/70">전시 관람 리뷰</p>
        </div>
      </div>
    </div>
  );
}
