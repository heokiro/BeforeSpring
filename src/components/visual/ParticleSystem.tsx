import { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioStore } from '../../stores/audioStore';
import { particleSettings, rainSettings } from '../ui/ControlPanel';
import sakuraTexture1 from '../../assets/sprite/벚꽃.png';
import sakuraTexture2 from '../../assets/sprite/벚꽃2.png';
import snowTexture from '../../assets/sprite/snow.png';

const MAX_PARTICLE_COUNT = 10000;
const MAX_SETTLED_COUNT = 3000; // 정착 파티클 최대 개수 (이 이상이면 오래된 것부터 리스폰)

// 카메라/화면 설정 (App.tsx의 Canvas와 일치)
const CAMERA_Z = 8;
const FOV_RAD = 60 * Math.PI / 180;
const GROUND_UV = 0.01; // 배경 땅 경계 (BackgroundColor.tsx의 groundLine과 일치)

// 파티클별 회전값 (벚꽃잎 회전용)
const rotations = new Float32Array(MAX_PARTICLE_COUNT);
const rotationSpeeds = new Float32Array(MAX_PARTICLE_COUNT);
// 파티클별 텍스처 인덱스 (0 또는 1)
const textureIndices = new Float32Array(MAX_PARTICLE_COUNT);
for (let i = 0; i < MAX_PARTICLE_COUNT; i++) {
  rotations[i] = Math.random() * Math.PI * 2;
  rotationSpeeds[i] = (Math.random() - 0.5) * 0.05;
  textureIndices[i] = Math.random() > 0.5 ? 1.0 : 0.0; // 랜덤하게 텍스처 선택
}

