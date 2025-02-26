const express = require("express");
const { google } = require("googleapis");
const cors = require("cors");
require("dotenv").config(); // Sử dụng dotenv để đọc biến môi trường

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// Đọc credentials từ biến môi trường thay vì file JSON
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

// Kết nối Google Sheets API
const auth = new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

const SPREADSHEET_ID = process.env.SPREADSHEET_ID; // Lấy ID từ biến môi trường

// 🟢 API Lấy Danh Sách Người Dùng
app.get("/api/users", async (req, res) => {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "Users!A2:C", // Giả sử dữ liệu bắt đầu từ hàng A2
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return res.status(200).json([]);
        }

        // Chuyển đổi dữ liệu thành danh sách người dùng
        const users = rows.map((row) => ({
            name: row[0],
            email: row[1],
            picture: row[2] || "",
        }));

        res.status(200).json(users);
    } catch (error) {
        console.error("Lỗi khi lấy danh sách người dùng:", error);
        res.status(500).json({ error: "Không thể lấy danh sách người dùng" });
    }
});

// 🟢 API Thêm Người Dùng Mới
app.post("/api/addUser", async (req, res) => {
    try {
        const { name, email, picture } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: "Thiếu thông tin người dùng" });
        }

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: "Users!A2:C",
            valueInputOption: "RAW",
            insertDataOption: "INSERT_ROWS",
            resource: {
                values: [[name, email, picture]],
            },
        });

        res.status(201).json({ message: "Người dùng đã được thêm thành công" });
    } catch (error) {
        console.error("Lỗi khi thêm người dùng:", error);
        res.status(500).json({ error: "Không thể thêm người dùng" });
    }
});

// Khởi động server
app.listen(PORT, () => {
    console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
});
