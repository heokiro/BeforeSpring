import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioStore } from '../../stores/audioStore';

export function SnowGround() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { isSpringMode, isPlaying } = useAudioStore();
  const snowHeightRef = useRef(0);
  const transitionRef = useRef(1); // 1 = 보임, 0 = 숨김

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSnowHeight: { value: 0 },
        uOpacity: { value: 1 },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uSnowHeight;

        varying vec2 vUv;
        varying float vHeight;

        // 심플 노이즈 함수
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);

          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));

          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          for (int i = 0; i < 4; i++) {
            value += amplitude * noise(p);
            p *= 2.0;
            amplitude *= 0.5;
          }
          return value;
        }

        void main() {
          vUv = uv;

          vec3 pos = position;

          // 노이즈로 자연스러운 눈 표면 만들기
          float noiseVal = fbm(pos.xz * 0.5 + uTime * 0.02);
          float snowSurface = noiseVal * 0.3 * uSnowHeight;

          // 가장자리는 낮게
          float edgeFade = 1.0 - smoothstep(0.3, 0.5, length(pos.xz / 10.0));
          snowSurface *= edgeFade;

          // 눈 높이 적용
          pos.y += snowSurface + uSnowHeight * 0.2;

          vHeight = snowSurface + uSnowHeight * 0.2;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        uniform float uSnowHeight;

        varying vec2 vUv;
        varying float vHeight;

        void main() {
          // 눈 색상 (약간의 파란 틴트)
          vec3 snowColor = vec3(0.95, 0.97, 1.0);

          // 높이에 따른 음영
          float shade = 0.8 + vHeight * 0.5;
          snowColor *= shade;

          // 가장자리 페이드
          float edgeFade = 1.0 - smoothstep(0.35, 0.5, length(vUv - 0.5));

          // 스파클 효과
          float sparkle = fract(sin(dot(vUv * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
          sparkle = smoothstep(0.97, 1.0, sparkle) * 0.3;
          snowColor += sparkle;

          float alpha = edgeFade * uOpacity * smoothstep(0.0, 0.3, uSnowHeight);

          gl_FragColor = vec4(snowColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;

    // 봄 모드면 눈 녹이기, 겨울이고 재생중이면 쌓기
    const targetHeight = isSpringMode ? 0 : (isPlaying ? 1.0 : snowHeightRef.current);
    const targetOpacity = isSpringMode ? 0 : 1;

    // 눈 쌓이는 속도 (재생 중일 때만)
    if (!isSpringMode && isPlaying && snowHeightRef.current < 1.0) {
      snowHeightRef.current += 0.001; // 천천히 쌓임
    }

    // 봄이 되면 녹기
    if (isSpringMode) {
      snowHeightRef.current = THREE.MathUtils.lerp(snowHeightRef.current, 0, 0.01);
    }

    // 전환 애니메이션
    transitionRef.current = THREE.MathUtils.lerp(
      transitionRef.current,
      targetOpacity,
      0.02
    );

    shaderMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    shaderMaterial.uniforms.uSnowHeight.value = snowHeightRef.current;
    shaderMaterial.uniforms.uOpacity.value = transitionRef.current;
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -7, 0]}
    >
      <planeGeometry args={[25, 15, 64, 64]} />
      <primitive object={shaderMaterial} attach="material" />
    </mesh>
  );
}
