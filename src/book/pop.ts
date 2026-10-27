import * as THREE from 'three'

// Pop-up drawings. Every material in a pop-up runs its vertices through popWorld(): at lift 0 the drawing lies
// flat on the page as a printed cabinet-oblique picture; as lift rises it hinges up about its front edge, and only
// near the end does its depth come back. One pop-up is on the page at a time, so the uniforms are shared.

export const POP = {
  /** pop-up frame (drawing cm, y up, +z towards the reader) to world, and back */
  uPop: { value: new THREE.Matrix4() },
  uPopInv: { value: new THREE.Matrix4() },
  uLift: { value: 1 },
  /** z of the hinge line in the pop-up frame: the front of the drawing */
  uHinge: { value: 0 },
  /** cabinet projection: how far one unit of depth shifts across and up the flat picture */
  uCab: { value: new THREE.Vector2(0.4 * Math.cos(0.61), 0.4 * Math.sin(0.61)) },
  /** seconds since the drawing was put on the page; pen strokes are drawn against it */
  uDraw: { value: 1e6 },
  /** drawing-buffer size in pixels, for pen widths */
  uRes: { value: new THREE.Vector2(1600, 900) },
  uDpr: { value: 1 },
}

export const POP_GLSL = /* glsl */ `
uniform mat4 uPop; uniform mat4 uPopInv; uniform float uLift; uniform float uHinge; uniform vec2 uCab;
vec3 popWorld(vec3 w) {
  if (uLift > 0.9995) return w;
  vec3 q = (uPopInv * vec4(w, 1.0)).xyz;
  float d = max(0.0, uHinge - q.z);
  float u = clamp(uLift, 0.0, 1.0);
  float a = 1.5707963 * u * u * (3.0 - 2.0 * u);
  // depth stays sheared into the picture until the card is nearly upright
  float lam = pow(u, 8.0);
  float x = q.x + (1.0 - lam) * d * uCab.x;
  float y = q.y + (1.0 - lam) * d * uCab.y;
  vec3 r = vec3(x, 0.0, uHinge) + y * vec3(0.0, sin(a), -cos(a)) + lam * d * vec3(0.0, -cos(a), -sin(a));
  r.y = max(r.y, 0.02 + 0.03 * u);
  return (uPop * vec4(r, 1.0)).xyz;
}`

const PROJECT = /* glsl */ `
vec4 popW = modelMatrix * vec4(transformed, 1.0);
popW.xyz = popWorld(popW.xyz);
vec4 mvPosition = viewMatrix * popW;
gl_Position = projectionMatrix * mvPosition;`

/** onBeforeCompile step that makes a built-in material fold with the pop-up. */
export function popVertex(shader: THREE.WebGLProgramParametersWithUniforms) {
  Object.assign(shader.uniforms, POP)
  shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${POP_GLSL}`).replace('#include <project_vertex>', PROJECT)
}

/** Shadow caster for pop-up meshes: folds the same way and fades in with the lift. */
export const POP_DEPTH = (() => {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaHash: true })
  m.onBeforeCompile = popVertex
  m.customProgramCacheKey = () => 'pop-depth'
  return m
})()
