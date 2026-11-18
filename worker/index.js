// The site is static files; this Worker runs only in front of /media/* (wrangler.jsonc, run_worker_first).
// Cloudflare's static assets answer a Range request with the whole file, which leaves video unseekable until it has
// fully downloaded and can stop Safari playing it at all. Here a Range request gets a proper 206 with just the
// bytes asked for, and every media response says it accepts ranges. Anything this cannot handle is passed
// through untouched, so the worst case is the old behaviour.

// "bytes=a-b", "bytes=a-" or "bytes=-n" against a file of `size` bytes: { start, end } inclusive, "invalid" when it
// cannot be satisfied, or null when it is not a single byte range (several ranges, another unit: serve the whole file)
export function parseRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match || (match[1] === "" && match[2] === "")) return null
  let start
  let end
  if (match[1] === "") {
    const tail = Number(match[2])
    if (tail === 0) return "invalid"
    start = Math.max(0, size - tail)
    end = size - 1
  } else {
    start = Number(match[1])
    end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1)
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || start > end) return "invalid"
  return { start, end }
}

// passes on only bytes start..end (inclusive) of a stream, and stops reading the source once it has them
function slice(body, start, end) {
  let at = 0
  return body.pipeThrough(new TransformStream({
    transform(chunk, controller) {
      const from = Math.max(start - at, 0)
      const to = Math.min(end + 1 - at, chunk.byteLength)
      if (to > from) controller.enqueue(chunk.subarray(from, to))
      at += chunk.byteLength
      if (at > end) controller.terminate()
    },
  }))
}

export default {
  async fetch(request, env) {
    const header = request.headers.get("Range")
    if (!header || (request.method !== "GET" && request.method !== "HEAD")) {
      const response = await env.ASSETS.fetch(request)
      if (response.status !== 200) return response
      const headers = new Headers(response.headers)
      headers.set("Accept-Ranges", "bytes")
      return new Response(response.body, { status: 200, headers })
    }
    try {
      // the whole file, asked for without the Range (and without If-Range: the file only changes with a deploy)
      const wanted = new Headers(request.headers)
      wanted.delete("Range")
      wanted.delete("If-Range")
      const whole = await env.ASSETS.fetch(new Request(request.url, { method: request.method, headers: wanted }))
      const size = Number(whole.headers.get("Content-Length"))
      if (whole.status !== 200 || !Number.isSafeInteger(size) || size <= 0) return whole
      const headers = new Headers(whole.headers)
      headers.set("Accept-Ranges", "bytes")
      const range = parseRange(header, size)
      if (range === null) return new Response(whole.body, { status: 200, headers })
      if (range === "invalid") {
        whole.body?.cancel()
        headers.set("Content-Range", `bytes */${size}`)
        headers.delete("Content-Length")
        return new Response(null, { status: 416, headers })
      }
      headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`)
      headers.set("Content-Length", String(range.end - range.start + 1))
      if (request.method === "HEAD" || !whole.body) return new Response(null, { status: 206, headers })
      return new Response(slice(whole.body, range.start, range.end), { status: 206, headers })
    } catch {
      return env.ASSETS.fetch(request)
    }
  },
}
