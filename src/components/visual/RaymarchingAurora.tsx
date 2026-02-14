import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioStore } from '../../stores/audioStore';

import vertexShader from './shaders/auroraVertex.glsl?raw';
import fragmentShader from './shaders/auroraFragment.glsl?raw';

// 절차적 Perlin-like 노이즈 텍스처 생성
function createNoiseTexture(size: number = 256): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);

  // Fade function for smooth interpolation
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + t * (b - a);

  // 랜덤 그라디언트 벡터
  const gradients: number[][] = [];
  for (let i = 0; i < 256; i++) {
    const angle = Math.random() * Math.PI * 2;
    gradients.push([Math.cos(angle), Math.sin(angle)]);
  }

  // 퍼뮤테이션 테이블
  const permutation: number[] = [];
  for (let i = 0; i < 256; i++) permutation.push(i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
  }
  const perm = [...permutation, ...permutation];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // 다중 옥타브 노이즈
      let noise = 0;
      let amplitude = 1;
      let frequency = 4;
      let maxValue = 0;

      for (let octave = 0; octave < 4; octave++) {
        const nx = (x / size) * frequency;
        const ny = (y / size) * frequency;

        const xi = Math.floor(nx) & 255;
        const yi = Math.floor(ny) & 255;
        const xf = nx - Math.floor(nx);
        const yf = ny - Math.floor(ny);

        const u = fade(xf);
        const v = fade(yf);

        const g00 = gradients[perm[perm[xi] + yi] & 255];
        const g10 = gradients[perm[perm[(xi + 1) & 255] + yi] & 255];
        const g01 = gradients[perm[perm[xi] + ((yi + 1) & 255)] & 255];
        const g11 = gradients[perm[perm[(xi + 1) & 255] + ((yi + 1) & 255)] & 255];

        const n00 = g00[0] * xf + g00[1] * yf;
        const n10 = g10[0] * (xf - 1) + g10[1] * yf;
        const n01 = g01[0] * xf + g01[1] * (yf - 1);
        const n11 = g11[0] * (xf - 1) + g11[1] * (yf - 1);

        const nx1 = lerp(n00, n10, u);
        const nx2 = lerp(n01, n11, u);
        const nxy = lerp(nx1, nx2, v);

        noise += nxy * amplitude;
        maxValue += amplitude;
        amplitude *= 0.5;
        frequency *= 2;
      }

      const value = Math.floor(((noise / maxValue) + 1) * 0.5 * 255);
      const i = (y * size + x) * 4;
      data[i + 0] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;

  return texture;
}

interface RaymarchingAuroraProps {
  // 색상
  color?: THREE.Color;
  // 위치/크기
  position?: [number, number, number];
  boxSize?: [number, number, number];
}

export function RaymarchingAurora({
  color = new THREE.Color(0.3, 0.8, 0.5), // 녹색-청록색 오로라
  position = [0, 2, 0], // 화면 중앙 위쪽
  boxSize = [12, 6, 8], // 카메라를 감싸는 큰 박스
}: RaymarchingAuroraProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { camera } = useThree();
  const transitionRef = useRef(0);

  // inverse model matrix 저장용
  const inverseMatrixRef = useRef(new THREE.Matrix4());
  const cameraLocalPosRef = useRef(new THREE.Vector3());

  // 노이즈 텍스처 생성 (한 번만)
  const noiseTexture = useMemo(() => createNoiseTexture(256), []);

  // 텍스처 정리
  useEffect(() => {
    return () => {
      noiseTexture.dispose();
    };
  }, [noiseTexture]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSpeed: { value: 0.01 },
      uColor: { value: new THREE.Vector4(color.r, color.g, color.b, 1.0) },
      uEmissionStrength: { value: 5.0 },
      uNoise: { value: noiseTexture },
      uOffset: { value: 0.0 },
      uSmoothness: { value: 0.15 },
      uDistort: { value: 1.0 },
      uScale: { value: 0.02 },
      uStep: { value: 0.01 },
      uBaseDensity: { value: 2.0 },
      uEnergy: { value: 0 },
      uBass: { value: 0 },
      uIsBeat: { value: 0 },
      uTransition: { value: 0 },
      uCameraLocalPos: { value: new THREE.Vector3() },
      uBoxSize: { value: new THREE.Vector3(boxSize[0], boxSize[1], boxSize[2]) },
    }),
    [color, noiseTexture, boxSize]
  );

  useFrame((state) => {
    if (!materialRef.current || !meshRef.current) return;

    const mat = materialRef.current;
    const mesh = meshRef.current;

    // Zustand에서 항상 최신 상태 가져오기 (클로저 문제 방지)
    const storeState = useAudioStore.getState();
    const { bass, energy, isBeat, isSpringMode, auroraParams } = storeState;

    mat.uniforms.uTime.value = state.clock.elapsedTime;

    // 오로라 파라미터 실시간 업데이트
    mat.uniforms.uSpeed.value = auroraParams.speed;
    mat.uniforms.uEmissionStrength.value = auroraParams.emissionStrength;
    mat.uniforms.uOffset.value = auroraParams.offset;
    mat.uniforms.uSmoothness.value = auroraParams.smoothness;
    mat.uniforms.uDistort.value = auroraParams.distort;
    mat.uniforms.uScale.value = auroraParams.scale;
    mat.uniforms.uStep.value = auroraParams.step;
    mat.uniforms.uBaseDensity.value = auroraParams.baseDensity;

    // 카메라 위치를 오브젝트 로컬 공간으로 변환 후 정규화 (-1 ~ 1)
    mesh.updateMatrixWorld();
    inverseMatrixRef.current.copy(mesh.matrixWorld).invert();
    cameraLocalPosRef.current.copy(camera.position).applyMatrix4(inverseMatrixRef.current);
    // 박스 크기로 나누어 정규화
    cameraLocalPosRef.current.x /= boxSize[0] * 0.5;
    cameraLocalPosRef.current.y /= boxSize[1] * 0.5;
    cameraLocalPosRef.current.z /= boxSize[2] * 0.5;
    mat.uniforms.uCameraLocalPos.value.copy(cameraLocalPosRef.current);

    // 오디오 반응 (부드러운 보간)
    mat.uniforms.uBass.value = THREE.MathUtils.lerp(mat.uniforms.uBass.value, bass, 0.1);
    mat.uniforms.uEnergy.value = THREE.MathUtils.lerp(mat.uniforms.uEnergy.value, energy, 0.08);
    mat.uniforms.uIsBeat.value = isBeat ? 1.0 : THREE.MathUtils.lerp(mat.uniforms.uIsBeat.value, 0, 0.15);

    // 봄 전환 (겨울에만 표시)
    const targetTransition = isSpringMode ? 1 : 0;
    transitionRef.current = THREE.MathUtils.lerp(transitionRef.current, targetTransition, 0.015);
    mat.uniforms.uTransition.value = transitionRef.current;
  });

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={boxSize} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
