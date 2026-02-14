// Volumetric Aurora Fragment Shader
// Based on Godot Volumetric Aurora - Curtain Effect
// Optimized with 50 steps raymarching (vs 400 steps original)

precision highp float;

// 기본 유니폼
uniform float uTime;
uniform vec4 uColor;
uniform float uEmissionStrength;

// 오디오 반응
uniform float uEnergy;
uniform float uBass;
uniform float uIsBeat;

// 계절 전환
uniform float uTransition;

// 오로라 파라미터
uniform float uAuroraIntensity;
uniform float uSpeed;

varying vec3 vLocalPosition;
varying vec3 vRayOrigin;
varying vec3 vRayDirection;

#define PI 3.14159265358979323846

// ============================================
// 회전 행렬
// ============================================
mat2 mm2(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, s, -s, c);
}

// 고정 회전 행렬 (최적화)
const mat2 m2 = mat2(0.95534, 0.29552, -0.29552, 0.95534);

// ============================================
// 삼각파 함수 - 커튼 효과의 핵심
// ============================================
float tri(float x) {
  return clamp(abs(fract(x) - 0.5), 0.01, 0.49);
}

vec2 tri2(vec2 p) {
  return vec2(tri(p.x) + tri(p.y), tri(p.y + tri(p.x)));
}

// ============================================
// 삼각파 노이즈 (5회 반복으로 효율적)
// ============================================
float triNoise2d(vec2 p, float spd) {
  float z = 1.8;
  float z2 = 2.5;
  float rz = 0.0;

  p *= mm2(p.x * 0.06);

  vec2 bp = p;
  for (float i = 0.0; i < 5.0; i++) {
    vec2 dg = tri2(bp * 1.85) * 0.75;
    dg *= mm2(uTime * spd);
    p -= dg / z2;
    bp *= 1.3;
    z2 *= 0.45;
    z *= 0.42;
    p *= 1.21 + (rz - 1.0) * 0.02;
    rz += tri(p.x + tri(p.y)) * z;
    p *= (m2 * -1.0);
  }
  return clamp(1.0 / pow(rz * 29.0, 1.3), 0.0, 0.55);
}

// ============================================
// 해시 함수 (디더링용)
// ============================================
float hash21(vec2 n) {
  return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

// ============================================
// 오로라 메인 함수 (50 스텝 레이마칭)
// ============================================
vec4 aurora(vec3 ro, vec3 rd) {
  vec4 col = vec4(0.0);
  vec4 avgCol = vec4(0.0);

  for (float i = 0.0; i < 50.0; i++) {
    // 디더링으로 밴딩 방지
    float of = 0.006 * hash21(gl_FragCoord.xy) * smoothstep(0.0, 15.0, i);

    // 레이 진행 거리 계산
    float pt = ((0.8 + pow(i, 1.4) * 0.002) - ro.y) / (rd.y * 2.0 + 0.4);
    pt -= of;

    vec3 bpos = ro + pt * rd;
    vec2 p = bpos.zx;

    float rzt = triNoise2d(p, uSpeed);

    vec4 col2 = vec4(0.0, 0.0, 0.0, rzt);

    // 색상 변주 (기존 uColor와 혼합하여 자연스러운 그라데이션)
    vec3 colorVariation = sin(1.0 - vec3(2.15, -0.5, 1.2) + i * 0.043) * 0.5 + 0.5;
    col2.rgb = mix(uColor.rgb, colorVariation, 0.4) * rzt;

    avgCol = mix(avgCol, col2, 0.5);

    // 지수 감쇠로 부드러운 페이드
    col += avgCol * exp2(-i * 0.065 - 2.5) * smoothstep(0.0, 5.0, i);
  }

  // 레이 방향에 따른 클리핑
  col *= clamp(rd.y * 15.0 + 0.4, 0.0, 1.0);

  return col * uAuroraIntensity;
}

// ============================================
// 레이-박스 교차점 계산 (AABB intersection)
// ============================================
vec2 intersectBox(vec3 ro, vec3 rd) {
  vec3 tMin = (-1.0 - ro) / rd;
  vec3 tMax = (1.0 - ro) / rd;
  vec3 t1 = min(tMin, tMax);
  vec3 t2 = max(tMin, tMax);
  float tNear = max(max(t1.x, t1.y), t1.z);
  float tFar = min(min(t2.x, t2.y), t2.z);
  return vec2(tNear, tFar);
}

void main() {
  vec3 ro = vRayOrigin;
  vec3 rd = normalize(vRayDirection);

  // 박스 교차 확인
  vec2 t = intersectBox(ro, rd);
  if (t.x > t.y) {
    gl_FragColor = vec4(0.0);
    return;
  }

  vec4 aur = vec4(0.0);

  // 위로 향하는 레이만 오로라 렌더링
  if (rd.y > 0.0) {
    aur = smoothstep(0.0, 1.5, aurora(ro, rd));
  }

  // 발광 효과
  vec3 emission = aur.rgb * uEmissionStrength;
  vec3 finalColor = aur.rgb + emission;

  // 봄 전환 페이드
  float alpha = aur.a * (1.0 - uTransition);

  gl_FragColor = vec4(finalColor, clamp(alpha, 0.0, 1.0));
}
