import { debtService } from '../services/debt.service.js';

export const debtController = {
  async list(_req, res) {
    try { res.json({ success: true, data: await debtService.list() }); }
    catch (error) { res.status(500).json({ success: false, message: error.message }); }
  },
  async create(req, res) {
    try { res.status(201).json({ success: true, data: await debtService.create(req.body) }); }
    catch (error) { res.status(400).json({ success: false, message: error.message }); }
  },
  async addRepayment(req, res) {
    try { res.json({ success: true, data: await debtService.addRepayment(req.params.id, req.body) }); }
    catch (error) { res.status(400).json({ success: false, message: error.message }); }
  },
};
