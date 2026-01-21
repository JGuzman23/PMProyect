import { Note } from '../models/Note.js';

export const noteRepository = {
  async getAllByUserId(userId) {
    return await Note.find({ userId })
      .sort({ updatedAt: -1 })
      .lean();
  },

  async getById(id, userId) {
    return await Note.findOne({ _id: id, userId }).lean();
  },

  async create(data) {
    const note = new Note(data);
    return await note.save();
  },

  async update(id, userId, data) {
    return await Note.findOneAndUpdate(
      { _id: id, userId },
      { $set: data },
      { new: true }
    ).lean();
  },

  async delete(id, userId) {
    return await Note.findOneAndDelete({ _id: id, userId });
  }
};
