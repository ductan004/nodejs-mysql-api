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

app.use("/images", express.static(path.join(__dirname, "public/images")));

// Create a connection pool
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  port: 3306,
  database: "react-asm",
});

// Fetch products with optional limit
app.get("/product/:limi?", (req, res) => {
  let limi = parseInt(req.params.limi || 6);
  let sql = `SELECT * FROM product ORDER BY created_at desc LIMIT 0, ?`;
  db.query(sql, [limi], (err, data) => {
    if (err) {
      res.json({ thongbao: "loi lay sp", err });
    } else {
      res.json(data);
    }
  });
});

// Product hot
app.get("/productHot/:limi?", (req, res) => {
  let limi = parseInt(req.params.limi || 8);
  let sql = `SELECT * FROM product WHERE hot = 1 ORDER BY created_at desc LIMIT 0, ?`;
  db.query(sql, [limi], (err, data) => {
    if (err) {
      res.json({ thongbao: "loi lay sp hot", err });
    } else {
      res.json(data);
    }
  });
});

// Product sale
app.get("/productSale/:limi?", (req, res) => {
  let limi = parseInt(req.params.limi || 8);
  let sql = `SELECT * FROM product WHERE sale = 1 ORDER BY created_at desc LIMIT 0, ?`;
  db.query(sql, [limi], (err, data) => {
    if (err) {
      res.json({ thongbao: "loi lay sp sale", err });
    } else {
      res.json(data);
    }
  });
});

// Fetch product details by id
app.get("/productDetail/:id", (req, res) => {
  let id = parseInt(req.params.id || 0);
  if (isNaN(id) || id <= 0) {
    res.json({ "thong bao": "Không biết sản phẩm", id: id });
    return;
  }
  let sql = `SELECT product.*, catalog.name as catalog_name FROM product JOIN catalog ON product.id_catalog = catalog.id WHERE product.id = ?`;
  db.query(sql, [id], (err, data) => {
    if (err) {
      res.json({ thongbao: "Lỗi lấy 1 sp", err });
    } else {
      res.json(data[0]);
    }
  });
});

// Fetch products by catalog id
app.get("/productCatalog/:id_catalog/:limi?", (req, res) => {
  let limi = parseInt(req.params.limi || 6);
  let id_catalog = parseInt(req.params.id_catalog);
  if (isNaN(id_catalog) || id_catalog <= 0) {
    res.json({ "thong bao": "Không biết loai", id_catalog: id_catalog });
    return;
  }
  let sql = `SELECT * FROM product WHERE id_catalog = ? ORDER BY id desc LIMIT 0, ?`;
  db.query(sql, [id_catalog, limi], (err, data) => {
    if (err) {
      res.json({ thongbao: "Lỗi lấy sp trong loai", err });
    } else {
      res.json(data);
    }
  });
});

// Fetch catalog details by id
app.get("/catalog/:id_catalog", (req, res) => {
  let id_catalog = parseInt(req.params.id_catalog);
  if (isNaN(id_catalog) || id_catalog <= 0) {
    res.json({ "thong bao": "Không biết loai", id_catalog: id_catalog });
    return;
  }
  let sql = `SELECT * FROM catalog WHERE id = ?`;
  db.query(sql, [id_catalog], (err, data) => {
    if (err) {
      res.json({ thongbao: "Lỗi lấy loai", err });
    } else {
      res.json(data[0]);
    }
  });
});

// Fetch all catalogs
app.get("/catalog", (req, res) => {
  let sql = `SELECT * FROM catalog ORDER BY id`;
  db.query(sql, (err, data) => {
    if (err) {
      res.json({ thongbao: "Lỗi lấy loai", err });
    } else {
      res.json(data);
    }
  });
});

// Fetch related products by product id
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
      res.json({ id: -1, thongbao: "Loi luu don hang", err });
    } else {
      const id = result.insertId;
      res.json({ id: id, thongbao: "da luu don hang" });
    }
  });
});

app.post("/order_detail", (req, res) => {
  let data = req.body;
  let sql = `INSERT INTO order_detail SET ?`;
  db.query(sql, data, (err, result) => {
    if (err) {
      res.json({ thongbao: "Loi luu don hang chi tiet", err });
    } else {
      res.json({
        product_id: data.product_id,
        thongbao: "da luu don hang chi tiet",
      });
    }
  });
});

