const Bill = require('../models/Bill');

/**
 * Returns start-of-day and end-of-day Date objects for a given date string.
 * Defaults to today if no date is given.
 */
const dayRange = (dateStr) => {
  const base = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(base.getTime())) return null;
  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  const end = new Date(base);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

/**
 * GET /api/reports/today-revenue  (manager only)
 * Returns total revenue and bill count for today.
 */
const getTodayRevenue = async (req, res, next) => {
  try {
    const today = new Date();
    const start = new Date(today); start.setHours(0, 0, 0, 0);
    const end   = new Date(today); end.setHours(23, 59, 59, 999);

    const bills = await Bill.find({ createdAt: { $gte: start, $lte: end } });

    const totalRevenue = parseFloat(
      bills.reduce((sum, b) => sum + b.total, 0).toFixed(2)
    );

    res.status(200).json({
      success: true,
      message: "Today's revenue retrieved.",
      data: {
        date:         today.toISOString().slice(0, 10),
        billCount:    bills.length,
        totalRevenue,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/profit-summary  (manager only)
 * Query params: from=<YYYY-MM-DD>  to=<YYYY-MM-DD>
 * Defaults to today if neither param is provided.
 *
 * Logic per bill item:
 *   revenue += price    * qty
 *   cost    += costPrice * qty
 *   profit   = revenue - cost
 */
const getProfitSummary = async (req, res, next) => {
  try {
    let start, end;

    if (!req.query.from && !req.query.to) {
      // Default: today
      const today = new Date();
      start = new Date(today); start.setHours(0, 0, 0, 0);
      end   = new Date(today); end.setHours(23, 59, 59, 999);
    } else {
      // Use provided dates
      const fromRange = req.query.from ? dayRange(req.query.from) : null;
      const toRange   = req.query.to   ? dayRange(req.query.to)   : null;

      if (req.query.from && !fromRange) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid "from" date. Use YYYY-MM-DD format.',
        });
      }
      if (req.query.to && !toRange) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid "to" date. Use YYYY-MM-DD format.',
        });
      }

      start = fromRange ? fromRange.start : toRange.start;
      end   = toRange   ? toRange.end     : fromRange.end;
    }

    const bills = await Bill.find({ createdAt: { $gte: start, $lte: end } });

    let totalRevenue = 0;
    let totalCost    = 0;

    for (const bill of bills) {
      for (const item of bill.items) {
        totalRevenue += item.price     * item.qty;
        totalCost    += (item.costPrice || 0) * item.qty;
      }
    }

    totalRevenue = parseFloat(totalRevenue.toFixed(2));
    totalCost    = parseFloat(totalCost.toFixed(2));
    const totalProfit = parseFloat((totalRevenue - totalCost).toFixed(2));

    res.status(200).json({
      success: true,
      message: 'Profit summary retrieved.',
      data: {
        dateRange: {
          from: start.toISOString().slice(0, 10),
          to:   end.toISOString().slice(0, 10),
        },
        billCount:    bills.length,
        totalRevenue,
        totalCost,
        totalProfit,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTodayRevenue, getProfitSummary };
