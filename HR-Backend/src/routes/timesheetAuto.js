const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Timesheet = require("../models/timesheet");

// Storage folder
const uploadDir = path.join(__dirname, "..", "..", "uploads", "auto-timesheets");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) =>
        cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_")),
});

const upload = multer({ storage });

router.post("/auto-upload", upload.single("file"), async (req, res) => {
    try {
        // Security check (n8n must send x-n8n-key header)
        const key = req.headers["x-n8n-key"];
        if (!key || key !== process.env.N8N_SECRET_KEY) {
            return res.status(401).json({ success: false, message: "Unauthorized: Invalid key" });
        }

        const { employeeEmail, notes, week, summary } = req.body;

        if (!employeeEmail) {
            return res.status(400).json({ success: false, message: "Missing employeeEmail" });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Missing file" });
        }

        // Find employee via email
        const employee = await require("../models/user").User.findOne({
            where: { email: employeeEmail },
        });

        if (!employee) {
            return res.status(404).json({ success: false, message: "Employee not found" });
        }

        // Save document
        const record = await Timesheet.create({
            employeeId: employee_id,
            employeeName: employee.name,
            hours: null, // n8n summary doesn't include this
            projectName: null,
            clientName: null,
            role: null,
            notes: notes || "",
            summary: summary || "",
            week: week || "",
            filePath: req.file.path,
            originalFileName: req.file.originalname,
            mimeType: req.file.mimetype,
        });

        return res.json({
            success: true,
            message: "Timesheet auto-uploaded successfully",
            recordId: record.id,
        });
    } catch (err) {
        console.error("Auto-upload error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

module.exports = router;
