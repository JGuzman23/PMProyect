import { Board } from '../models/Board.js';

export const boardRepository = {
  async findAll(companyId, filters = {}) {
    return await Board.find({ companyId, ...filters })
      .populate('ownerId', 'firstName lastName email')
      .populate('projectId', 'name')
      .sort({ createdAt: -1 });
  },

  async findById(id, companyId) {
    return await Board.findOne({ _id: id, companyId })
      .populate('ownerId', 'firstName lastName email')
      .populate('projectId', 'name');
  },

  async create(boardData) {
    const board = new Board(boardData);
    return await board.save();
  },

  async update(id, companyId, updateData) {
    return await Board.findOneAndUpdate(
      { _id: id, companyId },
      updateData,
      { new: true }
    ).populate('ownerId', 'firstName lastName email')
     .populate('projectId', 'name');
  },

  async delete(id, companyId) {
    return await Board.findOneAndDelete({ _id: id, companyId });
  }
};








