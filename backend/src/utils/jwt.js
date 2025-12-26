import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  return { accessToken };
};

export const verifyToken = (token) => {
  return jwt.verify(token, config.jwt.secret);
};







