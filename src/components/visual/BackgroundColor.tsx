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
  const { isSpringMode } = useAudioStore();
  const meshRef = useRef<THREE.Mesh>(null);

  // 현재 색상 상태
  const currentSkyRef = useRef(WINTER_SKY.clone());
  const currentGroundRef = useRef(WINTER_GROUND.clone());
  const transitionRef = useRef(0);

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
        varying vec2 vUv;

        // Simplex 2D Noise (미묘한 배경 질감용)
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

        void main() {
          // 기본 배경색 계산
          float groundLine = 0.05;
          float blendZone = 0.05;

          vec3 winterSky = uColorSky;
          float groundMix = smoothstep(groundLine + blendZone, groundLine - blendZone, vUv.y);
          vec3 winterColor = mix(winterSky, uColorGround, groundMix);

          vec3 springColor = mix(uColorGround, uColorSky, vUv.y);
          vec3 baseColor = mix(winterColor, springColor, uTransition);

          // 노이즈 패턴 (움직이는 배경 질감)
          float noiseScale = 2.0;
          float noiseSpeed = 0.08;
          float noise1 = snoise(vUv * noiseScale + vec2(uTime * noiseSpeed, 0.0));
          float noise2 = snoise(vUv * noiseScale * 1.5 + vec2(0.0, uTime * noiseSpeed * 0.7));
          float combinedNoise = (noise1 + noise2) * 0.5;

          // 노이즈로 미묘한 색상 변화
          vec3 noiseColor = baseColor + combinedNoise * 0.04;

          // 전환 시 부드러운 효과
          float transitionPeak = sin(uTransition * 3.14159);
          vec3 transitionGlow = vec3(1.0, 0.97, 0.98) * transitionPeak * 0.04;

          vec3 color = noiseColor + transitionGlow;

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
  });

  return (
    <mesh ref={meshRef} renderOrder={-1000}>
      <planeGeometry args={[2, 2]} />
      <primitive object={shaderMaterial} attach="material" />
    </mesh>
  );
}
