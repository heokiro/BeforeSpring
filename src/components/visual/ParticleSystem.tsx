import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioStore } from '../../stores/audioStore';
import { particleSettings } from '../ui/ControlPanel';

const MAX_PARTICLE_COUNT = 10000;

// 카메라/화면 설정 (App.tsx의 Canvas와 일치)
const CAMERA_Z = 8;
const FOV_RAD = 60 * Math.PI / 180;
const GROUND_UV = 0.01; // 배경 땅 경계 (BackgroundColor.tsx의 groundLine과 일치)

// 파티클별 회전값 (벚꽃잎 회전용)
const rotations = new Float32Array(MAX_PARTICLE_COUNT);
const rotationSpeeds = new Float32Array(MAX_PARTICLE_COUNT);
for (let i = 0; i < MAX_PARTICLE_COUNT; i++) {
  rotations[i] = Math.random() * Math.PI * 2;
  rotationSpeeds[i] = (Math.random() - 0.5) * 0.05;
}

export function ParticleSystem() {
  const pointsRef = useRef<THREE.Points>(null);
  const { bass, energy, isBeat, isSpringMode, isPlaying } = useAudioStore();
  const transitionRef = useRef(0);
  const beatPumpRef = useRef(0); // 비트 펌프 값
  const settledCountRef = useRef(0);
  const hasStartedRef = useRef(false); // 음악 시작 여부 추적

  // 파티클 데이터 - 초기 위치를 화면 위쪽에 배치
  const particleData = useMemo(() => {
    const positions = new Float32Array(MAX_PARTICLE_COUNT * 3);
    const velocities = new Float32Array(MAX_PARTICLE_COUNT * 3);
    const sizes = new Float32Array(MAX_PARTICLE_COUNT);
    const offsets = new Float32Array(MAX_PARTICLE_COUNT);
    const settled = new Float32Array(MAX_PARTICLE_COUNT); // 0 = 떨어지는 중, 1 = 정착

    for (let i = 0; i < MAX_PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      // 초기 위치: 화면 위쪽 (음악 시작 전까지 보이지 않음)
      positions[i * 3 + 1] = 10 + Math.random() * 15;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

      velocities[i * 3] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 1] = 0.008 + Math.random() * 0.015;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;

      sizes[i] = 0.04 + Math.random() * 0.06;
      offsets[i] = Math.random() * Math.PI * 2;
      settled[i] = 0;
    }

    return { positions, velocities, sizes, offsets, settled };
  }, []);

  // Geometry 생성
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(particleData.positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(particleData.sizes, 1));
    geo.setAttribute('aOffset', new THREE.BufferAttribute(particleData.offsets, 1));
    geo.setAttribute('aSettled', new THREE.BufferAttribute(particleData.settled, 1));
    geo.setAttribute('aRotation', new THREE.BufferAttribute(rotations, 1));
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
        attribute float aSettled;
        attribute float aRotation;

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
        varying float vRotation;
        varying float vOffset;

        void main() {
          vec3 pos = position;

          // 정착하지 않은 파티클만 흔들림 효과 적용
          float moveFactor = 1.0 - aSettled;

          // 부드러운 흔들림
          float sway = sin(uTime * 0.4 + aOffset) * 0.5 * uSwayAmount * moveFactor;
          float drift = cos(uTime * 0.25 + aOffset * 1.5) * 0.4 * uSwayAmount * moveFactor;

          // 리듬에 반응하는 움직임
          float rhythmX = sin(uTime * 1.5 + aOffset) * uBass * uRhythmStrength * moveFactor;
          float rhythmZ = cos(uTime * 1.5 + aOffset) * uBass * uRhythmStrength * 0.7 * moveFactor;

          pos.x += sway + rhythmX;
          pos.z += drift + rhythmZ;

          // 에너지에 따른 움직임
          float floatEffect = uEnergy * sin(aOffset + uTime * 0.6) * 0.5 * uRhythmStrength * moveFactor;
          pos.y += floatEffect;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

          // 크기 계산 (비트 펌프 효과 추가)
          float energySize = 1.0 + uEnergy * 0.4 * moveFactor;
          float springBonus = uTransition * 0.3; // 벚꽃잎이 좀 더 크게

          // 파티클별로 다른 비트 펌프 강도 (약 40%만 강하게 반응)
          float beatResponse = smoothstep(0.3, 0.7, fract(aOffset * 3.14159));
          float beatSize = 1.0 + uBeatPump * uBeatPumpSize * beatResponse * moveFactor;

          gl_PointSize = aSize * uSizeMultiplier * energySize * beatSize * (1.0 + springBonus) * (350.0 / -mvPosition.z);

          gl_Position = projectionMatrix * mvPosition;

          vAlpha = smoothstep(-8.0, 6.0, position.y) * 0.9;
          vTransition = uTransition;
          vBeatPump = uBeatPump * beatResponse * moveFactor;
          // 회전 애니메이션 (떨어지면서 회전)
          vRotation = aRotation + uTime * (0.5 + aOffset * 0.5) * moveFactor;
          vOffset = aOffset;
        }
      `,
      fragmentShader: `
        uniform vec3 uColorSnow;
        uniform vec3 uColorSakura;

        varying float vAlpha;
        varying float vTransition;
        varying float vBeatPump;
        varying float vRotation;
        varying float vOffset;

        // 2D 회전 함수
        vec2 rotate2D(vec2 uv, float angle) {
          float c = cos(angle);
          float s = sin(angle);
          return vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
        }

        // 눈송이 모양 - 부드럽고 자연스러운 형태
        float snowflakeShape(vec2 uv, float variation) {
          float dist = length(uv);

          // 기본: 부드러운 원형 글로우 (실제 눈송이의 기본)
          float softCircle = exp(-dist * dist * 12.0);

          // 약간의 결정 구조 (일부 파티클에만)
          float angle = atan(uv.y, uv.x);
          float crystal = 0.0;

          if (variation > 0.6) {
            // 6각형 결정 구조 (약하게)
            float hex = abs(cos(angle * 3.0));
            crystal = hex * exp(-dist * 8.0) * 0.3;
          }

          // 중심부 밝은 코어
          float core = exp(-dist * dist * 40.0);

          // 가장자리 부드러운 페이드
          float fade = 1.0 - smoothstep(0.3, 0.5, dist);

          return (softCircle * 0.7 + core * 0.5 + crystal) * fade;
        }

        // 벚꽃 꽃잎 모양 - 단일 꽃잎이 회전하며 떨어지는 형태
        float sakuraPetalShape(vec2 uv, float rotation) {
          // 회전 적용
          vec2 rotatedUV = rotate2D(uv, rotation);

          // 꽃잎 형태: 타원형 + 한쪽 끝이 뾰족한 형태
          float x = rotatedUV.x;
          float y = rotatedUV.y;

          // 타원 기반 (세로로 긴 형태)
          float ellipse = (x * x) / 0.06 + (y * y) / 0.15;

          // 위쪽 끝을 뾰족하게 (꽃잎 끝)
          float taper = 1.0 + y * 1.5;
          ellipse *= taper;

          // 아래쪽 끝 갈라짐 (꽃잎 특유의 하트 모양 끝)
          float notch = 0.0;
          if (y < -0.1) {
            notch = exp(-x * x * 200.0) * smoothstep(-0.1, -0.25, y) * 0.5;
          }

          // 기본 꽃잎 모양
          float petal = 1.0 - smoothstep(0.8, 1.2, ellipse);
          petal = max(0.0, petal - notch);

          // 부드러운 가장자리
          petal *= smoothstep(1.3, 0.7, ellipse);

          // 중심 맥 (잎맥 표현)
          float vein = exp(-x * x * 150.0) * smoothstep(0.35, 0.0, abs(y)) * 0.2;

          return petal + vein;
        }

        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);

          // 눈송이와 벚꽃잎 모양 계산
          float snowShape = snowflakeShape(center, vOffset);
          float sakuraShapeVal = sakuraPetalShape(center, vRotation);

          // 전환에 따라 모양 블렌딩
          float shape = mix(snowShape, sakuraShapeVal, vTransition);
          float alpha = shape * vAlpha;

          // 눈 색상: 순백색 + 약간의 푸른 빛
          vec3 snowColor = vec3(0.98, 0.99, 1.0);

          // 벚꽃 색상: 연한 분홍색 (가장자리가 더 진함)
          float dist = length(center);
          vec3 sakuraCore = vec3(1.0, 0.92, 0.94);  // 연한 분홍
          vec3 sakuraEdge = vec3(1.0, 0.7, 0.8);   // 진한 분홍
          vec3 sakuraColor = mix(sakuraCore, sakuraEdge, smoothstep(0.1, 0.4, dist));

          // 색상 전환
          vec3 color = mix(snowColor, sakuraColor, vTransition);

          // 눈: 중심부 밝은 글로우
          if (vTransition < 0.5) {
            float snowGlow = exp(-dist * dist * 20.0);
            color += snowGlow * 0.3 * (1.0 - vTransition * 2.0);
          }

          // 비트 펌프 시 밝기 증가
          color += vBeatPump * 0.2;

          // 알파가 너무 낮으면 버림
          if (alpha < 0.02) discard;

          gl_FragColor = vec4(color, alpha * 0.95);
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

    // 음악이 재생되지 않으면 파티클 애니메이션 중지
    if (!isPlaying) {
      // 음악이 멈추면 시작 상태 리셋 (다음 재생 시 다시 위에서 시작)
      if (hasStartedRef.current) {
        hasStartedRef.current = false;
        // 파티클을 다시 위로 리셋
        const posAttr = pointsRef.current.geometry.attributes.position;
        const positions = posAttr.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          positions[i * 3 + 1] = 10 + Math.random() * 15;
          particleData.settled[i] = 0;
        }
        posAttr.needsUpdate = true;
        settledCountRef.current = 0;
      }
      return;
    }

    // 음악 시작됨
    hasStartedRef.current = true;

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
    const { velocities, settled } = particleData;

    const isWinter = transitionRef.current < 0.5;
    const direction = isWinter ? -1 : 1;

    // 봄이 되면 쌓인 눈 리셋
    if (!isWinter && settledCountRef.current > 0) {
      settledCountRef.current = 0;
      for (let i = 0; i < particleCount; i++) {
        settled[i] = 0;
      }
    }

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // 정착한 파티클 처리 - 완전히 멈춤
      if (settled[i] > 0 && isWinter) {
        continue;
      }

      // 봄이면 정착 해제하고 위로 날아오름
      if (settled[i] > 0 && !isWinter) {
        settled[i] = 0;
      }

      // 속도 (비트 펌프 시 약간 느려짐 - 확대되는 순간 정지 느낌)
      const beatSlowdown = 1.0 - beatPumpRef.current * 0.3;
      const rhythmBoost = 1 + bass * rhythmStrength * 0.5;
      const baseSpeed = velocities[i3 + 1] * speed * rhythmBoost * beatSlowdown;

      positions[i3 + 1] += baseSpeed * direction;

      // 좌우 흔들림
      const swaySpeed = velocities[i3] * swayAmount;
      positions[i3] += swaySpeed + (isBeat ? (Math.random() - 0.5) * 0.05 * rhythmStrength : 0);
      positions[i3 + 2] += velocities[i3 + 2] * swayAmount;

      // 경계 처리
      if (direction < 0) {
        // 겨울: 아래로 떨어짐
        // 파티클의 z에 따른 화면상 바닥 위치 계산 (원근법 적용)
        const distToCamera = CAMERA_Z - positions[i3 + 2];
        const screenHalfHeight = Math.tan(FOV_RAD / 2) * distToCamera;

        // 파티클 y를 화면 UV로 변환 (0 = 하단, 1 = 상단)
        const uvY = (positions[i3 + 1] + screenHalfHeight) / (2 * screenHalfHeight);

        // 땅 경계(UV 0.15) 아래면 정착
        if (uvY < GROUND_UV) {
          // 화면 안쪽에 있으면 정착
          if (Math.abs(positions[i3]) < 8 && Math.abs(positions[i3 + 2]) < 4) {
            settled[i] = 1;
            // 정확히 땅 경계 위치로 이동
            const groundY = GROUND_UV * (2 * screenHalfHeight) - screenHalfHeight;
            positions[i3 + 1] = groundY + Math.random() * 0.1;
            settledCountRef.current++;
          } else {
            // 화면 밖이면 리스폰
            positions[i3 + 1] = 10 + Math.random() * 5;
            positions[i3] = (Math.random() - 0.5) * 20;
            positions[i3 + 2] = (Math.random() - 0.5) * 10;
          }
        }
      } else {
        // 봄: 위로 올라감
        if (positions[i3 + 1] > 10) {
          positions[i3 + 1] = -8 - Math.random() * 5;
          positions[i3] = (Math.random() - 0.5) * 20;
          positions[i3 + 2] = (Math.random() - 0.5) * 10;
        }
      }
    }

    posAttr.needsUpdate = true;

    // settled attribute 업데이트
    const settledAttr = pointsRef.current.geometry.attributes.aSettled;
    if (settledAttr) {
      settledAttr.needsUpdate = true;
    }

    // 벚꽃잎 회전 업데이트
    const rotAttr = pointsRef.current.geometry.attributes.aRotation;
    if (rotAttr && transitionRef.current > 0.1) {
      const rotArray = rotAttr.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        if (particleData.settled[i] === 0) {
          rotArray[i] += rotationSpeeds[i];
        }
      }
      rotAttr.needsUpdate = true;
    }

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
