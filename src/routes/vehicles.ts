import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

const vehicleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  plate: z.string().min(1, "Plate is required"),
  mileage: z.string().min(1, "Mileage is required"),
  type: z.string().min(1, "Type is required"),
  // Basic VIN validation regex (17 characters alphanumeric, no I, O, Q)
  vin: z
    .string()
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/, "Invalid VIN format")
    .optional(),
});

router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = vehicleSchema.parse(req.body);
    const userId = req.user.id;

    const vehicle = await prisma.vehicle.create({
      data: {
        ...validatedData,
        userId,
      },
    });

    res.status(201).json({ success: true, data: vehicle });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res
        .status(400)
        .json({
          success: false,
          message: "Validation error",
          errors: error.issues,
        });
    } else {
      res
        .status(500)
        .json({
          success: false,
          message: "Failed to create vehicle",
          errors: [error?.message],
        });
    }
  }
});

router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const vehicles = await prisma.vehicle.findMany({
      where: { userId },
    });

    res.json({ success: true, data: vehicles });
  } catch (error: any) {
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to fetch vehicles",
        errors: [error.message],
      });
  }
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const vehicleId = parseInt(req.params.id as string, 10);

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle || vehicle.userId !== userId) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Vehicle not found or unauthorized",
          errors: [],
        });
    }

    await prisma.vehicle.delete({ where: { id: vehicleId } });

    res.json({
      success: true,
      data: null,
      message: "Vehicle deleted successfully",
    });
  } catch (error: any) {
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to delete vehicle",
        errors: [error.message],
      });
  }
});

router.post("/scan", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // OCR endpoint simulation
    // Normally we'd take an image and pass it to AWS Textract or something, extracting VIN.
    const mockVin = "1HGCM82633A004123"; // example format

    // Simulate validation
    const parsed = z
      .string()
      .regex(/^[A-HJ-NPR-Z0-9]{17}$/)
      .parse(mockVin);

    res.json({
      success: true,
      data: {
        extractedText: mockVin,
        isValidVin: true,
      },
    });
  } catch (error: any) {
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to process OCR",
        errors: [error.message],
      });
  }
});

export default router;
