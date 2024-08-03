const jwt = require("node-jsonwebtoken");
const fs = require("fs");
const PRIVATE_KEY = process.env.PRIVATE_KEY || fs.readFileSync("private-key.txt");

exports.adminAuth = (req, res, next) => {
  let token = req.headers.authorization;
  // console.log("Token:", token); // Kiểm tra token
  if (!token) {
    return res.status(401).json({ thongbao: "Không có token! Không phận sự miễn vào :)" });
  }
  token = token.split(" ")[1];
  jwt.verify(token, PRIVATE_KEY, (err, datadDecoded) => {
    if (err) return res.status(401).json({ thongbao: "Lỗi test token: " + err });
    // console.log("Decoded Data:", datadDecoded); // Kiểm tra thông tin token giải mã
    if (datadDecoded.role !== 1) {
      return res.status(401).json({ thongbao: "Bạn không đủ quyền để vào" });
    } else next();
  });
};
