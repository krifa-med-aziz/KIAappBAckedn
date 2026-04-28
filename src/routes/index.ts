import { Router } from 'express';
import servicesRouter from './services';
import agenciesRouter from './agencies';
import vehiclesRouter from './vehicles';
import appointmentsRouter from './appointments';

const router = Router();

router.use('/services', servicesRouter);
router.use('/agencies', agenciesRouter);
router.use('/vehicles', vehiclesRouter);
router.use('/appointments', appointmentsRouter);

export default router;
