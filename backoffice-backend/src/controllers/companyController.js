import { Company } from '../models/Company.js';
import { User } from '../models/User.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';

export const companyController = {
  async getAll(req, res, next) {
    try {
      const companies = await Company.find().sort({ createdAt: -1 });
      res.json(companies);
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const company = await Company.findById(req.params.id);
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }
      res.json(company);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const company = new Company(req.body);
      await company.save();
      res.status(201).json(company);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const company = await Company.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }
      res.json(company);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      const company = await Company.findByIdAndDelete(req.params.id);
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }
      res.json({ message: 'Company deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  async toggleActive(req, res, next) {
    try {
      const company = await Company.findById(req.params.id);
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }
      company.isActive = !company.isActive;
      await company.save();
      res.json(company);
    } catch (error) {
      next(error);
    }
  },

  async getStats(req, res, next) {
    try {
      const totalCompanies = await Company.countDocuments();
      const activeCompanies = await Company.countDocuments({ isActive: true });
      
      const companies = await Company.find();
      const stats = await Promise.all(
        companies.map(async (company) => {
          const userCount = await User.countDocuments({ companyId: company.subdomain });
          const projectCount = await Project.countDocuments({ companyId: company.subdomain });
          const taskCount = await Task.countDocuments({ companyId: company.subdomain });
          
          return {
            companyId: company._id,
            companyName: company.name,
            subdomain: company.subdomain,
            plan: company.plan,
            isActive: company.isActive,
            userCount,
            projectCount,
            taskCount
          };
        })
      );

      res.json({
        totalCompanies,
        activeCompanies,
        companies: stats
      });
    } catch (error) {
      next(error);
    }
  }
};





