const express = require('express');
const router = express.Router();
const pool = require('../db');

// CREATE QUOTATION TEMPLATE
router.post('/', async (req, res) => {
    const { name, description, validity_days, lines } = req.body;

    if (!name || !validity_days || validity_days <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Name and valid validity days are required'
        });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [result] = await connection.query(
            `INSERT INTO quotation_templates (name, description, validity_days)
             VALUES (?, ?, ?)`,
            [name, description || null, validity_days]
        );

        const templateId = result.insertId;

        if (Array.isArray(lines) && lines.length > 0) {
            for (const line of lines) {
                if (line.product_id) {
                    await connection.query(
                        `INSERT INTO quotation_template_lines (template_id, product_id, quantity, unit_price)
                         VALUES (?, ?, ?, ?)`,
                        [
                            templateId,
                            line.product_id,
                            line.quantity || 1,
                            line.unit_price || 0
                        ]
                    );
                }
            }
        }

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Quotation template created successfully',
            template_id: templateId
        });

    } catch (error) {
        await connection.rollback();
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
});

// LIST ALL QUOTATION TEMPLATES
router.get('/', async (req, res) => {
    try {
        const [templates] = await pool.query(
            'SELECT * FROM quotation_templates ORDER BY id DESC'
        );

        // Fetch lines for each template
        for (const t of templates) {
            const [lines] = await pool.query(`
                SELECT qtl.*, p.name AS product_name
                FROM quotation_template_lines qtl
                JOIN products p ON qtl.product_id = p.id
                WHERE qtl.template_id = ?
            `, [t.id]);
            t.lines = lines;
        }

        res.json({
            success: true,
            data: templates
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET TEMPLATE BY ID
router.get('/:id', async (req, res) => {
    try {
        const [templates] = await pool.query(
            'SELECT * FROM quotation_templates WHERE id = ?',
            [req.params.id]
        );

        if (!templates.length) {
            return res.status(404).json({
                success: false,
                message: 'Template not found'
            });
        }

        const [lines] = await pool.query(`
            SELECT qtl.*, p.name AS product_name
            FROM quotation_template_lines qtl
            JOIN products p ON qtl.product_id = p.id
            WHERE qtl.template_id = ?
        `, [req.params.id]);

        res.json({
            success: true,
            data: {
                ...templates[0],
                lines
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE TEMPLATE
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM quotation_templates WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Template not found' });
        }
        res.json({ success: true, message: 'Template deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
