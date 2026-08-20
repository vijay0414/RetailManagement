#  Retail Inventory & Billing Management System

A web-based **Retail Inventory and Billing Management System** built for departmental stores, featuring **role-based access** for Managers and Billers, **barcode-based billing**, and **automated low-stock alerts** to keep suppliers informed before products run out.

---

##  Overview

Running a departmental store means juggling two things constantly — **billing customers quickly** and **keeping stock from running out**. This project solves both problems in one system:

- Billers can scan products (via camera or manual barcode entry) and generate bills in seconds.
- Managers can add new products, monitor inventory, and reorder stock before it runs out.
- When any product's stock falls below a set threshold, the Manager gets an instant alert with the supplier's details — and can choose to notify them with a single click.

---

##  Features

###  Role-Based Login
- Two distinct roles — **Manager** and **Biller** — each with a dedicated login and dashboard.
- Route-level access control ensures Billers cannot access Manager-only pages (and vice versa), even via direct URL access.

###  Manager
- **Add Product** — register new products with name, category, price, stock, supplier details, and reorder threshold.
- **Auto-Generated Barcode** — a unique barcode is generated automatically for every new product.
- **Inventory View** — full stock list with low-stock items highlighted.
- **Reorder Management** — place and track reorder requests for low-stock products.
- **Low-Stock Alert Popup** — instantly notified when any product's stock drops below the threshold, showing the supplier's name and contact. Choose:
  - **Inform** → simulates sending a restock notification to the supplier.
  - **Not Now** → dismisses the alert without action.

###  Biller
- **Camera-Based Barcode Scanning** — scan a product directly using the device camera (with manual entry as a fallback).
- **Instant Product Lookup** — auto-fetches product name and price on scan.
- **Bill Generation** — add multiple items, view a running total, and generate a printable itemized invoice.
- **Automatic Stock Deduction** — stock is updated in real time as bills are generated.

---

##  Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Functional Components + Hooks) |
| Routing | React Router |
| Barcode Generation | react-barcode / JsBarcode |
| Camera Barcode Scanning | html5-qrcode / react-qr-barcode-scanner |
| Styling | CSS / Tailwind (update based on your implementation) |
| State Management | React Context API |

> **Note:** This version of the project is **frontend-only**. Product, user, and stock data are currently simulated using mock/local state. Backend integration (database, authentication, real-time supplier notifications) is planned for a future phase.

---

##  Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or above recommended)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone git@github.com:vijay0414/RetailManagement.git

# Navigate into the project directory
cd RetailManagement

# Install dependencies
npm install

# Start the development server
npm start
```

The app will run at `http://localhost:3000` by default.

---

##  Demo Login Credentials

| Role | Username | Password |
|---|---|---|
| Manager | `manager` | `manager123` |
| Biller | `biller` | `biller123` |

> These are mock credentials for demo purposes only, since the project currently has no backend authentication.

---

##  Project Structure

```
RetailManagement/
├── src/
│   ├── components/
│   │   ├── Login/
│   │   ├── ManagerDashboard/
│   │   ├── AddProduct/
│   │   ├── Inventory/
│   │   ├── ReorderPage/
│   │   ├── StockAlertModal/
│   │   ├── BillingScreen/
│   │   └── Navbar/
│   ├── context/          # Shared state (auth, inventory, alerts)
│   ├── data/             # Mock product/supplier/user data
│   ├── routes/           # Protected route logic
│   └── App.js
├── public/
└── README.md
```

---

##  How It Works (User Flow)

1. **Manager logs in** → adds a new product → system auto-generates a barcode.
2. **Biller logs in** → scans the product's barcode using the camera → enters quantity → generates the bill.
3. Stock is automatically reduced after billing.
4. If stock falls below **5 units**, a popup instantly appears on the **Manager's dashboard** with the supplier's contact details.
5. Manager clicks **Inform** to simulate notifying the supplier, or **Not Now** to dismiss.

---

##  Roadmap

- [ ] Backend integration (Node.js/Express + database)
- [ ] Real authentication (JWT-based login)
- [ ] Real-time supplier notifications (SMS/Email/WhatsApp API)
- [ ] Sales & inventory analytics dashboard
- [ ] Multi-store support

---

##  Contributors

| Name | Role |
|---|---|
| [Your Name] | Frontend Development |
| [Friend's Name] | Backend Development |

---

##  License

This project is developed for academic/learning purposes. Feel free to fork and build upon it.

---

##  Support

If you run into issues or have suggestions, feel free to open an [Issue](https://github.com/vijay0414/RetailManagement/issues) on this repository.
