import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioStore } from '../../stores/audioStore';

// 겨울 배경색 (하늘 + 땅) - 확실한 구분
const WINTER_SKY = new THREE.Color('#4a5568');     // 밝은 청회색 하늘
const WINTER_GROUND = new THREE.Color('#5c4033');  // 확실한 갈색 땅

// 봄 배경색 (원래 그라데이션 유지)
const SPRING_TOP = new THREE.Color('#7a8fa3');     // 차분한 회청색
const SPRING_BOTTOM = new THREE.Color('#a8899a');  // 뮤트 분홍

export function BackgroundColor() {
  const { scene } = useThree();
  const { isSpringMode } = useAudioStore();
  const meshRef = useRef<THREE.Mesh>(null);

  // 현재 색상 상태
  const currentSkyRef = useRef(WINTER_SKY.clone());
  const currentGroundRef = useRef(WINTER_GROUND.clone());
  const transitionRef = useRef(0);

  // scene.background를 null로 설정 (셰이더 배경 사용)
  useEffect(() => {
    scene.background = null;
  }, [scene]);

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColorSky: { value: WINTER_SKY.clone() },
        uColorGround: { value: WINTER_GROUND.clone() },
        uTransition: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColorSky;
        uniform vec3 uColorGround;
        uniform float uTransition;
        varying vec2 vUv;

        void main() {
          // 겨울: 하늘과 땅 구분 (하단 5%가 땅, 경계 뚜렷하게)
          float groundLine = 0.05;
          float blendZone = 0.05;

          vec3 winterSky = uColorSky;
          float groundMix = smoothstep(groundLine + blendZone, groundLine - blendZone, vUv.y);
          vec3 winterColor = mix(winterSky, uColorGround, groundMix);

          // 봄: 위에서 아래로 단순 그라데이션
          vec3 springColor = mix(uColorGround, uColorSky, vUv.y);

          // 겨울/봄 전환
          vec3 color = mix(winterColor, springColor, uTransition);

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      depthWrite: false,
      depthTest: false,
    });
  }, []);

  useFrame(() => {
    const targetTransition = isSpringMode ? 1 : 0;
    transitionRef.current = THREE.MathUtils.lerp(transitionRef.current, targetTransition, 0.015);

    // 겨울 → 봄 색상 전환
    const targetSky = isSpringMode ? SPRING_TOP : WINTER_SKY;
    const targetGround = isSpringMode ? SPRING_BOTTOM : WINTER_GROUND;

    currentSkyRef.current.lerp(targetSky, 0.015);
    currentGroundRef.current.lerp(targetGround, 0.015);

    // 셰이더 유니폼 업데이트
    shaderMaterial.uniforms.uColorSky.value.copy(currentSkyRef.current);
    shaderMaterial.uniforms.uColorGround.value.copy(currentGroundRef.current);
    shaderMaterial.uniforms.uTransition.value = transitionRef.current;
  });

  return (
    <mesh ref={meshRef} renderOrder={-1000}>
      <planeGeometry args={[2, 2]} />
      <primitive object={shaderMaterial} attach="material" />
    </mesh>
  );
}
