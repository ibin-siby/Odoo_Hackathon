const express = require('express');
const router = express.Router();

const { pool } = require('../db');
const bcrypt = require('bcrypt');

const { authenticateToken } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roles');

// All staff routes require admin login
router.use(authenticateToken, adminOnly);

// Create a staff account
router.post('/', async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password || password.length < 9) {
            return res.status(400).json({
                success: false,
                message: 'Name, valid email and password (minimum 9 characters) are required.'
            });
        }

        const [existing] = await pool.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existing.length) {
            return res.status(409).json({
                success: false,
                message: 'Email already registered.'
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const [result] = await pool.query(
            'INSERT INTO users (name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)',
            [name, email, passwordHash, 'staff', 1]
        );

        res.status(201).json({
            success: true,
            message: 'Staff account created successfully.',
            staffId: result.insertId
        });

    } catch (error) {
        next(error);
    }
});

// List all staff accounts
router.get('/', async (req, res, next) => {
    try {
        const [staff] = await pool.query(
            "SELECT id, name, email, role, is_active, created_at FROM users WHERE role = 'staff' ORDER BY created_at DESC"
        );

        res.json({ success: true, staff });

    } catch (error) {
        next(error);
    }
});

// Deactivate a staff account
router.patch('/:id/deactivate', async (req, res, next) => {
    try {
        const [result] = await pool.query(
            "UPDATE users SET is_active = 0 WHERE id = ? AND role = 'staff'",
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Staff account not found.'
            });
        }

        res.json({
            success: true,
            message: 'Staff account deactivated.'
        });

    } catch (error) {
        next(error);
    }
});

module.exports = router;