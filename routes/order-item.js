const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.get("/", async (req, res) => {
  const query = `
    SELECT pi.*, p.nama
    FROM pesanan_item pi
    JOIN product p ON pi.product_id = p.id
  `;
  try {
    const [results] = await db.query(query);
    res.json(results);
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:id", async (req, res) => {
  const query = `
    SELECT pi.id, pi.qty, pi.subtotal, p.nama, p.price
    FROM pesanan_item pi
    JOIN product p ON pi.product_id = p.id
    WHERE pi.pesanan_id = ?
  `;
  try {
    const [results] = await db.query(query, [req.params.id]);
    res.json(results);
  } catch (error) {
    // console.error("Error fetching detail by pesanan ID:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", async (req, res) => {
  const { pesanan_id, product_id, qty, subtotal } = req.body;

  if (!pesanan_id || !product_id || !qty || !subtotal) {
    return res.status(400).json({ error: "Semua kolom (pesanan_id, product_id, qty, subtotal) wajib diisi!" });
  }

  const query = "INSERT INTO pesanan_item (pesanan_id, product_id, qty, subtotal) VALUES (?, ?, ?, ?)";
  const values = [pesanan_id, product_id, qty, subtotal];

  try {
    const [results] = await db.query(query, values);
    res.status(201).json({
      id: results.insertId,
      pesanan_id,
      product_id,
      qty,
      subtotal,
    });
  } catch (error) {
    console.error("Error creating item:", error);
    res.status(500).json({ error: "Gagal menambah item. Pastikan ID pesanan dan produk benar." });
  }
});

router.put("/:id", async (req, res) => {
  const { pesanan_id, product_id, qty, subtotal } = req.body;
  const query = "UPDATE pesanan_item SET pesanan_id = ?, product_id = ?, qty = ?, subtotal = ? WHERE id = ?";
  const values = [pesanan_id, product_id, qty, subtotal, req.params.id];

  try {
    const [results] = await db.query(query, values);
    if (results.affectedRows === 0) return res.status(404).json({ error: "Item tidak ditemukan" });
    res.json({ message: "Item berhasil diperbarui" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const [results] = await db.query("DELETE FROM pesanan_item WHERE id = ?", [req.params.id]);
    if (results.affectedRows === 0) return res.status(404).json({ error: "Item tidak ditemukan" });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;