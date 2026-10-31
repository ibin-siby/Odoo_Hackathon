
const express = require("express");
const router = express.Router();

const db = require("../config/db");

// CREATE QUOTATION TEMPLATE
router.post("/", async (req, res) => {
    const { name, description, validity_days, lines } = req.body;

    if (!name || !validity_days || validity_days <= 0) {
        return res.status(400).json({
            success: false,
            message: "Name and valid validity days are required"
        });
    }

    if (!Array.isArray(lines) || lines.length === 0) {
        return res.status(400).json({
            success: false,
            message: "At least one product line is required"
        });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [result] = await connection.query(
            `INSERT INTO quotation_templates
            (name, description, validity_days)
            VALUES (?, ?, ?)`,
            [name, description || null, validity_days]
        );

        const templateId = result.insertId;

        for (const line of lines) {
            if (
                !line.product_id ||
                !Number.isInteger(Number(line.quantity)) ||
                Number(line.quantity) <= 0 ||
                !Number.isFinite(Number(line.unit_price)) ||
                Number(line.unit_price) < 0
            ) {
                throw new Error("Invalid product line");
            }

            await connection.query(
                `INSERT INTO quotation_template_lines
                (template_id, product_id, quantity, unit_price)
                VALUES (?, ?, ?, ?)`,
                [
                    templateId,
                    line.product_id,
                    line.quantity,
                    line.unit_price
                ]
            );
        }

        await connection.commit();

        res.status(201).json({
            success: true,
            message: "Quotation template created successfully",
            template_id: templateId
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


// LIST ALL QUOTATION TEMPLATES
router.get("/", async (req, res) => {
    try {
        const [templates] = await db.query(
            `SELECT * FROM quotation_templates
             ORDER BY created_at DESC`
        );

        res.json({
            success: true,
            data: templates
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


// GET ONE TEMPLATE WITH PRODUCT LINES
router.get("/:id", async (req, res) => {
    try {
        const [templates] = await db.query(
            `SELECT * FROM quotation_templates WHERE id = ?`,
            [req.params.id]
        );

        if (templates.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Template not found"
            });
        }

        const [lines] = await db.query(
            `SELECT * FROM quotation_template_lines
             WHERE template_id = ?`,
            [req.params.id]
        );

        res.json({
            success: true,
            data: {
                ...templates[0],
                lines
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


// EDIT QUOTATION TEMPLATE AND PRODUCT LINES
router.put("/:id", async (req, res) => {
    const { name, description, validity_days, lines } = req.body;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [existing] = await connection.query(
            `SELECT id FROM quotation_templates WHERE id = ?`,
            [req.params.id]
        );

        if (existing.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "Template not found"
            });
        }

        if (
            !name ||
            !Number.isInteger(Number(validity_days)) ||
            Number(validity_days) <= 0 ||
            !Array.isArray(lines) ||
            lines.length === 0
        ) {
            throw new Error("Invalid template details or product lines");
        }

        await connection.query(
            `UPDATE quotation_templates
             SET name = ?, description = ?, validity_days = ?
             WHERE id = ?`,
            [
                name,
                description || null,
                validity_days,
                req.params.id
            ]
        );

        await connection.query(
            `DELETE FROM quotation_template_lines
             WHERE template_id = ?`,
            [req.params.id]
        );

        for (const line of lines) {
            if (
                !line.product_id ||
                !Number.isInteger(Number(line.quantity)) ||
                Number(line.quantity) <= 0 ||
                !Number.isFinite(Number(line.unit_price)) ||
                Number(line.unit_price) < 0
            ) {
                throw new Error("Invalid product line");
            }

            await connection.query(
                `INSERT INTO quotation_template_lines
                (template_id, product_id, quantity, unit_price)
                VALUES (?, ?, ?, ?)`,
                [
                    req.params.id,
                    line.product_id,
                    line.quantity,
                    line.unit_price
                ]
            );
        }

        await connection.commit();

        res.json({
            success: true,
            message: "Quotation template updated successfully"
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

module.exports = router;
