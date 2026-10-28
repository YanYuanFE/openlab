import * as THREE from 'three'

// Pop-up drawings. Every material in a pop-up runs its vertices through popWorld(): at lift 0 the drawing lies
// flat on the page as a printed cabinet-oblique picture; as lift rises it hinges up about its front edge, and only
// near the end does its depth come back. One pop-up is on the page at a time, so the uniforms are shared.
// While a leaf turns forward, the flat drawing rides on it (leafWorld), and solid surfaces dissolve in and out
// with uSurf so a drawing arrives and leaves as pen lines only.

/** segments along a turning leaf, from the spine to its edge */
export const LEAF_N = 40

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
  /** how much of the solid surfaces is shown, 0..1 */
  uSurf: { value: 1 },
  /** 1 while a leaf turns forward carrying the drawing, 2 once that face has turned away; the leaf's centre line in book space (x out from the spine, y up) */
  uLeafOn: { value: 0 },
  uLeaf: { value: Array.from({ length: LEAF_N + 1 }, () => new THREE.Vector2()) },
  uLeafStep: { value: 1 },
  /** height of the leaf over the middle of a page: a drawing's height above the leaf is measured from it */
  uLeafBase: { value: 0 },
  uBook: { value: new THREE.Matrix4() },
  uBookInv: { value: new THREE.Matrix4() },
}

export const LEAF_GLSL = /* glsl */ `
uniform float uLeafOn; uniform vec2 uLeaf[${LEAF_N + 1}]; uniform float uLeafStep; uniform float uLeafBase; uniform mat4 uBook; uniform mat4 uBookInv;
// moves a point lying on the right page onto the turning leaf, just above its front face
vec3 leafWorld(vec3 w) {
  if (uLeafOn < 0.5) return w;
  if (uLeafOn > 1.5) return vec3(0.0, -1e4, 0.0);   // the face carrying it has turned away
  vec3 b = (uBookInv * vec4(w, 1.0)).xyz;
  float f = clamp(b.x / uLeafStep, 0.0, ${LEAF_N}.0 - 0.001);
  int i = int(f);
  vec2 a = uLeaf[i], c = uLeaf[i + 1];
  vec2 t = normalize(c - a);
  vec2 q = mix(a, c, fract(f)) + vec2(-t.y, t.x) * max(b.y - uLeafBase, 0.015);
  return (uBook * vec4(q, b.z, 1.0)).xyz;
}`

export const POP_GLSL = /* glsl */ `
${LEAF_GLSL}
uniform mat4 uPop; uniform mat4 uPopInv; uniform float uLift; uniform float uHinge; uniform vec2 uCab;
vec3 foldWorld(vec3 w) {
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
}
vec3 popWorld(vec3 w) { return leafWorld(foldWorld(w)); }`

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

/** onBeforeCompile step for a solid surface of a pop-up: folds, and dissolves in and out with uSurf. */
export function popSurface(shader: THREE.WebGLProgramParametersWithUniforms) {
  popVertex(shader)
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nuniform float uSurf;\nfloat popHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }')
    .replace('void main() {', 'void main() {\n  if (uSurf < 0.999 && popHash(gl_FragCoord.xy) >= uSurf) discard;')
}

/** onBeforeCompile step for print that lies flat by the drawing (captions): it does not fold, but rides a turning leaf. */
export function leafVertex(shader: THREE.WebGLProgramParametersWithUniforms) {
  Object.assign(shader.uniforms, POP)
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${LEAF_GLSL}`)
    .replace('#include <project_vertex>', PROJECT.replace('popWorld', 'leafWorld'))
}

/** Shadow caster for pop-up meshes: folds the same way and dissolves with the surfaces. */
export const POP_DEPTH = (() => {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })
  m.onBeforeCompile = popSurface
  m.customProgramCacheKey = () => 'pop-depth'
  return m
})()
