const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
// Serve frontend files
app.use(express.static('public'));

// Payment routes
const paymentRoutes = require('./routes/payments.routes');
app.use('/api/payments', paymentRoutes);
const dashboardRoutes = require('./routes/dashboard.routes');
app.use('/api/dashboard', dashboardRoutes);
// Test route
app.get('/', (req, res) => {
    res.send('Odoo Hackathon API is running!');
});
// Health check API
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Odoo Hackathon API is running'
    });
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});