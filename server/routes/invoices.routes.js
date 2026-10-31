
const express = require('express');
const router = express.Router();
const { pool: db } = require('../db');

// CREATE INVOICE
router.post('/', async (req, res) => {
    const connection = await db.getConnection();

    try {
        const {
            customer_id,
            subscription_id,
            issue_date,
            due_date,
            items
        } = req.body;

        if (!customer_id || !issue_date || !due_date ||
            !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Customer, dates and invoice items are required'
            });
        }

        for (const item of items) {
            if (
                !item.description ||
                !Number.isInteger(Number(item.quantity)) ||
                Number(item.quantity) <= 0 ||
                !Number.isFinite(Number(item.unit_price)) ||
                Number(item.unit_price) < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Each item needs a description, positive quantity and valid price'
                });
            }
        }

        const subtotal = items.reduce(
            (sum, item) =>
                sum + Number(item.quantity) * Number(item.unit_price),
            0
        );

        await connection.beginTransaction();

        const [customers] = await connection.query(
            'SELECT id FROM customers WHERE id = ?',
            [customer_id]
        );

        if (!customers.length) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Customer not found'
            });
        }

        const invoiceNumber =
            'INV-' + Date.now();

        const [invoice] = await connection.query(
            `INSERT INTO invoices
            (customer_id, subscription_id, invoice_number,
             issue_date, due_date, subtotal, total_amount, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [
                customer_id,
                subscription_id || null,
                invoiceNumber,
                issue_date,
                due_date,
                subtotal,
                subtotal
            ]
        );

        for (const item of items) {
            const quantity = Number(item.quantity);
            const unitPrice = Number(item.unit_price);
            const lineTotal = quantity * unitPrice;

            await connection.query(
                `INSERT INTO invoice_items
                (invoice_id, description, quantity, unit_price, line_total)
                VALUES (?, ?, ?, ?, ?)`,
                [
                    invoice.insertId,
                    item.description,
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
            invoice_id: invoice.insertId,
            invoice_number: invoiceNumber,
            subtotal,
            total_amount: subtotal
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
        const [rows] = await db.query(`
            SELECT i.*, c.name AS customer_name
            FROM invoices i
            JOIN customers c ON i.customer_id = c.id
            ORDER BY i.id DESC
        `);

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
        const [invoices] = await db.query(
            `SELECT i.*, c.name AS customer_name
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

        const [items] = await db.query(
            'SELECT * FROM invoice_items WHERE invoice_id = ?',
            [req.params.id]
        );

        res.json({
            success: true,
            data: {
                ...invoices[0],
                items
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
        const allowedStatuses = ['pending', 'paid', 'overdue', 'cancelled'];
        const { status } = req.body;

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid invoice status'
            });
        }

        const [result] = await db.query(
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
            message: 'Invoice status updated successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;

