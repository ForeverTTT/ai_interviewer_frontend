import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import harborScene from '../../assets/background.jpg'

/**
 * 首页主视觉：汉堡港插画 + WebGL「2.5D 景深视差」。
 *
 * 插画本身是一张平面图，这里在片元着色器里按一张**程序化深度图**偏移采样坐标：
 *   - 画面有一个清晰的灭点（易北爱乐厅脚下，约 50% / 47%）；
 *   - 地面越靠近画面底部越近，两侧建筑越靠近边缘越近，天空和音乐厅最远。
 * 鼠标移动时近处和远处朝相反方向位移，看起来像镜头在场景里轻轻平移——
 * 这是纯 3D 渲染技巧，但幅度很小，不会让人觉得花哨。
 *
 * 降级：不支持 WebGL 或用户开启「减少动态效果」时，只渲染静态 <img>。
 * 性能：离开视口或页面隐藏时暂停渲染循环；像素比上限 2。
 */

export const HARBOR_IMAGE = harborScene
export const HARBOR_ASPECT = 1419 / 752
/** 画面放大一点，给视差位移留出边缘余量，避免露出图片边界 */
export const HARBOR_OVERSCAN = 1.07

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

const FRAG = `
precision mediump float;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uImgAspect;
uniform vec2 uMouse;
uniform float uTime;
uniform float uOverscan;
uniform vec2 uFocus;
varying vec2 vUv;

// 0 = 远（天空 / 音乐厅），1 = 近（画面底部地面 / 两侧建筑）
float depthAt(vec2 p) {
  vec2 vp = vec2(0.5, 0.47);
  float ground = smoothstep(0.44, 1.0, p.y);
  float side = smoothstep(0.08, 0.52, abs(p.x - vp.x));
  float d = max(ground, side * 0.92);
  return clamp(d, 0.0, 1.0);
}

void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  float rs = uRes.x / uRes.y;
  vec2 scale = rs > uImgAspect ? vec2(1.0, uImgAspect / rs) : vec2(rs / uImgAspect, 1.0);
  vec2 p = (uv - uFocus) * scale / uOverscan + uFocus;

  vec2 drift = vec2(sin(uTime * 0.21), cos(uTime * 0.17)) * 0.0022;
  vec2 offset = uMouse * vec2(0.014, 0.009) + drift;

  // 两次迭代：先按当前点深度偏移，再用偏移后的位置修正，边缘拉伸更少
  float d = depthAt(p);
  vec2 q = p - offset * (d - 0.32);
  d = depthAt(q);
  q = p - offset * (d - 0.32);

  gl_FragColor = texture2D(uTex, clamp(q, 0.001, 0.999));
}
`

function compile(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/**
 * @param {object} props
 * @param {[number, number]} [props.focus] 画面裁切时保持在视野内的焦点（图片坐标 0..1）
 * @param {string} [props.className]
 */
const DEFAULT_FOCUS = [0.5, 0.5]
const POSITION_CLASSES = ['absolute', 'fixed', 'relative', 'sticky']

const HarborStage = forwardRef(function HarborStage({ className = '', focus = DEFAULT_FOCUS, alt = '' }, ref) {
  const [fx, fy] = focus
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 })
  const [webglReady, setWebglReady] = useState(false)

  useImperativeHandle(ref, () => ({
    /** 让外部（比如整块 hero）把鼠标位置喂进来，范围 -1..1 */
    setPointer(x, y) {
      mouseRef.current.tx = Math.max(-1, Math.min(1, x))
      mouseRef.current.ty = Math.max(-1, Math.min(1, y))
    },
  }), [])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return undefined
    if (prefersReducedMotion()) return undefined

    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'low-power' })
    if (!gl) return undefined

    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return undefined
    const program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return undefined
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(program, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const u = {
      res: gl.getUniformLocation(program, 'uRes'),
      imgAspect: gl.getUniformLocation(program, 'uImgAspect'),
      mouse: gl.getUniformLocation(program, 'uMouse'),
      time: gl.getUniformLocation(program, 'uTime'),
      overscan: gl.getUniformLocation(program, 'uOverscan'),
      focus: gl.getUniformLocation(program, 'uFocus'),
    }
    gl.uniform1f(u.imgAspect, HARBOR_ASPECT)
    gl.uniform1f(u.overscan, HARBOR_OVERSCAN)
    gl.uniform2f(u.focus, fx, fy)

    let disposed = false
    let raf = 0
    let visible = true
    let textureLoaded = false
    const start = performance.now()

    const texture = gl.createTexture()
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => {
      if (disposed) return
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image)
      textureLoaded = true
      draw()
      setWebglReady(true)
      loop()
    }
    image.src = harborScene

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.max(1, Math.round(wrap.clientWidth * dpr))
      const h = Math.max(1, Math.round(wrap.clientHeight * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
      gl.uniform2f(u.res, w, h)
    }

    function draw() {
      if (!textureLoaded) return
      const m = mouseRef.current
      // 临界阻尼式缓动：鼠标停下后画面慢慢归位，没有生硬的跳变
      m.x += (m.tx - m.x) * 0.06
      m.y += (m.ty - m.y) * 0.06
      gl.uniform2f(u.mouse, m.x, m.y)
      gl.uniform1f(u.time, (performance.now() - start) / 1000)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    function loop() {
      cancelAnimationFrame(raf)
      if (disposed || !visible || document.hidden) return
      draw()
      raf = requestAnimationFrame(loop)
    }

    const ro = new ResizeObserver(() => { resize(); draw() })
    ro.observe(wrap)
    resize()

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) loop()
    }, { threshold: 0 })
    io.observe(wrap)

    const onVisibility = () => { if (!document.hidden) loop() }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      gl.deleteTexture(texture)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
    }
  }, [fx, fy])

  return (
    /* 定位方式交给调用方（通常是 absolute inset-0）；没传时退回 relative */
    <div ref={wrapRef} className={`overflow-hidden ${POSITION_CLASSES.some(c => className.split(' ').includes(c)) ? '' : 'relative'} ${className}`}>
      {/* 静态兜底图：WebGL 就绪前、或不支持 WebGL 时显示。缩放与着色器一致，切换时不跳 */}
      <img
        src={harborScene}
        alt={alt}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${webglReady ? 'opacity-0' : 'opacity-100'}`}
        style={{
          objectPosition: `${fx * 100}% ${fy * 100}%`,
          transform: `scale(${HARBOR_OVERSCAN})`,
          transformOrigin: `${fx * 100}% ${fy * 100}%`,
        }}
        draggable={false}
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${webglReady ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
})

export default HarborStage

/**
 * 把「图片坐标」（0..1）换算成舞台内的像素位置，和着色器 / object-cover 的裁切规则一致。
 * 用来把对话气泡钉在插画里那两个人的头顶上，视口怎么裁切都跟得住。
 */
export function mapImagePoint(stageW, stageH, ax, ay, focus = [0.5, 0.5]) {
  const imgAspect = HARBOR_ASPECT
  const stageAspect = stageW / stageH
  let drawW
  let drawH
  if (stageAspect > imgAspect) {
    drawW = stageW
    drawH = stageW / imgAspect
  } else {
    drawH = stageH
    drawW = stageH * imgAspect
  }
  drawW *= HARBOR_OVERSCAN
  drawH *= HARBOR_OVERSCAN
  const fx = focus[0] * stageW
  const fy = focus[1] * stageH
  return {
    x: fx + (ax - focus[0]) * drawW,
    y: fy + (ay - focus[1]) * drawH,
  }
}
