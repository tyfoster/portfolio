import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { defineConfig } from "vite"

const root = import.meta.dirname

// `<!-- @include name [class] -->` pulls in src/partials/name.html; an optional class fills {{class}}.
// A missing partial fails the build rather than shipping a page without its nav or footer.
const partials = {
  name: "partials",
  transformIndexHtml: {
    order: "pre",
    handler: (html) =>
      html.replace(/<!--\s*@include\s+([\w-]+)(?:\s+([\w-]+))?\s*-->/g, (_, name, cls = "") =>
        readFileSync(resolve(root, "src/partials", `${name}.html`), "utf8").replaceAll("{{class}}", cls).trim(),
      ),
  },
}

export default defineConfig({
  plugins: [partials],
  build: {
    rollupOptions: {
      input: {
        home: resolve(root, "index.html"),
        icite: resolve(root, "icite/index.html"),
        sircus: resolve(root, "sircus/index.html"),
        notFound: resolve(root, "404.html"),
      },
    },
  },
})
