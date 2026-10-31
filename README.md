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

---

## 🎯 Hackathon Demonstration Flow for the Judges

1. **Sign In**: Login as Admin or Staff using the quick demo buttons on `/login.html`.
2. **Finance Dashboard**: View real-time KPI cards (Total Revenue Collected, Outstanding Balance, Active Subscriptions, Overdue Count), Chart.js monthly trend, recent payments, and overdue invoices.
3. **Product & Plan Catalog**: Navigate to `/products.html` and `/plans.html` to showcase billable services, add-ons, and pricing tiers.
4. **Subscription Kanban**: Navigate to `/subscriptions.html` to demonstrate the **5-Column Kanban Board** (`Draft → Quotation → Confirmed → Active → Closed`). Click **Advance →** on any card to step it through the business state machine.
5. **Recurring Billing Run**: Click **⚡ Run Automated Billing** (from top navbar, dashboard, or Ctrl+K). The billing engine automatically identifies due active subscriptions, prevents duplicate billing, creates invoices with taxes and discounts, and advances the next billing date.
6. **Invoices & Receipts**: Navigate to `/invoices.html` to view the generated invoices, confirm draft invoices, or click **View / Print** to preview a formatted invoice with printable stylesheet.
7. **Partial & Final Payments**: Navigate to `/payments.html` and click **Record Payment**. Notice that selecting an invoice dynamically calculates the remaining balance and prevents overpayments.
8. **Customer Portal**: Sign in as `customer@brightloop.com` to view `/portal.html` showing customer-isolated subscription status, renewal dates, and billing history.
9. **Command Palette**: Press `Ctrl + K` anywhere in the app to quick-search pages or trigger automated billing instantly.
