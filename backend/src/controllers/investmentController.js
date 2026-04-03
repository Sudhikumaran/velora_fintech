import Investment from '../models/Investment.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const getInvestments = async (req, res, next) => {
  try {
    const { type, isActive } = req.query;
    const filter = { user: req.user._id };
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const investments = await Investment.find(filter).sort({ createdAt: -1 });
    successResponse(res, investments, 'Investments fetched successfully.');
  } catch (error) {
    next(error);
  }
};

export const createInvestment = async (req, res, next) => {
  try {
    const { name, type, symbol, units, buyPrice, currentPrice, buyDate, platform, notes, currency, account } = req.body;

    if (!name || !type || units === undefined || !buyPrice) {
      return errorResponse(res, 'Name, type, units and buy price are required.', 400);
    }

    const initialPrice = currentPrice || buyPrice;
    const investment = await Investment.create({
      user: req.user._id,
      name, type, symbol, units, buyPrice,
      currentPrice: initialPrice,
      buyDate: buyDate || Date.now(),
      platform, notes, currency: currency || 'USD', account,
      priceHistory: [{ price: initialPrice, date: buyDate || Date.now(), note: 'Initial price' }],
    });

    successResponse(res, investment, 'Investment added successfully.', 201);
  } catch (error) {
    next(error);
  }
};

export const updateInvestment = async (req, res, next) => {
  try {
    const investment = await Investment.findOne({ _id: req.params.id, user: req.user._id });
    if (!investment) return errorResponse(res, 'Investment not found.', 404);

    const { name, type, symbol, units, buyPrice, currentPrice, buyDate, platform, notes, currency, account, isActive } = req.body;
    Object.assign(investment, { name, type, symbol, units, buyPrice, currentPrice, buyDate, platform, notes, currency, account, isActive });
    await investment.save();

    successResponse(res, investment, 'Investment updated successfully.');
  } catch (error) {
    next(error);
  }
};

export const deleteInvestment = async (req, res, next) => {
  try {
    const investment = await Investment.findOne({ _id: req.params.id, user: req.user._id });
    if (!investment) return errorResponse(res, 'Investment not found.', 404);

    await Investment.deleteOne({ _id: req.params.id });
    successResponse(res, null, 'Investment deleted successfully.');
  } catch (error) {
    next(error);
  }
};

export const updatePrice = async (req, res, next) => {
  try {
    const investment = await Investment.findOne({ _id: req.params.id, user: req.user._id });
    if (!investment) return errorResponse(res, 'Investment not found.', 404);

    const { currentPrice, note } = req.body;
    if (currentPrice === undefined) return errorResponse(res, 'Current price is required.', 400);

    investment.currentPrice = currentPrice;
    investment.priceHistory.push({ price: currentPrice, date: new Date(), note: note || '' });

    // Keep only last 365 entries
    if (investment.priceHistory.length > 365) {
      investment.priceHistory = investment.priceHistory.slice(-365);
    }

    await investment.save();
    successResponse(res, investment, 'Price updated successfully.');
  } catch (error) {
    next(error);
  }
};

export const getPriceHistory = async (req, res, next) => {
  try {
    const investment = await Investment.findOne({ _id: req.params.id, user: req.user._id }).select('name type symbol priceHistory buyPrice units');
    if (!investment) return errorResponse(res, 'Investment not found.', 404);

    const { days = 30 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

    const history = investment.priceHistory
      .filter((h) => new Date(h.date) >= since)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    successResponse(res, { investment, history }, 'Price history fetched.');
  } catch (error) {
    next(error);
  }
};
