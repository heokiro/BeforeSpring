// Aurora Raymarching Vertex Shader
// Converted from Godot to WebGL/Three.js

uniform vec3 uBoxSize;

varying vec3 vWorldPosition;
varying vec3 vLocalPosition;

void main() {
  // 로컬 좌표를 -1 ~ 1 범위로 정규화
  // BoxGeometry는 [-size/2, size/2] 범위이므로 정규화 필요
  vLocalPosition = position / (uBoxSize * 0.5);

  // 월드 좌표 계산
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
