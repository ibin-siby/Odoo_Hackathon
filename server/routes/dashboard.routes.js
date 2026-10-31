const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Finance dashboard summary
router.get('/summary', async (req, res) => {
    try {
        const [paymentStats] = await pool.query(
            'SELECT COALESCE(SUM(amount), 0) AS total_revenue, COUNT(*) AS total_payments FROM payments'
        );

        const [invoiceStats] = await pool.query(
            "SELECT COALESCE(SUM(outstanding_amount), 0) AS outstanding_amount FROM invoices WHERE status NOT IN ('paid', 'cancelled')"
        );

        res.json({
            total_revenue: Number(paymentStats[0].total_revenue),
            total_payments: Number(paymentStats[0].total_payments),
            outstanding_amount: Number(invoiceStats[0].outstanding_amount)
        });

    } catch (error) {
        console.error('Dashboard error:', error.message);

        res.status(500).json({
            message: error.message
        });
    }
});

module.exports = router;