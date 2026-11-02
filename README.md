# Brightloop Subscription Management Platform 🚀
**Odoo Hackathon 2026**

A production-grade subscription business platform built with **Node.js, Express, MySQL 8, Bootstrap 5, Chart.js, and Vanilla JavaScript**.

---

## 👥 Integrated Team Modules & Branch Merges
All four team feature branches have been merged into `harisankar` / `feature/hari-subscriptions`:
- **Member 1 (Ibin - Auth & Identity)**: JWT authentication, role middleware (`admin`, `staff`, `customer`), bcrypt hashing, customer registration, password reset token flow, and customer portal.
- **Member 2 (Amala - Product Catalog & Pricing)**: Products CRUD, Plans & billing cycles (`monthly`, `quarterly`, `yearly`), Taxes, and automatic Discount evaluation service.
- **Member 3 (Hari - Subscriptions & Invoicing Engine)**: Quotation templates, Subscriptions state machine (`Draft → Quotation → Confirmed → Active → Closed`), Kanban board, Automated Recurring Billing engine, and Invoice management.
- **Member 4 (Parvathy - Finance & Integration)**: MySQL database schema, database migration & seed scripts, partial payment recording with overpayment protection, finance aggregate analytics, Chart.js revenue visualization, shared theme, and Ctrl+K Command Palette.

---

## ⚡ Quick Start Instructions

### 1. Configure Environment
Your `.env` file is already configured with your MySQL credentials:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=Hari@6002
DB_NAME=subscription
DB_PORT=3306
PORT=3000
JWT_SECRET=brightloop_odoo_hackathon_super_secret_jwt_key_2026_xyz
JWT_EXPIRES_IN=1d
APP_URL=http://localhost:3000
```

### 2. Run Database Migration & Seed Demo Data
Populates products, plans, taxes, discounts, quotation templates, subscriptions, invoices, and payments:
```bash
npm run migrate
npm run seed
```

### 3. Start the Server
```bash
npm start
```
Open **[http://localhost:3000](http://localhost:3000)** (or `http://localhost:3000/login.html`) in your browser.

---

## 🔑 Demo Login Credentials

| Role | Email | Password | Access / Landing Page |
|---|---|---|---|
| **Admin** | `admin@brightloop.com` | `Admin@12345` | Full Dashboard, Products, Plans, Taxes, Discounts, Subscriptions, Invoices, Payments |
| **Staff** | `staff@brightloop.com` | `Staff@12345` | Dashboard, Quotations, Subscriptions, Invoices, Payments |
| **Customer** | `customer@brightloop.com` | `Customer@12345` | Customer Portal (`portal.html`), My Subscriptions, My Invoices |

*(Note: The login page also features 1-click Quick Fill demo buttons for Admin, Staff, and Customer).*

