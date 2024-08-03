const { adminAuth } = require("./auth.js");
const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const app = express();

require("dotenv").config();
app.use(cors());
app.use(express.json());

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/images/product");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

// Kiểm tra có phải là file hình không
const fileFilter = (req, file, cb) => {
  const fileTypes = /jpeg|jpg|png|gif|webp/;
  const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = fileTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Chỉ cho phép hình ảnh (jpeg, jpg, png, gif, webp)"));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
});

const bcrypt = require("bcrypt");
const jwt = require("node-jsonwebtoken");
const privateKey = process.env.PRIVATE_KEY;
const maxAge = 3 * 60 * 60; // 3 giờ - thời gian sống của token

app.use("/images", express.static(path.join(__dirname, "public/images")));

// Tạo kết nối đến cơ sở dữ liệu
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DBNAME || "react-asm",
  port: process.env.DB_PORT || 3306,
});

// Lấy sản phẩm với giới hạn tùy chọn
app.get("/product/:limi?", (req, res) => {
  let limi = parseInt(req.params.limi || 6);
  let sql = `SELECT * FROM product ORDER BY created_at desc LIMIT 0, ?`;
  db.query(sql, [limi], (err, data) => {
    if (err) {
      res.json({ thongbao: "Lỗi lấy sản phẩm", err });
    } else {
      res.json(data);
    }
  });
});

// Sản phẩm hot
app.get("/productHot/:limi?", (req, res) => {
  let limi = parseInt(req.params.limi || 8);
  let sql = `SELECT * FROM product WHERE hot = 1 ORDER BY created_at desc LIMIT 0, ?`;
  db.query(sql, [limi], (err, data) => {
    if (err) {
      res.json({ thongbao: "Lỗi lấy sản phẩm hot", err });
    } else {
      res.json(data);
    }
  });
});

// Sản phẩm giảm giá
app.get("/productSale/:limi?", (req, res) => {
  let limi = parseInt(req.params.limi || 8);
  let sql = `SELECT * FROM product WHERE sale = 1 ORDER BY created_at desc LIMIT 0, ?`;
  db.query(sql, [limi], (err, data) => {
    if (err) {
      res.json({ thongbao: "Lỗi lấy sản phẩm giảm giá", err });
    } else {
      res.json(data);
    }
  });
});

// Lấy chi tiết sản phẩm theo ID
app.get("/productDetail/:id", (req, res) => {
  let id = parseInt(req.params.id || 0);
  if (isNaN(id) || id <= 0) {
    res.json({ "thong bao": "Không biết sản phẩm", id: id });
    return;
  }
  let sql = `SELECT product.*, catalog.name as catalog_name FROM product JOIN catalog ON product.id_catalog = catalog.id WHERE product.id = ?`;
  db.query(sql, [id], (err, data) => {
    if (err) {
      res.json({ thongbao: "Lỗi lấy sản phẩm", err });
    } else {
      res.json(data[0]);
    }
  });
});

// Lấy sản phẩm theo ID danh mục
app.get("/productCatalog/:id_catalog/:limi?", (req, res) => {
  let limi = parseInt(req.params.limi || 6);
  let id_catalog = parseInt(req.params.id_catalog);
  if (isNaN(id_catalog) || id_catalog <= 0) {
    res.json({ "thong bao": "Không biết loại", id_catalog: id_catalog });
    return;
  }
  let sql = `SELECT * FROM product WHERE id_catalog = ? ORDER BY id desc LIMIT 0, ?`;
  db.query(sql, [id_catalog, limi], (err, data) => {
    if (err) {
      res.json({ thongbao: "Lỗi lấy sản phẩm trong loại", err });
    } else {
      res.json(data);
    }
  });
});

// Lấy chi tiết danh mục theo ID
app.get("/catalog/:id_catalog", (req, res) => {
  let id_catalog = parseInt(req.params.id_catalog);
  if (isNaN(id_catalog) || id_catalog <= 0) {
    res.json({ "thong bao": "Không biết loại", id_catalog: id_catalog });
    return;
  }
  let sql = `SELECT * FROM catalog WHERE id = ?`;
  db.query(sql, [id_catalog], (err, data) => {
    if (err) {
      res.json({ thongbao: "Lỗi lấy loại", err });
    } else {
      res.json(data[0]);
    }
  });
});

