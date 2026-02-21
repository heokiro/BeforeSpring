import zanneImage from '../../assets/sprite/zanne.png';

/**
 * 크레딧 레이아웃 미리보기 페이지
 * URL에 ?preview=credits 추가하면 볼 수 있음
 */
export function CreditsPreview() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-200 to-pink-300 flex items-center justify-center">
      <div className="text-center font-exhibition text-white px-8 max-w-2xl mx-auto">
        {/* 타이틀 */}
        <div style={{ marginBottom: '4rem' }}>
          <p className="text-7xl md:text-9xl font-normal">立 春</p>
        </div>

        {/* 참여작가 */}
        <div style={{ marginBottom: '3.5rem' }}>
          <p className="text-xl md:text-2xl text-white/60 mb-3">참여작가</p>
          <p className="text-2xl md:text-3xl font-light">D.cus (최재호, 허재혁)</p>
          <p className="text-2xl md:text-3xl font-light">이건웅</p>
        </div>

        {/* 포스터 */}
        <div style={{ marginBottom: '3.5rem' }}>
          <p className="text-xl md:text-2xl text-white/60 mb-3">포스터</p>
          <p className="text-2xl md:text-3xl font-light">김윤희</p>
        </div>

        {/* 조형모델 */}
        <div style={{ marginBottom: '3.5rem' }}>
          <p className="text-xl md:text-2xl text-white/60 mb-3">조형모델</p>
          <p className="text-2xl md:text-3xl font-light">오주영</p>
        </div>

        {/* 장소제공 */}
        <div style={{ marginBottom: '3.5rem' }}>
          <p className="text-xl md:text-2xl text-white/60 mb-3">장소제공</p>
          <div className="flex justify-center" style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
            <img
              src={zanneImage}
              alt="갤러리잔느"
              className="h-8 md:h-10"
            />
          </div>
          <p className="text-2xl md:text-3xl font-light">갤러리잔느</p>
        </div>

        {/* 감사한 분들 */}
        <div style={{ marginBottom: '3.5rem' }}>
          <p className="text-xl md:text-2xl text-white/60 mb-3">감사한 분들</p>
          <p className="text-2xl md:text-3xl font-light">박수잔</p>
          <p className="text-2xl md:text-3xl font-light">정수봉</p>
        </div>

        {/* 멘트 */}
        <div style={{ marginBottom: '4rem' }}>
          <p className="text-xl md:text-2xl text-white/80 font-light leading-relaxed">
            유난히 춥고 길었던 겨울이었기에<br />
            그만큼 따스하고 행복한 봄이 되길 바랍니다.
          </p>
        </div>

        {/* QR 코드 */}
        <div className="flex flex-col items-center justify-center">
          <img
            src="/images/qr/qr.png"
            alt="전시 관람 리뷰 QR"
            style={{ marginBottom: '2rem' }}
            className="w-40 h-40 md:w-48 md:h-48 rounded-2xl"
          />
          <p className="text-xl md:text-2xl text-white/70">감상과 의견을 남겨주세요</p>
          <p className="text-xl md:text-2xl text-white/70">다음 전시에 소중히 반영하겠습니다</p>
        </div>
      </div>
    </div>
  );
}
