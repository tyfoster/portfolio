# Ty Foster: portfolio

Personal work portfolio: home, and case studies for Icite and Sircus. Built with Vite and plain HTML, CSS and JavaScript.

```bash
npm ci
npm run dev       # http://localhost:5340
npm run build     # dist/
npm run preview   # http://localhost:5341
```

It deploys as a Cloudflare Worker with static assets (`wrangler.jsonc`): `npm run build`, then `npx wrangler deploy`.
