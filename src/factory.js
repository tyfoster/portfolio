// The design factory (Icite case study, "How I work now"): signals → watchers → triage → design → build → review → ship.
// It sits in an image container (case.js expands it). Hovering a step lights everything upstream and downstream of it.
// At its default size one run plays once, when it scrolls into view; expanded, the runs play one after another on a
// loop, and clicking a signal (or the arrow keys) replays the run from it. With reduced motion nothing plays on its own
// and a replay shows one run, whole, without looping.
import { reduceMotion as reduce } from "./main.js"

const root = document.querySelector("[data-factory]")

if (root) {
  const W = 2060
  const H = 730
  const TOP = 36 // the column headings above the board
  const TITLE_TOP = 40 // the title's distance from the container's top, at the full 1040px container
  const NS = "http://www.w3.org/2000/svg"
  const shot = root.closest(".shot")
  const isOpen = () => shot?.classList.contains("is-open")

  const ICONS = {
    spark: '<path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9L4.9 19.1"/>',
    pulse: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
    pen: '<path d="M4 20l4-1 11-11-3-3L5 16l-1 4z"/><path d="M14 7l3 3"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
    alert: '<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',
    cursor: '<path d="M5 3l14 7-6 2-2 6z"/>',
    funnel: '<path d="M3 5h18l-7 8v6l-4-2v-4z"/>',
    branch: '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="7" r="2"/><path d="M6 7v10M18 9v1a4 4 0 01-4 4H8"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    pr: '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/><path d="M6 7v10M18 17V9a3 3 0 00-3-3h-4M13 4l-2 2 2 2"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    redo: '<path d="M20 12a8 8 0 11-2.3-5.7M20 4v5h-5"/>',
    tag: '<path d="M3 3h8l10 10-8 8L3 11z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14c3 0 5 2 5 5"/>',
    merge: '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 7v10M6 7c0 4 4 5 10 5"/>',
    issue: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/>',
    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0012 3z"/>',
    pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
    code: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    frame: '<path d="M7 3v18M17 3v18M3 7h18M3 17h18"/>',
  }
  const icon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>`
  const spark = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">${ICONS.spark}</svg>`
  const LOGOS = { zoom: "zoom.svg", slack: "slack.svg", agentation: "agentation.svg", github: "github.svg", linear: "linear.svg", dovetail: "dovetail.png", figma: "figma.svg", codex: "codex.svg", kimi: "kimi.svg" }
  const logo = (k, cls = "fx-logo") => `<img class="${cls}" src="/img/logos/${LOGOS[k]}" width="24" height="24" alt="" />`

  const COLUMNS = [[28, "Signals"], [248, "Watchers"], [498, "Triage"], [748, "Design"], [1258, "Build"], [1548, "Review"], [1848, "Ship"]]
  const PORT = { small: 106, mdlg: 152, idea: 198, fb: 244 } // the triage rows' centres, from the node's top

  // h is the design height; boxes then take their content's height around the same centre, so every step has the same
  // padding above and below. Signals and Triage keep theirs.
  const NODES = [
    { id: "zoom", signal: true, x: 28, y: 60, w: 180, h: 56, logo: "zoom", title: "Zoom calls", sub: "Calls and transcripts" },
    { id: "slack", signal: true, x: 28, y: 124, w: 180, h: 56, logo: "slack", title: "Customer Slack", sub: "#ext-* channels" },
    { id: "posthog", signal: true, x: 28, y: 280, w: 180, h: 56, icon: "pulse", title: "PostHog", sub: "Sessions and replays" },
    { id: "agentation", signal: true, x: 28, y: 470, w: 180, h: 56, logo: "agentation", title: "Agentation", sub: "Notes pinned to UI" },
    { id: "design", signal: true, x: 28, y: 534, w: 180, h: 56, icon: "pen", title: "Design tooling", sub: "Audits and checks" },

    { id: "feedback", claude: true, x: 248, y: 70, w: 210, h: 116, icon: "chat", title: "Feedback agent", meta: "Calls · Slack · Zoom" },
    { id: "error", claude: true, x: 248, y: 236, w: 210, h: 160, icon: "alert", title: "Error agent", meta: "PostHog", chips: ["Dead ends", "UI issues", "MCP issues", "Rage clicks"] },
    { id: "ui", claude: true, x: 248, y: 468, w: 210, h: 116, icon: "cursor", title: "UI agent", meta: "Agentation · design tooling" },

    { id: "triage", claude: true, fixed: true, x: 498, y: 150, w: 220, h: 276, icon: "funnel", title: "Triage", meta: "Dedupe · size it · route it",
      rows: [["small", "Small", "Build it, PR"], ["mdlg", "Md · Lg", "Scope in Linear"], ["idea", "Idea", "Dovetail + Linear"], ["fb", "Feedback", "Dovetail"]] },

    // Design: where it lives (Linear, Dovetail, Figma) on the left, the work itself on the right
    { id: "linear", tool: "linear", eyebrow: "Linear", x: 748, y: 170, w: 190, h: 100, icon: "issue", title: "Scoped issue", chips: ["Tag customer"] },
    { id: "dovetail", tool: "dovetail", eyebrow: "Dovetail", x: 748, y: 330, w: 190, h: 90, icon: "bulb", title: "Insight", meta: "Research repository" },
    { id: "figma", tool: "figma", eyebrow: "Figma", x: 748, y: 480, w: 190, h: 90, icon: "frame", title: "Design file", meta: "Flows · components" },
    { id: "ideation", eyebrow: "Human", x: 988, y: 64, w: 230, h: 100, icon: "pencil", title: "Ideation / Design", meta: "Problem solving · design" },
    { id: "prototype", claude: true, x: 988, y: 222, w: 230, h: 100, icon: "code", title: "Prototype", meta: "Working UI in code" },
    { id: "validation", eyebrow: "Human", x: 988, y: 386, w: 230, h: 128, icon: "check", title: "Validation", meta: "Review with", chips: ["Engineering", "Customers"] },
    { id: "final", claude: true, human: true, x: 988, y: 576, w: 230, h: 100, icon: "layers", title: "Final design concept", meta: "Linked in Linear and Figma" },

    { id: "branch", claude: true, x: 1274, y: 96, w: 218, h: 200, icon: "branch", title: "Branch", meta: "Isolated worktree", checks: ["Reproduce", "Verify", "Tests · CI · Lint"] },
    { id: "selfrev", claude: true, x: 1274, y: 340, w: 218, h: 106, icon: "shield", title: "Code review", meta: "Self-review before the PR" },

    { id: "pr", tool: "github", eyebrow: "GitHub", x: 1548, y: 60, w: 260, h: 84, icon: "pr", title: "Pull request", meta: "Opened from the branch" },
    { id: "indep", eyebrow: "Review agents · in parallel", x: 1548, y: 184, w: 260, h: 132, icon: "eye", title: "Independent review", duo: [["codex", "Codex"], ["kimi", "Kimi"]] },
    { id: "claude2", claude: true, x: 1548, y: 376, w: 260, h: 104, icon: "redo", title: "Second review", meta: "Reads findings · fixes · updates PR" },
    { id: "ready", tool: "github", eyebrow: "GitHub", x: 1548, y: 524, w: 260, h: 64, icon: "tag", title: "Ready for review" },
    { id: "team", eyebrow: "Human + agent", x: 1548, y: 624, w: 260, h: 84, icon: "users", title: "Team review", meta: "Teammates and their agents" },
    { id: "merge", tool: "github", eyebrow: "GitHub", x: 1848, y: 60, w: 190, h: 84, icon: "merge", title: "Merge", meta: "Squash and merge → Dev" },
  ]
  const byId = Object.fromEntries(NODES.map((n) => [n.id, n]))

  // [id, from, side, offset, to, side, offset, options]; a null offset is the side's middle, and offsets down a side
  // are in the design height, so they keep their place when a box takes its content's height
  const EDGES = [
    ["zoom-fb", "zoom", "r", null, "feedback", "l", 40],
    ["slack-fb", "slack", "r", null, "feedback", "l", 76],
    ["ph-err", "posthog", "r", null, "error", "l", 72],
    ["ag-ui", "agentation", "r", null, "ui", "l", 40],
    ["de-ui", "design", "r", null, "ui", "l", 76],
    ["fb-tr", "feedback", "r", null, "triage", "l", 40],
    ["err-tr", "error", "r", null, "triage", "l", 140],
    ["ui-tr", "ui", "r", null, "triage", "l", 240],
    ["tr-small", "triage", "r", PORT.small, "branch", "l", null, { lane: 36, label: "Small · straight to a branch" }],
    ["tr-mdlg", "triage", "r", PORT.mdlg, "linear", "l", 36],
    ["tr-idea-dv", "triage", "r", PORT.idea, "dovetail", "l", 30],
    ["tr-idea-ln", "triage", "r", PORT.idea, "linear", "l", 70, { dashed: true }],
    ["tr-fb", "triage", "r", PORT.fb, "dovetail", "l", 60],
    // design: two-way where the work goes back and forth
    ["ln-idea", "linear", "r", 30, "ideation", "l", 30, { both: true }],
    ["dv-idea", "dovetail", "r", 30, "ideation", "l", 55, { both: true }],
    ["fg-idea", "figma", "r", 20, "ideation", "l", 80, { both: true }],
    ["fg-proto", "figma", "r", 45, "prototype", "l", 50, { both: true }],
    ["ln-final", "linear", "r", 70, "final", "l", 30, { both: true }],
    ["fg-final", "figma", "r", 70, "final", "l", 65, { both: true }],
    ["idea-proto", "ideation", "b", null, "prototype", "t", null, { both: true }],
    ["proto-val", "prototype", "b", null, "validation", "t", null, { both: true, label: "Iterate", dx: 34 }],
    ["val-final", "validation", "b", null, "final", "t", null],
    ["final-br", "final", "r", null, "branch", "l", 150],
    ["br-sr", "branch", "b", null, "selfrev", "t", null],
    ["sr-pr", "selfrev", "r", null, "pr", "l", null],
    ["pr-ind", "pr", "b", null, "indep", "t", null, { label: "Sent to review agents", dx: 74 }],
    ["ind-c2", "indep", "b", 80, "claude2", "t", 80, { label: "Findings", dx: -38 }],
    ["c2-ind", "claude2", "t", 180, "indep", "b", 180, { label: "Push fix", dx: 38 }],
    ["c2-rdy", "claude2", "b", null, "ready", "t", null, { label: "Update PR", dx: 46 }],
    ["rdy-team", "ready", "b", null, "team", "t", null],
    ["team-merge", "team", "r", null, "merge", "l", null],
  ].map(([id, f, fs, fo, t, ts, to, o = {}]) => ({ id, f, fs, fo, t, ts, to, ...o }))
  const edgeById = Object.fromEntries(EDGES.map((e) => [e.id, e]))

  // Example runs. The main one starts from calls and Slack together and goes the whole way: feedback, triage,
  // Linear and Dovetail, the design column with its back and forth, then build, review and merge. A step's e and n can
  // be lists, travelled and lit together.
  const ORDER = ["main", "posthog", "agentation", "design"]
  const RUN_OF = { zoom: "main", slack: "main", posthog: "posthog", agentation: "agentation", design: "design" }
  const RUNS = {
    main: [
      { n: ["zoom", "slack"] },
      { e: ["zoom-fb", "slack-fb"], n: "feedback" },
      { e: "fb-tr", n: "triage", row: "idea" },
      { e: ["tr-idea-ln", "tr-idea-dv"], n: ["linear", "dovetail"], chips: [0] },
      { e: ["ln-idea", "dv-idea"], n: "ideation" },
      { e: "fg-idea", rev: true, n: "figma" },
      { e: "fg-idea", n: "ideation" },
      { e: "dv-idea", rev: true, n: "dovetail" },
      { e: "dv-idea", n: "ideation" },
      { e: "idea-proto", n: "prototype" },
      { e: "fg-proto", rev: true, n: "figma" },
      { e: "fg-proto", n: "prototype" },
      { e: "proto-val", n: "validation", chips: [0, 1] },
      { e: "proto-val", rev: true, n: "prototype" },
      { e: "proto-val", n: "validation" },
      { e: "val-final", n: "final" },
      { e: ["ln-final", "fg-final"], rev: true, n: ["linear", "figma"] },
      { e: "final-br", n: "branch", tick: [0] },
      { n: "branch", tick: [1, 2] },
      { e: "br-sr", n: "selfrev" },
      { e: "sr-pr", n: "pr", badge: "#495" },
      { e: "pr-ind", n: "indep" },
      { e: "ind-c2", n: "claude2" },
      { e: "c2-ind", n: "indep" },
      { e: "ind-c2", n: "claude2" },
      { e: "c2-rdy", n: "ready" },
      { e: "rdy-team", n: "team" },
      { e: "team-merge", n: "merge" },
      { back: true, n: ["zoom", "slack"] },
    ],
    posthog: [
      { n: "posthog" },
      { e: "ph-err", n: "error" },
      { e: "err-tr", n: "triage", row: "small" },
      { e: "tr-small", n: "branch", tick: [0] },
      { n: "branch", tick: [1, 2] },
      { e: "br-sr", n: "selfrev" },
      { e: "sr-pr", n: "pr", badge: "#482" },
      { e: "pr-ind", n: "indep" },
      { e: "ind-c2", n: "claude2" },
      { e: "c2-ind", n: "indep" },
      { e: "ind-c2", n: "claude2" },
      { e: "c2-rdy", n: "ready" },
      { e: "rdy-team", n: "team" },
      { e: "team-merge", n: "merge" },
      { back: true, n: "posthog" },
    ],
    agentation: [
      { n: "agentation" },
      { e: "ag-ui", n: "ui" },
      { e: "ui-tr", n: "triage", row: "small" },
      { e: "tr-small", n: "branch", tick: [0] },
      { n: "branch", tick: [1, 2] },
      { e: "br-sr", n: "selfrev" },
      { e: "sr-pr", n: "pr", badge: "#483" },
      { e: "pr-ind", n: "indep" },
      { e: "ind-c2", n: "claude2" },
      { e: "c2-rdy", n: "ready" },
      { e: "rdy-team", n: "team" },
      { e: "team-merge", n: "merge" },
      { back: true, n: "agentation" },
    ],
    // the long way round: scoped, designed, validated, then built
    design: [
      { n: "design" },
      { e: "de-ui", n: "ui" },
      { e: "ui-tr", n: "triage", row: "mdlg" },
      { e: "tr-mdlg", n: "linear" },
      { e: "ln-idea", n: "ideation" },
      { e: "idea-proto", n: "prototype" },
      { e: "fg-proto", rev: true, n: "figma" },
      { e: "fg-proto", n: "prototype" },
      { e: "proto-val", n: "validation", chips: [0, 1] },
      { e: "proto-val", rev: true, n: "prototype" },
      { e: "proto-val", n: "validation" },
      { e: "val-final", n: "final" },
      { e: "ln-final", rev: true, n: "linear" },
      { e: "final-br", n: "branch", tick: [0] },
      { n: "branch", tick: [1, 2] },
      { e: "br-sr", n: "selfrev" },
      { e: "sr-pr", n: "pr", badge: "#491" },
      { e: "pr-ind", n: "indep" },
      { e: "ind-c2", n: "claude2" },
      { e: "c2-rdy", n: "ready" },
      { e: "rdy-team", n: "team" },
      { e: "team-merge", n: "merge" },
      { back: true, n: "design" },
    ],
  }

  /* ---------- Draw ----------
     Everything is a span: the diagram sits inside the container's button. */
  const span = (cls, html = "") => Object.assign(document.createElement("span"), { className: cls, innerHTML: html })
  const stage = span("factory-stage")
  const canvas = span("factory-canvas")
  canvas.style.width = `${W}px`
  canvas.style.height = `${H + TOP}px`
  stage.append(canvas)
  root.append(stage)

  const title = span("fx-title-main", "The design factory")
  title.style.left = `${COLUMNS[0][0]}px`
  canvas.append(title)
  for (const [i, [x, name]] of COLUMNS.entries()) {
    const head = span("fx-colhead", `<b>0${i + 1}</b>${name}`)
    head.style.left = `${x}px`
    canvas.append(head)
  }

  const board = span("fx-board", `
    <span class="fx-layer"><span class="fx-group" style="left:1258px;top:50px;width:250px;height:420px"><span class="fx-group-label">${spark}Claude · one branch per ask</span></span></span>
    <svg class="fx-edges" width="${W}" height="${H}" aria-hidden="true">
      <defs><marker id="fx-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="fx-arrow" d="M0 0.8L7 4L0 7.2z"/></marker></defs>
      <g data-base></g><g data-trails></g><g data-dots></g>
    </svg>
    <span class="fx-layer" data-labels></span>
    <span class="fx-layer" data-nodes></span>`)
  board.style.width = `${W}px`
  board.style.height = `${H}px`
  board.style.top = `${TOP}px`
  canvas.append(board)
  const base = board.querySelector("[data-base]")
  const trails = board.querySelector("[data-trails]")
  const dots = board.querySelector("[data-dots]")
  const labels = board.querySelector("[data-labels]")
  const nodeLayer = board.querySelector("[data-nodes]")

  const nodeEls = {}
  for (const n of NODES) {
    n.h0 = n.h
    n.y0 = n.y
    let html
    if (n.signal) {
      html = `<span class="fx-ic">${n.logo ? logo(n.logo, "fx-ic-logo") : icon(n.icon)}</span><span class="fx-txt"><span class="fx-nm">${n.title}</span><span class="fx-sb">${n.sub}</span></span><span class="fx-play">Replay</span>`
    } else {
      const eyebrow = n.claude ? `${spark}${n.human ? "Human + Claude" : "Claude"}` : n.tool ? `${logo(n.tool)}${n.eyebrow}` : n.eyebrow
      html = `<span class="fx-eyebrow">${eyebrow}</span><span class="fx-title">${icon(n.icon)}${n.title}</span>`
      if (n.meta) html += `<span class="fx-meta">${n.meta}</span>`
      if (n.chips) html += `<span class="fx-chips">${n.chips.map((c) => `<span class="fx-chip">${c}</span>`).join("")}</span>`
      if (n.duo) html += `<span class="fx-duo">${n.duo.map(([k, name]) => `<span>${logo(k, "fx-duo-logo")}<span>${name}<small>Findings</small></span></span>`).join("")}</span>`
      if (n.checks) html += `<span class="fx-checks">${n.checks.map((c) => `<span><i></i>${c}</span>`).join("")}</span>`
      if (n.rows) html += n.rows.map(([k, a, b]) => `<span class="fx-row" data-row="${k}" style="top:${PORT[k] - 20}px"><b>${a}</b><span>→ ${b}</span></span>`).join("")
      if (n.id === "pr") html += `<span class="fx-badge" hidden></span>`
    }
    const el = span(n.signal ? "fx-node fx-signal" : "fx-node", html)
    Object.assign(el.style, { left: `${n.x}px`, top: `${n.y}px`, width: `${n.w}px` })
    if (n.signal || n.fixed) el.style.height = `${n.h}px`
    if (n.signal) {
      // expanded, a signal replays its run; at the default size the click opens the container as usual
      el.addEventListener("click", (e) => {
        if (!isOpen()) return
        e.stopPropagation()
        loop(RUN_OF[n.id])
      })
    }
    nodeLayer.append(el)
    nodeEls[n.id] = el
  }
  const badge = nodeEls.pr.querySelector(".fx-badge")

  const DIR = { r: [1, 0], l: [-1, 0], t: [0, -1], b: [0, 1] }
  const anchor = (id, side, off) => {
    const n = byId[id]
    const down = off == null ? n.h / 2 : (off * n.h) / n.h0
    if (side === "r") return [n.x + n.w, n.y + down]
    if (side === "l") return [n.x, n.y + down]
    if (side === "t") return [n.x + (off ?? n.w / 2), n.y]
    return [n.x + (off ?? n.w / 2), n.y + n.h]
  }
  // rev draws the same edge from its far end, for a run that travels it the other way
  const pathFor = (e, rev = false) => {
    let [x1, y1] = anchor(e.f, e.fs, e.fo)
    let [x2, y2] = anchor(e.t, e.ts, e.to)
    if (e.lane != null) {
      // over the top of the Design column on its own lane, rounded at each turn
      const a = x1 + 15
      const b = x2 - 22
      const l = e.lane
      return rev
        ? `M${x2} ${y2}H${b + 8}Q${b} ${y2} ${b} ${y2 - 8}V${l + 8}Q${b} ${l} ${b - 8} ${l}H${a + 8}Q${a} ${l} ${a} ${l + 8}V${y1 - 8}Q${a} ${y1} ${a - 8} ${y1}H${x1}`
        : `M${x1} ${y1}H${a - 8}Q${a} ${y1} ${a} ${y1 - 8}V${l + 8}Q${a} ${l} ${a + 8} ${l}H${b - 8}Q${b} ${l} ${b} ${l + 8}V${y2 - 8}Q${b} ${y2} ${b + 8} ${y2}H${x2}`
    }
    let fs = e.fs
    let ts = e.ts
    if (rev) {
      ;[x1, y1, x2, y2, fs, ts] = [x2, y2, x1, y1, ts, fs]
    }
    const k = Math.max(18, Math.min(110, Math.hypot(x2 - x1, y2 - y1) * 0.45))
    const [ax, ay] = DIR[fs]
    const [bx, by] = DIR[ts]
    return `M${x1} ${y1}C${x1 + ax * k} ${y1 + ay * k} ${x2 + bx * k} ${y2 + by * k} ${x2} ${y2}`
  }

  const edgeEls = {}
  const labelEls = {}
  const addLabel = (text, x, y) => {
    const l = span("fx-label")
    l.textContent = text
    l.style.left = `${x}px`
    l.style.top = `${y}px`
    labels.append(l)
    return l
  }
  const signals = NODES.filter((n) => n.signal)
  const mid = (n) => n.y + n.h / 2
  const railTop = 14
  let backPath = () => ""

  // Boxes take their content's height (in the final font) around their design centre, then the edges are drawn.
  // Runs again whenever a font finishes loading, so a late face never leaves edges pointing at old heights.
  function layout() {
    const sized = NODES.filter((n) => !n.signal && !n.fixed)
    const heights = sized.map((n) => nodeEls[n.id].offsetHeight) // every read first, then every write: one layout
    sized.forEach((n, i) => {
      n.h = heights[i]
      n.y = n.y0 + (n.h0 - n.h) / 2
      nodeEls[n.id].style.top = `${n.y}px`
    })
    base.replaceChildren()
    labels.replaceChildren()
    for (const e of EDGES) {
      const p = document.createElementNS(NS, "path")
      p.setAttribute("d", pathFor(e))
      p.setAttribute("class", e.dashed ? "fx-edge fx-edge--dashed" : "fx-edge")
      p.setAttribute("marker-end", "url(#fx-arrow)")
      if (e.both) p.setAttribute("marker-start", "url(#fx-arrow)")
      base.append(p)
      edgeEls[e.id] = p
      if (e.label) {
        const m = p.getPointAtLength(p.getTotalLength() / 2)
        labelEls[e.id] = addLabel(e.label, m.x + (e.dx || 0), m.y)
      }
    }
    // Write-back: merged work reports back to whichever signal asked, along a rail over the top and down the left
    const from = anchor("merge", "r")
    const rail = document.createElementNS(NS, "path")
    rail.setAttribute("class", "fx-rail")
    rail.setAttribute("d", `M${from[0]} ${from[1]}H${W - 10}V${railTop}H12V${mid(signals.at(-1))}` + signals.map((n) => `M12 ${mid(n)}H${n.x}`).join(""))
    base.append(rail)
    addLabel("Write-back · merged, with a note in the thread that asked", 640, railTop)
    backPath = (id) => `M${from[0]} ${from[1]}H${W - 10}V${railTop}H12V${mid(byId[id])}H${byId[id].x}`
  }

  /* ---------- Hover: everything upstream and downstream ---------- */
  const out = {}
  const into = {}
  for (const e of EDGES) {
    ;(out[e.f] ??= []).push(e)
    ;(into[e.t] ??= []).push(e)
  }
  function related(id) {
    const nodes = new Set([id])
    const edges = new Set()
    for (const [map, key] of [[out, "t"], [into, "f"]]) {
      const queue = [id]
      const seen = new Set([id])
      while (queue.length) {
        for (const e of map[queue.shift()] || []) {
          edges.add(e.id)
          if (!seen.has(e[key])) { seen.add(e[key]); nodes.add(e[key]); queue.push(e[key]) }
        }
      }
    }
    return { nodes, edges }
  }
  function hover(id) {
    canvas.classList.toggle("is-hovering", Boolean(id))
    const r = id ? related(id) : { nodes: new Set(), edges: new Set() }
    for (const [k, el] of Object.entries(nodeEls)) el.classList.toggle("is-rel", r.nodes.has(k))
    for (const [k, el] of Object.entries(edgeEls)) el.classList.toggle("is-rel", r.edges.has(k))
    for (const [k, el] of Object.entries(labelEls)) el.classList.toggle("is-rel", r.edges.has(k))
  }
  for (const [id, el] of Object.entries(nodeEls)) {
    el.addEventListener("mouseenter", () => hover(id))
    el.addEventListener("mouseleave", () => hover(null))
  }

  /* ---------- Runs ---------- */
  let token = 0
  const wait = (ms, t) => new Promise((r) => setTimeout(r, reduce.matches ? 0 : ms)).then(() => t === token)

  function reset() {
    trails.replaceChildren()
    dots.replaceChildren()
    for (const el of Object.values(nodeEls)) el.classList.remove("is-on", "is-current")
    for (const el of board.querySelectorAll(".fx-row.is-on, .fx-checks .is-done, .fx-chip.is-on")) el.classList.remove("is-on", "is-done")
    badge.hidden = true
  }

  function travel(d, t) {
    const p = document.createElementNS(NS, "path")
    p.setAttribute("d", d)
    p.setAttribute("class", "fx-trail")
    trails.append(p)
    if (reduce.matches) return Promise.resolve(t === token)
    const len = p.getTotalLength()
    p.style.strokeDasharray = len
    p.style.strokeDashoffset = len
    const dot = document.createElementNS(NS, "circle")
    dot.setAttribute("r", 4)
    dot.setAttribute("class", "fx-dot")
    dots.append(dot)
    const ms = Math.max(450, Math.min(1100, len * 1.6))
    return new Promise((resolve) => {
      const start = performance.now()
      const tick = (now) => {
        if (t !== token) { dot.remove(); return resolve(false) }
        const x = Math.min(1, (now - start) / ms)
        const eased = x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2
        p.style.strokeDashoffset = len * (1 - eased)
        const pt = p.getPointAtLength(len * eased)
        dot.setAttribute("cx", pt.x)
        dot.setAttribute("cy", pt.y)
        if (x < 1) requestAnimationFrame(tick)
        else { dot.remove(); resolve(true) }
      }
      requestAnimationFrame(tick)
    })
  }

  // one run from a signal; resolves false if another run took over
  async function run(id, t) {
    reset()
    let prev = []
    for (const s of RUNS[id]) {
      const ns = [].concat(s.n)
      const paths = s.back ? ns.map(backPath) : s.e ? [].concat(s.e).map((e) => pathFor(edgeById[e], s.rev)) : []
      if (paths.length && (await Promise.all(paths.map((d) => travel(d, t)))).includes(false)) return false
      for (const p of prev) if (!ns.includes(p)) nodeEls[p].classList.remove("is-current")
      for (const n of ns) {
        const el = nodeEls[n]
        el.classList.add("is-on", "is-current")
        if (s.row) el.querySelector(`[data-row="${s.row}"]`)?.classList.add("is-on")
        if (s.tick) { const items = el.querySelectorAll(".fx-checks > span"); for (const i of s.tick) items[i]?.classList.add("is-done") }
        if (s.chips) { const chips = el.querySelectorAll(".fx-chip"); for (const i of s.chips) chips[i]?.classList.add("is-on") }
      }
      if (s.badge) { badge.textContent = s.badge; badge.hidden = false }
      prev = ns
      if (!(await wait(paths.length ? 520 : 420, t))) return false
    }
    for (const p of prev) nodeEls[p].classList.remove("is-current")
    return true
  }

  let shown = "main" // the run playing or last played, for the arrow keys
  const once = (id) => { shown = id; return run(id, ++token) }
  // expanded: every run in turn, starting from the given one, until the container closes. With reduced motion every
  // wait is zero, so a loop would spin without pause: it shows the one run instead.
  async function loop(id) {
    if (reduce.matches) return once(id)
    const t = ++token
    for (let i = ORDER.indexOf(id); ; i = (i + 1) % ORDER.length) {
      shown = ORDER[i]
      if (!(await run(ORDER[i], t))) return
      if (!(await wait(1400, t))) return
    }
  }

  /* ---------- Fit the container ---------- */
  const fit = () => {
    const cs = getComputedStyle(root)
    const w = root.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
    const h = root.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
    const s = Math.min(w / W, h / (H + TOP))
    canvas.style.transform = `scale(${s})`
    stage.style.width = `${W * s}px`
    stage.style.height = `${(H + TOP) * s}px`
    // expanded, the container zooms to the diagram itself (plus a little room), not the whole box around it
    if (shot) {
      const cw = root.clientWidth
      const ch = root.clientHeight
      const m = 12
      const dw = W * s + 2 * m
      const pct = (n, of) => ((n / of) * 100).toFixed(3)
      // the title sits near the container's top, above the centred diagram (40px at 1040 wide, less in smaller ones)
      const titleTop = TITLE_TOP * Math.min(1, cw / 1040)
      const oy = (ch - (H + TOP) * s) / 2
      title.style.top = `${(titleTop - oy) / s}px`
      const top = titleTop - m
      const dh = oy + (H + TOP) * s + m - top
      shot.dataset.focus = [pct((cw - dw) / 2, cw), pct(top, ch), pct(dw, cw), pct(dh, ch)].join(",")
    }
  }
  fit()
  new ResizeObserver(fit).observe(root)

  let played = false
  document.fonts.ready.then(() => {
    layout()
    document.fonts.addEventListener("loadingdone", layout)

    // expanded, the runs loop; closed, whatever is playing stops where it is
    if (shot) {
      const label = shot.getAttribute("aria-label")
      let open = false
      new MutationObserver(() => {
        if (isOpen() === open) return
        open = isOpen()
        shot.setAttribute("aria-label", open ? "The design factory. Left and right arrow keys switch runs; Escape closes it." : label)
        if (!open) return void token++
        played = true
        if (!reduce.matches) loop("main")
      }).observe(shot, { attributes: true, attributeFilter: ["class"] })

      // expanded, the arrow keys step through the runs: the keyboard's way to what clicking a signal does
      addEventListener("keydown", (e) => {
        if (!isOpen()) return
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
        if (!step) return
        e.preventDefault()
        loop(ORDER[(ORDER.indexOf(shown) + step + ORDER.length) % ORDER.length])
      })
    }

    if (reduce.matches) return // nothing plays on its own
    // the first run plays once, when most of the container is on screen
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      io.disconnect()
      setTimeout(() => { if (!played && !isOpen()) { played = true; once("main") } }, 400)
    }, { threshold: 0.5 })
    io.observe(root)
  })
}
