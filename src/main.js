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

/* ---------- Line reveal ----------
   A [data-lines] block (the home page's left-column copy) un-blurs in place a line at a time, as tcosta.com's text
   does: nothing moves, each line only fades in while its blur clears (base.css, [data-line]). On that site the 7
   phrases start 100ms apart and the last begins at 600ms, so the whole text reads as one reveal. Here every line on
   screen shares that same clock: LINE_STEP apart at most, and never more than LINE_SPAN from the first line to the last.
   Text is wrapped a line at a time in plain inline spans, which leaves layout untouched. The block's links and spans
   are never moved, cloned or replaced, so focus and hover stay with them: one that sits on a single line reveals
   whole, and one that runs over several has its text wrapped line by line inside it. Nothing is put back afterwards;
   each mark is dropped the moment its own animation ends or is cut short. Not scaled by --pace. */
const LINE_STEP = 100
const LINE_SPAN = 600
const LINE_DUR = 900 // base.css, line-reveal

// marks up el for the reveal; returns its units as { node, row, wrap } and how many rendered lines it has
function splitLines(el) {
  el.normalize()
  // where each piece of text sits, read from the text exactly as it is drawn: nothing is inserted before measuring,
  // so the lines found are the real ones. A piece is a word, ending after a hyphen, or a dash by itself; one the
  // browser still broke across lines (a long address, a slash-joined phrase) is taken a character at a time.
  // A piece is on a new line when its middle lies outside the current line's band, so smaller or raised text
  // (a superscript, inline code) stays on the line it is drawn on.
  const range = document.createRange()
  const texts = []
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) texts.push(walker.currentNode)
  let row = -1
  let band = null
  const rowOf = (rect) => {
    const mid = (rect.top + rect.bottom) / 2
    if (!band || mid < band.top || mid > band.bottom) { row++; band = { top: rect.top, bottom: rect.bottom } }
    else { band.top = Math.min(band.top, rect.top); band.bottom = Math.max(band.bottom, rect.bottom) }
    return row
  }
  const rects = (node, from, to) => {
    range.setStart(node, from)
    range.setEnd(node, to)
    return [...range.getClientRects()].filter((rect) => rect.width > 0)
  }
  const pieces = new Map() // text node -> [{ start, row }], in order
  for (const node of texts) {
    const list = []
    for (const match of node.textContent.matchAll(/[^\s\-–—]+-*|[–—]|-+/g)) {
      const found = rects(node, match.index, match.index + match[0].length)
      if (!found.length) continue
      if (found.length === 1) { list.push({ start: match.index, row: rowOf(found[0]) }); continue }
      let at = match.index
      for (const char of match[0]) {
        const [rect] = rects(node, at, at + char.length)
        if (rect) {
          const r = rowOf(rect)
          if (list.at(-1)?.row !== r || at === match.index) list.push({ start: at, row: r })
        }
        at += char.length
      }
    }
    pieces.set(node, list)
  }
  // a text node is cut where a line ends and each line's share goes into a new inline span
  const wrapText = (node) => {
    const list = pieces.get(node) ?? []
    if (!list.length) return []
    // cut from the end so the earlier offsets stay true; the space before a line's first word stays with the line above
    const cuts = list.filter((piece, i) => i > 0 && piece.row !== list[i - 1].row)
    const parts = [{ node, row: list[0].row }]
    for (const cut of cuts.reverse()) parts.splice(1, 0, { node: node.splitText(cut.start), row: cut.row })
    return parts.map((part) => {
      const span = document.createElement("span")
      part.node.before(span)
      span.append(part.node)
      return { node: span, row: part.row }
    })
  }
  // units: the block's own text line by line; an element the block already had (a link, the Welcome span) as it
  // stands when it sits on one line, or its text line by line inside it when it runs over several. That element is
  // then a unit of its own kind (wrap), on its first line, for whatever it draws around its text (a link's underline).
  const units = []
  for (const child of [...el.childNodes]) {
    if (child.nodeType === Node.TEXT_NODE) { units.push(...wrapText(child)); continue }
    const inside = texts.filter((node) => child.contains(node))
    const rows = new Set(inside.flatMap((node) => pieces.get(node)).map((piece) => piece.row))
    if (!rows.size) continue
    if (rows.size === 1) { units.push({ node: child, row: [...rows][0] }); continue }
    units.push({ node: child, row: Math.min(...rows), wrap: true })
    for (const node of inside) units.push(...wrapText(node))
  }
  return { units, rows: row + 1 }
}

