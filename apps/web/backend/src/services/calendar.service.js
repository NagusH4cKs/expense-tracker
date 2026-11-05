import { prisma } from '../config/prisma.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function validateDate(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new Error('A valid due date is required');
  }
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error('A valid due date is required');
  }
  return value;
}

function optionalTime(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !TIME_PATTERN.test(value)) {
    throw new Error('Time must use the 24-hour HH:MM format');
  }
  return value;
}

function optionalAmount(value) {
  if (value === undefined || value === null || value === '') return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Amount must be zero or greater');
  return amount;
}

export const calendarService = {
  list: async ({ startDate, endDate } = {}) => {
    const where = {};
    if (startDate || endDate) {
      where.dueDate = {};
      if (startDate) where.dueDate.gte = validateDate(startDate);
      if (endDate) where.dueDate.lte = validateDate(endDate);
    }
    return prisma.calendarEvent.findMany({
      where,
      orderBy: [{ dueDate: 'asc' }, { dueTime: 'asc' }, { createdAt: 'asc' }],
    });
  },

  create: async (data = {}) => {
    const title = String(data.title || '').trim();
    if (!title) throw new Error('Event title is required');
    return prisma.calendarEvent.create({
      data: {
        title,
        description: data.description ? String(data.description).trim() : null,
        dueDate: validateDate(data.dueDate),
        dueTime: optionalTime(data.dueTime),
        amount: optionalAmount(data.amount),
        category: data.category ? String(data.category).trim() : null,
      },
    });
  },

  update: async (id, data = {}) => {
    const existing = await prisma.calendarEvent.findUnique({ where: { id } });
    if (!existing) throw new Error('Calendar event not found');
    const updateData = {};
    if (data.title !== undefined) {
      updateData.title = String(data.title).trim();
      if (!updateData.title) throw new Error('Event title is required');
    }
    if (data.description !== undefined) {
      updateData.description = data.description ? String(data.description).trim() : null;
    }
    if (data.dueDate !== undefined) updateData.dueDate = validateDate(data.dueDate);
    if (data.dueTime !== undefined) updateData.dueTime = optionalTime(data.dueTime);
    if (data.amount !== undefined) updateData.amount = optionalAmount(data.amount);
    if (data.category !== undefined) updateData.category = data.category ? String(data.category).trim() : null;
    if (data.isCompleted !== undefined) updateData.isCompleted = Boolean(data.isCompleted);
    return prisma.calendarEvent.update({ where: { id }, data: updateData });
  },

  delete: async (id) => prisma.calendarEvent.delete({ where: { id } }),
};
