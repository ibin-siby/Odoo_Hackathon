const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Customer Signup
router.post('/signup', [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array(),
                message: errors.array()[0].msg
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

        let [roles] = await pool.query(
            "SELECT id FROM roles WHERE LOWER(name) = 'customer' OR LOWER(name) = 'user' LIMIT 1"
        );

        if (roles.length === 0) {
            const [roleInsert] = await pool.query("INSERT INTO roles (name) VALUES ('customer')");
            roles = [{ id: roleInsert.insertId }];
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const [userResult] = await pool.query(
            `INSERT INTO users (role_id, name, email, password, is_active)
             VALUES (?, ?, ?, ?, TRUE)`,
            [roles[0].id, name, email, passwordHash]
        );

        // Also ensure customer record exists for portal / subscriptions
        await pool.query(
            `INSERT INTO customers (name, email)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE name = VALUES(name)`,
            [name, email]
        );

        res.status(201).json({
            success: true,
            message: 'Account created successfully.',
            userId: userResult.insertId
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
                    users.password, roles.name AS role, users.is_active
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

        if (user.is_active === 0 || user.is_active === false) {
            return res.status(403).json({
                success: false,
                message: 'Account is deactivated. Please contact administrator.'
            });
        }

        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        const jwtSecret = process.env.JWT_SECRET || 'brightloop_super_secret_jwt_key_default';
        const token = jwt.sign(
            { id: user.id, role: user.role.toLowerCase() },
            jwtSecret,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role.toLowerCase()
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
        message: 'Logged out successfully.'
    });
});

// Forgot password
router.post('/forgot-password', async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const [users] = await pool.query('SELECT id, name FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            // Return success even if not found to prevent user enumeration
            return res.json({
                success: true,
                message: 'If the email exists, a reset link has been generated.'
            });
        }

        const user = users[0];
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

        await pool.query(
            `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
             VALUES (?, ?, ?)`,
            [user.id, tokenHash, expiresAt]
        );

        const resetLink = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password.html?token=${rawToken}`;
        console.log(`\n========================================`);
        console.log(`PASSWORD RESET FOR: ${email}`);
        console.log(`RESET LINK: ${resetLink}`);
        console.log(`========================================\n`);

        res.json({
            success: true,
            message: 'Password reset link generated. Check server console for link.'
        });

    } catch (error) {
        next(error);
    }
});

// Reset password
router.post('/reset-password', async (req, res, next) => {
    try {
        const { token, password } = req.body;
        if (!token || !password || password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Valid token and minimum 8-character password are required'
            });
        }

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const [tokens] = await pool.query(
            `SELECT * FROM password_reset_tokens
             WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()`,
            [tokenHash]
        );

        if (tokens.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired password reset link.'
            });
        }

        const resetRecord = tokens[0];
        const passwordHash = await bcrypt.hash(password, 10);

        await pool.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [passwordHash, resetRecord.user_id]
        );

        await pool.query(
            'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?',
            [resetRecord.id]
        );

        res.json({
            success: true,
            message: 'Password has been reset successfully.'
        });

    } catch (error) {
        next(error);
    }
});

// Customer Portal: My Subscriptions
router.get('/my-subscriptions', authenticateToken, async (req, res, next) => {
    try {
        // Find customer record matching user email
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
                   DATE_FORMAT(s.end_date, '%Y-%m-%d') AS expiry_date
            FROM subscriptions s
            JOIN plans p ON s.plan_id = p.id
            WHERE s.customer_id = ?
            ORDER BY s.id DESC
        `, [customerId]);

        res.json({
            success: true,
            subscriptions
        });
    } catch (error) {
        next(error);
    }
});

// Customer Portal: My Invoices
router.get('/my-invoices', authenticateToken, async (req, res, next) => {
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
            invoices
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
