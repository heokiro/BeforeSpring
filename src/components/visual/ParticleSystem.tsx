import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioStore } from '../../stores/audioStore';
import { particleSettings } from '../ui/ControlPanel';

const MAX_PARTICLE_COUNT = 10000;

export function ParticleSystem() {
  const pointsRef = useRef<THREE.Points>(null);
  const { bass, energy, isBeat, isSpringMode } = useAudioStore();
  const transitionRef = useRef(0);
  const beatPumpRef = useRef(0); // 비트 펌프 값

  // 파티클 데이터
  const particleData = useMemo(() => {
    const positions = new Float32Array(MAX_PARTICLE_COUNT * 3);
    const velocities = new Float32Array(MAX_PARTICLE_COUNT * 3);
    const sizes = new Float32Array(MAX_PARTICLE_COUNT);
    const offsets = new Float32Array(MAX_PARTICLE_COUNT);

    for (let i = 0; i < MAX_PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = Math.random() * 20 - 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

      velocities[i * 3] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 1] = 0.008 + Math.random() * 0.015;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;

      sizes[i] = 0.04 + Math.random() * 0.06;
      offsets[i] = Math.random() * Math.PI * 2;
    }

    return { positions, velocities, sizes, offsets };
  }, []);

  // Geometry 생성
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(particleData.positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(particleData.sizes, 1));
    geo.setAttribute('aOffset', new THREE.BufferAttribute(particleData.offsets, 1));
    return geo;
  }, [particleData]);

  // 셰이더 머티리얼
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uEnergy: { value: 0 },
        uBass: { value: 0 },
        uBeatPump: { value: 0 },  // 비트 펌프 효과
        uBeatPumpSize: { value: 0.8 },  // 비트 펌프 크기
        uTransition: { value: 0 },
        uSizeMultiplier: { value: 1.5 },
        uRhythmStrength: { value: 1.5 },
        uSwayAmount: { value: 1.0 },
        uColorSnow: { value: new THREE.Color(1.0, 1.0, 1.0) },
        uColorSakura: { value: new THREE.Color(1.0, 0.4, 0.6) },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aOffset;

        uniform float uTime;
        uniform float uEnergy;
        uniform float uBass;
        uniform float uBeatPump;
        uniform float uBeatPumpSize;
        uniform float uTransition;
        uniform float uSizeMultiplier;
        uniform float uRhythmStrength;
        uniform float uSwayAmount;

        varying float vAlpha;
        varying float vTransition;
        varying float vBeatPump;

        void main() {
          vec3 pos = position;

          // 부드러운 흔들림
          float sway = sin(uTime * 0.4 + aOffset) * 0.5 * uSwayAmount;
          float drift = cos(uTime * 0.25 + aOffset * 1.5) * 0.4 * uSwayAmount;

          // 리듬에 반응하는 움직임
          float rhythmX = sin(uTime * 1.5 + aOffset) * uBass * uRhythmStrength;
          float rhythmZ = cos(uTime * 1.5 + aOffset) * uBass * uRhythmStrength * 0.7;

          pos.x += sway + rhythmX;
          pos.z += drift + rhythmZ;

          // 에너지에 따른 움직임
          float floatEffect = uEnergy * sin(aOffset + uTime * 0.6) * 0.5 * uRhythmStrength;
          pos.y += floatEffect;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

          // 크기 계산 (비트 펌프 효과 추가)
          float energySize = 1.0 + uEnergy * 0.4;
          float springBonus = uTransition * 0.2;

          // 파티클별로 다른 비트 펌프 강도 (약 40%만 강하게 반응)
          float beatResponse = smoothstep(0.3, 0.7, fract(aOffset * 3.14159));
          float beatSize = 1.0 + uBeatPump * uBeatPumpSize * beatResponse;

          gl_PointSize = aSize * uSizeMultiplier * energySize * beatSize * (1.0 + springBonus) * (350.0 / -mvPosition.z);

          gl_Position = projectionMatrix * mvPosition;

          vAlpha = smoothstep(-8.0, 6.0, position.y) * 0.9;
          vTransition = uTransition;
          vBeatPump = uBeatPump * beatResponse;  // 파티클별로 다른 밝기 반응
        }
      `,
      fragmentShader: `
        uniform vec3 uColorSnow;
        uniform vec3 uColorSakura;

        varying float vAlpha;
        varying float vTransition;
        varying float vBeatPump;

        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);

          // 꽃잎 모양
          float petalShape = 1.0 - smoothstep(0.15, 0.5, dist);
          float alpha = petalShape * vAlpha;

          // 눈 → 벚꽃 색상 전환
          vec3 color = mix(uColorSnow, uColorSakura, vTransition);

          // 중심부 글로우
          float glow = 1.0 - dist * 1.5;
          glow = max(0.0, glow);
          vec3 glowColor = mix(vec3(1.0), vec3(1.0, 0.6, 0.7), vTransition);
          color += glow * 0.4 * glowColor;

          // 비트 펌프 시 밝기 증가
          color += vBeatPump * 0.3;

          // 봄 모드에서 색상 채도 증가
          color = mix(color, color * vec3(1.0, 0.85, 0.9), vTransition * 0.3);

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;

    const { size, speed, rhythmStrength, swayAmount, beatPumpSize, beatPumpSpeed, particleCount } = particleSettings;

    // 렌더링할 파티클 수 설정
    pointsRef.current.geometry.setDrawRange(0, particleCount);

    // 모드 전환
    const targetTransition = isSpringMode ? 1 : 0;
    transitionRef.current = THREE.MathUtils.lerp(transitionRef.current, targetTransition, 0.02);

    // 비트 펌프 효과 (비트 감지 시 1로 점프, 그 후 부드럽게 감소)
    if (isBeat) {
      beatPumpRef.current = 1.0;
    } else {
      beatPumpRef.current = THREE.MathUtils.lerp(beatPumpRef.current, 0, beatPumpSpeed);
    }

    const posAttr = pointsRef.current.geometry.attributes.position;
    const positions = posAttr.array as Float32Array;
    const { velocities } = particleData;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // 속도 (비트 펌프 시 약간 느려짐 - 확대되는 순간 정지 느낌)
      const beatSlowdown = 1.0 - beatPumpRef.current * 0.3;
      const rhythmBoost = 1 + bass * rhythmStrength * 0.5;
      const baseSpeed = velocities[i3 + 1] * speed * rhythmBoost * beatSlowdown;

      const direction = transitionRef.current < 0.5 ? -1 : 1;
      positions[i3 + 1] += baseSpeed * direction;

      // 좌우 흔들림
      const swaySpeed = velocities[i3] * swayAmount;
      positions[i3] += swaySpeed + (isBeat ? (Math.random() - 0.5) * 0.05 * rhythmStrength : 0);
      positions[i3 + 2] += velocities[i3 + 2] * swayAmount;

      // 경계 처리
      if (direction < 0) {
        if (positions[i3 + 1] < -8) {
          positions[i3 + 1] = 10 + Math.random() * 5;
          positions[i3] = (Math.random() - 0.5) * 20;
          positions[i3 + 2] = (Math.random() - 0.5) * 10;
        }
      } else {
        if (positions[i3 + 1] > 10) {
          positions[i3 + 1] = -8 - Math.random() * 5;
          positions[i3] = (Math.random() - 0.5) * 20;
          positions[i3 + 2] = (Math.random() - 0.5) * 10;
        }
      }
    }

    posAttr.needsUpdate = true;

    // 유니폼 업데이트
    shaderMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    shaderMaterial.uniforms.uEnergy.value = THREE.MathUtils.lerp(
      shaderMaterial.uniforms.uEnergy.value,
      energy,
      0.1
    );
    shaderMaterial.uniforms.uBass.value = THREE.MathUtils.lerp(
      shaderMaterial.uniforms.uBass.value,
      bass,
      0.12
    );
    shaderMaterial.uniforms.uBeatPump.value = beatPumpRef.current;
    shaderMaterial.uniforms.uBeatPumpSize.value = beatPumpSize;
    shaderMaterial.uniforms.uTransition.value = transitionRef.current;
    shaderMaterial.uniforms.uSizeMultiplier.value = size;
    shaderMaterial.uniforms.uRhythmStrength.value = rhythmStrength;
    shaderMaterial.uniforms.uSwayAmount.value = swayAmount;
  });

  return <points ref={pointsRef} geometry={geometry} material={shaderMaterial} />;
}
