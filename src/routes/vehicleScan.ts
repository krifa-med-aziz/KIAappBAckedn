import { Router } from "express";
import multer from "multer";
import { ocrService } from "../services/ocrService";
import { requireAuth } from "../middleware/auth";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

router.post(
  "/scan-carte-grise",
  requireAuth,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, error: "No image file provided" });
      }

      const mimeType = req.file.mimetype;
      if (!["image/jpeg", "image/png"].includes(mimeType)) {
        return res
          .status(400)
          .json({
            success: false,
            error: "Invalid file type. Only JPEG and PNG are allowed",
          });
      }

      const scannedFields = await ocrService.extractCarteGrise(
        req.file.buffer,
        mimeType,
      );

      let confidence = 0;
      Object.values(scannedFields).forEach((value) => {
        if (value !== null) {
          confidence++;
        }
      });

      const matchPercent = (confidence / 8) * 100;

      return res.json({
        success: true,
        data: scannedFields,
        confidence,
        matchPercent,
      });
    } catch (error) {
      console.error("OCR Scan Error:", error);
      return res
        .status(500)
        .json({ success: false, error: "Could not scan image" });
    }
  },
);

export default router;
