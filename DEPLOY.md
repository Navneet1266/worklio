# Deploying Worklio

## Architecture

| Layer | Service | Why |
|-------|---------|-----|
| Frontend | **Vercel** | Free static hosting, instant CDN, auto-deploy from Git |
| Backend | **Railway** | Supports persistent WebSocket connections (Vercel serverless can't) |
| Database | **MongoDB Atlas** | Free M0 cluster (512 MB), managed, globally available |
| Cache / Pub-Sub | **Railway Redis** | One-click plugin, `REDIS_URL` auto-injected into backend |

> **Why not backend on Vercel?** Socket.io requires a persistent TCP connection. Vercel functions time out after 10 s and have no shared memory, making real-time features impossible.

---

## Step 1 — MongoDB Atlas

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) → **Try Free**
2. Create an organisation + project (any name)
3. Choose **M0 Free** tier → cloud provider doesn't matter → **Create Cluster**
4. **Database Access** → Add new database user:
   - Username: `worklio`
   - Password: generate a strong one and **save it**
   - Role: **Read and write to any database**
5. **Network Access** → Add IP Address → **Allow access from anywhere** (`0.0.0.0/0`)
   *(Railway's IPs are dynamic, so we must allow all)*
6. **Database** → Connect → **Drivers** → copy the connection string:
   ```
   mongodb+srv://worklio:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
7. Replace `<password>` with your actual password and append the database name:
   ```
   mongodb+srv://worklio:YOURPASS@cluster0.xxxxx.mongodb.net/worklio?retryWrites=true&w=majority
   ```
   Save this — it goes in Railway as `MONGODB_URI`.

---

## Step 2 — Backend on Railway

### 2a. Create the project

1. Go to [railway.app](https://railway.app) → **Start a New Project**
2. Choose **Deploy from GitHub repo** → authorise Railway → select your repo
3. When prompted for the service root, set it to **`backend`**
4. Railway will detect the `Dockerfile` and build it automatically

### 2b. Add Redis

1. Inside your Railway project, click **+ Add Service** → **Database** → **Redis**
2. Railway automatically injects `REDIS_URL` into every service in the project — no manual copy needed

### 2c. Set environment variables

In the **backend** service → **Variables** tab, add:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | your Atlas connection string from Step 1 |
| `JWT_SECRET` | any long random string (e.g. `openssl rand -hex 32`) |
| `JWT_EXPIRES_IN` | `7d` |
| `CLIENT_URL` | *(leave blank for now — fill in after Vercel deploy)* |
| `PORT` | `5000` |

> `REDIS_URL` is injected automatically by the Redis plugin — do **not** add it manually.

### 2d. Generate a public domain

1. In the backend service → **Settings** → **Networking** → **Generate Domain**
2. You'll get a URL like `https://worklio-backend-production.up.railway.app`
3. **Copy this URL** — you need it for Vercel env vars

### 2e. Deploy

Railway builds from the `Dockerfile` on every push to your main branch. The first build takes ~2 min.

Verify it's working:
```
https://YOUR-RAILWAY-URL/health
```
Should return: `{ "status": "ok", "timestamp": "..." }`

---

## Step 3 — Frontend on Vercel

### 3a. Import the project

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Under **Root Directory**, click **Edit** and type `frontend`
4. Framework Preset: **Vite** (auto-detected)
5. Build Command: `npm run build`
6. Output Directory: `dist`

### 3b. Set environment variables

Before clicking **Deploy**, go to **Environment Variables** and add:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://YOUR-RAILWAY-URL` (no trailing slash) |
| `VITE_SOCKET_URL` | `https://YOUR-RAILWAY-URL` (same URL) |

Example:
```
VITE_API_URL   = https://worklio-backend-production.up.railway.app
VITE_SOCKET_URL = https://worklio-backend-production.up.railway.app
```

### 3c. Deploy

Click **Deploy**. Vercel builds the Vite app and gives you a URL like:
```
https://worklio.vercel.app
```

---

## Step 4 — Wire up CORS (final step)

Go back to Railway → backend service → **Variables** and set:

```
CLIENT_URL = https://worklio.vercel.app
```

*(Use your actual Vercel URL, not this example)*

Then click **Redeploy** or push any commit to trigger a rebuild. This tells the backend to accept cross-origin requests from your frontend.

---

## Environment Variables Cheat-Sheet

### Railway (backend)
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://worklio:PASSWORD@cluster0.xxxxx.mongodb.net/worklio?retryWrites=true&w=majority
JWT_SECRET=<64-char random hex>
JWT_EXPIRES_IN=7d
CLIENT_URL=https://YOUR-APP.vercel.app
PORT=5000
# REDIS_URL is auto-injected by Railway Redis plugin
```

### Vercel (frontend)
```
VITE_API_URL=https://YOUR-APP.up.railway.app
VITE_SOCKET_URL=https://YOUR-APP.up.railway.app
```

---

## Testing the Deployment

Run through this checklist in order:

- [ ] `GET https://YOUR-RAILWAY-URL/health` returns `{ status: "ok" }`
- [ ] Open Vercel URL → Login / Register page loads
- [ ] Register a new account → redirects to Dashboard
- [ ] Create a workspace → appears in sidebar
- [ ] Create a board → opens board page with empty lists
- [ ] Create a list and a card → card appears in list
- [ ] Open the card → modal opens and is scrollable
- [ ] Open two browser tabs, move a card → both tabs update in real-time (Socket.io working)
- [ ] Click the bell icon → notification panel slides in
- [ ] Create a second user, invite them to a workspace → notifications appear

---

## Troubleshooting

### CORS errors in browser console
Make sure `CLIENT_URL` in Railway exactly matches your Vercel URL, including `https://` and with no trailing slash.

### "Failed to connect" / Socket not updating in real-time
- Check that `VITE_SOCKET_URL` is set correctly in Vercel
- Railway services stay alive by default; confirm the backend service shows **Active**
- Socket.io uses `['websocket', 'polling']` transports so it will fall back to polling if WebSocket is blocked

### MongoDB connection error in Railway logs
- Check that `0.0.0.0/0` is in Atlas Network Access
- Verify the password in `MONGODB_URI` has no special characters that need URL-encoding (use `%40` for `@`, `%23` for `#`, etc.)

### Redis not working
- The Railway Redis plugin must be in the **same project** as the backend service
- Verify `REDIS_URL` appears in the backend's Variables tab (added automatically)
- The app gracefully falls back to single-instance mode without Redis — real-time will still work, just without multi-server pub/sub

### Frontend shows blank page after deploy
- Check browser console for 404 on JS chunks — make sure Output Directory is `dist`
- The `frontend/vercel.json` rewrites handle React Router; if missing, add it (already committed)

### Old env vars not taking effect on Vercel
Vercel bakes env vars into the build at compile time (`VITE_*` vars are embedded by Vite). After changing any `VITE_*` variable in Vercel, you must trigger a **Redeploy**.

---

## Auto-Deploy (Optional)

Both platforms watch your `main` branch:
- Push to `main` → Railway rebuilds the backend
- Push to `main` → Vercel rebuilds the frontend

For a staging environment, connect a `dev` branch to a second Railway service + Vercel preview deployment with different env vars.
