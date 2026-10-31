const express = require('express');
const router = express.Router();
const pool = require('../db');

// List customers
router.get('/', async (req, res) => {
    try {
        const [customers] = await pool.query('SELECT * FROM customers ORDER BY id DESC');
        res.json({ success: true, data: customers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create customer
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, address } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: 'Customer name is required' });
        }

        const [result] = await pool.query(
            'INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)',
            [name, email || null, phone || null, address || null]
        );

        res.status(201).json({
            success: true,
            message: 'Customer created successfully',
            id: result.insertId
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;

