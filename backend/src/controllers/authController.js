import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import Budget from '../models/Budget.js';
import Debt from '../models/Debt.js';
import Goal from '../models/Goal.js';
import Investment from '../models/Investment.js';
import Subscription from '../models/Subscription.js';
import IncomePlan from '../models/IncomePlan.js';
import CalendarEvent from '../models/CalendarEvent.js';
import crypto from 'crypto';
import { sendTokenResponse, clearAuthCookie } from '../utils/generateToken.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { sendPasswordReset } from '../services/emailService.js';

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
    const { name, currency, theme, timezone, avatar, merchantRules, aaWaitlist } = req.body;
    const patch = {};
    if (name !== undefined) patch.name = name;
    if (currency !== undefined) patch.currency = currency;
    if (theme !== undefined) patch.theme = theme;
    if (timezone !== undefined) patch.timezone = timezone;
    if (avatar !== undefined) patch.avatar = avatar;
    if (merchantRules !== undefined) patch.merchantRules = merchantRules;
    if (aaWaitlist !== undefined) patch.aaWaitlist = Boolean(aaWaitlist);
    const user = await User.findByIdAndUpdate(
      req.user._id,
      patch,
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

export const logout = async (req, res) => {
  clearAuthCookie(res);
  successResponse(res, null, 'Logged out successfully.');
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return errorResponse(res, 'Email is required.', 400);

    const user = await User.findOne({ email });
    if (!user) {
      return successResponse(res, null, 'If that email exists, a reset link was sent.');
    }

    const raw = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(raw).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0];
    const resetUrl = `${clientUrl}/reset-password?token=${raw}`;
    await sendPasswordReset({ to: user.email, userName: user.name, resetUrl });

    successResponse(res, null, 'If that email exists, a reset link was sent.');
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return errorResponse(res, 'Token and new password are required.', 400);
    if (password.length < 6) return errorResponse(res, 'Password must be at least 6 characters.', 400);

    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+resetPasswordToken +resetPasswordExpires +password');

    if (!user) return errorResponse(res, 'Reset link is invalid or expired.', 400);

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    sendTokenResponse(res, user, 200, 'Password reset successfully.');
  } catch (error) {
    next(error);
  }
};

export const deleteMyAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    if (!user) return errorResponse(res, 'User not found.', 404);
    if (!password || !(await user.comparePassword(password))) {
      return errorResponse(res, 'Password is incorrect.', 400);
    }

    const uid = user._id;
    await Promise.all([
      Transaction.deleteMany({ user: uid }),
      Account.deleteMany({ user: uid }),
      Budget.deleteMany({ user: uid }),
      Debt.deleteMany({ user: uid }),
      Goal.deleteMany({ user: uid }),
      Investment.deleteMany({ user: uid }),
      Subscription.deleteMany({ user: uid }),
      IncomePlan.deleteMany({ user: uid }),
      CalendarEvent.deleteMany({ user: uid }),
    ]);
    await User.deleteOne({ _id: uid });
    clearAuthCookie(res);
    successResponse(res, null, 'Account deleted.');
  } catch (error) {
    next(error);
  }
};
