require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');

const { testConnection } = require('./db');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth.routes');
const staffRoutes = require('./routes/staff.routes');
const customerRoutes = require('./routes/customers.routes');
const productsRoutes = require('./routes/products.routes');
const plansRoutes = require('./routes/plans.routes');
const taxesRoutes = require('./routes/taxes.routes');
const discountsRoutes = require('./routes/discounts.routes');
const templatesRoutes = require('./routes/templates.routes');
const subscriptionsRoutes = require('./routes/subscriptions.routes');
const invoicesRoutes = require('./routes/invoices.routes');
const billingRoutes = require('./routes/billing.routes');
const paymentsRoutes = require('./routes/payments.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const portalRoutes = require('./routes/portal.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Security and basic middleware
app.use(helmet({
    contentSecurityPolicy: false
}));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Limit repeated requests in production
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: {
        success: false,
        message: 'Too many requests. Please try again later.'
    }
});
app.use('/api', limiter);

// Serve frontend files
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/taxes', taxesRoutes);
app.use('/api/discounts', discountsRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/portal', portalRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'OK',
        message: 'Brightloop Software API is running!'
    });
});

// Fallback home
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
async function startServer() {
    const connected = await testConnection();

    if (!connected) {
        console.error('Server startup stopped: Database connection failed.');
        process.exit(1);
    }

    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
        console.log(`Open http://localhost:${PORT}/dashboard.html or /login.html in your browser.`);
    });
}

if (require.main === module) {
    startServer();
}

module.exports = app;
