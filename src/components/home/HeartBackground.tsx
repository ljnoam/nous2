"use client"

import { useEffect, useRef } from 'react'
import {
    AmbientLight,
    Color,
    ExtrudeGeometry,
    Mesh,
    MeshPhysicalMaterial,
    PerspectiveCamera,
    PointLight,
    Scene,
    Shape,
    SRGBColorSpace,
    Vector3,
    WebGLRenderer
} from 'three'

export default function HeartBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    console.log('[HeartBackground] Component mounted')
    if (!canvasRef.current || !containerRef.current) {
      console.log('[HeartBackground] Canvas or container ref not available')
      return
    }

    const canvas = canvasRef.current
    const container = containerRef.current
    console.log('[HeartBackground] Starting Three.js setup')

    // Scene setup
    const scene = new Scene()
    const camera = new PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.z = 15

    const renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    })
    renderer.outputColorSpace = SRGBColorSpace
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    // Create heart shape
    function createHeartShape() {
      const shape = new Shape()
      const x = 0
      const y = 0

      shape.moveTo(x, y)
      shape.bezierCurveTo(x, y - 0.3, x - 0.6, y - 0.3, x - 0.6, y)
      shape.bezierCurveTo(x - 0.6, y + 0.3, x, y + 0.8, x, y + 1.2)
      shape.bezierCurveTo(x, y + 0.8, x + 0.6, y + 0.3, x + 0.6, y)
      shape.bezierCurveTo(x + 0.6, y - 0.3, x, y - 0.3, x, y)

      return shape
    }

    const heartShape = createHeartShape()
    const extrudeSettings = {
      depth: 0.4,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.1,
      bevelSegments: 5
    }
    const heartGeometry = new ExtrudeGeometry(heartShape, extrudeSettings)
    heartGeometry.center()

    // Create hearts with different colors
    const pinkColors = [
      new Color(0xff69b4), // Hot pink
      new Color(0xffb6c1), // Light pink
      new Color(0xff1493), // Deep pink
      new Color(0xff6b9d), // Rose
      new Color(0xff85a2)  // Pink
    ]

    const hearts: Array<{
      mesh: Mesh
      velocity: Vector3
      rotationSpeed: Vector3
    }> = []

    const heartCount = 35

    for (let i = 0; i < heartCount; i++) {
      const material = new MeshPhysicalMaterial({
        color: pinkColors[i % pinkColors.length],
        metalness: 0.3,
        roughness: 0.4,
        clearcoat: 1,
        clearcoatRoughness: 0.2,
        transparent: true,
        opacity: 0.8
      })

      const heart = new Mesh(heartGeometry, material)

      // Random position
      heart.position.set(
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20
      )

      // Random scale (smaller hearts)
      const scale = 0.3 + Math.random() * 0.4
      heart.scale.set(scale, scale, scale)

      // Random rotation
      heart.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      )

      scene.add(heart)

      hearts.push({
        mesh: heart,
        velocity: new Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02
        ),
        rotationSpeed: new Vector3(
          (Math.random() - 0.5) * 0.005,
          (Math.random() - 0.5) * 0.005,
          (Math.random() - 0.5) * 0.005
        )
      })
    }

    // Lights
    const ambientLight = new AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const pointLight1 = new PointLight(0xff69b4, 100, 100)
    pointLight1.position.set(10, 10, 10)
    scene.add(pointLight1)

    const pointLight2 = new PointLight(0xffb6c1, 80, 100)
    pointLight2.position.set(-10, -10, 5)
    scene.add(pointLight2)

    // Animation
    let animationId: number

    function animate() {
      animationId = requestAnimationFrame(animate)

      hearts.forEach(({ mesh, velocity, rotationSpeed }) => {
        // Update position
        mesh.position.add(velocity)

        // Gentle rotation
        mesh.rotation.x += rotationSpeed.x
        mesh.rotation.y += rotationSpeed.y
        mesh.rotation.z += rotationSpeed.z

        // Bounce off boundaries (gentle)
        const bounds = { x: 15, y: 10, z: 10 }

        if (Math.abs(mesh.position.x) > bounds.x) {
          velocity.x *= -0.95
          mesh.position.x = Math.sign(mesh.position.x) * bounds.x
        }
        if (Math.abs(mesh.position.y) > bounds.y) {
          velocity.y *= -0.95
          mesh.position.y = Math.sign(mesh.position.y) * bounds.y
        }
        if (Math.abs(mesh.position.z) > bounds.z) {
          velocity.z *= -0.95
          mesh.position.z = Math.sign(mesh.position.z) * bounds.z
        }

        // Apply gentle friction for smooth slowdown
        velocity.multiplyScalar(0.9995)

        // Add tiny random impulses to keep movement interesting
        if (Math.random() < 0.01) {
          velocity.x += (Math.random() - 0.5) * 0.002
          velocity.y += (Math.random() - 0.5) * 0.002
          velocity.z += (Math.random() - 0.5) * 0.002
        }

        // Clamp velocity
        const maxVel = 0.03
        if (velocity.length() > maxVel) {
          velocity.normalize().multiplyScalar(maxVel)
        }
      })

      renderer.render(scene, camera)
    }

    animate()

    // Handle resize
    function handleResize() {
      const width = window.innerWidth
      const height = window.innerHeight

      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }

    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationId)

      hearts.forEach(({ mesh }) => {
        mesh.geometry.dispose()
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => m.dispose())
        } else {
          mesh.material.dispose()
        }
      })

      renderer.dispose()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 1 }}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
}
