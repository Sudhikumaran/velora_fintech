import User from '../models/User.js';
import { sendTokenResponse } from '../utils/generateToken.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password, currency } = req.body;

    if (!name || !email || !password) {
      return errorResponse(res, 'Name, email and password are required.', 400);
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 'Email already registered.', 400);
    }

    const user = await User.create({ name, email, password, currency: currency || 'USD' });
    sendTokenResponse(res, user, 201, 'Account created successfully.');
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, 'Email and password are required.', 400);
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return errorResponse(res, 'Invalid email or password.', 401);
    }

    sendTokenResponse(res, user, 200, 'Login successful.');
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    successResponse(res, user, 'Profile fetched successfully.');
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, currency, theme, timezone, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, currency, theme, timezone, avatar },
      { new: true, runValidators: true }
    );
    successResponse(res, user, 'Profile updated successfully.');
  } catch (error) {
    next(error);
  }
};

export const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return errorResponse(res, 'Current and new passwords are required.', 400);
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
      return errorResponse(res, 'Current password is incorrect.', 400);
    }

    user.password = newPassword;
    await user.save();

    sendTokenResponse(res, user, 200, 'Password updated successfully.');
  } catch (error) {
    next(error);
  }
};
