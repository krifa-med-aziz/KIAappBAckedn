import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

const appointmentSchema = z.object({
  vehicleId: z.number().int().positive("Vehicle ID is required"),
  serviceId: z.number().int().positive("Service ID is required"),
  agencyId: z.number().int().positive("Agency ID is required"),
  date: z.string().datetime("Valid date required"),
  time: z.string().min(1, "Time is required"),
  status: z.string().default("PENDING"),
});

const appointmentUpdateSchema = z.object({
  status: z.string().min(1, "Status is required"),
});

router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = appointmentSchema.parse(req.body);
    const userId = req.user.id;

    // Verify relations (especially that agency offers the service, and user owns vehicle)
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: validatedData.vehicleId },
    });
    if (!vehicle || vehicle.userId !== userId) {
      return res
        .status(403)
        .json({ success: false, message: "Invalid vehicle", errors: [] });
    }

    const agency = await prisma.agency.findFirst({
      where: {
        id: validatedData.agencyId,
        services: {
          some: {
            id: validatedData.serviceId,
          },
        },
      },
    });

    if (!agency) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Agency does not offer this service",
          errors: [],
        });
    }

    const appointment = await prisma.appointment.create({
      data: {
        ...validatedData,
        date: new Date(validatedData.date),
        userId,
      },
    });

    res.status(201).json({ success: true, data: appointment });
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
          message: "Failed to book appointment",
          errors: [error.message],
        });
    }
  }
});

router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const appointments = await prisma.appointment.findMany({
      where: { userId },
      include: {
        service: true,
        agency: true,
        vehicle: true,
      },
    });

    res.json({ success: true, data: appointments });
  } catch (error: any) {
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to fetch appointments",
        errors: [error.message],
      });
  }
});

router.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const id = parseInt(req.params.id as string, 10);

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        service: true,
        agency: true,
        vehicle: true,
      },
    });

    if (!appointment || appointment.userId !== userId) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found", errors: [] });
    }

    res.json({ success: true, data: appointment });
  } catch (error: any) {
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to fetch appointment",
        errors: [error.message],
      });
  }
});

router.patch(
  "/:id/status",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const id = parseInt(req.params.id as string, 10);
      const { status } = appointmentUpdateSchema.parse(req.body);

      const appointment = await prisma.appointment.findUnique({
        where: { id },
      });
      if (!appointment || appointment.userId !== userId) {
        return res
          .status(404)
          .json({
            success: false,
            message: "Appointment not found",
            errors: [],
          });
      }

      const updated = await prisma.appointment.update({
        where: { id },
        data: { status },
      });

      res.json({ success: true, data: updated });
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
            message: "Failed to update appointment status",
            errors: [error.message],
          });
      }
    }
  },
);

export default router;
