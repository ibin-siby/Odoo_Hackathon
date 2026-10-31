const express = require('express');
const router = express.Router();
const pool = require('../db');

// Helper to generate next subscription number
async function generateSubNumber(conn) {
    const [rows] = await conn.query('SELECT MAX(id) AS maxId FROM subscriptions');
    const nextId = (rows[0].maxId || 0) + 1;
    return `SUB-${String(nextId).padStart(5, '0')}`;
}

// Calculate next billing date based on cycle
function calculateNextDate(startDate, billingCycle) {
    const d = new Date(startDate);
    if (billingCycle === 'daily') d.setDate(d.getDate() + 1);
    else if (billingCycle === 'weekly') d.setDate(d.getDate() + 7);
    else if (billingCycle === 'quarterly') d.setMonth(d.getMonth() + 3);
    else if (billingCycle === 'yearly') d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1); // default monthly
    return d.toISOString().split('T')[0];
}

// CREATE SUBSCRIPTION
router.post('/', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const {
            customer_id,
            plan_id,
            template_id,
            start_date,
            end_date,
            status,
            items
        } = req.body;

        if (!customer_id || !plan_id || !start_date) {
            return res.status(400).json({
                success: false,
                message: 'Customer, plan and start date are required'
            });
        }

        const [customer] = await connection.query(
            'SELECT id FROM customers WHERE id = ?',
            [customer_id]
        );

        const [plan] = await connection.query(
            "SELECT * FROM plans WHERE id = ? AND status = 'active'",
            [plan_id]
        );

        if (!customer.length || !plan.length) {
            return res.status(400).json({
                success: false,
                message: 'Invalid customer or inactive plan'
            });
        }

        await connection.beginTransaction();

        const subNumber = await generateSubNumber(connection);
        const nextBillingDate = calculateNextDate(start_date, plan[0].billing_cycle);
        const subStatus = status || 'draft';

        const [result] = await connection.query(
            `INSERT INTO subscriptions
            (subscription_number, customer_id, plan_id, template_id, start_date, end_date, next_billing_date, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                subNumber,
                customer_id,
                plan_id,
                template_id || null,
                start_date,
                end_date || null,
                nextBillingDate,
                subStatus
            ]
        );

        const subId = result.insertId;

        // If items were passed
        if (Array.isArray(items) && items.length > 0) {
            for (const item of items) {
                if (item.product_id) {
                    await connection.query(
                        `INSERT INTO subscription_items (subscription_id, product_id, quantity, unit_price)
                         VALUES (?, ?, ?, ?)`,
                        [subId, item.product_id, item.quantity || 1, item.unit_price || 0]
                    );
                }
            }
        }

        // Record history
        await connection.query(
            `INSERT INTO subscription_history (subscription_id, action, details)
             VALUES (?, 'created', ?)`,
            [subId, `Subscription created in ${subStatus} status`]
        );

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Subscription created successfully',
            subscription_id: subId,
            subscription_number: subNumber
        });

    } catch (error) {
        await connection.rollback();
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
});

// LIST ALL SUBSCRIPTIONS
router.get('/', async (req, res) => {
    try {
        const { status, customer_id } = req.query;
        let sql = `
            SELECT s.*, 
                   COALESCE(s.subscription_number, CONCAT('SUB-', LPAD(s.id, 5, '0'))) AS subscription_number,
                   c.name AS customer_name, c.email AS customer_email,
                   p.name AS plan_name, p.price AS plan_price, p.billing_cycle,
                   DATE_FORMAT(s.start_date, '%Y-%m-%d') AS start_date,
                   DATE_FORMAT(s.end_date, '%Y-%m-%d') AS end_date,
                   DATE_FORMAT(s.next_billing_date, '%Y-%m-%d') AS next_billing_date
            FROM subscriptions s
            JOIN customers c ON s.customer_id = c.id
            JOIN plans p ON s.plan_id = p.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            sql += ' AND s.status = ?';
            params.push(status);
        }
        if (customer_id) {
            sql += ' AND s.customer_id = ?';
            params.push(customer_id);
        }

        sql += ' ORDER BY s.id DESC';

        const [rows] = await pool.query(sql, params);

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET SUBSCRIPTION BY ID
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT s.*, 
                   COALESCE(s.subscription_number, CONCAT('SUB-', LPAD(s.id, 5, '0'))) AS subscription_number,
                   c.name AS customer_name, c.email AS customer_email,
                   p.name AS plan_name, p.price AS plan_price, p.billing_cycle,
                   DATE_FORMAT(s.start_date, '%Y-%m-%d') AS start_date,
                   DATE_FORMAT(s.end_date, '%Y-%m-%d') AS end_date,
                   DATE_FORMAT(s.next_billing_date, '%Y-%m-%d') AS next_billing_date
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

        const [items] = await pool.query(`
            SELECT si.*, pr.name AS product_name
            FROM subscription_items si
            JOIN products pr ON si.product_id = pr.id
            WHERE si.subscription_id = ?
        `, [req.params.id]);

        const [history] = await pool.query(`
            SELECT * FROM subscription_history
            WHERE subscription_id = ?
            ORDER BY created_at DESC
        `, [req.params.id]);

        res.json({
            success: true,
            data: {
                ...rows[0],
                items,
                history
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// STATUS TRANSITION / ADVANCE
// State machine: Draft -> Quotation -> Confirmed -> Active -> Closed
router.patch('/:id/transition', async (req, res) => {
    try {
        const { target_status } = req.body;
        const [rows] = await pool.query('SELECT * FROM subscriptions WHERE id = ?', [req.params.id]);

        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'Subscription not found' });
        }

        const sub = rows[0];
        const current = sub.status;

        // Transition mapping
        const validNext = {
            'draft': ['quotation'],
            'quotation': ['draft', 'confirmed'],
            'confirmed': ['active'],
            'active': ['closed', 'cancelled'],
            'pending': ['active', 'cancelled'],
            'closed': [],
            'cancelled': []
        };

        let nextStatus = target_status;
        if (!nextStatus) {
            // auto-advance to next sequential state
            const sequence = ['draft', 'quotation', 'confirmed', 'active', 'closed'];
            const idx = sequence.indexOf(current);
            if (idx >= 0 && idx < sequence.length - 1) {
                nextStatus = sequence[idx + 1];
            } else {
                return res.status(400).json({
                    success: false,
                    message: `Subscription in ${current} status cannot be advanced further.`
                });
            }
        }

        const allowed = validNext[current] || [];
        if (!allowed.includes(nextStatus)) {
            return res.status(400).json({
                success: false,
                message: `Invalid state transition from ${current} to ${nextStatus}. Allowed: ${allowed.join(', ') || 'None'}`
            });
        }

        await pool.query(
            'UPDATE subscriptions SET status = ? WHERE id = ?',
            [nextStatus, req.params.id]
        );

        await pool.query(
            `INSERT INTO subscription_history (subscription_id, action, details)
             VALUES (?, 'status_change', ?)`,
            [req.params.id, `Status changed from ${current} to ${nextStatus}`]
        );

        res.json({
            success: true,
            message: `Subscription transitioned to ${nextStatus}`,
            old_status: current,
            new_status: nextStatus
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// UPDATE SUBSCRIPTION
router.put('/:id', async (req, res) => {
    try {
        const { customer_id, plan_id, start_date, end_date, status } = req.body;
        const [result] = await pool.query(
            `UPDATE subscriptions
             SET customer_id = ?, plan_id = ?, start_date = ?, end_date = ?, status = ?
             WHERE id = ?`,
            [customer_id, plan_id, start_date, end_date || null, status, req.params.id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ success: false, message: 'Subscription not found' });
        }

        res.json({ success: true, message: 'Subscription updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// CANCEL SUBSCRIPTION
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await pool.query(
            "UPDATE subscriptions SET status = 'cancelled' WHERE id = ?",
            [req.params.id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ success: false, message: 'Subscription not found' });
        }

        await pool.query(
            `INSERT INTO subscription_history (subscription_id, action, details)
             VALUES (?, 'cancelled', 'Subscription was cancelled')`,
            [req.params.id]
        );

        res.json({ success: true, message: 'Subscription cancelled successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// HISTORY
router.get('/:id/history', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM subscription_history WHERE subscription_id = ? ORDER BY created_at DESC',
            [req.params.id]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
