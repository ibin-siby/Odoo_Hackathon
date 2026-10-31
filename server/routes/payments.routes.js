const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET all payments
router.get('/', async (req, res) => {
    try {
        const [payments] = await pool.query(
            `SELECT p.*, i.invoice_number, c.name AS customer_name,
                    pm.name AS payment_method
             FROM payments p
             JOIN invoices i ON p.invoice_id = i.id
             JOIN customers c ON i.customer_id = c.id
             LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
             ORDER BY p.payment_date DESC`
        );

        res.json(payments);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET payment by ID
router.get('/:id', async (req, res) => {
    try {
        const [payments] = await pool.query(
            'SELECT * FROM payments WHERE id = ?',
            [req.params.id]
        );

        if (payments.length === 0) {
            return res.status(404).json({
                message: 'Payment not found'
            });
        }

        res.json(payments[0]);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// CREATE payment
router.post('/', async (req, res) => {
    const {
        invoice_id,
        payment_method_id,
        amount,
        note
    } = req.body;

    // Validate input
    if (
        !invoice_id ||
        !amount ||
        !Number.isFinite(Number(amount)) ||
        Number(amount) <= 0
    ) {
        return res.status(400).json({
            message: 'Valid invoice ID and payment amount are required'
        });
    }

    let connection;

    try {
        connection = await pool.getConnection();

        await connection.beginTransaction();

        // Find and lock invoice
        const [invoices] = await connection.query(
            'SELECT * FROM invoices WHERE id = ? FOR UPDATE',
            [invoice_id]
        );

        if (invoices.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                message: 'Invoice not found'
            });
        }

        const invoice = invoices[0];

        // Check invoice status
        if (
            invoice.status === 'cancelled' ||
            invoice.status === 'draft'
        ) {
            await connection.rollback();

            return res.status(400).json({
                message: 'Cannot pay a draft or cancelled invoice'
            });
        }

        const outstanding = Number(invoice.outstanding_amount);
        const paymentAmount = Number(amount);

        // Check payment amount
        if (paymentAmount > outstanding) {
            await connection.rollback();

            return res.status(400).json({
                message: 'Payment exceeds outstanding invoice amount'
            });
        }

        // Validate payment method
        if (payment_method_id) {
            const [methods] = await connection.query(
                'SELECT id FROM payment_methods WHERE id = ?',
                [payment_method_id]
            );

            if (methods.length === 0) {
                await connection.rollback();

                return res.status(400).json({
                    message: 'Invalid payment method'
                });
            }
        }

        // Insert payment
        const [result] = await connection.query(
            `INSERT INTO payments
             (invoice_id, payment_method_id, amount, note)
             VALUES (?, ?, ?, ?)`,
            [
                invoice_id,
                payment_method_id || null,
                paymentAmount,
                note || null
            ]
        );

        // Update invoice amounts
        const newPaidAmount =
            Number(invoice.paid_amount) + paymentAmount;

        const newOutstanding =
            outstanding - paymentAmount;

        const newStatus = newOutstanding === 0
            ? 'paid'
            : 'partially_paid';

        await connection.query(
            `UPDATE invoices
             SET paid_amount = ?,
                 outstanding_amount = ?,
                 status = ?
             WHERE id = ?`,
            [
                newPaidAmount,
                newOutstanding,
                newStatus,
                invoice_id
            ]
        );

        await connection.commit();

        // Send response
        res.status(201).json({
            message: 'Payment recorded successfully',
            payment_id: result.insertId,
            paid_amount: newPaidAmount,
            outstanding_amount: newOutstanding,
            invoice_status: newStatus
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        res.status(500).json({
            message: error.message
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
});

module.exports = router;