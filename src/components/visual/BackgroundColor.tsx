import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioStore } from '../../stores/audioStore';

// 겨울 배경색 (하늘 + 땅) - 차가운 쿨톤
const WINTER_TOP = new THREE.Color('#0a1520');     // 거의 검은 상단
const WINTER_SKY = new THREE.Color('#7a8aa3');     // 어두운 네이비 하늘 (중간)
const WINTER_GROUND = new THREE.Color('#3d2817');  // 어두운 갈색 땅

// 봄 배경색 (원래 그라데이션 유지)
const SPRING_TOP = new THREE.Color('#9cbbd3');     // 차분한 회청색
const SPRING_BOTTOM = new THREE.Color('#c197bb');  // 뮤트 분홍

export function BackgroundColor() {
  const { scene } = useThree();
  const { isSpringMode } = useAudioStore();
  const meshRef = useRef<THREE.Mesh>(null);

  // 현재 색상 상태
  const currentTopRef = useRef(WINTER_TOP.clone());
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
        uColorTop: { value: WINTER_TOP.clone() },
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
        uniform vec3 uColorTop;
        uniform vec3 uColorSky;
        uniform vec3 uColorGround;
        uniform float uTransition;
        varying vec2 vUv;

        void main() {
          // 겨울: 위에서 아래로 그라데이션 (상단 어둡게)
          float groundLine = 0.05;
          float blendZone = 0.05;

          // 하늘 그라데이션: 상단(어두운) → 중간(네이비)
          vec3 winterSky = mix(uColorSky, uColorTop, vUv.y);
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
    const targetTop = isSpringMode ? SPRING_TOP : WINTER_TOP;
    const targetSky = isSpringMode ? SPRING_TOP : WINTER_SKY;
    const targetGround = isSpringMode ? SPRING_BOTTOM : WINTER_GROUND;

    currentTopRef.current.lerp(targetTop, 0.015);
    currentSkyRef.current.lerp(targetSky, 0.015);
    currentGroundRef.current.lerp(targetGround, 0.015);

    // 셰이더 유니폼 업데이트
    shaderMaterial.uniforms.uColorTop.value.copy(currentTopRef.current);
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