export function ParticleSystem() {
  const pointsRef = useRef<THREE.Points>(null);
  const { bass, energy, isBeat, isSpringMode, isPlaying, currentStep } = useAudioStore();
  const transitionRef = useRef(0);
  const rainTransitionRef = useRef(0); // 비 모드 전환값 (0 = 눈/벚꽃, 1 = 비)
  const beatPumpRef = useRef(0); // 비트 펌프 값
  const windBoostRef = useRef(0); // 봄 모드 산들바람 효과
  const settledCountRef = useRef(0);
  const settledQueueRef = useRef<number[]>([]); // 정착된 파티클 인덱스 큐 (FIFO)
  const hasStartedRef = useRef(false); // 음악 시작 여부 추적
  const prevSpringModeRef = useRef(false); // 이전 봄 모드 상태 (전환 감지용)
  const updraftBoostRef = useRef(0); // 상승기류 효과 (겨울→봄 전환 시 한 번)
  const springStartTimeRef = useRef<number | null>(null); // 봄 모드 시작 시간
  const updraftDelayPassed = useRef(false); // 상승기류 딜레이 경과 여부
  const UPDRAFT_DELAY = 5000; // 상승기류 딜레이 (5초)

  // 벚꽃 텍스처 로드 (2개)
  const sakuraTex1 = useLoader(THREE.TextureLoader, sakuraTexture1);
  const sakuraTex2 = useLoader(THREE.TextureLoader, sakuraTexture2);
  // 눈 텍스처 로드
  const snowTex = useLoader(THREE.TextureLoader, snowTexture);

  // 텍스처 설정 (클램프로 경계 처리)
  sakuraTex1.wrapS = THREE.ClampToEdgeWrapping;
  sakuraTex1.wrapT = THREE.ClampToEdgeWrapping;
  sakuraTex2.wrapS = THREE.ClampToEdgeWrapping;
  sakuraTex2.wrapT = THREE.ClampToEdgeWrapping;
  snowTex.wrapS = THREE.ClampToEdgeWrapping;
  snowTex.wrapT = THREE.ClampToEdgeWrapping;

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
    geo.setAttribute('aTexIndex', new THREE.BufferAttribute(textureIndices, 1));
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
        uRainMode: { value: 0 },  // 비 모드 (0 = 눈/벚꽃, 1 = 비)
        uRainStretch: { value: 0.25 },  // 비 세로 길이
        uRainSqueeze: { value: 1.5 },   // 비 가로 좁힘
        uRainSwayReduction: { value: 0.8 }, // 비 흔들림 감소
        uRainSize: { value: 0.8 },      // 비 크기 배수
        uSizeMultiplier: { value: 1.5 },
        uRhythmStrength: { value: 1.5 },
        uSwayAmount: { value: 1.0 },
        uSpringScaleGrow: { value: 0 },  // 봄 모드: 위로 갈수록 커지는 정도
        uRotationBoost: { value: 0 },  // 봄 모드: 회전 속도 가속
        uColorSnow: { value: new THREE.Color(1.0, 1.0, 1.0) },
        uColorSakura: { value: new THREE.Color(1.0, 0.4, 0.6) },
        uColorRain: { value: new THREE.Color(0.7, 0.85, 1.0) },  // 비 색상 (연한 파랑)
        uSakuraTexture1: { value: sakuraTex1 },  // 벚꽃 텍스처 1
        uSakuraTexture2: { value: sakuraTex2 },  // 벚꽃 텍스처 2
        uSnowTexture: { value: snowTex },  // 눈 텍스처
      },
      vertexShader: `
        attribute float aSize;
        attribute float aOffset;
        attribute float aSettled;
        attribute float aRotation;
        attribute float aTexIndex;

        uniform float uTime;
        uniform float uEnergy;
        uniform float uBass;
        uniform float uBeatPump;
        uniform float uBeatPumpSize;
        uniform float uTransition;
        uniform float uRainMode;
        uniform float uRainStretch;
        uniform float uRainSqueeze;
        uniform float uRainSwayReduction;
        uniform float uRainSize;
        uniform float uSizeMultiplier;
        uniform float uRhythmStrength;
        uniform float uSwayAmount;
        uniform float uSpringScaleGrow;
        uniform float uRotationBoost;

        varying float vAlpha;
        varying float vTransition;
        varying float vRainMode;
        varying float vBeatPump;
        varying float vRotation;
        varying float vOffset;
        varying float vTexIndex;

        void main() {
          vec3 pos = position;

          // 정착하지 않은 파티클만 흔들림 효과 적용
          float moveFactor = 1.0 - aSettled;

          // 비 모드에서는 흔들림 감소
          float rainSwayReduce = 1.0 - uRainMode * uRainSwayReduction;

          // 부드러운 흔들림
          float sway = sin(uTime * 0.4 + aOffset) * 0.5 * uSwayAmount * moveFactor * rainSwayReduce;
          float drift = cos(uTime * 0.25 + aOffset * 1.5) * 0.4 * uSwayAmount * moveFactor * rainSwayReduce;

          // 리듬에 반응하는 움직임
          float rhythmX = sin(uTime * 1.5 + aOffset) * uBass * uRhythmStrength * moveFactor * rainSwayReduce;
          float rhythmZ = cos(uTime * 1.5 + aOffset) * uBass * uRhythmStrength * 0.7 * moveFactor * rainSwayReduce;

          pos.x += sway + rhythmX;
          pos.z += drift + rhythmZ;

          // 에너지에 따른 움직임 (비 모드에서는 약함)
          float floatEffect = uEnergy * sin(aOffset + uTime * 0.6) * 0.5 * uRhythmStrength * moveFactor * rainSwayReduce;
          pos.y += floatEffect;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

          // 크기 계산 (비트 펌프 효과 추가)
          float energySize = 1.0 + uEnergy * 0.4 * moveFactor;
          float springBonus = uTransition * 0.3; // 벚꽃잎이 좀 더 크게

          // 비 모드: 파티클 크기 조절 (빗방울)
          float rainSizeAdjust = 1.0 - uRainMode * (1.0 - uRainSize);

          // 파티클별로 다른 비트 펌프 강도 (약 40%만 강하게 반응)
          float beatResponse = smoothstep(0.3, 0.7, fract(aOffset * 3.14159));
          float beatSize = 1.0 + uBeatPump * uBeatPumpSize * beatResponse * moveFactor;

          // 봄 모드: 위로 갈수록 커지는 효과 (Y 범위: -8 ~ 10)
          float heightFactor = smoothstep(-8.0, 10.0, position.y); // 0 ~ 1
          float springGrowSize = 1.0 + heightFactor * uSpringScaleGrow * uTransition;

          gl_PointSize = aSize * uSizeMultiplier * energySize * beatSize * springGrowSize * rainSizeAdjust * (1.0 + springBonus) * (350.0 / -mvPosition.z);

          gl_Position = projectionMatrix * mvPosition;

          vAlpha = smoothstep(-8.0, 6.0, position.y) * 0.9;
          vTransition = uTransition;
          vRainMode = uRainMode;
          vBeatPump = uBeatPump * beatResponse * moveFactor;
          // 회전 애니메이션 (떨어지면서 회전 + 봄 모드: 에너지에 따라 가속)
          // 비 모드에서는 회전 없음
          float rotationSpeed = 0.5 + aOffset * 0.5;
          float springRotationBoost = uRotationBoost * uTransition * 0.2; // 봄 모드에서만 회전 가속
          vRotation = aRotation + uTime * (rotationSpeed + springRotationBoost) * moveFactor * (1.0 - uRainMode);
          vOffset = aOffset;
          vTexIndex = aTexIndex;
        }
      `,
      fragmentShader: `
        uniform vec3 uColorSnow;
        uniform vec3 uColorSakura;
        uniform vec3 uColorRain;
        uniform sampler2D uSakuraTexture1;
        uniform sampler2D uSakuraTexture2;
        uniform sampler2D uSnowTexture;
        uniform float uRainStretch;
        uniform float uRainSqueeze;

        varying float vAlpha;
        varying float vTransition;
        varying float vRainMode;
        varying float vBeatPump;
        varying float vRotation;
        varying float vOffset;
        varying float vTexIndex;

        // 2D 회전 함수
        vec2 rotate2D(vec2 uv, float angle) {
          float c = cos(angle);
          float s = sin(angle);
          return vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
        }

        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);

          // 비 모드: 세로로 긴 타원형 빗방울 효과
          vec2 rainCenter = center;
          // 세로로 늘린 타원형 (더 날씬한 빗방울)
          rainCenter.y *= uRainStretch; // 세로 압축 = 세로로 더 긴 타원
          rainCenter.x *= uRainSqueeze; // 가로 확대 = 더 좁게
          float rainDist = length(rainCenter);
          // 부드러운 원형 그라데이션
          float dropShape = smoothstep(0.2, 0.05, rainDist);
          // 아래쪽이 약간 흐려지는 효과
          float motionBlur = 1.0 - center.y * 0.4;

          float rainAlpha = dropShape * motionBlur * vAlpha;

          // 벚꽃용 회전 UV (봄 모드에서만 회전)
          vec2 rotatedUV = rotate2D(center, vRotation);
          vec2 sakuraTexCoord = rotatedUV + vec2(0.5);

          // 눈용 UV (회전 없음)
          vec2 snowTexCoord = gl_PointCoord;

          // UV가 0~1 범위 밖이면 투명 처리
          float sakuraInBounds = step(0.0, sakuraTexCoord.x) * step(sakuraTexCoord.x, 1.0) *
                          step(0.0, sakuraTexCoord.y) * step(sakuraTexCoord.y, 1.0);

          // 눈 텍스처 샘플링 (회전 없음)
          vec4 snowTexColor = texture2D(uSnowTexture, snowTexCoord);

          // 텍스처 인덱스에 따라 다른 벚꽃 텍스처 사용 (회전 적용)
          vec4 sakuraTexColor;
          if (vTexIndex < 0.5) {
            sakuraTexColor = texture2D(uSakuraTexture1, sakuraTexCoord) * sakuraInBounds;
          } else {
            sakuraTexColor = texture2D(uSakuraTexture2, sakuraTexCoord) * sakuraInBounds;
          }

          // 눈: 텍스처 색상 사용
          vec3 snowColor = snowTexColor.rgb;
          float snowAlpha = snowTexColor.a * vAlpha;

          // 비: 연한 파란색 그라데이션
          vec3 rainColor = uColorRain;

          // 벚꽃: 텍스처 색상 그대로 사용
          vec3 sakuraColor = sakuraTexColor.rgb;
          float sakuraAlpha = sakuraTexColor.a * vAlpha;

          // 색상 및 알파 전환
          vec3 color;
          float alpha;

          // 비 모드 체크 (vRainMode > 0)
          if (vRainMode > 0.01) {
            // 비 모드
            if (vTransition > 0.01) {
              // 비 → 벚꽃 전환 중
              color = mix(rainColor, sakuraColor, vTransition);
              alpha = mix(rainAlpha, sakuraAlpha, vTransition);
            } else {
              // 순수 비 모드
              color = rainColor;
              alpha = rainAlpha * vRainMode + snowAlpha * (1.0 - vRainMode);
              color = mix(snowColor, rainColor, vRainMode);
            }
          } else if (vTransition > 0.99) {
            // 완전 봄 모드: 벚꽃 텍스처만 표시
            color = sakuraColor;
            alpha = sakuraAlpha;
          } else if (vTransition < 0.01) {
            // 완전 겨울 모드: 눈 텍스처만 표시
            color = snowColor;
            alpha = snowAlpha;
          } else {
            // 눈 → 벚꽃 전환 중
            color = mix(snowColor, sakuraColor, vTransition);
            alpha = mix(snowAlpha, sakuraAlpha, vTransition);
          }

          // 비트 펌프 시 밝기 증가 (눈에만 적용, 벚꽃/비는 제외)
          color += vBeatPump * 0.2 * (1.0 - vTransition) * (1.0 - vRainMode);

          // 알파가 너무 낮으면 버림
          if (alpha < 0.02) discard;

          gl_FragColor = vec4(color, alpha * 0.95);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [sakuraTex1, sakuraTex2, snowTex]);

  useFrame((state) => {
    if (!pointsRef.current) return;

    const { size, speed, rhythmStrength, swayAmount, beatPumpSize, beatPumpSpeed, particleCount, springScaleGrow } = particleSettings;

    // 디버그: 1% 확률로 오디오 데이터 출력
    if (Math.random() < 0.01) {
      console.log('ParticleSystem 수신:', { bass: bass.toFixed(3), energy: energy.toFixed(3), isBeat, isPlaying });
    }

    // 음악이 시작되면 플래그 설정 (일시정지해도 리셋하지 않음)
    if (isPlaying && !hasStartedRef.current) {
      hasStartedRef.current = true;
    }

    // 렌더링할 파티클 수 설정
    pointsRef.current.geometry.setDrawRange(0, particleCount);

    // 비 모드 전환 (step3 = 비)
    const isRainMode = currentStep === 3;
    const targetRainTransition = isRainMode ? 1 : 0;
    rainTransitionRef.current = THREE.MathUtils.lerp(rainTransitionRef.current, targetRainTransition, 0.03);

    // 모드 전환 (step4 = 봄/벚꽃)
    const targetTransition = isSpringMode ? 1 : 0;
    transitionRef.current = THREE.MathUtils.lerp(transitionRef.current, targetTransition, 0.02);

    // 겨울→봄 전환 감지: 5초 후 상승기류 발동
    if (isSpringMode && !prevSpringModeRef.current) {
      springStartTimeRef.current = Date.now(); // 봄 시작 시간 기록
      updraftDelayPassed.current = false; // 딜레이 리셋
    }
    // 겨울로 돌아가면 리셋
    if (!isSpringMode && prevSpringModeRef.current) {
      springStartTimeRef.current = null;
      updraftDelayPassed.current = false;
    }
    prevSpringModeRef.current = isSpringMode;

    // 5초 후 상승기류 발동
    if (springStartTimeRef.current && !updraftDelayPassed.current) {
      const elapsed = Date.now() - springStartTimeRef.current;
      if (elapsed >= UPDRAFT_DELAY) {
        updraftDelayPassed.current = true;
        updraftBoostRef.current = 1.0; // 상승기류 시작
      }
    }

    // 상승기류 효과 감쇠
    updraftBoostRef.current = THREE.MathUtils.lerp(updraftBoostRef.current, 0, 0.015);

    // 비트 펌프 효과 (비트 감지 시 1로 점프, 그 후 부드럽게 감소)
    if (isBeat) {
      beatPumpRef.current = 1.0;
      // 봄 모드: 산들바람 효과 (개별 흔들림 가속)
      // 봄에서는 더 강한 비트에서만 반응 (bass > 0.5)
      if (transitionRef.current > 0.5 && bass > 0.6) {
        windBoostRef.current = 1.0;
      }
    } else {
      // 겨울 모드에서만 펌프 값 감소
      if (transitionRef.current < 0.5) {
        beatPumpRef.current = THREE.MathUtils.lerp(beatPumpRef.current, 0, beatPumpSpeed);
      }
    }

    // 봄 모드: 산들바람 효과 감쇠
    if (transitionRef.current > 0.5) {
      windBoostRef.current = THREE.MathUtils.lerp(windBoostRef.current, 0, 0.01);
    }

    const posAttr = pointsRef.current.geometry.attributes.position;
    const positions = posAttr.array as Float32Array;
    const { velocities, settled } = particleData;

    // 봄 모드지만 딜레이가 안 지났으면 여전히 아래로 떨어짐
    const isWinter = transitionRef.current < 0.5;
    const isFalling = isWinter || !updraftDelayPassed.current; // 딜레이 전까지는 낙하
    const direction = isFalling ? -1 : 1;

    // 봄이 되거나 비 모드가 되면 쌓인 눈 리셋 (눈 녹음)
    if ((!isWinter || rainTransitionRef.current > 0.3) && settledCountRef.current > 0) {
      settledCountRef.current = 0;
      settledQueueRef.current = [];
      for (let i = 0; i < particleCount; i++) {
        settled[i] = 0;
      }
    }

    // 정착 파티클이 한계를 초과하면 오래된 것부터 리스폰
    while (settledQueueRef.current.length > MAX_SETTLED_COUNT) {
      const oldIndex = settledQueueRef.current.shift()!;
      if (settled[oldIndex] > 0) {
        settled[oldIndex] = 0;
        // 위쪽에서 다시 떨어지도록 리스폰
        positions[oldIndex * 3] = (Math.random() - 0.5) * 20;
        positions[oldIndex * 3 + 1] = 10 + Math.random() * 5;
        positions[oldIndex * 3 + 2] = -6 + Math.random() * 5;
        settledCountRef.current--;
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
      // 봄 모드(상승 중): 산들바람으로 가속 (1.0 ~ 1.8배 속도)
      const windMultiplier = isFalling ? 1.0 : (1.0 + windBoostRef.current * 0.8);
      // 비 모드: 더 빠르고 균일하게 떨어짐
      // 비 모드에서는 속도 변동을 줄이고 기본 속도를 높임
      const rainFactor = rainTransitionRef.current;
      const normalizedSpeed = velocities[i3 + 1]; // 0.008 ~ 0.023 범위
      // 비 모드: 속도를 균일하게 만들고 rainSettings.speed 배수 적용
      const rainSpeedMultiplier = rainSettings.speed - 1; // 1 기준이므로 -1
      const rainBaseSpeed = rainFactor > 0.1
        ? (normalizedSpeed * (1 - rainFactor * 0.5) + 0.018 * rainFactor * 0.5) * (1 + rainFactor * rainSpeedMultiplier)
        : normalizedSpeed;
      const baseSpeed = rainBaseSpeed * speed * rhythmBoost * beatSlowdown * windMultiplier;

      // 상승기류 효과 (딜레이 후 발동)
      const updraftSpeed = updraftBoostRef.current * 0.15 * (0.5 + Math.random() * 0.5);

      positions[i3 + 1] += baseSpeed * direction + updraftSpeed;

      // 좌우 흔들림 (봄 상승 모드: 개별 흔들림 가속)
      const swayMultiplier = isFalling ? 1.0 : (1.0 + windBoostRef.current * 1.5);
      const swaySpeed = velocities[i3] * swayAmount * swayMultiplier;
      positions[i3] += swaySpeed + (isBeat ? (Math.random() - 0.5) * 0.05 * rhythmStrength : 0);
      positions[i3 + 2] += velocities[i3 + 2] * swayAmount * swayMultiplier;

      // 경계 처리
      if (isFalling) {
        // 낙하 모드 (겨울 또는 봄 딜레이 중): 아래로 떨어짐
        // Z가 카메라에 너무 가까우면 부드럽게 뒤로 밀어냄
        if (positions[i3 + 2] > -2) {
          positions[i3 + 2] += ((-3 - positions[i3 + 2]) * 0.02);
        }

        // 파티클의 z에 따른 화면상 바닥 위치 계산 (원근법 적용)
        const distToCamera = CAMERA_Z - positions[i3 + 2];
        const screenHalfHeight = Math.tan(FOV_RAD / 2) * distToCamera;

        // 파티클 y를 화면 UV로 변환 (0 = 하단, 1 = 상단)
        const uvY = (positions[i3 + 1] + screenHalfHeight) / (2 * screenHalfHeight);

        // 땅 경계(UV 0.15) 아래면 처리
        if (uvY < GROUND_UV) {
          // 겨울에만 정착 (비 모드나 봄 딜레이 중에는 정착하지 않고 리스폰)
          const canSettle = isWinter && rainTransitionRef.current < 0.3;
          if (canSettle && hasStartedRef.current && Math.abs(positions[i3]) < 8 && Math.abs(positions[i3 + 2]) < 4) {
            settled[i] = 1;
            // 정확히 땅 경계 위치로 이동
            const groundY = GROUND_UV * (2 * screenHalfHeight) - screenHalfHeight;
            positions[i3 + 1] = groundY + Math.random() * 0.1;
            settledCountRef.current++;
            settledQueueRef.current.push(i); // 큐에 추가
          } else {
            // 비 모드, 봄 딜레이 중, 음악 시작 전, 화면 밖이면 리스폰
            positions[i3 + 1] = 10 + Math.random() * 5;
            positions[i3] = (Math.random() - 0.5) * 20;
            // Z축을 카메라에서 멀게 (-6 ~ -1 범위로 제한)
            positions[i3 + 2] = -6 + Math.random() * 5;
          }
        }
      } else {
        // 봄: 위로 올라감
        // Z가 카메라에 너무 가까우면 부드럽게 뒤로 밀어냄
        if (positions[i3 + 2] > -2) {
          // Z > -2 이면 서서히 뒤로 이동 (lerp)
          positions[i3 + 2] += ((-3 - positions[i3 + 2]) * 0.02);
        }

        if (positions[i3 + 1] > 10) {
          positions[i3 + 1] = -8 - Math.random() * 5;
          positions[i3] = (Math.random() - 0.5) * 20;
          // 봄: Z축을 카메라에서 멀게 (-6 ~ -1 범위로 제한)
          positions[i3 + 2] = -6 + Math.random() * 5;
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
    shaderMaterial.uniforms.uRainMode.value = rainTransitionRef.current;
    shaderMaterial.uniforms.uRainStretch.value = rainSettings.stretch;
    shaderMaterial.uniforms.uRainSqueeze.value = rainSettings.squeeze;
    shaderMaterial.uniforms.uRainSwayReduction.value = rainSettings.swayReduction;
    shaderMaterial.uniforms.uRainSize.value = rainSettings.size;
    shaderMaterial.uniforms.uSizeMultiplier.value = size;
    shaderMaterial.uniforms.uRhythmStrength.value = rhythmStrength;
    shaderMaterial.uniforms.uSwayAmount.value = swayAmount;
    shaderMaterial.uniforms.uSpringScaleGrow.value = springScaleGrow;

    // 봄 모드: 회전 속도 가속 (에너지에 따라)
    shaderMaterial.uniforms.uRotationBoost.value = THREE.MathUtils.lerp(
      shaderMaterial.uniforms.uRotationBoost.value,
      energy * 1.5, // 에너지에 비례하여 회전 가속
      0.06
    );

    // 봄 모드에서는 Normal Blending 사용 (겹침 시 하얗게 되는 현상 방지)
    // 비 모드에서는 Additive Blending 유지
    if (transitionRef.current > 0.5 && rainTransitionRef.current < 0.3) {
      shaderMaterial.blending = THREE.NormalBlending;
    } else {
      shaderMaterial.blending = THREE.AdditiveBlending;
    }
  });

  return <points ref={pointsRef} geometry={geometry} material={shaderMaterial} />;
}
