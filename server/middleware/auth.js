const jwt = require('jsonwebtoken');
const { pool } = require('../db');

async function authenticateToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Please log in.'
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const [users] = await pool.query(
            `SELECT users.id, users.name, users.email, roles.name AS role
             FROM users
             JOIN roles ON users.role_id = roles.id
             WHERE users.id = ?`,
            [decoded.id]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User not found.'
            });
        }

        req.user = users[0];
        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token.'
        });
    }
}

module.exports = { authenticateToken };