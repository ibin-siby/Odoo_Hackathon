const express = require('express');
const router = express.Router();
const pool = require('../db');

// Finance dashboard summary
router.get('/summary', async (req, res) => {
    try {
        const [paymentStats] = await pool.query(
            'SELECT COALESCE(SUM(amount), 0) AS total_revenue, COUNT(*) AS total_payments FROM payments'
        );

        const [invoiceStats] = await pool.query(
            "SELECT COALESCE(SUM(outstanding_amount), 0) AS outstanding_amount FROM invoices WHERE status NOT IN ('paid', 'cancelled')"
        );

        const [activeSubs] = await pool.query(
            "SELECT COUNT(*) AS active_subscriptions FROM subscriptions WHERE status = 'active'"
        );

        const [overdueInvoices] = await pool.query(
            "SELECT COUNT(*) AS overdue_count FROM invoices WHERE status = 'confirmed' AND due_date < CURDATE() AND outstanding_amount > 0"
        );

        res.json({
            success: true,
            total_revenue: Number(paymentStats[0].total_revenue),
            total_payments: Number(paymentStats[0].total_payments),
            outstanding_amount: Number(invoiceStats[0].outstanding_amount),
            active_subscriptions: Number(activeSubs[0].active_subscriptions),
            overdue_count: Number(overdueInvoices[0].overdue_count)
        });

    } catch (error) {
        console.error('Dashboard error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Monthly revenue breakdown (for Chart.js)
router.get('/revenue', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT DATE_FORMAT(payment_date, '%b %Y') AS month,
                   SUM(amount) AS revenue,
                   COUNT(*) AS count
            FROM payments
            GROUP BY DATE_FORMAT(payment_date, '%Y-%m'), DATE_FORMAT(payment_date, '%b %Y')
            ORDER BY MIN(payment_date) ASC
            LIMIT 12
        `);

        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Overdue invoices list
router.get('/overdue', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT i.*, c.name AS customer_name, c.email AS customer_email,
                   DATEDIFF(CURDATE(), i.due_date) AS days_overdue
            FROM invoices i
            JOIN customers c ON i.customer_id = c.id
            WHERE i.status = 'confirmed' AND i.due_date < CURDATE() AND i.outstanding_amount > 0
            ORDER BY i.due_date ASC
        `);

        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Subscription stats by status
router.get('/subscription-stats', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT status, COUNT(*) AS count
            FROM subscriptions
            GROUP BY status
        `);

        const stats = {
            draft: 0,
            quotation: 0,
            confirmed: 0,
            active: 0,
            closed: 0,
            cancelled: 0,
            pending: 0
        };

        rows.forEach(r => {
            if (stats.hasOwnProperty(r.status)) {
                stats[r.status] = Number(r.count);
            }
        });

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
