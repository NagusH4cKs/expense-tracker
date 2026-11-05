import { Router } from 'express';
import { calendarController } from '../controllers/calendar.controller.js';

const router = Router();
router.get('/', calendarController.list);
router.post('/', calendarController.create);
router.patch('/:id', calendarController.update);
router.delete('/:id', calendarController.remove);

export default router;
