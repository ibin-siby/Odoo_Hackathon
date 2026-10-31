const express = require('express');
const router = express.Router();
const pool = require('../db');

// List discounts
router.get('/', async (req, res) => {
    try {
        const [discounts] = await pool.query('SELECT * FROM discounts ORDER BY id DESC');
        res.json({ success: true, data: discounts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create discount
router.post('/', async (req, res) => {
    try {
        const { name, discount_type, value, min_purchase, min_quantity, status } = req.body;
        if (!name || !discount_type || value === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Name, discount_type (percentage or fixed), and value are required'
            });
        }

        const [result] = await pool.query(
            `INSERT INTO discounts (name, discount_type, value, min_purchase, min_quantity, status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, discount_type, Number(value), Number(min_purchase || 0), Number(min_quantity || 0), status || 'active']
        );

        res.status(201).json({
            success: true,
            message: 'Discount created successfully',
            id: result.insertId
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update discount
router.put('/:id', async (req, res) => {
    try {
        const { name, discount_type, value, min_purchase, min_quantity, status } = req.body;
        const [result] = await pool.query(
            `UPDATE discounts
             SET name = ?, discount_type = ?, value = ?, min_purchase = ?, min_quantity = ?, status = ?
             WHERE id = ?`,
            [name, discount_type, Number(value), Number(min_purchase || 0), Number(min_quantity || 0), status || 'active', req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Discount not found' });
        }

        res.json({ success: true, message: 'Discount updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete discount
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM discounts WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Discount not found' });
        }
        res.json({ success: true, message: 'Discount deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
