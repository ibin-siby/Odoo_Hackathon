const express = require('express');
const router = express.Router();
const pool = require('../db');

// List taxes
router.get('/', async (req, res) => {
    try {
        const [taxes] = await pool.query('SELECT * FROM taxes ORDER BY id DESC');
        res.json({ success: true, data: taxes });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create tax
router.post('/', async (req, res) => {
    try {
        const { name, rate, status } = req.body;
        if (!name || rate === undefined) {
            return res.status(400).json({ success: false, message: 'Name and rate are required' });
        }

        const [result] = await pool.query(
            'INSERT INTO taxes (name, rate, status) VALUES (?, ?, ?)',
            [name, Number(rate), status || 'active']
        );

        res.status(201).json({
            success: true,
            message: 'Tax created successfully',
            id: result.insertId
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update tax
router.put('/:id', async (req, res) => {
    try {
        const { name, rate, status } = req.body;
        const [result] = await pool.query(
            'UPDATE taxes SET name = ?, rate = ?, status = ? WHERE id = ?',
            [name, Number(rate), status || 'active', req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Tax not found' });
        }

        res.json({ success: true, message: 'Tax updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete tax
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM taxes WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Tax not found' });
        }
        res.json({ success: true, message: 'Tax deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
