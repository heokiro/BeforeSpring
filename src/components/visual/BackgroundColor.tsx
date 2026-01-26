import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioStore } from '../../stores/audioStore';

// 겨울 배경색 (어두운 청회색 그라데이션)
const WINTER_TOP = new THREE.Color('#0a0a12');
const WINTER_BOTTOM = new THREE.Color('#050508');

// 봄 배경색 (뮤트 파스텔 - 세련된 톤)
const SPRING_TOP = new THREE.Color('#7a8fa3');    // 차분한 회청색
const SPRING_BOTTOM = new THREE.Color('#a8899a'); // 뮤트 분홍

export function BackgroundColor() {
  const { scene } = useThree();
  const { isSpringMode } = useAudioStore();
  const meshRef = useRef<THREE.Mesh>(null);

  // 현재 색상 상태
  const currentTopRef = useRef(WINTER_TOP.clone());
  const currentBottomRef = useRef(WINTER_BOTTOM.clone());

  // scene.background를 null로 설정 (셰이더 배경 사용)
  useEffect(() => {
    scene.background = null;
  }, [scene]);

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColorTop: { value: WINTER_TOP.clone() },
        uColorBottom: { value: WINTER_BOTTOM.clone() },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColorTop;
        uniform vec3 uColorBottom;
        varying vec2 vUv;

        void main() {
          // 위에서 아래로 그라데이션
          vec3 color = mix(uColorBottom, uColorTop, vUv.y);

          // 중앙에서 약간 밝게 (비네트 역효과)
          float vignette = 1.0 - length(vUv - 0.5) * 0.3;
          color *= vignette;

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      depthWrite: false,
      depthTest: false,
    });
  }, []);

  useFrame(() => {
    const targetTop = isSpringMode ? SPRING_TOP : WINTER_TOP;
    const targetBottom = isSpringMode ? SPRING_BOTTOM : WINTER_BOTTOM;

    // 부드럽게 색상 전환
    currentTopRef.current.lerp(targetTop, 0.015);
    currentBottomRef.current.lerp(targetBottom, 0.015);

    // 셰이더 유니폼 업데이트
    shaderMaterial.uniforms.uColorTop.value.copy(currentTopRef.current);
    shaderMaterial.uniforms.uColorBottom.value.copy(currentBottomRef.current);
  });

  return (
    <mesh ref={meshRef} renderOrder={-1000}>
      <planeGeometry args={[2, 2]} />
      <primitive object={shaderMaterial} attach="material" />
    </mesh>
  );
}
