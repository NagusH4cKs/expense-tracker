import { calendarService } from '../services/calendar.service.js';

export const calendarController = {
  async list(req, res) {
    try {
      const data = await calendarService.list({
        startDate: req.query.startDate,
        endDate: req.query.endDate,
      });
      res.json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },
  async create(req, res) {
    try {
      res.status(201).json({ success: true, data: await calendarService.create(req.body) });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },
  async update(req, res) {
    try {
      res.json({ success: true, data: await calendarService.update(req.params.id, req.body) });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },
  async remove(req, res) {
    try {
      await calendarService.delete(req.params.id);
      res.json({ success: true, message: 'Calendar event deleted' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },
};
