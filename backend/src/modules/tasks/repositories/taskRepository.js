import { Task } from '../models/Task.js';

export const taskRepository = {
  async findAll(companyId, filters = {}) {
    return await Task.find({ companyId, ...filters })
      .populate('assignees', 'firstName lastName email avatar')
      .populate('createdBy', 'firstName lastName email')
      .populate('projectId', 'name')
      .populate('boardId', 'name')
      .populate('clientId', 'name type company lastName agents')
      .sort({ order: 1, createdAt: -1 });
  },

  async findById(id, companyId) {
    return await Task.findOne({ _id: id, companyId })
      .populate('assignees', 'firstName lastName email avatar')
      .populate('createdBy', 'firstName lastName email')
      .populate('projectId', 'name')
      .populate('boardId', 'name')
      .populate('clientId', 'name type company lastName agents')
      .populate('labels')
      .populate('comments.userId', 'firstName lastName email')
      .populate('activityLog.userId', 'firstName lastName email');
  },

  async findByBoard(boardId, companyId) {
    return await Task.find({ boardId, companyId })
      .populate('assignees', 'firstName lastName email avatar')
      .populate('createdBy', 'firstName lastName email')
      .populate('clientId', 'name type company lastName agents')
      .populate('labels', 'name color')
      .populate('comments.userId', 'firstName lastName email')
      .sort({ order: 1, createdAt: -1 });
  },

  async create(taskData) {
    const task = new Task(taskData);
    return await task.save();
  },

  async update(id, companyId, updateData) {
    // Separar $push del resto de updateData
    const pushData = updateData.$push;
    delete updateData.$push;
    
    const task = await Task.findOneAndUpdate(
      { _id: id, companyId },
      { ...updateData, ...(pushData ? { $push: pushData } : {}) },
      { new: true }
    ).populate('assignees', 'firstName lastName email avatar')
     .populate('createdBy', 'firstName lastName email')
     .populate('clientId', 'name type company lastName agents')
     .populate('activityLog.userId', 'firstName lastName email');
    
    return task;
  },

  async delete(id, companyId) {
    return await Task.findOneAndDelete({ _id: id, companyId });
  },

  async updateMany(ids, companyId, updateData) {
    return await Task.updateMany(
      { _id: { $in: ids }, companyId },
      updateData
    );
  }
};

