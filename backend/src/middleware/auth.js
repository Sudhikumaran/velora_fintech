import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { errorResponse } from '../utils/apiResponse.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) return errorResponse(res, 'Access denied. No token provided.', 401);

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('FATAL: JWT_SECRET is missing or too short.');
    return errorResponse(res, 'Server configuration error.', 500);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return errorResponse(res, 'User no longer exists.', 401);
    req.user = user;
    next();
  } catch (error) {
    return errorResponse(res, 'Invalid or expired token.', 401);
  }
};
