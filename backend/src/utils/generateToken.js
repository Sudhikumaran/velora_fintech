import jwt from 'jsonwebtoken';

export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

export const sendTokenResponse = (res, user, statusCode = 200, message = 'Success') => {
  const token = generateToken(user._id);

  res.status(statusCode).json({
    success: true,
    message,
    token,
    user,
  });
};
