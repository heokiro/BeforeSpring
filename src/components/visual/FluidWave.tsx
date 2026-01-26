import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioStore } from '../../stores/audioStore';

import vertexShader from './shaders/fluidVertex.glsl?raw';
import fragmentShader from './shaders/fluidFragment.glsl?raw';

export function FluidWave() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { bass, mid, treble, energy, isBeat } = useAudioStore();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uTreble: { value: 0 },
      uEnergy: { value: 0 },
      uIsBeat: { value: 0 },
    }),
    []
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;

      // 부드러운 전환을 위한 lerp
      materialRef.current.uniforms.uBass.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uBass.value,
        bass,
        0.1
      );
      materialRef.current.uniforms.uMid.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uMid.value,
        mid,
        0.1
      );
      materialRef.current.uniforms.uTreble.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uTreble.value,
        treble,
        0.1
      );
      materialRef.current.uniforms.uEnergy.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uEnergy.value,
        energy,
        0.08
      );
      materialRef.current.uniforms.uIsBeat.value = isBeat ? 1.0 :
        THREE.MathUtils.lerp(materialRef.current.uniforms.uIsBeat.value, 0, 0.15);
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2.5, 0, 0]} position={[0, -1, 0]}>
      <planeGeometry args={[10, 10, 128, 128]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