// Lấy tất cả danh mục
app.get("/catalog", (req, res) => {
  let sql = `SELECT * FROM catalog ORDER BY id`;
  db.query(sql, (err, data) => {
    if (err) {
      res.json({ thongbao: "Lỗi lấy loại", err });
    } else {
      res.json(data);
    }
  });
});

// Lấy sản phẩm liên quan theo ID sản phẩm
app.get("/productRelated/:id", (req, res) => {
  let id = parseInt(req.params.id || 0);
  if (isNaN(id) || id <= 0) {
    res.json({ "thong bao": "Không biết sản phẩm", id: id });
    return;
  }

  db.query(
    "SELECT id_catalog FROM product WHERE id = ?",
    [id],
    (err, categoryData) => {
      if (err) {
        res.json({ thongbao: "Lỗi xảy ra khi lấy dữ liệu", err });
      } else if (categoryData.length === 0) {
        res.json({ thongbao: "Không tìm thấy sản phẩm" });
      } else {
        const id_catalog = categoryData[0].id_catalog;
        db.query(
          "SELECT * FROM product WHERE id_catalog = ? AND id != ?",
          [id_catalog, id],
          (err, relatedData) => {
            if (err) {
              res.json({ thongbao: "Lỗi xảy ra khi lấy dữ liệu", err });
            } else {
              res.json(relatedData);
            }
          }
        );
      }
    }
  );
});

app.post("/orders", (req, res) => {
  let data = req.body;
  let sql = `INSERT INTO orders SET ?`;
  db.query(sql, data, (err, result) => {
    if (err) {
      res.json({ id: -1, thongbao: "Lỗi lưu đơn hàng", err });
    } else {
      const id = result.insertId;
      res.json({ id: id, thongbao: "Đã lưu đơn hàng" });
    }
  });
});

app.post("/order_detail", (req, res) => {
  let data = req.body;
  let sql = `INSERT INTO order_detail SET ?`;
  db.query(sql, data, (err, result) => {
    if (err) {
      res.json({ thongbao: "Lỗi lưu đơn hàng chi tiết", err });
    } else {
      res.json({
        product_id: data.product_id,
        thongbao: "Đã lưu đơn hàng chi tiết",
      });
    }
  });
});

// Admin
app.get("/admin/product", adminAuth, (req, res) => {
  let limi = parseInt(req.query.limi || 10);
  let sql = `SELECT * FROM product ORDER BY created_at desc LIMIT 0,?`;
  db.query(sql, [limi], (err, data) => {
    if (err) req.status(500).json({ error: "Lỗi lấy sản phẩm" }, err);
    else res.json(data);
  });
});

app.get("/admin/product/:id", adminAuth, (req, res) => {
  let id = parseInt(req.params.id);
  if (id <= 0 || isNaN(id)) {
    res.json({ error: "ID sản phẩm không hợp lệ", id: id });
    return;
  }
  let sql = `SELECT * FROM product WHERE id = ?`;
  db.query(sql, id, (err, data) => {
    if (err) {
      res.json({ error: "Lỗi lấy sản phẩm", details: err });
    } else if (data.length === 0) {
      res.json({ error: "Sản phẩm không tìm thấy", id: id });
    } else {
      res.json(data[0]);
    }
  });
});

app.post("/admin/product", upload.single("image"), adminAuth, (req, res) => {
  let data = req.body;
  let image = req.file ? req.file.originalname : null;
  data.image = image;
  let sql = `INSERT INTO product SET ?`;
  db.query(sql, data, (err, result) => {
    if (err) {
      res.json({ id: -1, thongbao: "Lỗi lưu sản phẩm", err });
    } else {
      res.json({
        id: result.insertId,
        thongbao: "Đã lưu sản phẩm",
        image: image,
      });
    }
  });
});

app.put("/admin/product/:id", upload.single("image"), adminAuth, (req, res) => {
  let id = parseInt(req.params.id);
  let data = req.body;
  let image = req.file ? req.file.originalname : null;
  if (image) data.image = image;

  let sql = `UPDATE product SET ? WHERE id = ?`;
  db.query(sql, [data, id], (err, result) => {
    if (err) {
      res.json({ thongbao: "Lỗi cập nhật sản phẩm", err });
    } else {
      res.json({ thongbao: "Cập nhật sản phẩm thành công", image: image });
    }
  });
});

