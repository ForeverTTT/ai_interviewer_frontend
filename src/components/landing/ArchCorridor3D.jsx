import { useEffect, useRef, useState } from 'react'

/**
 * 收尾区的 3D 场景：一条蜿蜒的小路穿过一排拱门，尽头是一团暖光。
 *
 * 拱门取自首页插画里那几扇墙上的拱形门洞，颜色也来自插画：港湾蓝、赭黄、鼠尾草、雾灰。
 * 语义很直白——每一次练习都是穿过一道门，路的尽头就是 Offer。
 *
 * 克制的几条原则：
 *   - 材质全部是哑光（roughness≈1），不反光、不发亮，保持插画的平涂质感；
 *   - 镜头只随滚动缓慢前进、随指针轻微转头，幅度都很小；
 *   - three.js 按需动态加载，离开视口即停止渲染，卸载时释放全部 GPU 资源；
 *   - 不支持 WebGL / 减少动态效果时，父组件显示静态兜底。
 */

const PALETTE = {
  light: {
    ground: '#DCE4DE',
    path: '#BAC8CF',
    fog: '#EEF2EE',
    sky: '#F2F5F1',
    hemiSky: '#F4F7F4',
    hemiGround: '#C9D4CC',
    walls: ['#6E8BA4', '#E3B45C', '#A3BCA8', '#DCE3E4', '#5E7B95', '#E9C27A', '#B86E57'],
    buildings: ['#CBD6DA', '#AFC2C9', '#D5DDD6', '#BCCAC1', '#C7D1DB'],
    glow: '#F6C66A',
  },
  dark: {
    ground: '#1A2530',
    path: '#253444',
    fog: '#101820',
    sky: '#101820',
    hemiSky: '#3A4D5E',
    hemiGround: '#141D26',
    walls: ['#4E6A84', '#C99A45', '#6F8E77', '#3B4A58', '#435E77', '#B98E4E', '#8E5646'],
    buildings: ['#243240', '#2B3A49', '#223029', '#26343C', '#2A3746'],
    glow: '#F2B955',
  },
}

function pathX(z) {
  return Math.sin(z * 0.11) * 1.3 + Math.sin(z * 0.043) * 0.8
}

