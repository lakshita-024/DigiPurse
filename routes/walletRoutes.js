const express = require('express');
const router = express.Router();
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const sendEmailAlert = require('../utils/email');
const User = require('../models/User');
const { authMiddleware } = require('./authRoutes');
const AdminError = 'Admin access required';
// Supported currencies
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP','INR'];
// Exchange rates to INR (latest)
const EXCHANGE_RATES_TO_INR = {
  INR: 1,                 
  USD: 85,                  
  EUR: 95,                  
  GBP: 108                  
};
const LARGE_WITHDRAWAL_LIMIT_INR = 1000000; // 10 lakh inr

// Deposit funds
router.post('/deposit', authMiddleware, async (req, res) => {
  const session = await Wallet.startSession();
  session.startTransaction();
  
  try {
    const { amount, currency } = req.body;

    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      throw new Error('Unsupported currency');
    }

    const wallet = await Wallet.findOne({ user: req.user }).session(session);

    // Null check added
    if (!wallet) {
      throw new Error('Wallet not found for user');
    }

    wallet.updateBalance(currency, amount);
    await wallet.save();

    await Transaction.create([{
      user: req.user,
      type: 'deposit',
      amount,
      currency
    }], { session });

    await session.commitTransaction();
    res.json(wallet);
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ error: err.message });
  } finally {
    session.endSession();
  }
});

// Withdraw funds 
router.post('/withdraw', authMiddleware, async (req, res) => {
  const session = await Wallet.startSession();
  session.startTransaction();

  try {
    const { amount, currency } = req.body;


    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      throw new Error('Unsupported currency');
    }

    // Converting withdrawal amount to INR for fraud check
    const rate = EXCHANGE_RATES_TO_INR[currency] || 1;
    const amountInINR = amount * rate;
    const isLargeWithdrawal = amountInINR > LARGE_WITHDRAWAL_LIMIT_INR;
    
    //Mock email alert for large withdrawals
    if (isLargeWithdrawal) {
      // Get user's email
      const user = await User.findById(req.user);
      sendEmailAlert(
        user.email,
        'Alert: Large Withdrawal Detected',
        `A large withdrawal of ${amount} ${currency} was detected on your account. If this was not you, please contact  support immediately.`
      );
    }

    const wallet = await Wallet.findOne({ user: req.user }).session(session);

    // Null check added
    if (!wallet) {
      throw new Error('Wallet not found for user');
    }

    const currencyBalance = wallet.currencies.find(c => c.type === currency);
    if (!currencyBalance || currencyBalance.balance < amount) {
      throw new Error('Insufficient funds');
    }

    wallet.updateBalance(currency, -amount);
    await wallet.save();

    await Transaction.create([{
      user: req.user,
      type: 'withdraw',
      amount,
      currency,
      flagged: isLargeWithdrawal // Flag if large
    }], { session });

    await session.commitTransaction();
    res.json(wallet);
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ error: err.message });
  } finally {
    session.endSession();
  }
});

// Transfer funds
router.post('/transfer', authMiddleware, async (req, res) => {
  const session = await Wallet.startSession();
  session.startTransaction();

  try {
    const { toUserId, amount, currency } = req.body;

    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      throw new Error('Unsupported currency');
    }
    
    // Sender's wallet 
    const fromWallet = await Wallet.findOne({ user: req.user }).session(session);
    if (!fromWallet) {
      throw new Error('Sender wallet not found');
    }


    // Receiver's wallet
    const toWallet = await Wallet.findOne({ user: toUserId }).session(session);
    if (!toWallet) {
      throw new Error('Recipient wallet not found');
    }


    const fromCurrency = fromWallet.currencies.find(c => c.type === currency);
    if (!fromCurrency || fromCurrency.balance < amount) {
      throw new Error('Insufficient funds');
    }

    // Fraud checking: more than 3 transfers in 10 minutes?
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentTransfers = await Transaction.countDocuments({
      user: req.user,
      type: 'transfer',
      createdAt: { $gte: tenMinutesAgo }
    });
    const isFrequentTransfer = recentTransfers >= 3;

    // Mock email alert for frequent transfers
    if (isFrequentTransfer) {
      const user = await User.findById(req.user);
      sendEmailAlert(
        user.email,
        'Alert: Suspicious Transfer Activity',
        `Multiple transfers were detected from your account in a short period. If this was not you, please review your   account activity.`
      );
    }

    // Update balances
    fromWallet.updateBalance(currency, -amount);
    toWallet.updateBalance(currency, amount);
    
    await fromWallet.save();
    await toWallet.save();

    // Create transactions with flag
    await Transaction.create([
      {
        user: req.user,
        type: 'transfer',
        amount: amount,
        currency,
        toUser: toUserId,
        flagged: isFrequentTransfer // Flag if frequent
      },
      {
        user: toUserId,
        type: 'transfer',
        amount,
        currency,
        toUser: req.user
      }
    ], { session, ordered: true });


    await session.commitTransaction();
    res.json({ message: 'Transfer successful' });
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ error: err.message });
  } finally {
    session.endSession();
  }
});

