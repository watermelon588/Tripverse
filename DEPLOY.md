# Deploying TripVerse

Frontend on **Vercel**, backend on **Render**, database and auth stay on **Supabase**.
Deploy the backend first: the frontend needs its URL at build time.

## 1. Backend on Render

1. Render → **New → Blueprint** → connect `watermelon588/Tripverse`, branch `main`. It reads `render.yaml`:
   Python 3.12.4, `rootDir: backend`, `pip install -r requirements.txt`, then
   `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, health check `/api/health`.
2. Render asks for the secrets (the `sync: false` entries). Copy them from `backend/.env`, except:
   - **`DATABASE_URL`**: use Supabase's **session pooler** URL, not `db.<ref>.supabase.co`. That host is
     IPv6-only and Render has no IPv6, so the app would fail to start. Supabase → Project → **Connect** →
     *Session pooler*, then change the scheme to `postgresql+asyncpg://`. It looks like
     `postgresql+asyncpg://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`.
     (The transaction pooler on port 6543 also works; `database.py` turns off asyncpg's statement cache for it.)
   - **`CORS_ORIGINS`**: leave as `http://localhost:5173` for now; set it in step 3.
3. Wait for the deploy, then open `https://<service>.onrender.com/api/health`. It should say
   `"status":"healthy"` and `"database":{"status":"connected"...}`.

The free plan sleeps after 15 minutes without traffic; the first request after that takes about a minute.
The paid Starter plan ($7/month) doesn't sleep.

## 2. Frontend on Vercel

1. Vercel → **Add New → Project** → import `watermelon588/Tripverse`.
2. **Root Directory: `frontend`**. The framework, build command and output come from `frontend/vercel.json`.
3. Environment variables (Production), copied from `frontend/.env` except the first:
   - `VITE_API_URL` = `https://<service>.onrender.com` (no trailing slash)
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GOOGLE_MAPS_API_KEY`
4. Deploy. Note the URL, e.g. `https://tripverse.vercel.app`.

## 3. Connect them

- **Render** → the service → Environment → `CORS_ORIGINS` = the Vercel URL (comma-separate several, e.g.
  a custom domain too). Saving redeploys.
- **Supabase** → Authentication → URL Configuration: **Site URL** = the Vercel URL, and add
  `https://<your-vercel-domain>/**` to **Redirect URLs**. Sign-up confirmation and password-reset emails
  link back to `/profile` and `/reset-password` on whatever origin the user signed in from.
- **Google Cloud** → the Maps key → Application restrictions → HTTP referrers: add
  `https://<your-vercel-domain>/*`.

## 4. Check the live site

Open the Vercel URL and try: the home page, Explore, `/guide`, sign in, then one trip each way
(full itinerary and build with your guide), the studio, and an export. Watch Render's logs while you do.

## Rolling back

Both hosts keep earlier deploys: Vercel → Deployments → **Promote** an older one; Render → the service →
Events → **Rollback**. Or `git revert` the bad commit and push to `main`; both redeploy on push.

## Notes

- `media/` is not in git. The photos the app uses are committed in `frontend/src/assets/photos/`
  (the `@media` alias) and `frontend/public/`.
- `backend/requirements.txt` is pinned to the versions the tests ran against; upgrade deliberately.
- LangSmith tracing is off in production (`render.yaml`); its key was over the monthly limit.
