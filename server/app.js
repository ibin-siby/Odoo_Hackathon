require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');

const { testConnection } = require('./db');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Security and middleware
app.use(helmet({
    contentSecurityPolicy: false
}));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: {
        success: false,
        message: 'Too many requests. Please try again later.'
    }
});

app.use('/api', limiter);

// Serve frontend
app.use(express.static(path.join(__dirname, '../public')));

// Authentication routes
const authRoutes = require('./routes/auth.routes');
app.use('/api/auth', authRoutes);

// Staff routes
const staffRoutes = require('./routes/staff.routes');
app.use('/api/staff', staffRoutes);

// Products routes
const productsRoutes = require('./routes/products.routes');
app.use('/api/products', productsRoutes);

// Payments routes
const paymentsRoutes = require('./routes/payments.routes');
app.use('/api/payments', paymentsRoutes);

// Invoices routes
const invoicesRoutes = require('./routes/invoices.routes');
app.use('/api/invoices', invoicesRoutes);

// Subscriptions routes
const subscriptionsRoutes = require('./routes/subscriptions.routes');
app.use('/api/subscriptions', subscriptionsRoutes);

// Templates routes
const templatesRoutes = require('./routes/templates.routes');
app.use('/api/templates', templatesRoutes);

// Finance dashboard routes
const dashboardRoutes = require('./routes/dashboard.routes');
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Odoo Hackathon API is running!'
    });
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
    });
}

startServer();