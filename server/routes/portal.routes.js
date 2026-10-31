const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Customer Subscriptions
router.get('/subscriptions', async (req, res) => {
    try {
        const [customers] = await pool.query(
            'SELECT id FROM customers WHERE email = ?',
            [req.user.email]
        );

        if (customers.length === 0) {
            return res.json({ success: true, subscriptions: [] });
        }

        const customerId = customers[0].id;
        const [subscriptions] = await pool.query(`
            SELECT s.*, p.name AS plan_name, p.price, p.billing_cycle,
                   COALESCE(s.subscription_number, CONCAT('SUB-', LPAD(s.id, 5, '0'))) AS subscription_number,
                   DATE_FORMAT(s.start_date, '%Y-%m-%d') AS start_date,
                   DATE_FORMAT(s.end_date, '%Y-%m-%d') AS expiry_date,
                   DATE_FORMAT(s.next_billing_date, '%Y-%m-%d') AS next_billing_date
            FROM subscriptions s
            JOIN plans p ON s.plan_id = p.id
            WHERE s.customer_id = ?
            ORDER BY s.id DESC
        `, [customerId]);

        res.json({
            success: true,
            subscriptions,
            data: subscriptions
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Customer Invoices
router.get('/invoices', async (req, res) => {
    try {
        const [customers] = await pool.query(
            'SELECT id FROM customers WHERE email = ?',
            [req.user.email]
        );

        if (customers.length === 0) {
            return res.json({ success: true, invoices: [] });
        }

        const customerId = customers[0].id;
        const [invoices] = await pool.query(`
            SELECT i.*,
                   DATE_FORMAT(i.invoice_date, '%Y-%m-%d') AS invoice_date,
                   DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due_date
            FROM invoices i
            WHERE i.customer_id = ?
            ORDER BY i.id DESC
        `, [customerId]);

        res.json({
            success: true,
            invoices,
            data: invoices
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