// starts the lines of every block one after another from `start` ms, all on one clock; returns the last line's start
function revealLines(blocks, start, k) {
  const split = blocks.filter((el) => !el.classList.contains("is-split")).map((el) => ({ el, ...splitLines(el) })).filter((b) => b.rows)
  const total = split.reduce((n, b) => n + b.rows, 0)
  const step = total > 1 ? Math.min(LINE_STEP, LINE_SPAN / (total - 1)) : 0
  const at = (line) => Math.round(start + line * step)
  const last = total ? at(total - 1) : start
  let line = 0
  for (const { el, units, rows } of split) {
    for (const { node, row, wrap } of units) {
      const mark = wrap ? "data-line-wrap" : "data-line"
      node.setAttribute(mark, "")
      node.style.setProperty("--line-delay", `${at(line + row)}ms`)
      // the mark goes as soon as this unit's own animation ends or is cut short (a link's hover animation takes
      // over), so nothing can bring the reveal back on it later; the timer covers a unit that never animated
      const clear = (e) => {
        if (e && (e.target !== node || !e.animationName.startsWith("line-"))) return
        node.removeAttribute(mark)
        node.removeEventListener("animationend", clear)
        node.removeEventListener("animationcancel", clear)
      }
      node.addEventListener("animationend", clear)
      node.addEventListener("animationcancel", clear)
      setTimeout(clear, last + LINE_DUR + 200)
    }
    // the project row pairs with About by these: it starts with the block and ends with its last line
    el.style.setProperty("--delay", `${at(line)}ms`)
    el.style.setProperty("--dur", `${Math.round((at(line + rows - 1) - at(line) + LINE_DUR) / k)}ms`)
    el.classList.add("is-split", "is-in")
    line += rows
  }
  return last
}

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
  // the left-column copy un-blurs as one reveal, a line at a time. Lines are measured, so it waits for the web font:
  // a block whose own font is still loading takes the plain entrance instead of splitting on the fallback font's lines
  const fontIn = (el) => { try { return !document.fonts || document.fonts.check(getComputedStyle(el).font) } catch { return true } }
  const lined = (els) => (calm ? [] : els.filter((el) => el.hasAttribute("data-lines") && fontIn(el)))
  const lastLine = revealLines(lined(visible), 60, k)
  for (const el of visible) {
    if (synced(el)) continue
    if (el.classList.contains("is-split")) { last = Math.max(last, lastLine); continue } // the nav and footer follow the last line
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
    // blocks of lines arriving together un-blur as one reveal
    revealLines(lined(entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target)), 0, k)
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      const el = entry.target
      if (el.classList.contains("is-split")) { io.unobserve(el); continue }
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

/* ---------- Video sources ----------
   A <video> with more than one <source> falls back by itself only when a source is refused up front. If the one it
   chose then fails to decode (an HEVC file on hardware that cannot play it after all), that source is dropped and
   the next one loads, resuming playback if it was under way. */
for (const video of document.querySelectorAll("video")) {
  video.addEventListener("error", () => {
    const sources = video.querySelectorAll("source")
    const failed = [...sources].find((source) => source.src === video.currentSrc)
    if (sources.length < 2 || !failed || failed === sources[sources.length - 1]) return
    const resume = !video.paused
    failed.remove()
    video.load()
    if (resume) video.play().catch(() => {})
  })
}

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
