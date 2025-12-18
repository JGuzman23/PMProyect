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
  async findAllStatuses(companyId, projectId = null) {
    const query = { companyId };
    if (projectId) {
      query.projectId = projectId;
    }
    return await BoardStatus.find(query)
      .populate('projectId', 'name')
      .sort({ order: 1 });
  },

  async findStatusById(id, companyId) {
    return await BoardStatus.findOne({ _id: id, companyId })
      .populate('projectId', 'name');
  },

  async createStatus(statusData) {
    const status = new BoardStatus(statusData);
    return await status.save().then(s => s.populate('projectId', 'name'));
  },

  async updateStatus(id, companyId, updateData) {
    return await BoardStatus.findOneAndUpdate(
      { _id: id, companyId },
      updateData,
      { new: true }
    ).populate('projectId', 'name');
  },

  async deleteStatus(id, companyId) {
    return await BoardStatus.findOneAndDelete({ _id: id, companyId });
  }
};

