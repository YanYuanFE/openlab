import { ContactShadows, Environment, Lightformer } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { BulbDropper } from '@/kit/apparatus'
import { Glass, lathe } from '@/kit/core'
import { SHAPES } from '@/kit/shapes'
import { glassGeometry } from '@/kit/vessel'

const FLASK = SHAPES.conical250
const FILL = 6.2
const TIP_Y = FLASK.height + 1.6
const FALL = 0.42
const SETTLE = 2.4

export interface Drop {
  id: number
  color: string
}

// The radius profile is duplicated in GLSL so the raymarch can test "inside the liquid".
const liquidVert = /* glsl */ `
varying vec3 vPos;
varying vec3 vCam;
void main() {
  vPos = position;
  vCam = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const liquidFrag = /* glsl */ `
uniform vec3 uBase;
uniform vec3 uDrop;
uniform vec2 uDropXZ;
uniform float uT;
uniform float uTime;
uniform float uFill;
varying vec3 vPos;
varying vec3 vCam;

float rad(float y) { return y < 9.0 ? 4.2 - 2.6 * pow(y / 9.0, 1.3) : 1.6; }

float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float noise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}

// Falling, swirling dye plume from the drop point.
float plume(vec3 p) {
  float t = uT;
  vec3 w = p * 0.75 + vec3(0.0, uTime * 0.6, 0.0);
  vec3 q = p + (vec3(noise(w), noise(w + 17.0), noise(w + 31.0)) - 0.5) * 2.6 * smoothstep(0.0, 1.0, t);
  float head = max(uFill - t * 6.0, 0.4);
  vec3 a = vec3(uDropXZ.x, uFill, uDropXZ.y);
  vec3 ba = vec3(0.0, head - uFill, 0.0);
  vec3 pa = q - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
  float d = length(pa - ba * h);
  float r = 0.3 + t * 1.6 + h * 0.5;
  return smoothstep(r, r * 0.3, d);
}

void main() {
  vec3 rd = normalize(vPos - vCam);
  vec3 p = vPos;
  float ds = 0.14;
  float thick = 0.0;
  float cov = 0.0;
  bool dropping = uT >= 0.0;
  for (int i = 0; i < 70; i++) {
    if (p.y < -0.02 || p.y > uFill + 0.02 || length(p.xz) > rad(p.y) + 0.03) break;
    thick += ds;
    if (dropping) cov = max(cov, plume(p));
    p += rd * ds;
  }
  float mixAmt = dropping ? max(cov, smoothstep(1.0, ${SETTLE.toFixed(1)}, uT)) : 0.0;
  vec3 col = mix(uBase, uDrop, mixAmt);
  float depth = 1.0 - exp(-thick * 0.32);
  vec3 tint = mix(vec3(1.0), col, 0.3 + 0.7 * depth);
  // ripple ring on the surface around the drop point
  if (dropping && vPos.y > uFill - 0.02) {
    float d = length(vPos.xz - uDropXZ);
    tint += vec3(0.55) * smoothstep(0.12, 0.0, abs(d - uT * 3.2)) * exp(-uT * 1.8);
  }
  gl_FragColor = vec4(tint, 0.6 + 0.35 * depth);
}`

const causticFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
varying vec2 vUv;
void main() {
  vec2 p = (vUv - 0.5) * 9.0;
  vec2 i = p;
  float c = 1.0;
  for (int n = 0; n < 4; n++) {
    float t = uTime * 0.35 * (1.0 - 3.5 / float(n + 1));
    i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + t) / 0.005), p.y / (cos(i.y + t) / 0.005)));
  }
  c = pow(abs(1.17 - c / 4.0), 7.0);
  float mask = smoothstep(0.42, 0.05, length((vUv - vec2(0.56, 0.47)) * vec2(1.0, 1.35)));
  gl_FragColor = vec4(mix(uColor, vec3(1.0), 0.25), mask * (0.18 + clamp(c, 0.0, 1.0) * 0.5));
}`

const uvVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`

function liquidGeometry() {
  const pts: [number, number][] = [[0, 0]]
  for (let i = 0; i <= 40; i++) {
    const y = (i / 40) * FILL
    pts.push([FLASK.r(y), y])
  }
  pts.push([0, FILL])
  return lathe(pts, 64)
}

const ease = (t: number) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3)

function Flask({ base, drop, intro, onLand }: { base: string; drop: Drop | null; intro: boolean; onLand: (d: Drop) => void }) {
  const glass = useMemo(() => glassGeometry(FLASK), [])
  const liquidGeo = useMemo(liquidGeometry, [])
  const slot = useRef<THREE.Group>(null)
  const rig = useRef<THREE.Group>(null)
  const liquid = useRef<THREE.Mesh>(null)
  const dropper = useRef<THREE.Group>(null)
  const bead = useRef<THREE.Mesh>(null)
  const born = useRef<number | null>(null)
  const fall = useRef<{
    drop: Drop
    start: number
    x: number
    z: number
    landed: boolean
  } | null>(null)
  const pending = useRef<Drop | null>(null)

  const liquidMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: liquidVert,
        fragmentShader: liquidFrag,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uBase: { value: new THREE.Color(base) },
          uDrop: { value: new THREE.Color(base) },
          uDropXZ: { value: new THREE.Vector2() },
          uT: { value: -1 },
          uTime: { value: 0 },
          uFill: { value: FILL },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const causticMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: uvVert,
        fragmentShader: causticFrag,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uColor: { value: new THREE.Color(base) },
          uTime: { value: 0 },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(() => {
    if (drop) pending.current = drop
  }, [drop])

  useFrame(({ clock, pointer, size }, dt) => {
    const now = clock.elapsedTime
    if (born.current === null) born.current = now
    const age = now - born.current
    const u = liquidMat.uniforms

    // Fill on load, then follow the pointer with a gentle tilt.
    liquid.current!.scale.y = intro ? Math.max(ease((age - 0.2) / 1.6), 0.001) : 1
    const g = rig.current!
    const wide = size.width / size.height > 1.1
    slot.current!.position.x = THREE.MathUtils.damp(slot.current!.position.x, wide ? 5.5 : 0, 4, dt)
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, pointer.x * 0.45, 3, dt)
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -pointer.y * 0.08, 3, dt)

    const d = dropper.current!
    d.position.x = THREE.MathUtils.damp(d.position.x, THREE.MathUtils.clamp(pointer.x * 3, -0.9, 0.9), 8, dt)
    d.position.z = THREE.MathUtils.damp(d.position.z, THREE.MathUtils.clamp(-pointer.y * 2, -0.9, 0.9), 8, dt)
    d.position.y = TIP_Y + Math.sin(now * 2) * 0.15

    if (pending.current && !fall.current) {
      fall.current = {
        drop: pending.current,
        start: now,
        x: d.position.x,
        z: d.position.z,
        landed: false,
      }
      pending.current = null
    }
    const f = fall.current
    if (f) {
      const t = now - f.start
      if (!f.landed) {
        const k = Math.min(t / FALL, 1)
        bead.current!.visible = true
        bead.current!.position.set(f.x, TIP_Y - (TIP_Y - FILL) * k * k, f.z)
        d.position.y -= Math.sin(Math.min(t / 0.2, 1) * Math.PI) * 0.5
        if (k === 1) {
          f.landed = true
          bead.current!.visible = false
          if (u.uT.value >= 0) u.uBase.value.copy(u.uDrop.value)
          u.uDrop.value.set(f.drop.color)
          u.uDropXZ.value.set(f.x, f.z)
          u.uT.value = 0
          f.start = now
          onLand(f.drop)
        }
      } else if (t > 0.35) {
        fall.current = null
      }
    }
    if (u.uT.value >= 0) {
      u.uT.value += dt
      if (u.uT.value > SETTLE) {
        u.uBase.value.copy(u.uDrop.value)
        u.uT.value = -1
      }
    }
    u.uTime.value = now
    causticMat.uniforms.uTime.value = now
    causticMat.uniforms.uColor.value.copy(
      u.uT.value >= 0 ? u.uBase.value.clone().lerp(u.uDrop.value, Math.min(u.uT.value / SETTLE, 1)) : u.uBase.value,
    )
  })

  return (
    <group ref={slot}>
      <ContactShadows position={[0, -0.05, 0]} scale={30} blur={2.6} opacity={0.3} far={20} resolution={512} />
      <group ref={rig}>
        <mesh geometry={glass} renderOrder={2}>
          <Glass opacity={0.13} />
        </mesh>
        <mesh ref={liquid} geometry={liquidGeo} material={liquidMat} renderOrder={1} />
        <mesh rotation-x={-Math.PI / 2} position={[1.5, 0.02, 1.5]} material={causticMat}>
          <planeGeometry args={[20, 20]} />
        </mesh>
        <group ref={dropper} position={[0, TIP_Y, 0]}>
          <BulbDropper />
        </group>
        <mesh ref={bead} visible={false}>
          <sphereGeometry args={[0.22, 16, 12]} />
          <meshPhysicalMaterial color="#eef6f8" transparent opacity={0.7} roughness={0} clearcoat={1} />
        </mesh>
      </group>
    </group>
  )
}

export function FlaskScene(props: { base: string; drop: Drop | null; intro: boolean; onLand: (d: Drop) => void; onClick: () => void }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 15, 58], fov: 30 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ camera }) => camera.lookAt(0, 11, 0)}
      onClick={props.onClick}
      className="cursor-crosshair"
    >
      <hemisphereLight args={['#ffffff', '#a9b6b3', 1.1]} />
      <directionalLight position={[-20, 40, 25]} intensity={1.5} />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={3} position={[0, 12, 20]} scale={[30, 8, 1]} />
        <Lightformer form="rect" intensity={1.5} position={[-25, 8, 0]} rotation-y={Math.PI / 2} scale={[20, 10, 1]} />
      </Environment>
      <Flask {...props} />
    </Canvas>
  )
}
