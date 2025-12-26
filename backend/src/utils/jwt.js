import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export const generateTokens = (userId) => {
  // Validar que userId esté presente
  if (!userId) {
    throw new Error('User ID is required to generate tokens');
  }

  // Validar que los secretos estén configurados
  if (!config.jwt.secret || config.jwt.secret === 'default-secret-change-in-production') {
    throw new Error('JWT_SECRET is not properly configured');
  }

  if (!config.jwt.refreshSecret || config.jwt.refreshSecret === 'default-refresh-secret-change-in-production') {
    throw new Error('JWT_REFRESH_SECRET is not properly configured');
  }

  try {
    const accessToken = jwt.sign(
      { userId },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    return { accessToken, refreshToken };
  } catch (error) {
    console.error('Error generating JWT tokens:', error);
    throw new Error('Failed to generate authentication tokens');
  }
};

export const verifyToken = (token, isRefresh = false) => {
  if (!token) {
    throw new Error('Token is required');
  }

  const secret = isRefresh ? config.jwt.refreshSecret : config.jwt.secret;
  
  if (!secret) {
    throw new Error('JWT secret is not configured');
  }

  try {
    return jwt.verify(token, secret);
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    throw error;
  }
};








