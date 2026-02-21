import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { useAudioStore } from '../../stores/audioStore';
import { BackgroundColor } from '../visual/BackgroundColor';
import { ParticleSystem } from '../visual/ParticleSystem';

/**
 * 봄 배경 미리보기 컴포넌트
 * ?preview=spring 으로 접속하면 봄 모드 배경을 미리 볼 수 있음
 */
export function SpringPreview() {
  const setSpringMode = useAudioStore((state) => state.setSpringMode);

  // 마운트 시 봄 모드 활성화
  useEffect(() => {
    setSpringMode(true);
  }, [setSpringMode]);

  return (
    <div className="w-screen h-screen bg-black relative">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        className="absolute inset-0"
        gl={{ antialias: true, alpha: true }}
      >
        <BackgroundColor />
        <ParticleSystem />
      </Canvas>

      {/* 미리보기 안내 */}
      <div className="absolute top-4 left-4 text-white/70 text-sm font-exhibition">
        봄 배경 미리보기 (?preview=spring)
      </div>
    </div>
  );
}
