
const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend files
app.use(express.static(path.join(__dirname, "../public")));

// API routes
const dashboardRoutes = require("./routes/dashboard.routes");
const paymentsRoutes = require("./routes/payments.routes");
const templatesRoutes = require("./routes/templates.routes");
const subscriptionsRoutes = require("./routes/subscriptions.routes");
const invoicesRoutes = require("./routes/invoices.routes");

app.use("/api/dashboard", dashboardRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/templates", templatesRoutes);
app.use("/api/subscriptions", subscriptionsRoutes);
app.use("/api/invoices", invoicesRoutes);

// Health check
app.get("/api/health", (req, res) => {
    res.json({ message: "Odoo Hackathon API is running!" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

