import { Router } from 'express';
import { ruleController } from '../controllers/rule.controller.js';

const router = Router();

router.get('/', ruleController.getAll);
router.post('/', ruleController.create);
router.put('/:id', ruleController.update);
router.delete('/:id', ruleController.delete);

export default router;