// admin
app.get("/admin/product", adminAuth, (req, res) => {
  let limi = parseInt(req.query.limi || 10);
  let sql = `SELECT * FROM product ORDER BY created_at desc LIMIT 0,?`;
  db.query(sql, [limi], (err, data) => {
    if (err) req.status(500).json({ error: "loi lay san pham" }, err);
    else res.json(data);
  });
});

app.get("/admin/product/:id", adminAuth, (req, res) => {
  let id = parseInt(req.params.id);
  if (id <= 0 || isNaN(id)) {
    res.json({ error: "Invalid product ID", id: id });
    return;
  }
  let sql = `SELECT * FROM product WHERE id = ?`;
  db.query(sql, id, (err, data) => {
    if (err) {
      res.json({ error: "Error fetching product", details: err });
    } else if (data.length === 0) {
      res.json({ error: "Product not found", id: id });
    } else {
      res.json(data[0]);
    }
  });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/images/product");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
// kiem tra co phai file hinh ko
const fileFilter = (req, file, cb) => {
  const fileTypes = /jpeg|jpg|png|gif|webp/;
  const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = fileTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only images are allowed (jpeg, jpg, png, gif,webp)"));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
});

// add product
app.post("/admin/product", adminAuth, upload.single("img"), (req, res) => {
  const { id_catalog, name, price, price_sale, sale, hot, des } = req.body;
  let img = req.file;

  if (!id_catalog || !name || !img) {
    return res
      .status(400)
      .json({ error: "id_catalog, name, and img are required" });
  }

  const productData = {
    id_catalog,
    name,
    price: price || 0,
    price_sale: price_sale || 0,
    sale: sale || 0,
    hot: hot || 0,
    img: img.filename,
    des: des || null,
    created_at: new Date(),
  };

  const sql = "INSERT INTO product SET ?";
  db.query(sql, productData, (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Failed to add product", details: err });
    }
    res.json({
      message: "Product added successfully",
      productId: result.insertId,
    });
  });
});

app.put("/admin/product/:id", adminAuth, upload.single("img"), (req, res) => {
  const { id_catalog, name, price, price_sale, sale, hot, des } = req.body;
  const { id } = req.params;
  let img = req.file;

  if (!id_catalog || !name) {
    return res.status(400).json({ error: "id_catalog and name are required" });
  }

  // Fetch current product details to get the existing values
  const selectSql = "SELECT img FROM product WHERE id = ?";
  db.query(selectSql, [id], (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Failed to retrieve product details" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const product = results[0];
    const oldImagePath = path.join(
      __dirname,
      "public",
      "images",
      "product",
      product.img
    );

    const productData = {
      id_catalog,
      name,
      price: price || product.price,
      price_sale: price_sale || product.price_sale,
      sale: sale !== undefined ? sale : product.sale,
      hot: hot !== undefined ? hot : product.hot,
      des: des || product.des,
      created_at: new Date(),
    };

    if (img) {
      productData.img = img.filename;
    }

    const updateSql = "UPDATE product SET ? WHERE id = ?";
    db.query(updateSql, [productData, id], (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ error: "Failed to update product", details: err });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Product not found" });
      }

      // If new image is provided, delete the old image
      if (img) {
        fs.unlink(oldImagePath, (err) => {
          if (err) {
            console.error("Failed to delete old image file:", err);
          }
        });
      }

      res.json({ message: "Product updated successfully" });
    });
  });
});

// Delete product endpoint
app.delete("/admin/product/:id", adminAuth, (req, res) => {
  const productId = parseInt(req.params.id);
  // Fetch the product details to get the image filename
  const selectSql = "SELECT img FROM product WHERE id = ?";
  db.query(selectSql, [productId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Failed to retrieve product" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    const product = results[0];
    const imagePath = path.join(
      __dirname,
      "public",
      "images",
      "product",
      product.img
    );

    // Delete the product from the database
    const deleteSql = "DELETE FROM product WHERE id = ?";
    db.query(deleteSql, [productId], (err, results) => {
      if (err) {
        return res.status(500).json({ error: "Failed to delete product" });
      }
      // Delete the image file
      fs.unlink(imagePath, (err) => {
        if (err) {
          console.error("Failed to delete image file:", err);
        }
        res.json({ message: "Product deleted successfully" });
      });
    });
  });
});

// catalog

app.get("/admin/catalog", adminAuth, (req, res) => {
  let sql = `SELECT * FROM catalog ORDER BY id`;
  db.query(sql, (err, data) => {
    if (err) return res.status(500).json({ error: err });
    else res.json(data);
  });
});

