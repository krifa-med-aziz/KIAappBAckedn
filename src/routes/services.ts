import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const services = await prisma.service.findMany();
    res.json({ success: true, data: services });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch services', errors: [error.message] });
  }
});

export default router;
