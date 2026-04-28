import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

router.get('/', async (req, res) => {
  const { serviceId } = req.query;

  try {
    let filter = {};

    if (serviceId) {
      const parsedServiceId = parseInt(serviceId as string, 10);
      filter = {
        where: {
          services: {
            some: {
              id: parsedServiceId
            }
          }
        }
      };
    }

    const agencies = await prisma.agency.findMany(filter);
    
    res.json({ success: true, data: agencies });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch agencies', errors: [error.message] });
  }
});

export default router;