// Transaction history for the logged-in user
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user, isDeleted: false })
      .sort({ createdAt: -1 }) // Most recent first
      .populate('toUser', 'username email') //shows receiver info for transfers
      .exec();
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch transactions' });
  }
});

// Get wallet balances by currency for the logged-in user
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user }).populate('user', 'username email');
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // Create a summary object like{USD: 100,INR: 50, ..}
    const balances = {};
    wallet.currencies.forEach(c => {
      balances[c.type] = c.balance;
    });

    res.json({
      user: wallet.user,
      balances
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch wallet balance' });
  }
});


router.get('/all-balances', authMiddleware, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user });
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // Initialize all supported currencies to 0
    const balances = {};
    SUPPORTED_CURRENCIES.forEach(cur => {
      balances[cur] = 0;
    });

    // Overwrite with actual balances
    wallet.currencies.forEach(c => {
      balances[c.type] = c.balance;
    });

    res.json({ balances });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch wallet balances' });
  }
});

router.get('/details', authMiddleware, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user }).populate('user', 'username email');
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    res.json(wallet);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch wallet details' });
  }
});

// Add admin middleware
const adminMiddleware = (req, res, next) => {
  
  const isAdmin = req.header('Admin-Key') === process.env.ADMIN_SECRET;
  if (!isAdmin) return res.status(403).json({ error: AdminError });
  next();
};

// Get flagged transactions (admin-only)
router.get('/admin/flagged-transactions', adminMiddleware, async (req, res) => {
  try {
    const transactions = await Transaction.find({ flagged: true, isDeleted: false })
      .populate('user', 'username email')
      .populate('toUser', 'username email');
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch flagged transactions' });
  }
});

// Get total user balances (admin-only)
router.get('/admin/total-balances', adminMiddleware, async (req, res) => {
  try {
    // Aggregate total balances by currency
    const wallets = await Wallet.find({});
    const totals = {};

    wallets.forEach(wallet => {
      wallet.currencies.forEach(c => {
        if (!totals[c.type]) totals[c.type] = 0;
        totals[c.type] += c.balance;
      });
    });

    res.json({ totalBalances: totals });
  } catch (err) {
    res.status(500).json({ error: 'Failed to aggregate balances' });
  }
});

// Top users by total balance (admin-only)
router.get('/admin/top-users-by-balance', adminMiddleware, async (req, res) => {
  try {
    // Aggregate total balance per user (sum of all currencies)
    const wallets = await Wallet.find({})
    .populate({
      path: 'user',      
      select: 'username email'
    });
    const userBalances = wallets
      .filter(wallet => wallet.user) // Only include wallets with active users
      .map(wallet => {
        const total = wallet.currencies.reduce((sum, c) => sum + c.balance, 0);
        return {
          user: wallet.user,
          totalBalance: total
        };
    });

    // Sort descending and take top 10
    userBalances.sort((a, b) => b.totalBalance - a.totalBalance);
    res.json({ topUsers: userBalances.slice(0, 10) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch top users' });
  }
});

// Top users by transaction count (admin-only)
router.get('/admin/top-users-by-transactions', adminMiddleware, async (req, res) => {
  try {
    const pipeline = [
      { $group: { _id: "$user", transactionCount: { $sum: 1 } } },
      { $sort: { transactionCount: -1 } },
      { $limit: 10 },
      { $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo"
        }
      },
      { $unwind: "$userInfo" },
      { $project: { _id: 0, user: "$userInfo.username", email: "$userInfo.email", transactionCount: 1 } }
    ];
    const topUsers = await Transaction.aggregate(pipeline);
    res.json({ topUsers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch top users by transactions' });
  }
});

// Soft delete a user (admin only)
router.delete('/admin/users/:id', adminMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isDeleted: true });
    res.json({ message: 'User soft deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to soft delete user' });
  }
});

// Soft delete a transaction (admin only)
router.delete('/admin/transactions/:id', adminMiddleware, async (req, res) => {
  await Transaction.findByIdAndUpdate(req.params.id, { isDeleted: true });
  res.json({ message: 'Transaction soft deleted' });
});

// Restore a soft-deleted user (admin only)
router.patch('/admin/users/:id/restore', adminMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isDeleted: false });
    res.json({ message: 'User restored' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to restore user' });
  }
});

// Restore a soft-deleted transaction (admin only)
router.patch('/admin/transactions/:id/restore', adminMiddleware, async (req, res) => {
  try {
    await Transaction.findByIdAndUpdate(req.params.id, { isDeleted: false });
    res.json({ message: 'Transaction restored' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to restore transaction' });
  }
});

module.exports = router;
