// Home: the project row swaps the picture above it (Figma 2665:30781, row 2665:31072).
import { reduceMotion } from "./main.js"

const showcase = document.querySelector(".showcase")
const row = document.querySelector(".projects")
const projects = [...document.querySelectorAll(".project")]
// the last project with a picture stays chosen when the pointer leaves the row
let chosen = showcase?.dataset.show ?? "icite"

function activate(name) {
  for (const p of projects) p.toggleAttribute("data-active", p.dataset.project === name)
}

/* Product reels: Icite and Sircus play their reel over the picture while they are pointed at or focused.
   It keeps playing while the pointer is anywhere over the picture or the row, so it can be watched, and while a
   project in the row has keyboard focus; the picture comes back once neither holds. A reel shows only once it is
   actually playing. Not played under reduced motion.
   Loading: nothing is requested with the page. When the browser is idle only each file's header is fetched; the
   files themselves start downloading when the pointer first comes over the picture or the row, or the row is
   focused, which is before a project can be chosen. On a slow or data-saving connection nothing is fetched ahead:
   a hover starts the download itself. */
const reels = new Map([...document.querySelectorAll(".show-video")].map((video) => [video.dataset.video, video]))
let playing = null // the reel that is wanted now
let leaving = null // the reel it replaced, kept on screen until the new one is, so no picture shows between the two
const FADE = 340 // a little over .show-video's fade (home.css)

// takes a reel off screen: fades it out, then rewinds it to its first lit frame (data-start), since the reel itself
// opens on a fade from black and a hover should not put a black panel over the picture
function release(video) {
  video.classList.remove("is-playing", "is-top")
  video.pause()
  setTimeout(() => { if (playing !== video && leaving !== video) video.currentTime = Number(video.dataset.start) || 0 }, FADE)
}

for (const video of reels.values()) {
  video.addEventListener("playing", () => {
    if (playing !== video) return
    // the incoming reel fades in above the outgoing one, which goes only once it is fully covered
    for (const other of reels.values()) other.classList.toggle("is-top", other === video)
    video.classList.add("is-playing")
    const out = leaving
    if (out) setTimeout(() => { if (leaving === out) { leaving = null; release(out) } }, FADE)
  })
}

// ends the reel and whatever it was replacing; the picture underneath shows again
function stopReel() {
  for (const video of [playing, leaving]) if (video) release(video)
  const was = playing
  playing = leaving = null
  if (was) activate(chosen) // the row goes back to the project whose picture is showing
}

// resolves to whether the reel is under way; false when there is none to play or it could not start
function playReel(name) {
  const video = reduceMotion.matches ? null : reels.get(name)
  if (video === playing) return Promise.resolve(Boolean(video))
  if (!video) { stopReel(); return Promise.resolve(false) }
  // from one reel to another: the one on screen stays until the new one has faded in over it
  if (video === leaving) {
    // back to the reel that was on its way out: it is still on screen, so it simply carries on
    if (playing) release(playing)
    leaving = null
  } else {
    const shown = playing?.classList.contains("is-playing") ? playing : leaving
    for (const other of [playing, leaving]) if (other && other !== shown) release(other)
    leaving = shown ?? null
  }
  playing = video
  return video.play().then(() => true, () => {
    if (playing !== video) return true // it was stopped or swapped for another, not refused
    playing = null
    if (leaving) { release(leaving); leaving = null }
    return false
  })
}

const work = showcase?.closest(".home-work") ?? row
const slow = () => {
  const c = navigator.connection
  return Boolean(c && (c.saveData || (c.effectiveType && c.effectiveType !== "4g")))
}
function warmReels(preload) {
  if (reduceMotion.matches || slow()) return
  if (!showcase?.getClientRects().length) return // tablet and phone have no showcase
  for (const video of reels.values()) {
    if (video.preload === preload || video.preload === "auto") continue
    video.preload = preload
    if (video.paused && video.readyState === 0) video.load()
  }
}
const whenIdle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 1200))
if (document.readyState === "complete") whenIdle(() => warmReels("metadata"))
else addEventListener("load", () => whenIdle(() => warmReels("metadata")), { once: true })
work?.addEventListener("pointerenter", () => warmReels("auto"), { once: true })
row?.addEventListener("focusin", () => warmReels("auto"), { once: true })

// the picture a project brings with it. One marked data-still="fallback" (Sircus, whose still is a logo on its brand
// colour) shows that still only when its reel cannot play or is slow to arrive: otherwise the reel fades in over the
// picture already there and back out to it, and that picture's project stays the chosen one.
const STILL_AFTER = 1200 // how long a reel may take to show before its project's still stands in
function showStill(project) {
  chosen = project.dataset.project
  showcase.dataset.show = chosen
}

const chooser = new Map()
for (const project of projects) {
  const name = project.dataset.project
  const choose = () => {
    const reelOnly = project.dataset.still === "fallback" && reels.has(name) && !reduceMotion.matches
    if (project.hasAttribute("data-image") && !reelOnly) showStill(project)
    const started = playReel(name) // stops any other reel first, which re-lights the chosen project
    activate(name)
    if (!reelOnly) return
    // still wanted, and its reel is neither showing nor on its way in time: the still stands in
    const wanted = () => project.matches(":hover, :focus") && !reels.get(name).classList.contains("is-playing")
    started.then((under) => { if (!under && wanted()) showStill(project) })
    setTimeout(() => {
      if (!wanted()) return
      showStill(project)
      if (leaving) { release(leaving); leaving = null } // the reel it was replacing gives way to the still
    }, STILL_AFTER)
  }
  chooser.set(project, choose)
  project.addEventListener("pointerenter", choose)
  project.addEventListener("focus", choose)
}
// while a reel plays its project stays lit, also once the pointer has moved up onto the picture
const lit = () => [...reels].find(([, video]) => video === playing)?.[0] ?? chosen
row?.addEventListener("pointerleave", () => activate(lit()))
// the pointer has left the picture and the row: the reel stops, unless a project holds keyboard focus, in which case
// the panel goes back to that project (its reel, its picture), not whichever one the pointer last crossed
work?.addEventListener("pointerleave", () => {
  const focused = row.querySelector(":focus-visible")
  if (focused) chooser.get(focused)?.()
  else stopReel()
})
row?.addEventListener("focusout", (e) => {
  if (row.contains(e.relatedTarget)) return
  if (work.matches(":hover")) activate(lit())
  else if (playing) stopReel()
  else activate(chosen)
})
