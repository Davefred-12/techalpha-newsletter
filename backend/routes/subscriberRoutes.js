import express from "express";
import { subscribe } from "../controllers/subscriberController.js";
import Subscriber from "../models/subscriber.js";
import multer from "multer";
import xlsx from "xlsx";
import { createObjectCsvWriter } from "csv-writer";
import PDFDocument from "pdfkit";
import fs from "fs";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype === "text/csv" ||
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error("Only Excel and CSV files are allowed!"));
    }
  },
});

// Public subscription endpoint
router.post("/subscribe", subscribe);

// Get subscribers with pagination
router.get("/subscribers", async (req, res) => {
  try {
    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const total = await Subscriber.countDocuments({});
    
    // Get subscribers with pagination
    const subscribers = await Subscriber.find({})
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      subscribers,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("Error fetching subscribers:", error);
    res
      .status(500)
      .json({ success: false, error: "Error fetching subscribers" });
  }
});

// Get total subscribers count
router.get("/subscribers/count", async (req, res) => {
  try {
    const count = await Subscriber.countDocuments({});
    res.json({ success: true, count });
  } catch (error) {
    console.error("Error counting subscribers:", error);
    res.status(500).json({ success: false, error: "Error counting subscribers" });
  }
});

// Add new subscriber
router.post("/subscribers/add", async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    // Check if subscriber already exists
    const existingSubscriber = await Subscriber.findOne({ email });
    if (existingSubscriber) {
      return res.status(400).json({
        success: false,
        error: "Subscriber with this email already exists",
      });
    }

    // Create new subscriber
    const subscriber = new Subscriber({
      name,
      email,
      phone,
    });

    await subscriber.save();
    res.json({
      success: true,
      message: "Subscriber added successfully",
    });
  } catch (error) {
    console.error("Error adding subscriber:", error);
    res.status(500).json({
      success: false,
      error: "Error adding subscriber",
    });
  }
});

// Delete subscriber
router.delete("/subscribers/delete", async (req, res) => {
  try {
    const { email } = req.body;
    const result = await Subscriber.findOneAndDelete({ email });

    if (!result) {
      return res.status(404).json({
        success: false,
        error: "Subscriber not found",
      });
    }

    res.json({
      success: true,
      message: "Subscriber deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting subscriber:", error);
    res.status(500).json({
      success: false,
      error: "Error deleting subscriber",
    });
  }
});

router.delete("/subscribers/delete-multiple", async (req, res) => {
  try {
    const { emails } = req.body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No subscribers selected for deletion",
      });
    }

    const result = await Subscriber.deleteMany({ email: { $in: emails } });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "No subscribers found for deletion",
      });
    }

    res.json({
      success: true,
      message: `${result.deletedCount} subscribers deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting multiple subscribers:", error);
    res.status(500).json({
      success: false,
      error: "Error deleting multiple subscribers",
    });
  }
});

// Import subscribers from Excel/CSV
router.post("/subscribers/import", upload.single("file"), async (req, res) => {
  console.log("Received Data:", req.body);

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    console.log("Parsed Data:", data);

    let imported = 0;
    let skipped = 0;

    for (const row of data) {
      // Check for capitalized field names
      if (!row.Name || !row.Email || !row.Phone) {
        console.warn("Skipping invalid row:", row);
        skipped++;
        continue;
      }

      try {
        const existingSubscriber = await Subscriber.findOne({
          email: row.Email.toLowerCase(),
        });
        if (!existingSubscriber) {
          await Subscriber.create({
            name: row.Name,
            email: row.Email.toLowerCase(),
            phone: row.Phone,
          });
          imported++;
        } else {
          console.log(`Subscriber already exists: ${row.Email}`);
          skipped++;
        }
      } catch (err) {
        console.error(`Error processing row:`, row, err);
        skipped++;
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: "Import completed",
      summary: {
        total: data.length,
        imported,
        skipped,
      },
    });
  } catch (error) {
    console.error("Error importing subscribers:", error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      error: "Error importing subscribers",
      details: error.message,
    });
  }
});

// Export subscribers
router.get("/subscribers/export/:format", async (req, res) => {
  try {
    const subscribers = await Subscriber.find({});
    const format = req.params.format.toLowerCase();

    switch (format) {
      case "xlsx":
        // Export as Excel
        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(subscribers);
        xlsx.utils.book_append_sheet(workbook, worksheet, "Subscribers");
        const buffer = xlsx.write(workbook, {
          type: "buffer",
          bookType: "xlsx",
        });

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=subscribers.xlsx"
        );
        return res.send(buffer);

      case "csv":
        // Export as CSV
        const csvWriter = createObjectCsvWriter({
          path: "subscribers.csv",
          header: [
            { id: "name", title: "NAME" },
            { id: "email", title: "EMAIL" },
            { id: "phone", title: "PHONE" },
          ],
        });

        await csvWriter.writeRecords(subscribers);
        res.download("subscribers.csv", "subscribers.csv", (err) => {
          if (err) {
            console.error("Error downloading CSV:", err);
          }
          fs.unlinkSync("subscribers.csv");
        });
        break;

      case "pdf":
        // Export as PDF
        const doc = new PDFDocument();
        const filename = "subscribers.pdf";

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${filename}`
        );

        doc.pipe(res);

        // Add content to PDF
        doc.fontSize(16).text("Subscribers List", { align: "center" });
        doc.moveDown();

        subscribers.forEach((subscriber, index) => {
          doc.fontSize(12).text(`${index + 1}. ${subscriber.name}`);
          doc
            .fontSize(10)
            .text(`Email: ${subscriber.email}`)
            .text(`Phone: ${subscriber.phone}`);
          doc.moveDown();
        });

        doc.end();
        break;

      default:
        return res.status(400).json({
          success: false,
          error: "Invalid export format",
        });
    }
  } catch (error) {
    console.error("Error exporting subscribers:", error);
    res.status(500).json({
      success: false,
      error: "Error exporting subscribers",
    });
  }
});

export default router;