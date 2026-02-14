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

          // 2. 오로라 효과 (상단에 은은한 빛의 띠)
          float auroraY = smoothstep(0.5, 0.95, vUv.y);
          float auroraWave = sin(vUv.x * 6.0 + uTime * 0.2) * 0.5 + 0.5;
          auroraWave *= sin(vUv.x * 2.5 - uTime * 0.15) * 0.3 + 0.7;
          float auroraIntensity = auroraY * auroraWave * 0.06; // 0.15 → 0.06 (더 은은하게)

          // 오로라 색상 (시간에 따라 변화)
          float auroraHue = fract(uTime * 0.015 + vUv.x * 0.15);
          // 겨울: 청록색 계열, 봄: 분홍색 계열
          float winterHue = 0.5 + auroraHue * 0.1; // 청록~파랑
          float springHue = 0.9 + auroraHue * 0.08;  // 분홍~빨강
          float finalHue = mix(winterHue, springHue, uTransition);
          vec3 auroraColor = hsv2rgb(vec3(finalHue, 0.25, 0.9)); // 채도 낮춤

          // 3. 비트 반응 펄스 (화면 전체 은은하게 밝아짐)
          float beatGlow = uBeatPulse * 0.035; // 0.08 → 0.035

          // 4. 전환 시 부드러운 효과
          float transitionPeak = sin(uTransition * 3.14159);
          vec3 transitionGlow = vec3(1.0, 0.97, 0.98) * transitionPeak * 0.06; // 0.12 → 0.06

          // 최종 색상 합성
          vec3 color = noiseColor;
          color += auroraColor * auroraIntensity;
          color += beatGlow;
          color += transitionGlow;

          // 시간에 따른 미묘한 전체 색조 변화
          float globalHueShift = sin(uTime * 0.1) * 0.02;
          color += globalHueShift;

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      depthWrite: false,
      depthTest: false,
    });
  }, []);

  useFrame((state) => {
    const targetTransition = isSpringMode ? 1 : 0;
    transitionRef.current = THREE.MathUtils.lerp(transitionRef.current, targetTransition, 0.015);

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
  });

  return (
    <mesh ref={meshRef} renderOrder={-1000}>
      <planeGeometry args={[2, 2]} />
      <primitive object={shaderMaterial} attach="material" />
    </mesh>
  );
}