export default function ArchCorridor3D({ className = '', dark = false, progressRef, onUnsupported }) {
  const mountRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined

    let disposed = false
    let cleanup = () => {}

    ;(async () => {
      let THREE
      try {
        THREE = await import('three')
      } catch {
        onUnsupported?.()
        return
      }
      if (disposed) return

      const probe = document.createElement('canvas')
      const hasGL = !!(probe.getContext('webgl2') || probe.getContext('webgl'))
      if (!hasGL) {
        onUnsupported?.()
        return
      }

      const colors = dark ? PALETTE.dark : PALETTE.light
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.domElement.style.width = '100%'
      renderer.domElement.style.height = '100%'
      renderer.domElement.style.display = 'block'
      mount.appendChild(renderer.domElement)

      const scene = new THREE.Scene()
      scene.fog = new THREE.Fog(colors.fog, 16, 62)

      const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 120)

      // ── 光：半球光铺底 + 一盏偏暖的斜射主光投软阴影
      scene.add(new THREE.HemisphereLight(colors.hemiSky, colors.hemiGround, dark ? 1.4 : 2.1))
      const sun = new THREE.DirectionalLight(dark ? '#AFC4D8' : '#FFF1DC', dark ? 1.3 : 2.3)
      sun.position.set(7, 12, 6)
      sun.castShadow = true
      sun.shadow.mapSize.set(1024, 1024)
      sun.shadow.camera.left = -14
      sun.shadow.camera.right = 14
      sun.shadow.camera.top = 26
      sun.shadow.camera.bottom = -30
      sun.shadow.camera.near = 1
      sun.shadow.camera.far = 60
      sun.shadow.bias = -0.0008
      sun.shadow.radius = 4
      scene.add(sun)
      scene.add(sun.target)
      sun.target.position.set(0, 0, -12)

      const disposables = []
      const track = (obj) => { disposables.push(obj); return obj }

      // ── 地面
      const ground = new THREE.Mesh(
        track(new THREE.PlaneGeometry(90, 120)),
        track(new THREE.MeshStandardMaterial({ color: colors.ground, roughness: 1, metalness: 0 })),
      )
      ground.rotation.x = -Math.PI / 2
      ground.position.z = -20
      ground.receiveShadow = true
      scene.add(ground)

      // ── 蜿蜒小路：沿 z 生成一条平铺的带状几何
      {
        const segments = 140
        const zStart = 24
        const zEnd = -58
        const positions = []
        const indices = []
        for (let i = 0; i <= segments; i += 1) {
          const z = zStart + (zEnd - zStart) * (i / segments)
          const x = pathX(z)
          const dz = 0.05
          const dx = pathX(z - dz) - x
          const len = Math.hypot(dx, dz)
          const nx = dz / len
          const nz = dx / len
          const half = 0.95 - (i / segments) * 0.25
          positions.push(x - nx * half, 0.012, z - nz * half, x + nx * half, 0.012, z + nz * half)
          if (i < segments) {
            const a = i * 2
            indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
          }
        }
        const geo = track(new THREE.BufferGeometry())
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
        geo.setIndex(indices)
        geo.computeVertexNormals()
        const path = new THREE.Mesh(geo, track(new THREE.MeshStandardMaterial({ color: colors.path, roughness: 1, side: THREE.DoubleSide })))
        path.receiveShadow = true
        scene.add(path)
      }

      // ── 拱门：墙面挖出「矩形 + 半圆」的门洞，挤出一点厚度
      const archGeometry = (() => {
        const w = 3.6
        const h = 4.1
        const ow = 1.56
        const oh = 2.25
        const r = ow / 2
        const shape = new THREE.Shape()
        shape.moveTo(-w / 2, 0)
        shape.lineTo(w / 2, 0)
        shape.lineTo(w / 2, h)
        shape.lineTo(-w / 2, h)
        shape.lineTo(-w / 2, 0)
        const hole = new THREE.Path()
        hole.moveTo(-r, 0)
        hole.lineTo(-r, oh)
        hole.absarc(0, oh, r, Math.PI, 0, true)
        hole.lineTo(r, 0)
        hole.lineTo(-r, 0)
        shape.holes.push(hole)
        const g = new THREE.ExtrudeGeometry(shape, { depth: 0.34, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2, curveSegments: 28 })
        g.translate(0, 0, -0.17)
        return track(g)
      })()

      const gates = []
      const gateZ = [-3, -8.5, -14, -19.5, -25, -30.5, -36]
      gateZ.forEach((z, i) => {
        const mat = track(new THREE.MeshStandardMaterial({ color: colors.walls[i % colors.walls.length], roughness: 0.96, metalness: 0 }))
        const gate = new THREE.Mesh(archGeometry, mat)
        gate.position.set(pathX(z), 0, z)
        gate.rotation.y = Math.atan2(pathX(z - 0.5) - pathX(z), 0.5) * 0.6 + (i % 2 ? 0.05 : -0.05)
        gate.castShadow = true
        gate.receiveShadow = true
        scene.add(gate)
        gates.push(gate)
      })

      // ── 两侧：像插画里那样斜立着的墙板（有的带拱门）和几座柔和的小山丘
      const slabGeo = track(new THREE.BoxGeometry(1, 1, 1))
      const rand = (() => { let s = 11; return () => { s = (s * 16807) % 2147483647; return s / 2147483647 } })()
      for (let i = 0; i < 14; i += 1) {
        const side = i % 2 ? 1 : -1
        const z = 2 - i * 3.6 - rand() * 1.5
        const withDoor = i % 3 === 1
        const color = i % 4 === 2 ? colors.walls[1] : colors.buildings[i % colors.buildings.length]
        const mat = track(new THREE.MeshStandardMaterial({ color: withDoor ? colors.walls[(i + 2) % colors.walls.length] : color, roughness: 1 }))
        let mesh
        if (withDoor) {
          mesh = new THREE.Mesh(archGeometry, mat)
          const k = 0.9 + rand() * 0.35
          mesh.scale.set(k, k, k)
          mesh.position.set(pathX(z) + side * (5 + rand() * 2.5), 0, z)
        } else {
          const w = 2.2 + rand() * 2.4
          const h = 2.4 + rand() * 3.6
          mesh = new THREE.Mesh(slabGeo, mat)
          mesh.scale.set(w, h, 0.32)
          mesh.position.set(pathX(z) + side * (5.4 + rand() * 3.5), h / 2, z)
        }
        // 墙面斜对着小路，像插画里的透视墙
        mesh.rotation.y = side * (0.55 + rand() * 0.35)
        mesh.castShadow = true
        mesh.receiveShadow = true
        scene.add(mesh)
      }

      const hillGeo = track(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2))
      const hillColors = dark ? ['#233329', '#1E2C33', '#27362D'] : ['#B9CDBE', '#C9D8CC', '#AFC4B5']
      ;[[-8.5, 12, 5, 1.5, 4], [9, 6, 6, 1.9, 4.5], [-10, -6, 6, 2.2, 5], [11, -18, 7, 2.4, 5], [-12, -26, 8, 2.8, 6]].forEach(([x, z, sx, sy, sz], i) => {
        const hill = new THREE.Mesh(hillGeo, track(new THREE.MeshStandardMaterial({ color: hillColors[i % hillColors.length], roughness: 1 })))
        hill.scale.set(sx, sy, sz)
        hill.position.set(x, 0, z)
        hill.receiveShadow = true
        scene.add(hill)
      })

      // ── 路的尽头：一团暖光（精灵贴图做柔和光晕）
      const glowTex = (() => {
        const c = document.createElement('canvas')
        c.width = c.height = 256
        const ctx = c.getContext('2d')
        const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
        g.addColorStop(0, 'rgba(255,236,196,1)')
        g.addColorStop(0.25, 'rgba(246,198,106,0.85)')
        g.addColorStop(0.6, 'rgba(246,198,106,0.22)')
        g.addColorStop(1, 'rgba(246,198,106,0)')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, 256, 256)
        const tex = new THREE.CanvasTexture(c)
        tex.colorSpace = THREE.SRGBColorSpace
        return track(tex)
      })()
      const glow = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, fog: false })))
      glow.position.set(pathX(-42), 1.6, -42)
      glow.scale.set(14, 14, 1)
      scene.add(glow)
      const warm = new THREE.PointLight(colors.glow, dark ? 30 : 18, 26, 1.6)
      warm.position.set(pathX(-37), 2.2, -38.5)
      scene.add(warm)

      // ── 尺寸
      const resize = () => {
        const w = Math.max(1, mount.clientWidth)
        const h = Math.max(1, mount.clientHeight)
        renderer.setSize(w, h, false)
        camera.aspect = w / h
        // 窄屏镜头往后退一点，保证前两道门完整入画
        camera.fov = w / h < 1 ? 50 : 34
        camera.updateProjectionMatrix()
      }
      resize()
      const ro = new ResizeObserver(resize)
      ro.observe(mount)

      // ── 指针：只让镜头轻轻「转头」
      const pointer = { x: 0, y: 0, sx: 0, sy: 0 }
      const onPointer = (e) => {
        if (e.pointerType === 'touch') return
        const rect = mount.getBoundingClientRect()
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
        pointer.y = ((e.clientY - rect.top) / rect.height) * 2 - 1
      }
      const onLeave = () => { pointer.x = 0; pointer.y = 0 }
      mount.addEventListener('pointermove', onPointer)
      mount.addEventListener('pointerleave', onLeave)

      const reduced = (() => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false } })()

      let visible = true
      let raf = 0
      let smoothProgress = progressRef?.current ?? 0
      const clock = new THREE.Clock()
      const lookTarget = new THREE.Vector3()

      const renderFrame = () => {
        const t = clock.getElapsedTime()
        const target = progressRef?.current ?? 0
        smoothProgress += (target - smoothProgress) * 0.06
        pointer.sx += (pointer.x - pointer.sx) * 0.05
        pointer.sy += (pointer.y - pointer.sy) * 0.05

        // 镜头略微仰视：拱门落在画面下半部，上半部留给文案
        const camZ = 19 - smoothProgress * 7 - (reduced ? 0 : Math.sin(t * 0.25) * 0.15)
        camera.position.set(pathX(camZ) * 0.6 + pointer.sx * 0.4, 1.7 + (reduced ? 0 : Math.sin(t * 0.6) * 0.03), camZ)
        lookTarget.set(pathX(camZ - 16) * 0.8 + pointer.sx * 1.6, 4.6 - pointer.sy * 0.4, camZ - 16)
        camera.lookAt(lookTarget)

        glow.material.opacity = 0.85 + Math.sin(t * 0.8) * 0.08
        renderer.render(scene, camera)
      }

      const loop = () => {
        cancelAnimationFrame(raf)
        if (disposed || !visible || document.hidden) return
        renderFrame()
        raf = requestAnimationFrame(loop)
      }

      const io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting
        if (visible) loop()
      }, { threshold: 0 })
      io.observe(mount)
      const onVis = () => { if (!document.hidden) loop() }
      document.addEventListener('visibilitychange', onVis)

      renderFrame()
      setReady(true)
      loop()

      cleanup = () => {
        cancelAnimationFrame(raf)
        io.disconnect()
        ro.disconnect()
        document.removeEventListener('visibilitychange', onVis)
        mount.removeEventListener('pointermove', onPointer)
        mount.removeEventListener('pointerleave', onLeave)
        disposables.forEach(d => d.dispose?.())
        renderer.dispose()
        renderer.forceContextLoss?.()
        renderer.domElement.remove()
      }
    })()

    return () => {
      disposed = true
      cleanup()
    }
  }, [dark, progressRef, onUnsupported])

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className={`transition-opacity duration-1000 ${ready ? 'opacity-100' : 'opacity-0'} ${className}`}
    />
  )
}
