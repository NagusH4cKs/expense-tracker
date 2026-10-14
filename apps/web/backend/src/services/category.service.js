import { prisma } from '../config/prisma.js';

export const getAllCategories = async (type) => {
  const where = {};
  if (type) {
    where.type = type;
  }

  return prisma.category.findMany({
    where,
    include: {
      groups: {
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });
};

export const getCategoryById = async (id) => {
  return prisma.category.findUnique({
    where: { id },
    include: {
      groups: true,
    },
  });
};

export const createCategory = async (data) => {
  const category = await prisma.category.create({
    data: {
      name: data.name.trim(),
      type: data.type || 'expense',
      description: data.description ? data.description.trim() : null,
      ...(data.groupNames && data.groupNames.length > 0
        ? {
            groups: {
              create: data.groupNames
                .filter((g) => g && g.trim())
                .map((g) => ({ name: g.trim() })),
            },
          }
        : {}),
    },
    include: {
      groups: true,
    },
  });

  if (data.groupIds && data.groupIds.length > 0) {
    await prisma.group.updateMany({
      where: { id: { in: data.groupIds } },
      data: { categoryId: category.id },
    });

    return prisma.category.findUnique({
      where: { id: category.id },
      include: { groups: true },
    });
  }

  return category;
};

export const updateCategory = async (id, data) => {
  return prisma.category.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name.trim() }),
      ...(data.type && { type: data.type }),
      ...(data.description !== undefined && {
        description: data.description ? data.description.trim() : null,
      }),
    },
    include: {
      groups: true,
    },
  });
};

export const deleteCategory = async (id) => {
  return prisma.category.delete({
    where: { id },
  });
};

export const categoryService = {
  getAll: getAllCategories,
  getById: getCategoryById,
  create: createCategory,
  update: updateCategory,
  delete: deleteCategory,
};
