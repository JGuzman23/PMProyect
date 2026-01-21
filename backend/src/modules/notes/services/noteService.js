import { noteRepository } from '../repositories/noteRepository.js';

export const noteService = {
  async getAllByUserId(userId) {
    return await noteRepository.getAllByUserId(userId);
  },

  async getById(id, userId) {
    const note = await noteRepository.getById(id, userId);
    if (!note) {
      throw new Error('Note not found');
    }
    return note;
  },

  async create(data) {
    return await noteRepository.create(data);
  },

  async update(id, userId, data) {
    const note = await noteRepository.update(id, userId, data);
    if (!note) {
      throw new Error('Note not found');
    }
    return note;
  },

  async delete(id, userId) {
    const note = await noteRepository.delete(id, userId);
    if (!note) {
      throw new Error('Note not found');
    }
    return note;
  }
};
