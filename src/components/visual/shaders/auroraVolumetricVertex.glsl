// Volumetric Aurora Vertex Shader
// Based on Godot Volumetric Aurora

uniform vec3 uBoxSize;
uniform vec3 uCameraLocalPos;

varying vec3 vWorldPosition;
varying vec3 vLocalPosition;
varying vec3 vRayOrigin;
varying vec3 vRayDirection;

void main() {
  // 로컬 좌표를 -1 ~ 1 범위로 정규화
  vLocalPosition = position / (uBoxSize * 0.5);

  // 월드 좌표 계산
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;

  // 레이 원점과 방향 사전 계산 (Fragment에서 사용)
  vRayOrigin = uCameraLocalPos;
  vRayDirection = normalize(vLocalPosition - uCameraLocalPos);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
