const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Get all products
router.get("/", async (req, res) => {
  try {
    const [products] = await db.query(
      "SELECT * FROM products ORDER BY id DESC"
    );
    res.json({ success: true, data: products });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch products" });
  }
});

// Add a product
router.post("/", async (req, res) => {
  try {
    const { name, description, price, status } = req.body;

    if (!name || price === undefined || Number(price) < 0 || !Number.isFinite(Number(price))) {
      return res.status(400).json({
        success: false,
        message: "Valid product name and price are required"
      });
    }

    const [result] = await db.query(
      "INSERT INTO products (name, description, price, status) VALUES (?, ?, ?, ?)",
      [name, description || null, Number(price), status || "active"]
    );

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      id: result.insertId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to create product" });
  }
});

// Update a product
router.put("/:id", async (req, res) => {
  try {
    const { name, description, price, status } = req.body;

    if (!name || price === undefined || !Number.isFinite(Number(price)) || Number(price) < 0) {
      return res.status(400).json({
        success: false,
        message: "Valid product name and price are required"
      });
    }

    const [result] = await db.query(
      "UPDATE products SET name = ?, description = ?, price = ?, status = ? WHERE id = ?",
      [name, description || null, Number(price), status || "active", req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, message: "Product updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update product" });
  }
});

// Delete a product
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await db.query(
      "DELETE FROM products WHERE id = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to delete product. It may be linked to a plan or subscription." });
  }
});

module.exports = router;