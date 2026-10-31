const express = require('express');
const router = express.Router();
const pool = require('../db');

// List plans
router.get('/', async (req, res) => {
    try {
        const [plans] = await pool.query('SELECT * FROM plans ORDER BY id DESC');
        res.json({ success: true, data: plans });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get plan by ID
router.get('/:id', async (req, res) => {
    try {
        const [plans] = await pool.query('SELECT * FROM plans WHERE id = ?', [req.params.id]);
        if (plans.length === 0) {
            return res.status(404).json({ success: false, message: 'Plan not found' });
        }
        res.json({ success: true, data: plans[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create plan
router.post('/', async (req, res) => {
    try {
        const { name, description, price, billing_cycle, status } = req.body;
        if (!name || price === undefined || !billing_cycle) {
            return res.status(400).json({
                success: false,
                message: 'Name, price, and billing_cycle (daily, weekly, monthly, quarterly, yearly) are required'
            });
        }

        const [result] = await pool.query(
            `INSERT INTO plans (name, description, price, billing_cycle, status)
             VALUES (?, ?, ?, ?, ?)`,
            [name, description || null, Number(price), billing_cycle, status || 'active']
        );

        res.status(201).json({
            success: true,
            message: 'Plan created successfully',
            id: result.insertId
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update plan
router.put('/:id', async (req, res) => {
    try {
        const { name, description, price, billing_cycle, status } = req.body;
        if (!name || price === undefined || !billing_cycle) {
            return res.status(400).json({
                success: false,
                message: 'Name, price, and billing_cycle are required'
            });
        }

        const [result] = await pool.query(
            `UPDATE plans
             SET name = ?, description = ?, price = ?, billing_cycle = ?, status = ?
             WHERE id = ?`,
            [name, description || null, Number(price), billing_cycle, status || 'active', req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Plan not found' });
        }

        res.json({ success: true, message: 'Plan updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete plan
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM plans WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Plan not found' });
        }
        res.json({ success: true, message: 'Plan deleted successfully' });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete plan. It may be linked to active subscriptions.'
        });
    }
});

module.exports = router;

