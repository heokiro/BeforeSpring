import { Canvas } from '@react-three/fiber';
import { ExhibitionContainer } from './components/layout/ExhibitionContainer';
import { ParticleSystem } from './components/visual/ParticleSystem';
import { ExhibitionText } from './components/ui/ExhibitionText';
import { AudioPlayer } from './components/audio/AudioPlayer';
import { SpringButton } from './components/ui/SpringButton';
import { ControlPanel } from './components/ui/ControlPanel';
import './index.css';

function App() {
  return (
    <ExhibitionContainer>
      {/* 3D 캔버스 - 파티클 비주얼 */}
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        className="absolute inset-0"
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={['#050508']} />
        <ParticleSystem />
      </Canvas>

      {/* 오버레이 - 전시 안내 텍스트 */}
      <ExhibitionText />

      {/* 오디오 플레이어 */}
      <AudioPlayer />

      {/* 봄 전환 버튼 */}
      <SpringButton />

      {/* 파티클 설정 패널 */}
      <ControlPanel />
    </ExhibitionContainer>
  );
}

export default App;