app.get("/admin/catalog/:id", adminAuth, (req, res) => {
  let id = parseInt(req.params.id);
  if (id <= 0) {
    res.status(500).json({ message: "Khong biet danh muc", id: id });
    return;
  }
  let sql = `SELECT * FROM catalog WHERE id = ?`;
  db.query(sql, id, (err, data) => {
    if (err) {
      res.json({ error: "Error fetching product", details: err });
    } else if (data.length === 0) {
      res.json({ error: "Catalog not found", id: id });
    } else {
      res.json(data[0]);
    }
  });
});

app.post("/admin/catalog", adminAuth, (req, res) => {
  const { name } = req.body;
  const data = {
    name,
  };
  let sql = `INSERT INTO catalog SET ?`;
  db.query(sql, data, (err, data) => {
    if (err) res.status(404).json({ message: "Error Insert catalog", err });
    else res.json({ message: "success", id: data.insertId });
  });
});

app.put("/admin/catalog/:id", adminAuth, (req, res) => {
  let id = parseInt(req.params.id);
  const data = req.body;
  let sql = `UPDATE catalog SET ? WHERE id = ?`;
  db.query(sql, [data, id], (err, data) => {
    if (err) res.status(404).json({ message: "Error Edit catalog", err });
    else res.json({ message: "success" });
  });
});

app.delete("/admin/catalog/:id", adminAuth, (req, res) => {
  let id = parseInt(req.params.id);
  let sql = `DELETE FROM catalog WHERE id = ?`;
  db.query(sql, id, (err, data) => {
    if (err) res.status(404).json({ message: "Error delete catalog", err });
    else res.json({ message: "sussecs" });
  });
});

const bcrypt = require("bcrypt");
const jwt = require("node-jsonwebtoken");
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const maxAge = 3 * 60 * 60; //3 giờ - thời gian sống của token

// API đăng ký người dùng
app.post("/register", async (req, res) => {
  const { email, password, fullName, role = 0, phone } = req.body;

  // Kiểm tra tất cả các trường có được cung cấp hay không
  if (!email || !password || !fullName || !phone) {
    return res
      .status(400)
      .json({ message: "All fields except role are required" });
  }

  try {
    // Kiểm tra xem email đã được đăng ký chưa
    db.query(
      "SELECT id FROM user WHERE email = ?",
      [email],
      async (err, results) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }

        if (results.length > 0) {
          return res.status(400).json({ message: "Email đã tồn tại" });
        }

        // Mã hóa mật khẩu
        const hashedPassword = await bcrypt.hash(password, 10);

        // Thêm người dùng mới vào cơ sở dữ liệu
        const user = { email, password: hashedPassword, fullName, role, phone };

        db.query("INSERT INTO user SET ?", user, (err, result) => {
          if (err) {
            return res
              .status(500)
              .json({ message: "Database insertion error", error: err });
          }

          const userId = result.insertId; // Lấy ID của người dùng mới
          const payload = { id: userId, fullName, email, role };

          // Tạo token JWT
          const token = jwt.sign(payload, PRIVATE_KEY, { expiresIn: maxAge });

          let userReturn = { id: userId, email, fullName, role, phone };

          // Gửi phản hồi với thông tin người dùng và token
          res.status(201).json({
            message: "User registered successfully",
            token,
            expiresIn: maxAge,
            user: userReturn,
          });
        });
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// API đăng nhập người dùng
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  // Kiểm tra tất cả các trường có được cung cấp hay không
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    // Tìm người dùng với email đã cung cấp
    db.query(
      "SELECT * FROM user WHERE email = ?",
      [email],
      async (err, results) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }

        if (results.length === 0) {
          return res.status(400).json({ message: "Không tìm thấy email" });
        }

        const user = results[0];

        // So sánh mật khẩu đã cung cấp với mật khẩu đã mã hóa trong cơ sở dữ liệu
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
          return res.status(400).json({ message: "Mật khẩu không đúng" });
        }

        // Tạo payload cho token JWT
        const payload = {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        };

        // Tạo token JWT
        const token = jwt.sign(payload, PRIVATE_KEY, { expiresIn: maxAge });

        // Thêm token vào header
        res.setHeader("Authorization", "Bearer " + token);

        // Gửi phản hồi với thông tin người dùng và token
        res.status(200).json({
          message: "Login successful",
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
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

app.get("/", (req, res) => {
  res.json({ message: "ket noi thanh cong" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
