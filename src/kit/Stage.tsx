import { ContactShadows, Environment, Lightformer, OrbitControls, OrthographicCamera, PerformanceMonitor } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import type { Vec3 } from './core'

/** Fits `extent` (world cm) into the area left free by the overlay panels. */
function FitCamera({ extent }: { extent: [number, number] }) {
  const { camera, size } = useThree()
  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera
    const left = size.width >= 768 ? 290 : 0
    const top = 120
    const bottom = 170
    cam.zoom = Math.min((size.width - left) / extent[0], (size.height - top - bottom) / extent[1])
    cam.setViewOffset(size.width, size.height, -left / 2, (bottom - top) / 2, size.width, size.height)
    cam.updateProjectionMatrix()
  }, [camera, size, extent])
  return null
}

/** Lets opaque meshes cast and receive shadows; labels, glass and liquids stay out, and `userData.noCastShadow` only receives. Re-checks as scenes change. */
function AutoShadows() {
  const frame = useRef(0)
  useFrame(({ scene }) => {
    if (frame.current++ % 30) return
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const mat = m.material as THREE.Material
      const opaque = !Array.isArray(mat) && !mat.transparent && !(mat as THREE.MeshBasicMaterial).isMeshBasicMaterial
      m.castShadow = opaque && !m.userData.noCastShadow
      m.receiveShadow = opaque
    })
  })
  return null
}

export function Stage({ extent, target = [0, 5, 0], children }: { extent: [number, number]; target?: Vec3; children: ReactNode }) {
  // Shadows switch off when the frame rate drops on slow devices.
  const [hq, setHq] = useState(true)
  const span = Math.max(extent[0], extent[1]) * 0.75
  return (
    <Canvas
      dpr={[1, 2]}
      shadows="percentage"
      gl={{ antialias: true }}
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true
      }}
      className="!absolute inset-0"
    >
      <color attach="background" args={['#e9eeed']} />
      <OrthographicCamera makeDefault position={[target[0], target[1] + 50, target[2] + 50]} near={0.1} far={500} />
      <FitCamera extent={extent} />
      <OrbitControls
        target={target}
        enablePan={false}
        minAzimuthAngle={-0.6}
        maxAzimuthAngle={0.6}
        minPolarAngle={0.55}
        maxPolarAngle={1.35}
        minZoom={4}
        maxZoom={40}
      />
      <hemisphereLight args={['#ffffff', '#a9b6b3', 1.1]} />
      <PerformanceMonitor onDecline={() => setHq(false)} />
      <directionalLight
        position={[-10, 60, 18]}
        intensity={1.5}
        castShadow={hq}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-radius={6}
      >
        <orthographicCamera attach="shadow-camera" args={[-span, span, span, -span, 1, 150]} />
      </directionalLight>
      <AutoShadows />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={3} position={[0, 12, 20]} scale={[30, 8, 1]} />
        <Lightformer form="rect" intensity={1.5} position={[-25, 8, 0]} rotation-y={Math.PI / 2} scale={[20, 10, 1]} />
      </Environment>
      <ContactShadows position={[0, 0.02, 0]} scale={110} blur={2.4} opacity={hq ? 0.18 : 0.32} far={30} resolution={1024} />
      {children}
    </Canvas>
  )
}
