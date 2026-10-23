// Case studies: image containers that expand to the screen (Figma 2725:15147), pages that scroll
// themselves once inside a window (2717:50601, 2683:50482), and phone recordings (2683:50536).
import { reduceMotion } from "./main.js"

const EASE = "cubic-bezier(0.65, 0, 0.35, 1)"
const OPEN_MS = 540
const CLOSE_MS = 440
const RADIUS = 16 // every expanded picture's corners, on screen
const root = document.documentElement
let current = null // { shot, mode: "image" | "stage", overlay?, big?, src? }
let busy = false

const insetPx = (r, vw, vh, radius) =>
  `inset(${r.top}px ${vw - r.right}px ${vh - r.bottom}px ${r.left}px round ${radius}px)`
const margin = (vw) => Math.max(16, Math.min(64, vw * 0.05))
const intersect = (a, b) => {
  const left = Math.max(a.left, b.left)
  const top = Math.max(a.top, b.top)
  const right = Math.min(a.right, b.right)
  const bottom = Math.min(a.bottom, b.bottom)
  return { left, top, right: Math.max(left, right), bottom: Math.max(top, bottom) }
}
// a parent still entering is transformed, and a transformed parent would trap `position: fixed`
const settle = (el) => { for (let p = el.parentElement; p; p = p.parentElement) p.getAnimations().forEach((a) => a.finish()) }

/* ---------- Pictures: open the whole image, not the crop, with 16px corners ----------
   The full image grows out of the part the container showed: its clip starts at the visible crop and opens to the
   whole picture while it moves and scales into place. */
