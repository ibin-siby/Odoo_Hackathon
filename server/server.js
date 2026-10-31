const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Payment routes
const paymentRoutes = require('./routes/payments.routes');
app.use('/api/payments', paymentRoutes);

// Test route
app.get('/', (req, res) => {
    res.send('Odoo Hackathon API is running!');
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});