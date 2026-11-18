# Ty Foster: portfolio

Personal work portfolio: home, and case studies for Icite, Sircus and Deepwatch. Built with Vite and plain HTML, CSS and JavaScript.

```bash
npm ci
npm run dev       # http://localhost:5340
npm run build     # dist/
npm run preview   # http://localhost:5341
```

It deploys as a Cloudflare Worker with static assets (`wrangler.jsonc`): `npm run build`, then `npx wrangler deploy`.

`worker/index.js` runs only in front of `/media/*`. Cloudflare's static assets ignore `Range` requests, so it answers them with a proper `206`, which lets video seek and loop without downloading the whole file first.
