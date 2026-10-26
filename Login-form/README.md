# NEXA GRID — full-stack auth

Your glassmorphism login/register page, now backed by a real server.

**Stack:** Node 22 (built-in `http` + `node:sqlite`) · zero npm dependencies · scrypt password hashing · server-side sessions in SQLite · HttpOnly cookies · rate limiting · CORS allow-list.

## Run locally
```bash
cd glass-auth
npm start            # http://localhost:3000
npm test             # 22 end-to-end checks
```
Requires Node ≥ 22.5. Optionally copy `.env.example` to `.env`.

## What works
- Register / login (username **or** email) / logout, "remember me" (30-day session)
- Forgot password -> single-use, 1-hour reset link -> new password (signs out all devices)
- After login you're redirected to `REDIRECT_URL` (default `https://reyyanabbas.vercel.app`)
- `GET /api/me` lets your website check who is signed in

Reset emails: the link is printed in the server log. To actually email it, set `RESET_WEBHOOK_URL` to any service that accepts a JSON POST `{to, username, link}` (Resend, Make, Zapier, ...).
Social buttons need OAuth client IDs, so they are inert for now.

## Deploy the backend online (Render)
SQLite needs a disk that survives restarts, so **don't put this server on Vercel** (its functions have no persistent filesystem). Use Render, Railway, or Fly:
1. Push this folder to a GitHub repo.
2. Render -> New -> Blueprint -> pick the repo (it reads `render.yaml`). Set `PUBLIC_URL` to the URL Render gives you.
3. Open `https://<your-service>.onrender.com` — the login page is served from the same server, so cookies just work.

## Using it from reyyanabbas.vercel.app
- Link your "Login" button to the Render URL. After login users are sent back to your site.
- To read the session from your Vercel site: `fetch("https://<service>.onrender.com/api/me", {credentials:"include"})`, and set `COOKIE_SAMESITE=none` on the server. Browsers increasingly block third-party cookies, so this may not work everywhere; the more robust fix is a custom domain like `auth.yourdomain.com`.
- To host only the HTML on Vercel instead, set `window.NEXA_API_BASE = "https://<service>.onrender.com"` in `index.html` and `COOKIE_SAMESITE=none`.
