import { groupService } from '../services/group.service.js';

export const getGroups = async (req, res) => {
  try {
    const { categoryId } = req.query;
    const groups = await groupService.getAll(categoryId);
    res.json({ success: true, data: groups });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getGroupById = async (req, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const group = await groupService.getById(id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }
    res.json({ success: true, data: group });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createGroup = async (req, res) => {
  try {
    const { name, description, categoryId } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Group name is required',
      });
    }

    const group = await groupService.create({
      name,
      description,
      categoryId,
    });

    res.status(201).json({ success: true, data: group });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateGroup = async (req, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const updated = await groupService.update(id, req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteGroup = async (req, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await groupService.delete(id);
    res.json({ success: true, message: 'Group deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const groupController = {
  getGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
};
