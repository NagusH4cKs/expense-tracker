import { ruleService } from '../services/rule.service.js';

export const getAllRules = async (req, res) => {
  try {
    const rules = await ruleService.getAll(req.query);
    res.json({ success: true, data: rules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createRule = async (req, res) => {
  try {
    const rule = await ruleService.create(req.body);
    res.status(201).json({ success: true, data: rule, message: 'Rule created successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateRule = async (req, res) => {
  try {
    const rule = await ruleService.update(req.params.id, req.body);
    res.json({ success: true, data: rule, message: 'Rule updated successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteRule = async (req, res) => {
  try {
    await ruleService.delete(req.params.id);
    res.json({ success: true, message: 'Rule deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const ruleController = {
  getAll: getAllRules,
  create: createRule,
  update: updateRule,
  delete: deleteRule,
};
