import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { User } from '../modules/users/models/User.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.accessToken;
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    
    const user = await User.findOne({ 
      _id: decoded.userId,
      companyId: req.companyId 
    }).select('-password');

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'User account is inactive' });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.accessToken;
    
    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findOne({ 
        _id: decoded.userId,
        companyId: req.companyId 
      }).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
        req.userId = user._id;
      }
    }
    next();
  } catch (error) {
    next();
  }
};





