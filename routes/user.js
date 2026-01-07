const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

router.get("/", (req, res) => {
  db.query(
    "SELECT id, name, username, email FROM `user`",
    (err, result) => {
      if (err) return res.status(500).json({ error: err });
      res.json(result);
    }
  );
});

router.post("/register", (req, res) => {
  const { name, email, username, password } = req.body;

  if (!name || !email || !username || !password) {
    return res.status(400).json({ message: "Data tidak lengkap!" });
  }

  db.query(
    "SELECT * FROM `user` WHERE username = ? OR email = ?",
    [username, email],
    (err, result) => {
      if (err) return res.status(500).json({ error: err });

      if (result.length > 0) {
        return res
          .status(400)
          .json({ message: "Username atau Email sudah terdaftar" });
      }

      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err)
          return res.status(500).json({ message: "Error hashing password" });

        db.query(
          "INSERT INTO `user` SET ?",
          {
            name,
            email,
            username,
            password: hashedPassword,
          },
          (err) => {
            if (err) return res.status(500).json({ error: err });

            res.json({ message: "User berhasil dibuat" });
          }
        );
      });
    }
  );
});

router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username dan password wajib diisi" });
  }

  db.query(
    "SELECT * FROM `user` WHERE username = ?",
    [username],
    (err, result) => {
      if (err) return res.status(500).json({ error: err });

      if (result.length === 0) {
        return res.status(400).json({ message: "Username tidak ditemukan" });
      }

      const user = result[0];

      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) return res.status(500).json({ error: err });

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
      });
    }
  );
});

module.exports = router;