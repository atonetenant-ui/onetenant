# 🏠 RentEase — Rent Collection Made Easy

> Collect rent without the chase. Free for landlords. ₹49/month per tenant.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

## Live URLs
- **Production:** https://rentease.in *(after domain setup)*
- **Render:** https://rentease.onrender.com

## One-click deploy
1. Click the button above → connect GitHub repo → Render reads `render.yaml`
2. Add env vars: `JWT_SECRET` (any 32+ char string), `NODE_ENV=production`
3. Live in ~3 minutes at `https://rentease.onrender.com`

## Project structure
```
rentease/
├── server.js              ← Express API + static frontend
├── db.js                  ← NeDB embedded database
├── public/index.html      ← Landing page + full dashboard
├── middleware/auth.js     ← JWT authentication
├── routes/
│   ├── auth.js            ← Signup / Login
│   ├── properties.js      ← Property CRUD
│   ├── tenants.js         ← Tenant CRUD
│   ├── payments.js        ← Payments + analytics
│   ├── subscriptions.js   ← Razorpay ₹49/tenant
│   └── notifications.js   ← Alerts
└── render.yaml            ← Render deployment config
```

## API endpoints
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register landlord |
| POST | `/api/auth/login` | Login |
| GET/POST | `/api/properties` | Properties CRUD |
| GET/POST | `/api/tenants` | Tenants CRUD |
| GET/POST | `/api/payments` | Payments + analytics |
| POST | `/api/subscriptions/create-order` | Razorpay ₹49 order |
| GET | `/api/notifications` | Alerts |
| GET | `/api/health` | Health check |

## Business model
| User | Cost |
|---|---|
| Landlords | **₹0 — forever** |
| Tenants | **₹49/month** |

**Revenue:** 100 tenants = ₹4,900/month · 1,000 tenants = ₹49,000/month

## Domain setup (rentease.in)
Add these DNS records at your registrar:
| Type | Host | Value |
|---|---|---|
| CNAME | www | rentease.onrender.com |
| A | @ | 216.24.57.1 |

## Tech stack
- **Backend:** Node.js + Express
- **Database:** NeDB (embedded, zero-config)
- **Auth:** JWT
- **Payments:** Razorpay
- **Hosting:** Render.com (free tier)
- **Frontend:** Vanilla HTML/CSS/JS (no build step)

---
Built with ❤️ for India's landlords.
