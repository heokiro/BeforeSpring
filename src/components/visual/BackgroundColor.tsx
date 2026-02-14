import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioStore } from '../../stores/audioStore';

// 겨울 배경색 (하늘 + 땅)
const WINTER_SKY = new THREE.Color('#4a5568');
const WINTER_GROUND = new THREE.Color('#5c4033');

// 봄 배경색
const SPRING_TOP = new THREE.Color('#7a8fa3');
const SPRING_BOTTOM = new THREE.Color('#a8899a');

export function BackgroundColor() {
  const { scene } = useThree();
  const { isSpringMode, isBeat, energy, bass } = useAudioStore();
  const meshRef = useRef<THREE.Mesh>(null);

  // 현재 색상 상태
  const currentSkyRef = useRef(WINTER_SKY.clone());
  const currentGroundRef = useRef(WINTER_GROUND.clone());
  const transitionRef = useRef(0);
  const beatPulseRef = useRef(0);

  // 오로라 성장 관련
  const winterTimeRef = useRef(0);
  const auroraGrowthRef = useRef(0);
  const AURORA_GROW_DURATION = 60; // 1분에 걸쳐 성장

  useEffect(() => {
    scene.background = null;
  }, [scene]);

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorSky: { value: WINTER_SKY.clone() },
        uColorGround: { value: WINTER_GROUND.clone() },
        uTransition: { value: 0 },
        uBeatPulse: { value: 0 },
        uEnergy: { value: 0 },
        uAuroraGrowth: { value: 0 },  // 오로라 성장도 (0~1)
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColorSky;
        uniform vec3 uColorGround;
        uniform float uTransition;
        uniform float uBeatPulse;
        uniform float uEnergy;
        uniform float uAuroraGrowth;
        varying vec2 vUv;

        // Simplex 2D Noise
        vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                   -0.577350269189626, 0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy));
          vec2 x0 = v -   i + dot(i, C.xx);
          vec2 i1;
          i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod(i, 289.0);
          vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
            + i.x + vec3(0.0, i1.x, 1.0));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
            dot(x12.zw,x12.zw)), 0.0);
          m = m*m;
          m = m*m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
          vec3 g;
          g.x  = a0.x  * x0.x  + h.x  * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }

        // HSV to RGB
        vec3 hsv2rgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }

        void main() {
          // 기본 배경색 계산
          float groundLine = 0.05;
          float blendZone = 0.05;

          vec3 winterSky = uColorSky;
          float groundMix = smoothstep(groundLine + blendZone, groundLine - blendZone, vUv.y);
          vec3 winterColor = mix(winterSky, uColorGround, groundMix);

          vec3 springColor = mix(uColorGround, uColorSky, vUv.y);
          vec3 baseColor = mix(winterColor, springColor, uTransition);

          // === 미디어아트 효과 ===

          // 1. 노이즈 패턴 (움직이는 배경 질감)
          float noiseScale = 2.0;
          float noiseSpeed = 0.08;
          float noise1 = snoise(vUv * noiseScale + vec2(uTime * noiseSpeed, 0.0));
          float noise2 = snoise(vUv * noiseScale * 1.5 + vec2(0.0, uTime * noiseSpeed * 0.7));
          float combinedNoise = (noise1 + noise2) * 0.5;

          // 노이즈로 미묘한 색상 변화
          vec3 noiseColor = baseColor + combinedNoise * 0.04;

          // 2. 실제 오로라 (다중 색상 + 물결 커튼)
          float winterAuroraMask = 1.0 - uTransition;  // 겨울에만 표시

          // 오로라 영역 (화면 상단 30~98%)
          float auroraRegion = smoothstep(0.30, 0.98, vUv.y);

          // 물결치는 Y좌표
          float waveOffset = sin(vUv.x * 8.0 + uTime * 0.3) * 0.03;
          float waveY = vUv.y + waveOffset;

          // === Layer 1: 배경 글로우 (넓고 부드러움) ===
          float glow1 = snoise(vec2(vUv.x * 1.5, uTime * 0.02));
          float glowBands = sin(vUv.x * 5.0 + glow1 * 2.0 + uTime * 0.08);
          glowBands = pow(glowBands * 0.5 + 0.5, 3.0);
          float glowFade = pow(1.0 - smoothstep(0.4, 0.98, waveY), 0.5);
          float aurora1 = glowBands * auroraRegion * glowFade * 0.4;

          // === Layer 2: 메인 커튼 (선명한 밴드) ===
          float aNoise2 = snoise(vec2(vUv.x * 3.0, uTime * 0.05));
          float bands2 = sin(vUv.x * 15.0 + aNoise2 * 2.5 + uTime * 0.15);
          bands2 = pow(bands2 * 0.5 + 0.5, 1.2);
          float height2 = snoise(vec2(vUv.x * 4.0 + uTime * 0.02, 0.0)) * 0.3 + 0.7;
          float fade2 = pow(1.0 - smoothstep(0.35, 0.92, waveY), 0.6);
          float aurora2 = bands2 * auroraRegion * fade2 * height2 * 0.6;

          // === Layer 3: 디테일 (빠르고 선명) ===
          float aNoise3 = snoise(vec2(vUv.x * 5.0, uTime * 0.1));
          float bands3 = sin(vUv.x * 30.0 + aNoise3 * 3.0 + uTime * 0.25);
          bands3 = pow(bands3 * 0.5 + 0.5, 1.0);
          float fade3 = pow(1.0 - smoothstep(0.3, 0.85, waveY), 0.7);
          float aurora3 = bands3 * auroraRegion * fade3 * 0.8;

          // === 색상 (Y축 기반 그라데이션) ===
          // 아래: 초록(0.33) → 중간: 청록(0.5) → 위: 보라(0.75)
          float hueBase = mix(0.33, 0.75, pow(vUv.y, 0.8));

          vec3 aColor1 = hsv2rgb(vec3(hueBase + 0.1, 0.6, 0.9));   // 배경: 약간 보라쪽
          vec3 aColor2 = hsv2rgb(vec3(hueBase, 0.75, 0.95));       // 메인: 기본색
          vec3 aColor3 = hsv2rgb(vec3(hueBase - 0.05, 0.7, 1.0)); // 디테일: 약간 초록쪽

          // === 레이어 합성 ===
          vec3 auroraColor = aColor1 * aurora1 + aColor2 * aurora2 + aColor3 * aurora3;

          // 3. 전환 시 부드러운 효과 (봄 전환 시만)
          float transitionPeak = sin(uTransition * 3.14159);
          vec3 transitionGlow = vec3(1.0, 0.97, 0.98) * transitionPeak * 0.04;

          // 최종 색상 합성
          vec3 color = noiseColor;
          color += auroraColor * winterAuroraMask;  // 겨울에만 오로라 (3-레이어)
          color += transitionGlow;

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      depthWrite: false,
      depthTest: false,
    });
  }, []);

  useFrame((state, delta) => {
    const targetTransition = isSpringMode ? 1 : 0;
    transitionRef.current = THREE.MathUtils.lerp(transitionRef.current, targetTransition, 0.015);

    // 오로라는 처음부터 완성된 상태로 표시
    auroraGrowthRef.current = 1.0;

    // 비트 펄스 (비트 감지 시 1로 점프, 서서히 감소)
    if (isBeat) {
      beatPulseRef.current = 1.0;
    } else {
      beatPulseRef.current = THREE.MathUtils.lerp(beatPulseRef.current, 0, 0.08);
    }

    // 색상 전환
    const targetSky = isSpringMode ? SPRING_TOP : WINTER_SKY;
    const targetGround = isSpringMode ? SPRING_BOTTOM : WINTER_GROUND;

    currentSkyRef.current.lerp(targetSky, 0.015);
    currentGroundRef.current.lerp(targetGround, 0.015);

    // 유니폼 업데이트
    shaderMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    shaderMaterial.uniforms.uColorSky.value.copy(currentSkyRef.current);
    shaderMaterial.uniforms.uColorGround.value.copy(currentGroundRef.current);
    shaderMaterial.uniforms.uTransition.value = transitionRef.current;
    shaderMaterial.uniforms.uBeatPulse.value = beatPulseRef.current;
    shaderMaterial.uniforms.uEnergy.value = THREE.MathUtils.lerp(
      shaderMaterial.uniforms.uEnergy.value,
      energy,
      0.1
    );
    shaderMaterial.uniforms.uAuroraGrowth.value = auroraGrowthRef.current;
  });

  return (
    <mesh ref={meshRef} renderOrder={-1000}>
      <planeGeometry args={[2, 2]} />
      <primitive object={shaderMaterial} attach="material" />
    </mesh>
  );
}
