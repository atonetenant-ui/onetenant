# 🏠 OneTenant — Live Rental Management Platform

> Free for landlords. ₹49/month per tenant.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

## ⚡ One-Click Deploy to Render

1. Click the button above — OR go to [render.com](https://render.com) → New Web Service
2. Connect this GitHub repo
3. Render auto-detects everything. Confirm:
   - **Build:** `npm install`
   - **Start:** `node server.js`
4. Add env vars:
   - `JWT_SECRET` → any 32+ char random string
   - `NODE_ENV` → `production`
5. Click **Deploy** → live in ~3 minutes at `https://onetenant.onrender.com`

## API Status
All endpoints tested and verified ✅

| Endpoint | Status |
|---|---|
| `GET /api/health` | ✅ |
| `POST /api/auth/signup` | ✅ |
| `POST /api/auth/login` | ✅ |
| `GET/POST /api/properties` | ✅ |
| `GET/POST /api/tenants` | ✅ |
| `GET/POST /api/payments` | ✅ |
| `GET /api/payments/analytics/summary` | ✅ |
| `GET /api/notifications` | ✅ |
| `POST /api/subscriptions/create-order` | ✅ |

## Business Model
- Landlords: **₹0 forever**
- Tenants: **₹49/month** (via Razorpay)
