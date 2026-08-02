# StockSense Backend

Retail Inventory & Billing Management System — Node.js + Express + MongoDB

---

## Quick Start

```bash
cd Backend/stocksense-backend
npm install
cp .env.example .env       # edit MONGO_URI, JWT_SECRET as needed
npm run seed               # creates 2 demo users + 8 sample products
npm run dev                # starts with nodemon on port 5000
```

---

## Demo Credentials (after seeding)

| Role    | Employee ID | Password    |
|---------|-------------|-------------|
| Manager | EMP001      | manager123  |
| Biller  | EMP002      | biller123   |

---

## Environment Variables (.env)

| Variable       | Description                              | Default                          |
|----------------|------------------------------------------|----------------------------------|
| PORT           | Server port                              | 5000                             |
| MONGO_URI      | MongoDB connection string                | mongodb://localhost:27017/stocksense |
| JWT_SECRET     | Secret for signing JWTs                  | _(set a strong value)_           |
| JWT_EXPIRES_IN | JWT expiry duration                      | 7d                               |
| FRONTEND_URL   | Allowed CORS origin                      | http://localhost:5173            |

---

## API Overview

### Auth
| Method | Endpoint         | Access | Description                    |
|--------|------------------|--------|--------------------------------|
| POST   | /api/auth/login  | Public | Login → returns JWT + role     |
| GET    | /api/auth/me     | Any    | Get current user info          |

### Products
| Method | Endpoint                      | Access  | Description                        |
|--------|-------------------------------|---------|-------------------------------------|
| POST   | /api/products                 | Manager | Create product (barcode generated) |
| GET    | /api/products                 | Both    | List all products                  |
| GET    | /api/products/barcode/:code   | Both    | Lookup by barcode (biller scan)    |
| GET    | /api/products/low-stock       | Manager | Products below reorderThreshold    |
| PUT    | /api/products/:id             | Manager | Update product details             |

### Bills
| Method | Endpoint       | Access  | Description                                          |
|--------|----------------|---------|------------------------------------------------------|
| POST   | /api/bills     | Biller  | Create bill — deducts stock, may trigger alerts      |
| GET    | /api/bills     | Both    | Manager sees all; Biller sees own                    |
| GET    | /api/bills/:id | Both    | Single bill (Biller restricted to own)               |

### Reorders
| Method | Endpoint                    | Access  | Description               |
|--------|-----------------------------|---------|---------------------------|
| POST   | /api/reorders               | Manager | Place a reorder           |
| GET    | /api/reorders               | Manager | Reorder history           |
| PATCH  | /api/reorders/:id/receive   | Manager | Mark received + add stock |

### Alerts
| Method | Endpoint                  | Access  | Description                          |
|--------|---------------------------|---------|--------------------------------------|
| GET    | /api/alerts/pending       | Manager | Polled by frontend for live popups   |
| GET    | /api/alerts               | Manager | All alerts (filter by ?status=)      |
| PATCH  | /api/alerts/:id/inform    | Manager | Notify supplier → status = informed  |
| PATCH  | /api/alerts/:id/dismiss   | Manager | Dismiss alert                        |

---

## Folder Structure

```
stocksense-backend/
├── src/
│   ├── config/          db.js, env.js
│   ├── models/          User, Product, Bill, ReorderRequest, StockAlert
│   ├── controllers/     auth, product, bill, reorder, alert
│   ├── routes/          auth, product, bill, reorder, alert
│   ├── middleware/       authMiddleware, roleMiddleware, errorHandler
│   ├── services/         barcodeService, stockService, notifyService
│   ├── utils/            generateToken.js
│   └── app.js
├── .env.example
├── package.json
├── seed.js
└── server.js
```

---

## Key Business Logic

- **Barcode**: Auto-generated as `PRD-<timestamp>-<random3digits>` with uniqueness check on every product creation.
- **Bill creation flow**: Validates ALL items' stock before touching anything → deducts stock atomically → creates `StockAlert` (status: `pending`) for any product that drops below its `reorderThreshold`.
- **Stock alerts**: Manager frontend polls `GET /api/alerts/pending` every few seconds. Manager can click **Inform** (notifies supplier via `notifyService`, marks `informed`) or **Dismiss** (marks `dismissed`).
- **Role guard**: `requireRole('manager')` middleware returns `403` for biller requests to manager-only routes.

---

## Response Shape

All endpoints return a consistent structure:

```json
{
  "success": true | false,
  "message": "Human-readable message",
  "data": { ... }   // on success
  "error": "..."    // on failure
}
```
