import { prisma } from '../config/prisma.js';

export const getAllGroups = async (categoryId) => {
  const where = {};
  if (categoryId) {
    where.categoryId = categoryId;
  }

  return prisma.group.findMany({
    where,
    include: {
      category: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });
};

export const getGroupById = async (id) => {
  return prisma.group.findUnique({
    where: { id },
    include: {
      category: true,
    },
  });
};

export const createGroup = async (data) => {
  return prisma.group.create({
    data: {
      name: data.name.trim(),
      description: data.description ? data.description.trim() : null,
      categoryId: data.categoryId || null,
    },
    include: {
      category: true,
    },
  });
};

export const updateGroup = async (id, data) => {
  return prisma.group.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name.trim() }),
      ...(data.description !== undefined && {
        description: data.description ? data.description.trim() : null,
      }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
    },
    include: {
      category: true,
    },
  });
};

export const deleteGroup = async (id) => {
  return prisma.group.delete({
    where: { id },
  });
};

export const groupService = {
  getAll: getAllGroups,
  getById: getGroupById,
  create: createGroup,
  update: updateGroup,
  delete: deleteGroup,
};
