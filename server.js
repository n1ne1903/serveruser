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
app.get('/api/users', async (req, res) => {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:C'
        });

        // Nếu không có dữ liệu, trả về []
        if (!response.data.values || response.data.values.length < 2) {
            return res.json([]);
        }

        // Chuyển đổi dữ liệu từ Google Sheets sang JSON
        const users = response.data.values.slice(1).map(row => ({
            name: row[0] || "No Name",
            email: row[1] || "No Email",
            picture: row[2] || "https://example.com/default-avatar.png"
        }));

        res.json(users);
    } catch (error) {
        console.error("❌ Lỗi khi lấy danh sách người dùng:", error);
        res.status(500).json({ message: "Lỗi server: Không thể lấy danh sách người dùng." });
    }
});

// 🟢 API Thêm Người Dùng Mới
app.post("/api/addUser", async (req, res) => {
    try {
        const { sub, name, email, picture } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: "Thiếu thông tin người dùng" });
        }

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: "Sheet1!A:D",
            valueInputOption: "RAW",
            insertDataOption: "INSERT_ROWS",
            resource: {
                values: [[sub, name, email, picture]],
            },
        });

        res.status(201).json({ message: "Người dùng đã được thêm thành công" });
    } catch (error) {
        console.error("❌ Lỗi khi thêm người dùng:", error);
        res.status(500).json({ error: "Không thể thêm người dùng" });
    }
});

// Khởi động server
app.listen(PORT, () => {
    console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
});
