const express = require('express');
const router = express.Router();

const { pool } = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const { authenticateToken } = require('../middleware/auth');
const { customerOnly } = require('../middleware/roles');

// Customer Signup
router.post('/signup', [
    body('name').trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 9 })
], async (req, res, next) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { name, email, password } = req.body;

        const [existing] = await pool.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Email already registered.'
            });
        }

        const [roles] = await pool.query(
            'SELECT id FROM roles WHERE name = ?',
            ['customer']
        );

        if (roles.length === 0) {
            return res.status(500).json({
                success: false,
                message: 'Customer role not found.'
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const [result] = await pool.query(
            `INSERT INTO users (role_id, name, email, password)
             VALUES (?, ?, ?, ?)`,
            [roles[0].id, name, email, passwordHash]
        );

        res.status(201).json({
            success: true,
            message: 'Account created successfully.',
            userId: result.insertId
        });

    } catch (error) {
        next(error);
    }
});

// Login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required.'
            });
        }

        const [users] = await pool.query(
            `SELECT users.id, users.name, users.email,
                    users.password, roles.name AS role
             FROM users
             JOIN roles ON users.role_id = roles.id
             WHERE users.email = ?`,
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        const user = users[0];

        const validPassword = await bcrypt.compare(
            password,
            user.password
        );

        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        next(error);
    }
});

// Current logged-in user
router.get('/me', authenticateToken, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

// Logout
router.post('/logout', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully. Please clear the token.'
    });
});

module.exports = router;