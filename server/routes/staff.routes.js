const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roles');

// All staff routes require admin login
router.use(authenticateToken, adminOnly);

// Create a staff account
router.post('/', async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password || password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Name, valid email and password (minimum 8 characters) are required.'
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

        let [roles] = await pool.query(
            "SELECT id FROM roles WHERE LOWER(name) = 'staff' LIMIT 1"
        );

        if (roles.length === 0) {
            const [roleInsert] = await pool.query("INSERT INTO roles (name) VALUES ('staff')");
            roles = [{ id: roleInsert.insertId }];
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const [result] = await pool.query(
            'INSERT INTO users (role_id, name, email, password, is_active) VALUES (?, ?, ?, ?, TRUE)',
            [roles[0].id, name, email, passwordHash]
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
        const [staff] = await pool.query(`
            SELECT u.id, u.name, u.email, r.name AS role, u.is_active, u.created_at
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE LOWER(r.name) = 'staff'
            ORDER BY u.created_at DESC
        `);

        res.json({ success: true, staff });

    } catch (error) {
        next(error);
    }
});

// Deactivate or toggle staff account
router.patch('/:id/deactivate', async (req, res, next) => {
    try {
        const [result] = await pool.query(
            "UPDATE users SET is_active = FALSE WHERE id = ?",
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
            message: 'Staff account deactivated successfully.'
        });

    } catch (error) {
        next(error);
    }
});

module.exports = router;
