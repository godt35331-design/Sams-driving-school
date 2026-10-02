# 🚀 Deployment Guide: Split Hosting (Render Backend + Vercel Frontend)

This project is configured for **split cloud hosting**:
- **Backend API & MongoDB**: Hosted on **[Render](https://render.com)** (Node.js Web Service)
- **Frontend Client**: Hosted on **[Vercel](https://vercel.com)** (Edge Static Delivery)

---

## 🛠️ Step 1: Deploy Backend to Render

1. **Push your code to GitHub / GitLab**.
2. Go to your **[Render Dashboard](https://dashboard.render.com/)** and click **New +** &rarr; **Web Service**.
3. Select your repository.
4. Fill in the following fields:
   - **Name**: `sams-driving-school-api` (or any name you prefer)
   - **Region**: Frankfurt (or region closest to the UK)
   - **Branch**: `main`
   - **Root Directory**: Leave blank (root `.`)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
5. Under **Environment Variables**, add:
   | Key | Value / Description |
   | :--- | :--- |
   | `NODE_ENV` | `production` |
   | `PORT` | `10000` (Render provides this automatically) |
   | `MONGODB_URI` | Your MongoDB Atlas connection string |
   | `JWT_SECRET` | A secure 32+ character random string |
   | `JWT_EXPIRES_IN` | `7d` |
   | `FRONTEND_URL` | Your Vercel frontend URL (e.g. `https://your-project.vercel.app`) |
   | `INSTRUCTOR_NAME` | `Sam` |
   | `PHONE_NUMBER` | `+44 7700 900543` |
   | `WHATSAPP_NUMBER`| `447700900543` |
   | `EMAIL` | `contact@samsdrivingschool.co.uk` |
6. Click **Create Web Service**.
7. Once deployed, copy your Render URL (e.g., `https://sams-driving-school-api.onrender.com`).

---

## ⚡ Step 2: Deploy Frontend to Vercel

1. Go to your **[Vercel Dashboard](https://vercel.com/dashboard)** and click **Add New...** &rarr; **Project**.
2. Import your GitHub repository.
3. Configure the project settings:
   - **Framework Preset**: `Other`
   - **Root Directory**: `.` (leave as root; `vercel.json` automatically directs to `frontend`)
   - **Build Command**: `npm run build` (or leave default)
   - **Output Directory**: `frontend` (pre-configured in `vercel.json`)
4. In your code, update `vercel.json`:
   Replace `https://REPLACE_WITH_YOUR_RENDER_URL.onrender.com` with your real Render URL from Step 1:
   ```json
   {
     "rewrites": [
       {
         "source": "/api/:path*",
         "destination": "https://sams-driving-school-api.onrender.com/api/:path*"
       }
     ]
   }
   ```
   *(Alternatively, you can paste the Render URL directly into `frontend/js/config.js` in `CONFIGURED_RENDER_URL`)*.
5. Click **Deploy**.

---

## 🔒 Step 3: Connect Frontend & Backend

Once your Vercel site is deployed:
1. Copy your Vercel URL (e.g. `https://sams-driving-school.vercel.app`).
2. Go back to your **Render Web Service** &rarr; **Environment**.
3. Set `FRONTEND_URL` to your Vercel URL: `https://sams-driving-school.vercel.app`.
4. Click **Save Changes** (Render will automatically re-deploy with updated CORS).

---

## ✅ Verification Checklist

- [ ] Visit `https://your-render-url.onrender.com/api/health` &rarr; should return `{ "status": "ok" }`.
- [ ] Visit `https://your-vercel-url.vercel.app` &rarr; landing page loads instantly with full animations.
- [ ] Sign in to `/login` with your credentials &rarr; successfully authenticates and redirects to `/dashboard` or `/admin`.
- [ ] Verify Mobile Responsiveness on phone devices &rarr; zero horizontal overflow.