function placeBig(big, src, vw, vh) {
  const ratio = (src.naturalWidth || src.width) / (src.naturalHeight || src.height)
  const m = margin(vw)
  const width = Math.min(vw - 2 * m, (vh - 2 * m) * ratio)
  const height = width / ratio
  const box = { left: (vw - width) / 2, top: (vh - height) / 2, width, height }
  Object.assign(big.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${width}px`, height: `${height}px` })
  return box
}

function fromState(shot, src, box) {
  const full = src.getBoundingClientRect() // the whole image's box, including what the container hides
  const shown = intersect(intersect(full, (src.closest(".shot-crop") || shot).getBoundingClientRect()), shot.getBoundingClientRect())
  const k = full.width / box.width
  const pct = (n, of) => `${(n / of) * 100}%`
  return {
    transform: `translate(${full.left - box.left}px, ${full.top - box.top}px) scale(${k})`,
    clip: `inset(${pct(shown.top - full.top, full.height)} ${pct(full.right - shown.right, full.width)} ${pct(full.bottom - shown.bottom, full.height)} ${pct(shown.left - full.left, full.width)} round ${12 / k}px)`,
  }
}

function openImage(shot) {
  settle(shot)
  const src = shot.querySelector(".shot-stage img")
  const overlay = Object.assign(document.createElement("div"), { className: "lightbox", tabIndex: -1 })
  overlay.setAttribute("role", "dialog")
  overlay.setAttribute("aria-modal", "true")
  overlay.setAttribute("aria-label", src.alt || "Image")
  const big = Object.assign(new Image(), { src: src.currentSrc || src.src, alt: src.alt, className: "lightbox-img" })
  overlay.append(big)
  document.body.append(overlay)
  root.classList.add("is-locked")
  const vw = overlay.clientWidth
  const vh = overlay.clientHeight
  const box = placeBig(big, src, vw, vh)
  const from = fromState(shot, src, box)
  const shotRect = shot.getBoundingClientRect()
  current = { shot, mode: "image", overlay, big, src }
  shot.setAttribute("aria-expanded", "true")
  overlay.addEventListener("click", collapse)
  overlay.focus({ preventScroll: true })
  if (reduceMotion.matches) {
    overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: "ease-out" })
    return
  }
  busy = true
  const opts = { duration: OPEN_MS, easing: EASE }
  overlay.animate([{ clipPath: insetPx(shotRect, vw, vh, 24) }, { clipPath: "inset(0px 0px 0px 0px round 0px)" }], opts)
  big.animate([{ transform: from.transform, clipPath: from.clip }, { transform: "none", clipPath: `inset(0% 0% 0% 0% round ${RADIUS}px)` }], opts)
    .finished.finally(() => { busy = false })
}

function closeImage() {
  const { shot, overlay, big, src } = current
  const vw = overlay.clientWidth
  const vh = overlay.clientHeight
  const box = placeBig(big, src, vw, vh)
  const to = fromState(shot, src, box)
  const done = () => {
    overlay.remove()
    root.classList.remove("is-locked")
    shot.setAttribute("aria-expanded", "false")
    shot.focus({ preventScroll: true })
    current = null
    busy = false
  }
  if (reduceMotion.matches) return done()
  busy = true
  const opts = { duration: CLOSE_MS, easing: EASE, fill: "forwards" }
  big.animate([{ transform: "none", clipPath: `inset(0% 0% 0% 0% round ${RADIUS}px)` }, { transform: to.transform, clipPath: to.clip }], opts)
  overlay.animate([{ clipPath: "inset(0px 0px 0px 0px round 0px)" }, { clipPath: insetPx(shot.getBoundingClientRect(), vw, vh, 24) }], opts)
    .finished.finally(done)
}

/* ---------- Windows, phones and full-bleed recordings: the whole container scales up in place ---------- */
// Scale and offset that fit the shot's focus box (in % of the container) on screen.
function fit(shot, w, h) {
  const vw = shot.clientWidth
  const vh = shot.clientHeight
  const [fx, fy, fw, fh] = (shot.dataset.focus || "0,0,100,100").split(",").map((n) => Number(n) / 100)
  const box = { x: fx * w, y: fy * h, w: fw * w, h: fh * h }
  const m = margin(vw)
  const s = Math.min((vw - 2 * m) / box.w, (vh - 2 * m) / box.h)
  return { s, transform: `translate(${(vw - box.w * s) / 2 - box.x * s}px, ${(vh - box.h * s) / 2 - box.y * s}px) scale(${s})` }
}

function playInside(shot, play) {
  if (!reduceMotion.matches) return // otherwise the recordings already play while in view
  for (const v of shot.querySelectorAll("video")) play ? v.play().catch(() => {}) : v.pause()
}

function openStage(shot) {
  settle(shot)
  const stage = shot.querySelector(".shot-stage")
  const r = shot.getBoundingClientRect()
  stage.style.width = `${r.width}px`
  stage.style.height = `${r.height}px`
  shot.classList.add("is-open")
  shot.setAttribute("aria-expanded", "true")
  root.classList.add("is-locked")
  const vw = shot.clientWidth
  const vh = shot.clientHeight
  const to = fit(shot, r.width, r.height)
  stage.style.setProperty("--open-radius", `${RADIUS / to.s}px`) // a window's corners land at 16px on screen
  stage.style.transform = to.transform
  shot.style.clipPath = "inset(0px 0px 0px 0px round 0px)"
  current = { shot, mode: "stage" }
  playInside(shot, true)
  if (reduceMotion.matches) {
    shot.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: "ease-out" })
    return
  }
  busy = true
  const opts = { duration: OPEN_MS, easing: EASE }
  stage.animate([{ transform: `translate(${r.left}px, ${r.top}px) scale(1)` }, { transform: to.transform }], opts)
  shot.animate([{ clipPath: insetPx(r, vw, vh, 24) }, { clipPath: "inset(0px 0px 0px 0px round 0px)" }], opts)
    .finished.finally(() => { busy = false })
}

function closeStage() {
  const { shot } = current
  const stage = shot.querySelector(".shot-stage")
  const r = shot.parentElement.getBoundingClientRect() // the slot holds the original place
  const vw = shot.clientWidth
  const vh = shot.clientHeight
  const done = () => {
    for (const a of [...stage.getAnimations(), ...shot.getAnimations()]) a.cancel()
    shot.classList.remove("is-open")
    shot.setAttribute("aria-expanded", "false")
    stage.style.width = stage.style.height = stage.style.transform = ""
    stage.style.removeProperty("--open-radius")
    shot.style.clipPath = ""
    root.classList.remove("is-locked")
    playInside(shot, false)
    current = null
    busy = false
  }
  if (reduceMotion.matches) return done()
  busy = true
  const opts = { duration: CLOSE_MS, easing: EASE, fill: "forwards" }
  stage.animate([{ transform: stage.style.transform }, { transform: `translate(${r.left}px, ${r.top}px) scale(1)` }], opts)
  shot.animate([{ clipPath: shot.style.clipPath }, { clipPath: insetPx(r, vw, vh, 24) }], opts).finished.finally(done)
}

function expand(shot) {
  if (busy || current) return
  shot.querySelector(".window, .phone, .shot-video") ? openStage(shot) : openImage(shot)
}
function collapse() {
  if (busy || !current) return
  current.mode === "image" ? closeImage() : closeStage()
}

for (const shot of document.querySelectorAll("button.shot")) {
  shot.setAttribute("aria-expanded", "false")
  shot.addEventListener("click", () => (current?.shot === shot ? collapse() : expand(shot)))
}
addEventListener("keydown", (e) => { if (e.key === "Escape") collapse() })
addEventListener("resize", () => {
  if (!current || busy) return
  if (current.mode === "image") {
    placeBig(current.big, current.src, current.overlay.clientWidth, current.overlay.clientHeight)
    return
  }
  const stage = current.shot.querySelector(".shot-stage")
  const to = fit(current.shot, stage.offsetWidth, stage.offsetHeight)
  stage.style.setProperty("--open-radius", `${RADIUS / to.s}px`)
  stage.style.transform = to.transform
})

/* ---------- A page that scrolls itself, once ----------
   4 seconds after the window is in view it scrolls down the page and returns to the top.
   Without stops it travels to the bottom in one move. With data-stops (fractions of the page's height, or "end")
   it moves from stop to stop, holding on each, e.g. the vote page: description, then the Senate vote. */
const TRAVEL_EASE = "cubic-bezier(0.45, 0, 0.4, 1)"
function scrollOnce(win) {
  const page = win.querySelector("img")
  const run = () => {
    const max = page.offsetHeight - win.clientHeight
    if (max <= 0) return
    const stops = (win.dataset.stops ? win.dataset.stops.split(",") : ["end"]).map((v) =>
      v.trim() === "end" ? max : Math.min(max, Number(v) * page.offsetHeight),
    )
    // [time, position] pairs: travel to each stop, hold, and finally return to the top
    const steps = []
    let t = 0
    let at = 0
    for (const [i, y] of stops.entries()) {
      const one = stops.length === 1
      const travel = one ? Math.min(16000, Math.max(7000, (y - at) * 4.2)) : Math.min(3200, Math.max(1400, (y - at) * 1.6))
      const hold = i === stops.length - 1 ? (one ? 1200 : 3200) : 2600
      steps.push({ t, y: at, travel: true }, { t: t + travel, y, travel: false })
      t += travel + hold
      at = y
    }
    const back = 1800
    steps.push({ t, y: at, travel: true }, { t: t + back, y: 0, travel: false })
    const total = t + back
    const frames = steps.map(({ t, y, travel }) => ({
      offset: t / total,
      transform: `translateY(${-y}px)`,
      ...(travel ? { easing: stops.length === 1 ? TRAVEL_EASE : EASE } : {}),
    }))
    page.animate(frames, { duration: total })
  }
  page.complete && page.naturalHeight ? run() : page.addEventListener("load", run, { once: true })
}

if (!reduceMotion.matches) {
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      io.unobserve(entry.target)
      setTimeout(() => scrollOnce(entry.target), 4000)
    }
  }, { threshold: 0.6 })
  document.querySelectorAll("[data-autoscroll]").forEach((win) => io.observe(win))
}

/* ---------- Recordings: play while in view ----------
   One with data-hold rests on its first frame that long (ms) before it plays, and again before every replay. */
if (!reduceMotion.matches) {
  const waits = new WeakMap()
  const visible = new WeakSet()
  const start = (v) => {
    clearTimeout(waits.get(v))
    if (!v.dataset.hold || v.currentTime > 0) return void v.play().catch(() => {})
    v.preload = "auto" // fetch during the hold, so it plays the moment the hold ends
    waits.set(v, setTimeout(() => v.play().catch(() => {}), Number(v.dataset.hold)))
  }
  const stop = (v) => {
    clearTimeout(waits.get(v))
    v.pause()
  }
  const io = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      isIntersecting ? visible.add(target) : visible.delete(target)
      isIntersecting ? start(target) : stop(target)
    }
  }, { threshold: 0.35 })
  for (const v of document.querySelectorAll("video[data-autoplay]")) {
    io.observe(v)
    if (!v.dataset.hold) continue
    v.addEventListener("ended", () => {
      v.currentTime = 0
      if (visible.has(v)) start(v)
    })
  }
}

/* ---------- Stills that take turns on one screen (My lawmakers): the next every few seconds while in view ---------- */
for (const screen of document.querySelectorAll("[data-rotate]")) {
  const stills = [...screen.children]
  if (reduceMotion.matches || stills.length < 2) continue
  let at = 0
  let timer = null
  const next = () => {
    stills[at].classList.remove("is-shown")
    at = (at + 1) % stills.length
    stills[at].classList.add("is-shown")
  }
  new IntersectionObserver(([entry]) => {
    clearInterval(timer)
    timer = entry.isIntersecting ? setInterval(next, Number(screen.dataset.rotate) || 3600) : null
  }, { threshold: 0.35 }).observe(screen)
}

/* ---------- Seals drifting through a box (Sircus): the row is doubled so it loops, and rests while out of view ---------- */
for (const box of document.querySelectorAll(".seals")) {
  const track = box.querySelector(".seal-track")
  for (const seal of [...track.children]) {
    const copy = seal.cloneNode()
    copy.setAttribute("aria-hidden", "true")
    track.append(copy)
  }
  box.classList.add("is-looping")
  new IntersectionObserver(([entry]) => box.classList.toggle("is-paused", !entry.isIntersecting)).observe(box)
  // every seal loads as the box nears the screen: one waiting off to the side would otherwise arrive late, mid-drift
  const near = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return
    for (const img of track.querySelectorAll("img")) img.loading = "eager"
    near.disconnect()
  }, { rootMargin: "800px 0px" })
  near.observe(box)
}
