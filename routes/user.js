const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name, username, email FROM `user`"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, username, password } = req.body;

    if (!name || !email || !username || !password) {
      return res.status(400).json({ message: "Data tidak lengkap!" });
    }

    const [existing] = await db.query(
      "SELECT * FROM `user` WHERE username = ? OR email = ?",
      [username, email]
    );

    if (existing.length > 0) {
      return res
        .status(400)
        .json({ message: "Username atau Email sudah terdaftar" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query("INSERT INTO `user` SET ?", {
      name,
      email,
      username,
      password: hashedPassword,
    });

    res.json({ message: "User berhasil dibuat" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Register gagal" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username dan password wajib diisi" });
    }

    const [rows] = await db.query(
      "SELECT * FROM `user` WHERE username = ?",
      [username]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: "Username tidak ditemukan" });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Password salah" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login berhasil",
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login gagal" });
  }
});

module.exports = router;
