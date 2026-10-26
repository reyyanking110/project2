# NEXA GRID login — 100% free (Vercel + Turso)

Your login page + a real backend. Hosting is free on **Vercel**, accounts are stored in a free **Turso** database.
No npm packages to install.

## Step 1 — Create the free database (Turso)
1. Go to **turso.tech** and sign up (GitHub login is easiest).
2. Click **Create database**, name it `nexa-auth`, pick the region closest to you.
3. Open the database and copy two things:
   - the **URL** (looks like `libsql://nexa-auth-yourname.turso.io`)
   - a **token**: click *Generate Token* (or "Create Token") and copy it.

## Step 2 — Put the code on GitHub
1. Create a GitHub repo named `login-form`.
2. Upload everything from this folder (keep the `api`, `lib`, `public` folders as they are).
   Make sure the file called `.gitignore` keeps its leading dot.

## Step 3 — Deploy on Vercel
1. Go to **vercel.com** → *Add New → Project* → import your `login-form` repo.
2. Framework Preset: **Other**. Leave Build Command and Output Directory empty.
3. Open **Environment Variables** and add:
   | Name | Value |
   |---|---|
   | `TURSO_URL` | the libsql:// URL from Step 1 |
   | `TURSO_TOKEN` | the token from Step 1 |
   | `REDIRECT_URL` | `https://reyyanabbas.vercel.app` |
4. Click **Deploy**. Open the address Vercel gives you — register, then log in. You'll be sent to reyyanabbas.vercel.app.

Link a "Login" button on your main site to that address.

## Run on your own PC (optional)
Needs Node 22.5+. In this folder: `npm start` then open http://localhost:3000. Without Turso keys it uses a local file. `npm test` runs 44 checks.

## Password reset emails (optional, free)
By default the reset link only appears in Vercel's logs. For real emails: create a free account at **resend.com**, make an API key, and add `RESEND_API_KEY` in Vercel. Without a verified domain, Resend only delivers to your own email address.

## Limits to know
- Social login buttons (Google/GitHub/X) need OAuth keys, so they do nothing yet.
- Turso free plan: 5 GB, 10M row writes/month — far more than a personal login needs.
- Your main site can read the login with `fetch("https://<login-site>/api/me", {credentials:"include"})` only if it's allowed in `ALLOWED_ORIGINS`, and browsers may block the cookie across different domains. Linking to the login page is the reliable way.
