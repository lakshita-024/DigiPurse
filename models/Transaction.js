const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['deposit', 'withdraw', 'transfer'], 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true,
    min: [0.01, 'Amount must be positive']
  },
  currency: { 
    type: String, 
    required: true 
  },
  toUser: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  flagged: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false }
});


module.exports = mongoose.model('Transaction', transactionSchema);
