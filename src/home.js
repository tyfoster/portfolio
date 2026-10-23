// Home: the project row swaps the picture above it (Figma 2665:30781, row 2665:31072).
import "./main.js"

const showcase = document.querySelector(".showcase")
const row = document.querySelector(".projects")
const projects = [...document.querySelectorAll(".project")]
// the last project with a picture stays chosen when the pointer leaves the row
let chosen = showcase?.dataset.show ?? "icite"

function activate(name) {
  for (const p of projects) p.toggleAttribute("data-active", p.dataset.project === name)
}

for (const project of projects) {
  const choose = () => {
    if (project.hasAttribute("data-image")) {
      chosen = project.dataset.project
      showcase.dataset.show = chosen
    }
    activate(project.dataset.project)
  }
  project.addEventListener("pointerenter", choose)
  project.addEventListener("focus", choose)
}
row?.addEventListener("pointerleave", () => activate(chosen))
row?.addEventListener("focusout", (e) => { if (!row.contains(e.relatedTarget)) activate(chosen) })
