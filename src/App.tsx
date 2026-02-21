import { Canvas } from '@react-three/fiber';
import { ExhibitionContainer } from './components/layout/ExhibitionContainer';
import { ParticleSystem } from './components/visual/ParticleSystem';
import { BackgroundColor } from './components/visual/BackgroundColor';
import { ExhibitionText } from './components/ui/ExhibitionText';
import { CreditsOverlay } from './components/ui/CreditsOverlay';
import { CreditsPreview } from './components/ui/CreditsPreview';
import { SpringPreview } from './components/ui/SpringPreview';
import { StartOverlay } from './components/ui/StartOverlay';
import { AudioPlayer } from './components/audio/AudioPlayer';
import { SpringButton } from './components/ui/SpringButton';
import { ControlPanel } from './components/ui/ControlPanel';
import { useExhibitionSync } from './hooks/useExhibitionSync';
import { useExhibitionTimers } from './hooks/useExhibitionTimers';
import './index.css';

function App() {
  // URL 파라미터로 미리보기 모드 확인
  const urlParams = new URLSearchParams(window.location.search);
  const previewMode = urlParams.get('preview');

  // 크레딧 미리보기 모드
  if (previewMode === 'credits') {
    return <CreditsPreview />;
  }

  // 봄 배경 미리보기 모드
  if (previewMode === 'spring') {
    return <SpringPreview />;
  }
  // Firebase DB와 전시 상태 실시간 동기화
  useExhibitionSync();

  // 전시 타이머 (크레딧 표시, 자동 복귀)
  useExhibitionTimers();

  return (
    <ExhibitionContainer>
      {/* 3D 캔버스 - 파티클 비주얼 */}
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        className="absolute inset-0"
        gl={{ antialias: true, alpha: true }}
      >
        <BackgroundColor />
        <ParticleSystem />
      </Canvas>

      {/* 오버레이 - 전시 안내 텍스트 */}
      <ExhibitionText />

      {/* 크레딧 오버레이 (4단계 5초 후 표시) */}
      <CreditsOverlay />

      {/* 시작 오버레이 (사용자 상호작용 필요) */}
      <StartOverlay />

      {/* 오디오 플레이어 */}
      <AudioPlayer />

      {/* 봄 전환 버튼 - 전시용으로 숨김 */}
      <div className="hidden">
        <SpringButton />
      </div>

      {/* 파티클 설정 패널 - 왼쪽 위 코너 클릭으로 열기 */}
      <ControlPanel />
    </ExhibitionContainer>
  );
}

export default App;
