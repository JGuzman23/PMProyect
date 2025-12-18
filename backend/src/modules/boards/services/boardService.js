import { boardRepository } from '../repositories/boardRepository.js';

export const boardService = {
  async getAll(companyId, filters = {}) {
    return await boardRepository.findAll(companyId, filters);
  },

  async getById(id, companyId) {
    const board = await boardRepository.findById(id, companyId);
    if (!board) {
      throw new Error('Board not found');
    }
    return board;
  },

  async create(data, companyId, userId) {
    const defaultColumns = [
      { name: 'To Do', order: 0, color: '#94A3B8' },
      { name: 'In Progress', order: 1, color: '#3B82F6' },
      { name: 'Review', order: 2, color: '#F59E0B' },
      { name: 'Done', order: 3, color: '#10B981' }
    ];

    return await boardRepository.create({
      ...data,
      companyId,
      ownerId: userId,
      columns: data.columns || defaultColumns
    });
  },

  async update(id, companyId, updateData) {
    const board = await boardRepository.update(id, companyId, updateData);
    if (!board) {
      throw new Error('Board not found');
    }
    return board;
  },

  async delete(id, companyId) {
    const board = await boardRepository.delete(id, companyId);
    if (!board) {
      throw new Error('Board not found');
    }
    return board;
  }
};





