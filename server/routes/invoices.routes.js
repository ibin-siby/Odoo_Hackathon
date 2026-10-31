const express = require('express');
const router = express.Router();
const pool = require('../db');

// Helper to generate invoice number
async function generateInvoiceNumber(conn) {
    const [rows] = await conn.query('SELECT MAX(id) AS maxId FROM invoices');
    const nextId = (rows[0].maxId || 0) + 1;
    return `INV-${String(nextId).padStart(5, '0')}`;
}

// CREATE INVOICE
router.post('/', async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const {
            customer_id,
            subscription_id,
            invoice_date,
            issue_date, // fallback
            due_date,
            items,
            tax_rate,
            discount_amount,
            status
        } = req.body;

        const effectiveDate = invoice_date || issue_date || new Date().toISOString().split('T')[0];
        const effectiveDue = due_date || effectiveDate;

        if (!customer_id || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Customer, valid items and dates are required'
            });
        }

        let subtotal = 0;
        for (const item of items) {
            const qty = Number(item.quantity) || 1;
            const price = Number(item.unit_price) || 0;
            subtotal += qty * price;
        }

        const discount = Number(discount_amount) || 0;
        const taxRate = Number(tax_rate) || 0;
        const taxableAmount = Math.max(0, subtotal - discount);
        const taxTotal = (taxableAmount * taxRate) / 100;
        const total = taxableAmount + taxTotal;
        const outstanding = total;

        await connection.beginTransaction();

        const [customers] = await connection.query(
            'SELECT id, name FROM customers WHERE id = ?',
            [customer_id]
        );

        if (!customers.length) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Customer not found'
            });
        }

        const invNumber = await generateInvoiceNumber(connection);
        const invStatus = status || 'draft';

        const [invoice] = await connection.query(
            `INSERT INTO invoices
            (customer_id, subscription_id, invoice_number,
             invoice_date, due_date, subtotal, tax_amount, discount_amount,
             total_amount, paid_amount, outstanding_amount, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?, ?)`,
            [
                customer_id,
                subscription_id || null,
                invNumber,
                effectiveDate,
                effectiveDue,
                subtotal,
                taxTotal,
                discount,
                total,
                outstanding,
                invStatus
            ]
        );

        const invoiceId = invoice.insertId;

        for (const item of items) {
            const quantity = Number(item.quantity) || 1;
            const unitPrice = Number(item.unit_price) || 0;
            const lineTotal = quantity * unitPrice;

            await connection.query(
                `INSERT INTO invoice_items
                (invoice_id, product_id, description, quantity, unit_price, line_total)
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    invoiceId,
                    item.product_id || null,
                    item.description || 'Service/Product',
                    quantity,
                    unitPrice,
                    lineTotal
                ]
            );
        }

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Invoice created successfully',
            invoice_id: invoiceId,
            invoice_number: invNumber,
            subtotal,
            total_amount: total,
            outstanding_amount: outstanding
        });

    } catch (error) {
        await connection.rollback();
        res.status(500).json({
            success: false,
            message: error.message
        });
    } finally {
        connection.release();
    }
});

// GET ALL INVOICES
router.get('/', async (req, res) => {
    try {
        const { status, customer_id } = req.query;
        let sql = `
            SELECT i.*, c.name AS customer_name, c.email AS customer_email,
                   DATE_FORMAT(i.invoice_date, '%Y-%m-%d') AS invoice_date,
                   DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due_date,
                   CASE 
                     WHEN i.status = 'confirmed' AND i.due_date < CURDATE() AND i.outstanding_amount > 0 THEN 1 
                     ELSE 0 
                   END AS is_overdue
            FROM invoices i
            JOIN customers c ON i.customer_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            sql += ' AND i.status = ?';
            params.push(status);
        }
        if (customer_id) {
            sql += ' AND i.customer_id = ?';
            params.push(customer_id);
        }

        sql += ' ORDER BY i.id DESC';

        const [rows] = await pool.query(sql, params);

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET INVOICE BY ID
router.get('/:id', async (req, res) => {
    try {
        const [invoices] = await pool.query(
            `SELECT i.*, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone, c.address AS customer_address,
                    DATE_FORMAT(i.invoice_date, '%Y-%m-%d') AS invoice_date,
                    DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due_date
             FROM invoices i
             JOIN customers c ON i.customer_id = c.id
             WHERE i.id = ?`,
            [req.params.id]
        );

        if (!invoices.length) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        const [items] = await pool.query(
            'SELECT * FROM invoice_items WHERE invoice_id = ?',
            [req.params.id]
        );

        const [payments] = await pool.query(`
            SELECT p.*, pm.name AS payment_method_name,
                   DATE_FORMAT(p.payment_date, '%Y-%m-%d %H:%i') AS payment_date_formatted
            FROM payments p
            LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
            WHERE p.invoice_id = ?
            ORDER BY p.payment_date DESC
        `, [req.params.id]);

        res.json({
            success: true,
            data: {
                ...invoices[0],
                items,
                payments
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// UPDATE INVOICE STATUS
router.patch('/:id/status', async (req, res) => {
    try {
        const allowedStatuses = ['draft', 'confirmed', 'partially_paid', 'paid', 'cancelled'];
        const { status } = req.body;

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid invoice status. Allowed: ${allowedStatuses.join(', ')}`
            });
        }

        const [result] = await pool.query(
            'UPDATE invoices SET status = ? WHERE id = ?',
            [status, req.params.id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        res.json({
            success: true,
            message: `Invoice status updated to ${status}`
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// CONFIRM INVOICE (draft -> confirmed)
router.post('/:id/confirm', async (req, res) => {
    try {
        const [result] = await pool.query(
            "UPDATE invoices SET status = 'confirmed' WHERE id = ? AND status = 'draft'",
            [req.params.id]
        );

        if (!result.affectedRows) {
            return res.status(400).json({
                success: false,
                message: 'Invoice cannot be confirmed (not in draft status)'
            });
        }

        res.json({ success: true, message: 'Invoice confirmed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// CANCEL INVOICE
router.post('/:id/cancel', async (req, res) => {
    try {
        const [inv] = await pool.query('SELECT paid_amount FROM invoices WHERE id = ?', [req.params.id]);
        if (!inv.length) {
            return res.status(404).json({ success: false, message: 'Invoice not found' });
        }
        if (Number(inv[0].paid_amount) > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel an invoice with recorded payments'
            });
        }

        await pool.query(
            "UPDATE invoices SET status = 'cancelled' WHERE id = ?",
            [req.params.id]
        );

        res.json({ success: true, message: 'Invoice cancelled successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// SIMULATE SEND INVOICE
router.post('/:id/send', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'Invoice not found' });
        }
        res.json({
            success: true,
            message: `Invoice ${rows[0].invoice_number} sent to customer email successfully.`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
