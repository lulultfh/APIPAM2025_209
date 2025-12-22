const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET


// get method all user
router.get("/",(req,res)=>{
    db.query("select id, name, username, password, email from `user`", (err, result)=>{
        if(err) return res.status(500).send(err);
        res.json(result);
    })
})

// post method for register user
router.post("/register", (req, res)=>{
    const {name, email, username, password} = req.body;

    if (!name || !email || !username || !password){
        return res.status(400).json({ message: "Data tidak lengkap!" });
    }

    db.query("select * from `user` where username = ? OR email = ?", [username, email], (err, result) =>{
        if (err) return res.status(500).json({ message: err });
        if (result.length > 0) {
            return res.status(400).json({ message: "Username dan Email sudah terdaftar" });
    }
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) return res.status(500).json({ message: "Error hashing password" });

        db.query("insert into `user` set ?")
    })
    })
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) return res.status(500).json({ message: "Error hashing password" });

      db.query(
        "INSERT INTO `user` SET ?",
        { email, password: hashedPassword, nama_lengkap },
        (err) => {
          if (err) return res.status(500).send(err);
          res.json({ message: "User admin berhasil dibuat" });
        }
      );
    });
})

router.post("/login", (req, res) => {
  const{username, password} = req.body;

  db.query("select * from `user` where username = ?", [username], (err,result)=>{
    if(err) return res.status(500).json({error: err});
    if (result.length = 0)
      return res.status(400).json({ message: "Username tidak ditemukan" });

    const user = result[0]

    bcrypt.compare(password, user.password, (err, isMatch => {
      if(!isMatch) return res.status(401).json({ message: "Password salah" });

      const token = jwt.sign(
        {id: user.id, username: user.username},
        JWT_SECRET,
        {expiresIn:"7d"}
      )
      res.json({
        message: "Login berhasil",
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
        }
      });
    }))
  })
})

module.exports = router;