import { Router } from 'express';
import multer from 'multer';
import { preview, confirm } from '../controllers/import.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const router = Router();

router.post('/preview', upload.single('file'), preview);
router.post('/confirm', confirm);

export default router;
