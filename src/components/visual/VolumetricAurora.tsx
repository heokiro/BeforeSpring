import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioStore } from '../../stores/audioStore';

import vertexShader from './shaders/auroraVolumetricVertex.glsl?raw';
import fragmentShader from './shaders/auroraVolumetricFragment.glsl?raw';

interface VolumetricAuroraProps {
  // 색상
  color?: THREE.Color;
  // 위치/크기
  position?: [number, number, number];
  boxSize?: [number, number, number];
  // 강도
  intensity?: number;
}

export function VolumetricAurora({
  color = new THREE.Color(0.3, 0.8, 0.5), // 녹색-청록색 오로라
  position = [0, 2, 0], // 화면 중앙 위쪽
  boxSize = [12, 6, 8], // 카메라를 감싸는 큰 박스
  intensity = 1.8,
}: VolumetricAuroraProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { camera } = useThree();
  const transitionRef = useRef(0);

  // inverse model matrix 저장용
  const inverseMatrixRef = useRef(new THREE.Matrix4());
  const cameraLocalPosRef = useRef(new THREE.Vector3());

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Vector4(color.r, color.g, color.b, 1.0) },
      uEmissionStrength: { value: 5.0 },
      uEnergy: { value: 0 },
      uBass: { value: 0 },
      uIsBeat: { value: 0 },
      uTransition: { value: 0 },
      uAuroraIntensity: { value: intensity },
      uSpeed: { value: 0.06 },
      uCameraLocalPos: { value: new THREE.Vector3() },
      uBoxSize: { value: new THREE.Vector3(boxSize[0], boxSize[1], boxSize[2]) },
    }),
    [color, boxSize, intensity]
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

    // auroraIntensity가 있으면 사용, 없으면 기본값
    if ('auroraIntensity' in auroraParams) {
      mat.uniforms.uAuroraIntensity.value = (auroraParams as { auroraIntensity?: number }).auroraIntensity ?? intensity;
    }

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
