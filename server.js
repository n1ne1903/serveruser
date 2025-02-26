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
            range: 'Sheet1!A:D'
        });

        const users = response.data.values || [];

        if (users.length < 2) {
            return res.json([]);
        }

        // Chuyển đổi dữ liệu từ Google Sheets (đảm bảo đúng thứ tự cột)
        const userList = users.slice(1).map(row => ({
            sub: row[0] || "",
            name: decodeURIComponent(escape(row[1] || "Không có tên")),
            email: row[2] || "Không có email",
            picture: row[3] || "https://example.com/default-avatar.png"
        }));

        res.json(userList);
    } catch (error) {
        console.error("❌ Lỗi khi lấy danh sách người dùng:", error);
        res.status(500).json({ message: "Lỗi server: Không thể lấy danh sách người dùng." });
    }
});

app.post("/api/addUser", async (req, res) => {
    try {
        const { sub, name, email, picture } = req.body;

        if (!sub || !name || !email) {
            return res.status(400).json({ error: "Thiếu thông tin người dùng" });
        }

        // Lấy danh sách người dùng từ Google Sheets
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "Sheet1!A:D" // Cột A chứa sub, cột B name, cột C email, cột D picture
        });

        const users = response.data.values || [];

        // Kiểm tra xem sub đã tồn tại hay chưa
        const userExists = users.some(row => row[0] === sub);
        if (userExists) {
            return res.status(200).json({ message: "Người dùng đã tồn tại, không cần ghi lại." });
        }

        // Nếu chưa tồn tại, thêm mới vào Google Sheets
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: "Sheet1!A:D",
            valueInputOption: "RAW",
            insertDataOption: "INSERT_ROWS",
            resource: {
                values: [[sub, name, email, picture || "https://example.com/default-avatar.png"]],
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
