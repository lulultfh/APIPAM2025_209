const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.get("/", async (req, res) => {
  const query = `
    SELECT 
      pi.id,
      pi.pesanan_id,
      pi.product_id,
      pi.qty,
      CAST(pi.subtotal AS SIGNED) AS subtotal,
      p.nama
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
    SELECT 
      pi.id,
      pi.qty,
      CAST(pi.subtotal AS SIGNED) AS subtotal,
      p.nama,
      p.price
    FROM pesanan_item pi
    JOIN product p ON pi.product_id = p.id
    WHERE pi.pesanan_id = ?
  `;

  try {
    const [results] = await db.query(query, [req.params.id]);
    res.json(results);
  } catch (error) {
    console.error("Error fetching detail:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
router.post("/", async (req, res) => {
  const { product_id, qty, subtotal } = req.body;

  if (product_id == null || qty == null || subtotal == null) {
    return res.status(400).json({
      error: "product_id, qty, dan subtotal wajib diisi!",
    });
  }

  try {
    const [pesananAktif] = await db.query(
      "SELECT id FROM pesanan WHERE status = 'process' LIMIT 1"
    );

    let targetPesananId;

    if (pesananAktif.length > 0) {
      targetPesananId = pesananAktif[0].id;
    } else {
      const [users] = await db.query("SELECT id FROM user LIMIT 1");
      
      if (users.length === 0) {
        return res.status(500).json({ error: "Tabel user kosong! Masukkan user dulu." });
      }
      
      const validAdminId = users[0].id;
      const [newOrder] = await db.query(
        "INSERT INTO pesanan (namaCust, status, tanggal, total_harga, admin_id) VALUES (?, ?, NOW(), ?, ?)",
        ["Draft Cust", "process", 0, validAdminId] 
      );
      targetPesananId = newOrder.insertId;
    }
    const [existingItem] = await db.query(
      "SELECT id, qty FROM pesanan_item WHERE pesanan_id = ? AND product_id = ?",
      [targetPesananId, product_id]
    );

    if (existingItem.length > 0) {
      const newQty = existingItem[0].qty + parseInt(qty);
      const newSubtotal = newQty * (subtotal / qty);

      await db.query(
        "UPDATE pesanan_item SET qty = ?, subtotal = ? WHERE id = ?",
        [newQty, newSubtotal, existingItem[0].id]
      );

      res.status(200).json({ message: "Quantity keranjang diperbarui", pesanan_id: targetPesananId });
    } else {
      const [result] = await db.query(
        "INSERT INTO pesanan_item (pesanan_id, product_id, qty, subtotal) VALUES (?, ?, ?, ?)",
        [targetPesananId, product_id, qty, subtotal]
      );

      res.status(201).json({
        id: result.insertId,
        pesanan_id: targetPesananId,
        product_id,
        qty,
        subtotal
      });
    }
  } catch (error) {
    console.error("Error pada logika keranjang:", error);
    res.status(500).json({ error: "Gagal memproses keranjang belanja" });
  }
});

router.put("/:id", async (req, res) => {
  const { qty, subtotal } = req.body; // Pastikan Android mengirim ini dalam JSON Body

  if (qty === undefined || subtotal === undefined) {
    return res.status(400).json({ error: "qty dan subtotal wajib diisi dalam body request!" });
  }

  const query = `
    UPDATE pesanan_item
    SET qty = ?, subtotal = ?
    WHERE id = ?
  `;
  const values = [qty, subtotal, req.params.id];

  try {
    const [results] = await db.query(query, values);
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "Item tidak ditemukan" });
    }
    res.json({ message: "Item berhasil diperbarui" });
  } catch (error) {
    console.error("Error updating item:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
router.delete("/:id", async (req, res) => {
  try {
    const [results] = await db.query(
      "DELETE FROM pesanan_item WHERE id = ?",
      [req.params.id]
    );
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "Item tidak ditemukan" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting item:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;