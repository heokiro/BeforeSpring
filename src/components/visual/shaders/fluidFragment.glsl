varying vec2 vUv;
varying float vElevation;

uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uEnergy;
uniform float uIsBeat;

void main() {
  // 기본 색상: 부드러운 흰색
  vec3 white = vec3(0.98, 0.98, 1.0);

  // 벚꽃 분홍색 그라데이션 (더 파스텔톤)
  vec3 softPink = vec3(1.0, 0.92, 0.94);     // 아주 연한 분홍
  vec3 blushPink = vec3(1.0, 0.85, 0.88);    // 블러쉬
  vec3 sakuraPink = vec3(1.0, 0.78, 0.83);   // 벚꽃색

  // 에너지에 따른 부드러운 색상 전환
  float colorMix = smoothstep(0.0, 0.8, uEnergy);

  // 흰색에서 분홍색으로 부드러운 그라데이션
  vec3 baseColor = mix(white, softPink, colorMix * 0.6);
  baseColor = mix(baseColor, blushPink, colorMix * colorMix * 0.7);

  // 높이에 따른 미묘한 색상 변화
  float heightFactor = smoothstep(-0.3, 0.5, vElevation);
  baseColor = mix(baseColor, sakuraPink, heightFactor * uEnergy * 0.5);

  // 비트 감지 시 부드러운 밝기 증가
  float brightness = 1.0 + uIsBeat * 0.15;
  baseColor *= brightness;

  // 부드러운 빛 반짝임 (고주파 대신 부드러운 글로우)
  float glow = sin(vUv.x * 3.0 + uTime * 0.5) * sin(vUv.y * 3.0 + uTime * 0.3);
  glow = glow * 0.5 + 0.5; // 0~1로 정규화
  glow = pow(glow, 3.0) * uTreble * 0.08;
  baseColor += vec3(glow * 0.8, glow * 0.6, glow * 0.7);

  // 부드러운 가장자리 페이드
  float edgeFade = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
  edgeFade *= smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);

  float alpha = 0.9 + uEnergy * 0.1;
  alpha *= edgeFade;

  gl_FragColor = vec4(baseColor, alpha);
}
