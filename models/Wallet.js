const mongoose = require('mongoose');

const currencySchema = new mongoose.Schema({
  type: { 
    type: String, 
    required: true,
    enum: ['INR', 'EUR', 'GBP', 'USD'] // Add supported currencies
  },
  balance: { 
    type: Number, 
    required: true, 
    default: 0,
    min: [0, 'Balance cannot be negative']
  }
});

const walletSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true 
  },
  currencies: [currencySchema]
});

// Add or update currency balance
walletSchema.methods.updateBalance = function(currencyType, amount) {
  const currency = this.currencies.find(c => c.type === currencyType);
  if (!currency) {
    this.currencies.push({ type: currencyType, balance: amount });
  } else {
    currency.balance += amount;
  }
};

module.exports = mongoose.model('Wallet', walletSchema);
