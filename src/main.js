// Shared by every page: entrance motion, the Contact control.
import { EMAIL } from "./config.js"

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)")
const finePointer = matchMedia("(hover: hover) and (pointer: fine)")

/* ---------- Entrance ----------
   What is on screen at load: the headline first, the rest staggered after it, then the nav and footer.
   What is below the fold enters as it scrolls into view, staggered when several arrive together; on a case study it
   is simply there, and the page's on-screen content staggers in once, header first.
   A [data-stagger] group (the About paragraphs) is spaced further apart so each one reads on its own.
   Timings are multiplied by --pace (base.css). */
const pace = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--pace")) || 1
const STEP = 70
const GROUP_STEP = 3 // a [data-stagger] child waits three steps after the one before it

function enter() {
  window.__entered = true
  const calm = reduceMotion.matches // a plain fade, all at once
  const k = pace()
  const visible = []
  const later = []
  for (const el of document.querySelectorAll("[data-enter]")) {
    if (!el.getClientRects().length) { el.classList.add("is-in"); continue } // not shown at this size
    if (el.getBoundingClientRect().top < innerHeight * 0.94) visible.push(el)
    else later.push(el)
  }
  let last = 0
  let slot = 0
  // a case study: the header (crumb, title, buttons) in order, a beat, then what is on screen below it in order;
  // what is below the fold is simply there, with no scroll animations
  if (document.body.classList.contains("page-case")) {
    let t = 60 * k
    let body = false
    for (const el of visible) {
      if (!body && !el.closest(".case-header")) {
        body = true
        t += 160 * k
      }
      el.style.setProperty("--delay", `${calm ? 0 : Math.round(t)}ms`)
      el.classList.add("is-in")
      last = calm ? 0 : t
      t += (body ? 110 : 80) * k
    }
    for (const el of later) el.classList.add("is-in", "is-still")
    for (const el of document.querySelectorAll("[data-chrome]")) {
      el.style.setProperty("--delay", `${calm ? 0 : Math.round(last + 320 * k)}ms`)
      el.classList.add("is-in")
    }
    return
  }
  // a [data-sync="id"] group (the project row) takes its timing from the group #id (About) instead of a slot of its own
  const synced = (el) => el.parentElement.closest("[data-sync]")
  for (const el of visible) {
    if (synced(el)) continue
    let delay = 0
    if (!calm) {
      if (el.dataset.enter === "headline") delay = 60 * k
      else {
        slot += el.parentElement.closest("[data-stagger]") ? GROUP_STEP : 1
        delay = (260 + (slot - 1) * STEP) * k
      }
    }
    el.style.setProperty("--delay", `${Math.round(delay)}ms`)
    el.classList.add("is-in")
    last = Math.max(last, delay)
  }
  for (const group of document.querySelectorAll("[data-sync]")) {
    const partners = visible.filter((el) => el.closest(`#${group.dataset.sync}`))
    const members = visible.filter((el) => synced(el) === group)
    members.forEach((el, i) => {
      const partner = partners[Math.min(i, partners.length - 1)]
      // same start and same pace as its partner, so each pair finishes together
      if (partner) {
        el.style.setProperty("--delay", partner.style.getPropertyValue("--delay"))
        el.style.setProperty("--dur", getComputedStyle(partner).getPropertyValue("--dur"))
      } else {
        el.style.setProperty("--delay", `${Math.round(calm ? 0 : (260 + slot++ * STEP) * k)}ms`)
      }
      el.classList.add("is-in")
    })
  }
  for (const el of document.querySelectorAll("[data-chrome]")) {
    el.style.setProperty("--delay", `${calm ? 0 : Math.round(last + 320 * k)}ms`)
    el.classList.add("is-in")
  }
  if (!later.length) return
  const io = new IntersectionObserver((entries) => {
    let slot = -1 // the first to arrive goes at once, the rest follow it
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      const el = entry.target
      if (!calm) {
        slot += slot < 0 ? 1 : el.parentElement.closest("[data-stagger]") ? GROUP_STEP : 1
        el.style.setProperty("--delay", `${Math.round(slot * STEP * k)}ms`)
      }
      el.classList.add("is-in")
      io.unobserve(el)
    }
  }, { rootMargin: "0px 0px -6% 0px" })
  later.forEach((el) => io.observe(el))
}

// start once the web font is in, so nothing reflows mid-animation (never wait longer than 600ms)
Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 600))]).then(() => requestAnimationFrame(enter))

/* ---------- Contact ----------
   Fine pointer: hovering shows the address, clicking copies it. Touch: a tap copies it. */
async function copy(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // http on a local network, or an older browser
    const area = Object.assign(document.createElement("textarea"), { value: text, readOnly: true })
    Object.assign(area.style, { position: "fixed", opacity: "0", pointerEvents: "none" })
    document.body.appendChild(area)
    area.select()
    let ok = false
    try { ok = document.execCommand("copy") } catch { ok = false }
    area.remove()
    return ok
  }
}

for (const button of document.querySelectorAll("[data-contact]")) {
  const emailFace = button.querySelector('[data-face="email"]')
  const copiedFace = button.querySelector('[data-face="copied"]')
  const status = document.querySelector("[data-contact-status]")
  // one span per letter, so the address can come into focus from left to right (base.css)
  emailFace.replaceChildren(...[...EMAIL].map((letter, i) => {
    const span = document.createElement("span")
    span.textContent = letter
    span.style.setProperty("--i", i)
    return span
  }))
  button.setAttribute("aria-label", `Contact: copy ${EMAIL}`)
  let timer
  const set = (state) => { button.dataset.state = state }
  const rest = () => (finePointer.matches && button.matches(":hover, :focus-visible") ? "email" : "label")

  button.addEventListener("pointerenter", (e) => {
    if (e.pointerType === "mouse" && finePointer.matches && button.dataset.state !== "copied") set("email")
  })
  button.addEventListener("pointerleave", (e) => {
    if (e.pointerType === "mouse" && button.dataset.state === "email") set("label")
  })
  button.addEventListener("focus", () => { if (button.matches(":focus-visible") && finePointer.matches) set("email") })
  button.addEventListener("blur", () => { if (button.dataset.state === "email") set("label") })
  button.addEventListener("click", async () => {
    const ok = await copy(EMAIL)
    copiedFace.textContent = ok ? "Copied" : EMAIL // if the clipboard refuses, at least show the address
    set("copied")
    if (status) status.textContent = ok ? `Copied ${EMAIL}` : EMAIL
    clearTimeout(timer)
    timer = setTimeout(() => set(rest()), ok ? 1600 : 4000)
  })
}

export { reduceMotion, finePointer }
