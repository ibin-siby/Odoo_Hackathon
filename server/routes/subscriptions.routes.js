
const express = require('express');
const router = express.Router();
const { pool: db } = require('../db');

// CREATE SUBSCRIPTION
router.post('/', async (req, res) => {
    try {
        const { customer_id, plan_id, start_date, end_date } = req.body;

        if (!customer_id || !plan_id || !start_date) {
            return res.status(400).json({
                success: false,
                message: 'Customer, plan and start date are required'
            });
        }

        const [customer] = await db.query(
            'SELECT id FROM customers WHERE id = ?',
            [customer_id]
        );

        const [plan] = await db.query(
            "SELECT id FROM plans WHERE id = ? AND status = 'active'",
            [plan_id]
        );

        if (!customer.length || !plan.length) {
            return res.status(400).json({
                success: false,
                message: 'Invalid customer or inactive plan'
            });
        }

        const [result] = await db.query(
            `INSERT INTO subscriptions
            (customer_id, plan_id, start_date, end_date, status)
            VALUES (?, ?, ?, ?, 'pending')`,
            [customer_id, plan_id, start_date, end_date || null]
        );

        res.status(201).json({
            success: true,
            message: 'Subscription created successfully',
            subscription_id: result.insertId
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// LIST ALL SUBSCRIPTIONS
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT s.*, c.name AS customer_name,
                   p.name AS plan_name, p.price, p.billing_cycle
            FROM subscriptions s
            JOIN customers c ON s.customer_id = c.id
            JOIN plans p ON s.plan_id = p.id
            ORDER BY s.id DESC
        `);

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET SUBSCRIPTION BY ID
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT s.*, c.name AS customer_name,
                   p.name AS plan_name, p.price, p.billing_cycle
            FROM subscriptions s
            JOIN customers c ON s.customer_id = c.id
            JOIN plans p ON s.plan_id = p.id
            WHERE s.id = ?
        `, [req.params.id]);

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: 'Subscription not found'
            });
        }

        res.json({
            success: true,
            data: rows[0]
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// UPDATE SUBSCRIPTION
router.put('/:id', async (req, res) => {
    try {
        const { customer_id, plan_id, start_date, end_date, status } = req.body;

        const allowedStatuses = ['active', 'cancelled', 'expired', 'pending'];

        if (!customer_id || !plan_id || !start_date ||
            !allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Valid subscription details are required'
            });
        }

        const [result] = await db.query(
            `UPDATE subscriptions
             SET customer_id = ?, plan_id = ?, start_date = ?,
                 end_date = ?, status = ?
             WHERE id = ?`,
            [customer_id, plan_id, start_date, end_date || null,
             status, req.params.id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                success: false,
                message: 'Subscription not found'
            });
        }

        res.json({
            success: true,
            message: 'Subscription updated successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// CANCEL SUBSCRIPTION
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.query(
            `UPDATE subscriptions
             SET status = 'cancelled'
             WHERE id = ?`,
            [req.params.id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                success: false,
                message: 'Subscription not found'
            });
        }

        res.json({
            success: true,
            message: 'Subscription cancelled successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;

