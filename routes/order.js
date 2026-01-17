const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.get("/", async (req, res) => {
  const query = `
    SELECT 
      id,
      status,
      tanggal,
      CAST(total_harga AS SIGNED) AS total_harga,
      namaCust,
      admin_id
    FROM pesanan
    ORDER BY tanggal DESC
  `;

  try {
    const [results] = await db.query(query);
    res.json(results);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Gagal mengambil data pesanan" });
  }
});


router.post("/", async (req, res) => {
  const { namaCust, total_harga, admin_id, items } = req.body;

  if (
    namaCust == null ||
    total_harga == null ||
    admin_id == null ||
    !Array.isArray(items)
  ) {
    return res.status(400).json({ error: "Data pesanan tidak lengkap" });
  }

  const totalHargaInt = parseInt(total_harga);

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [orderResult] = await connection.query(
      `
      INSERT INTO pesanan (status, tanggal, total_harga, namaCust, admin_id)
      VALUES ('process', NOW(), ?, ?, ?)
      `,
      [totalHargaInt, namaCust, admin_id]
    );

    const pesananId = orderResult.insertId;

    for (const item of items) {
      if (
        item.product_id == null ||
        item.qty == null ||
        item.subtotal == null
      ) {
        throw new Error("Item pesanan tidak valid");
      }

      await connection.query(
        `
        INSERT INTO pesanan_item (pesanan_id, product_id, qty, subtotal)
        VALUES (?, ?, ?, ?)
        `,
        [
          pesananId,
          item.product_id,
          item.qty,
          parseInt(item.subtotal),
        ]
      );

      await connection.query(
        `UPDATE product SET stok = stok - ? WHERE id = ?`,
        [item.qty, item.product_id]
      );
    }

    await connection.commit();

    res.status(201).json({
      id: pesananId,
      total_harga: totalHargaInt,
      message: "Pesanan berhasil dibuat",
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Gagal membuat pesanan" });
  } finally {
    if (connection) connection.release();
  }
});

router.put("/:id", async (req, res) => {
  const { status, total_harga, namaCust } = req.body; 

  if (!status) {
    return res.status(400).json({ error: "Status wajib diisi" });
  }

  try {
    const [result] = await db.query(
      `UPDATE pesanan SET status = ?, total_harga = ?, namaCust = ? WHERE id = ?`,
      [status, total_harga || 0, namaCust, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Pesanan tidak ditemukan" });
    }

    res.json({ message: "Pesanan Berhasil Diperbarui" });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ error: "Gagal update data" });
  }
});
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM pesanan WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Pesanan tidak ditemukan" });
    }
    res.json({ message: "Pesanan berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ error: "Gagal menghapus pesanan" });
  }
});

module.exports = router;