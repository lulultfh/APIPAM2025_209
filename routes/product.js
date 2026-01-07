const express = require('express');
const router = express.Router();
const multer = require('multer');
const db = require('../config/db');
const fs = require('fs');
const path = require('path');

const cleanupFileOnError = (file) => {
    if (file?.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
    }
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname,  '..', 'uploads', 'products');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `product-${unique}${path.extname(file.originalname)}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    allowed.includes(file.mimetype)
        ? cb(null, true)
        : cb(new Error('Format gambar tidak valid'), false);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 3 * 1024 * 1024 }
});

const ALLOWED_CATEGORIES = ['cake', 'pastry', 'bread', 'cookies'];

const validateCategory = (kategori) =>
    ALLOWED_CATEGORIES.includes(kategori);

const validatePriceAndStock = (price, stok) => {
    if (isNaN(price) || price < 0)
        return { valid: false, message: 'Harga tidak valid' };
    if (isNaN(stok) || stok < 0)
        return { valid: false, message: 'Stok tidak valid' };
    return { valid: true };
};

router.get('/image/:filename', (req, res) => {
    const imagePath = path.join(__dirname, '..', 'uploads', 'products', req.params.filename);
    if (!fs.existsSync(imagePath)) {
        return res.status(404).json({ error: 'Gambar tidak ditemukan' });
    }
    res.sendFile(path.resolve(imagePath));
});

router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM product');
        res.json(rows);
    } catch (error) {
        console.error('GET ALL ERROR:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM product WHERE id = ?',
            [req.params.id]
        );

        if (!rows.length) {
            return res.status(404).json({ error: 'Produk tidak ditemukan' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('GET BY ID ERROR:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/', upload.single('image'), async (req, res) => {
    const { nama, price, desc, stok, kategori } = req.body;

    if (!nama || !price || !desc || !stok || !kategori) {
        cleanupFileOnError(req.file);
        return res.status(400).json({ error: 'Semua field wajib diisi' });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'Gambar wajib diupload' });
    }

    if (!validateCategory(kategori)) {
        cleanupFileOnError(req.file);
        return res.status(400).json({ error: 'Kategori tidak valid' });
    }

    const validation = validatePriceAndStock(price, stok);
    if (!validation.valid) {
        cleanupFileOnError(req.file);
        return res.status(400).json({ error: validation.message });
    }

    try {
        const [result] = await db.query(
            `INSERT INTO product (nama, price, \`desc\`, image, stok, kategori)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [nama.trim(), price, desc.trim(), req.file.filename, stok, kategori]
        );

        res.status(201).json({
            id: result.insertId,
            nama,
            price,
            desc,
            stok,
            kategori,
            image: req.file.filename
        });
    } catch (error) {
        cleanupFileOnError(req.file);
        console.error('CREATE ERROR:', error);
        res.status(500).json({ error: error.message });
    }
});

router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM product WHERE id = ?',
            [req.params.id]
        );

        if (!rows.length) {
            cleanupFileOnError(req.file);
            return res.status(404).json({ error: 'Produk tidak ditemukan' });
        }

        const product = rows[0];
        let image = product.image;

        if (req.file) {
            const oldPath = path.join(__dirname, '..', 'uploads', 'products', product.image);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            image = req.file.filename;
        }

        await db.query(
            `UPDATE product SET nama=?, price=?, \`desc\`=?, image=?, stok=?, kategori=? WHERE id=?`,
            [
                req.body.nama ?? product.nama,
                req.body.price ?? product.price,
                req.body.desc ?? product.desc,
                image,
                req.body.stok ?? product.stok,
                req.body.kategori ?? product.kategori,
                req.params.id
            ]
        );

        res.json({ message: 'Produk berhasil diupdate' });
    } catch (error) {
        cleanupFileOnError(req.file);
        console.error('UPDATE ERROR:', error);
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT image FROM product WHERE id = ?',
            [req.params.id]
        );

        if (!rows.length) {
            return res.status(404).json({ error: 'Produk tidak ditemukan' });
        }

        const imagePath = path.join(__dirname, '..', 'uploads', 'products', rows[0].image);
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);

        await db.query('DELETE FROM product WHERE id = ?', [req.params.id]);
        res.status(204).send();
    } catch (error) {
        console.error('DELETE ERROR:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
