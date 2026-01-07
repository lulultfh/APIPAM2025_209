const express = require("express");
const router = express.Router();
const db = require("../config/db");
const PDFDocument = require('pdfkit');

router.get("/", async (req, res) => {
    const query = `
        SELECT id, status, tanggal, total_harga, namaCust, admin_id 
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

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [orderResult] = await connection.query(
            `INSERT INTO pesanan (status, tanggal, total_harga, namaCust, admin_id) 
             VALUES ('process', NOW(), ?, ?, ?)`,
            [total_harga, namaCust, admin_id]
        );

        const orderId = orderResult.insertId;

        if (items && items.length > 0) {
            for (const item of items) {
                await connection.query(
                    `INSERT INTO pesanan_item (order_id, product_id, qty, subtotal) VALUES (?, ?, ?, ?)`,
                    [orderId, item.product_id, item.qty, item.subtotal]
                );
                await connection.query(
                    `UPDATE product SET stok = stok - ? WHERE id = ?`,
                    [item.qty, item.product_id]
                );
            }
        }

        await connection.commit();
        res.status(201).json({ id: orderId, message: "Pesanan berhasil dibuat oleh Admin" });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error creating order:", error);
        res.status(500).json({ message: "Gagal membuat pesanan" });
    } finally {
        if (connection) connection.release();
    }
});

router.put("/:id", async (req, res) => {
    const { status } = req.body;
    try {
        const [result] = await db.query(
            "UPDATE pesanan SET status = ? WHERE id = ?", 
            [status, req.params.id]
        );
        
        if (result.affectedRows === 0) return res.status(404).send("Pesanan tidak ditemukan");
        res.json({ message: `Status berhasil diubah menjadi ${status}` });
    } catch (error) {
        res.status(500).send("Gagal update status");
    }
});

router.get("/print/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const [order] = await db.query("SELECT * FROM pesanan WHERE id = ?", [id]);
        if (order.length === 0) return res.status(404).send("Data tidak ditemukan");

        const doc = new PDFDocument({ size: [300, 600], margin: 20 }); // Ukuran kertas struk thermal
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Struk_${id}.pdf`);
        doc.pipe(res);

        doc.fontSize(14).text('TOKO WHIMSYWHISK', { align: 'center' });
        doc.fontSize(10).text('Admin Marketplace', { align: 'center' });
        doc.moveDown();
        doc.text(`ID Pesanan: ${order[0].id}`);
        doc.text(`Tanggal: ${order[0].tanggal.toLocaleString('id-ID')}`);
        doc.text(`Customer: ${order[0].namaCust}`);
        doc.text(`------------------------------`);
        
        doc.moveDown();
        doc.fontSize(12).text(`TOTAL: Rp ${order[0].total_harga.toLocaleString('id-ID')}`, { align: 'right' });
        doc.fontSize(10).text(`Status: ${order[0].status}`, { align: 'right' });
        doc.moveDown();
        doc.text('Terima kasih atas kunjungannya!', { align: 'center' });

        doc.end();
    } catch (error) {
        res.status(500).send("Gagal generate struk");
    }
});

module.exports = router;