const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');  
const fs = require('fs');
const YAML = require('yaml');
const { router: authRoutes, authMiddleware } = require('./routes/authRoutes');
const walletRoutes = require('./routes/walletRoutes');
const cron = require('node-cron');
const Transaction = require('./models/Transaction'); 

// Load environment variables from .env file
dotenv.config();

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Loading Swagger documentation
const swaggerDocument = YAML.parse(fs.readFileSync('./swagger.yaml', 'utf8'));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((err) => {
  console.error('MongoDB connection error:', err);
});

// Swagger UI Setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);

// Basic route
app.get('/', (req, res) => {
  res.send('Digital Wallet Backend is running!');
});

// === START OF SCHEDULED JOB CODE ===
cron.schedule('0 2 * * *', async () => {
  try {
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const flagged = await Transaction.find({
      flagged: true,
      createdAt: { $gte: today, $lt: tomorrow }
    });

    console.log(`\n=== Fraud Report for ${today.toISOString().slice(0,10)} ===`);
    if (flagged.length === 0) {
      console.log('No flagged transactions today.');
    } else {
      flagged.forEach(txn => {
        console.log(`Txn ID: ${txn._id}, User: ${txn.user}, Amount: ${txn.amount} ${txn.currency}, Flagged: ${txn.flagged}`);
      });
    }
    console.log('============================================\n');
  } catch (err) {
    console.error('Error running daily fraud scan:', err);
  }
});

// === END OF SCHEDULED JOB CODE ===    
// This job runs every day at 2 AM.
//It fetches all flagged transactions created today.
//It prints a report to my server console.


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
