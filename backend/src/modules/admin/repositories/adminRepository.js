import { Label } from '../models/Label.js';
import { BoardStatus } from '../models/BoardStatus.js';

export const adminRepository = {
  // Labels
  async findAllLabels(companyId) {
    return await Label.find({ companyId }).sort({ createdAt: -1 });
  },

  async findLabelById(id, companyId) {
    return await Label.findOne({ _id: id, companyId });
  },

  async createLabel(labelData) {
    const label = new Label(labelData);
    return await label.save();
  },

  async updateLabel(id, companyId, updateData) {
    return await Label.findOneAndUpdate(
      { _id: id, companyId },
      updateData,
      { new: true }
    );
  },

  async deleteLabel(id, companyId) {
    return await Label.findOneAndDelete({ _id: id, companyId });
  },

  // Board Statuses
  async findAllStatuses(companyId, boardId = null) {
    const query = { companyId };
    if (boardId) {
      query.boardId = boardId;
    }
    return await BoardStatus.find(query)
      .populate('boardId', 'name')
      .sort({ order: 1 });
  },

  async findStatusById(id, companyId) {
    return await BoardStatus.findOne({ _id: id, companyId })
      .populate('boardId', 'name');
  },

  async createStatus(statusData) {
    const status = new BoardStatus(statusData);
    return await status.save().then(s => s.populate('boardId', 'name'));
  },

  async updateStatus(id, companyId, updateData) {
    return await BoardStatus.findOneAndUpdate(
      { _id: id, companyId },
      updateData,
      { new: true }
    ).populate('boardId', 'name');
  },

  async updateStatusOrder(statuses) {
    const bulkOps = statuses.map((status, index) => ({
      updateOne: {
        filter: { _id: status._id },
        update: { $set: { order: index } }
      }
    }));
    return await BoardStatus.bulkWrite(bulkOps);
  },

  async deleteStatus(id, companyId) {
    return await BoardStatus.findOneAndDelete({ _id: id, companyId });
  }
};