app.delete("/admin/product/:id", adminAuth, (req, res) => {
  let id = parseInt(req.params.id);
  if (id <= 0 || isNaN(id)) {
    res.json({ error: "ID sản phẩm không hợp lệ", id: id });
    return;
  }
  db.query(`SELECT image FROM product WHERE id = ?`, [id], (err, data) => {
    if (err) {
      res.json({ error: "Lỗi lấy hình ảnh sản phẩm", details: err });
      return;
    }
    if (data.length === 0) {
      res.json({ error: "Sản phẩm không tìm thấy", id: id });
      return;
    }

    const imagePath = `public/images/product/${data[0].image}`;
    db.query(`DELETE FROM product WHERE id = ?`, [id], (err, result) => {
      if (err) {
        res.json({ error: "Lỗi xóa sản phẩm", details: err });
      } else {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
        res.json({ message: "Sản phẩm đã được xóa", id: id });
      }
    });
  });
});

app.post("/admin/catalog", adminAuth, (req, res) => {
  let data = req.body;
  let sql = `INSERT INTO catalog SET ?`;
  db.query(sql, data, (err, result) => {
    if (err) {
      res.json({ id: -1, thongbao: "Lỗi lưu danh mục", err });
    } else {
      res.json({ id: result.insertId, thongbao: "Đã lưu danh mục" });
    }
  });
});

app.put("/admin/catalog/:id", adminAuth, (req, res) => {
  let id = parseInt(req.params.id);
  let data = req.body;
  let sql = `UPDATE catalog SET ? WHERE id = ?`;
  db.query(sql, [data, id], (err, result) => {
    if (err) {
      res.json({ thongbao: "Lỗi cập nhật danh mục", err });
    } else {
      res.json({ thongbao: "Cập nhật danh mục thành công" });
    }
  });
});

app.delete("/admin/catalog/:id", adminAuth, (req, res) => {
  let id = parseInt(req.params.id);
  if (id <= 0 || isNaN(id)) {
    res.json({ error: "ID danh mục không hợp lệ", id: id });
    return;
  }
  let sql = `DELETE FROM catalog WHERE id = ?`;
  db.query(sql, [id], (err, result) => {
    if (err) {
      res.json({ error: "Lỗi xóa danh mục", details: err });
    } else {
      res.json({ message: "Danh mục đã được xóa", id: id });
    }
  });
});

app.post("/register", (req, res) => {
  const { email, password, fullName, phone } = req.body;
  if (!email || !password || !fullName || !phone) {
    res.status(400).json({ error: "Thiếu thông tin" });
    return;
  }

  db.query("SELECT * FROM user WHERE email = ?", [email], (err, data) => {
    if (err) {
      res.status(500).json({ error: "Lỗi cơ sở dữ liệu", details: err });
      return;
    }
    if (data.length > 0) {
      res.status(400).json({ error: "Email đã được sử dụng" });
      return;
    }

    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        res.status(500).json({ error: "Lỗi mã hóa mật khẩu", details: err });
        return;
      }

      db.query(
        "INSERT INTO user (email, password, fullName, phone) VALUES (?, ?, ?, ?)",
        [email, hashedPassword, fullName, phone],
        (err, result) => {
          if (err) {
            res
              .status(500)
              .json({ error: "Lỗi đăng ký người dùng", details: err });
          } else {
            res
              .status(201)
              .json({ message: "Đăng ký thành công", userId: result.insertId });
          }
        }
      );
    });
  });
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Thiếu thông tin" });
    return;
  }

  db.query("SELECT * FROM user WHERE email = ?", [email], (err, data) => {
    if (err) {
      res.status(500).json({ error: "Lỗi cơ sở dữ liệu", details: err });
      return;
    }
    if (data.length === 0) {
      res.status(400).json({ error: "Email không tìm thấy" });
      return;
    }

    const user = data[0];
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        res.status(500).json({ error: "Lỗi so sánh mật khẩu", details: err });
        return;
      }
      if (!isMatch) {
        res.status(400).json({ error: "Mật khẩu không đúng" });
        return;
      }

      const payload = {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      };
      const token = jwt.sign(payload, privateKey, { expiresIn: maxAge });

      res.status(200).json({
        message: "Đăng nhập thành công",
        token,
        expiresIn: maxAge,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          phone: user.phone,
        },
      });
    });
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Máy chủ đang chạy trên cổng ${PORT}`);
});
