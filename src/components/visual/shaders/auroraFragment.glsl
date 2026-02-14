// Aurora Raymarching Fragment Shader
// Converted from Godot to WebGL/Three.js

precision highp float;

// Godot 원본 파라미터
uniform float uTime;
uniform float uSpeed;
uniform vec4 uColor;
uniform float uEmissionStrength;
uniform sampler2D uNoise;
uniform float uOffset;
uniform float uSmoothness;
uniform float uDistort;
uniform float uScale;
uniform float uStep;
uniform float uBaseDensity;

// 오디오 반응
uniform float uEnergy;
uniform float uBass;
uniform float uIsBeat;

// 계절 전환
uniform float uTransition;

// 오브젝트 공간 카메라 위치 (JavaScript에서 계산)
uniform vec3 uCameraLocalPos;

varying vec3 vWorldPosition;
varying vec3 vLocalPosition;

// ============================================
// Godot 원본 함수들 (정확히 유지)
// ============================================

// 밝기 증폭 함수 (Godot 원본 그대로)
float amplify(float value) {
  float magic_number = 0.166504;
  float output_val = 0.0;
  value = clamp(value, 0.0, 1.0);
  value = pow(value, 2.0);
  output_val += pow(magic_number, 4.0) * value;
  value = pow(value, 2.0);
  output_val += magic_number * value;
  value = pow(value, 2.0);
  output_val += value;
  return output_val;
}

// 노이즈 보간 (Godot 원본)
float interpolate_noise(vec2 uv1, vec2 uv2) {
  return smoothstep(
    -uSmoothness, uSmoothness,
    texture2D(uNoise, uv1).r - texture2D(uNoise, uv2).r
  );
}

// 파동 패턴 생성 (Godot 원본)
float random_wave(vec2 uv) {
  vec2 uv_distort = texture2D(uNoise, uv).rr * uDistort * 0.5;
  vec2 uv1 = uv * uScale + vec2(uTime * uSpeed, uTime * uSpeed - uOffset) + uv_distort;
  vec2 uv2 = uv * uScale + vec2(uTime * uSpeed + 0.5, uTime * uSpeed + uOffset) + uv_distort;
  float interpolated_noise = interpolate_noise(uv1, uv2);
  float intensity = 0.2 + clamp((0.5 - abs(interpolated_noise - 0.5)) * 1.5, 0.0, 1.0);
  float wave = amplify(intensity);
  return wave;
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

// ============================================
// 레이마칭 (Godot 원본과 동일한 로직)
// ============================================

float ray_march(vec3 ray_origin, vec3 ray_direction, float start) {
  float density = 0.0;
  float dist = start + uStep;  // Godot 원본: dist = start + STEP

  // WebGL에서는 while(true) 대신 for 루프 사용
  const int MAX_STEPS = 400;

  for (int i = 0; i < MAX_STEPS; i++) {
    vec3 point = ray_origin + ray_direction * dist;

    // 박스 경계 체크 (-1 ~ 1) - Godot 원본과 동일
    if (point.x < -1.0 || point.x > 1.0 ||
        point.y < -1.0 || point.y > 1.0 ||
        point.z < -1.0 || point.z > 1.0) {
      break;
    }

    // UV 좌표 계산 (XZ 평면) - Godot 원본과 동일
    vec2 uv = vec2((point.x + 1.0) * 0.5, (point.z + 1.0) * 0.5);

    float wave_value = random_wave(uv);

    // 높이 팩터 (위로 갈수록 밀도 감소) - Godot 원본
    float height_factor = (1.0 - point.y) * 0.5;

    // 오디오 반응 추가
    float audio_boost = 1.0 + uBass * 0.5 + uEnergy * 0.3;

    float point_density = uBaseDensity * uStep * height_factor * wave_value * audio_boost;
    density += point_density;

    // Early termination (성능 최적화)
    if (density > 0.95) break;

    dist += uStep;
  }

  return density;
}

void main() {
  // 레이 원점과 방향 계산 (오브젝트 공간) - Godot 원본과 동일
  vec3 ray_origin = uCameraLocalPos;
  vec3 ray_direction = normalize(vLocalPosition - ray_origin);

  // 레이-박스 교차점 계산 - Godot의 length(camera_position - vertex_position)와 유사
  vec2 t = intersectBox(ray_origin, ray_direction);
  float start = max(t.x, 0.0);  // 박스 진입점 (카메라가 박스 내부면 0)

  // 레이마칭 실행
  float density = ray_march(ray_origin, ray_direction, start);

  // 비트 반응
  float beat_boost = 1.0 + uIsBeat * 0.3;
  density *= beat_boost;

  // 색상 계산 (Godot 원본: ALBEDO + EMISSION)
  vec3 color = uColor.rgb * density;
  vec3 emission = uColor.rgb * density * uEmissionStrength;

  // 최종 색상 (emission 포함)
  vec3 finalColor = color + emission;

  // 봄 전환 시 페이드 아웃
  float alpha = density * (1.0 - uTransition);

  // 부드러운 알파 감쇠
  alpha = clamp(alpha, 0.0, 1.0);

  gl_FragColor = vec4(finalColor, alpha);
}
