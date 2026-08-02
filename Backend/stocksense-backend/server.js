require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { PORT } = require('./src/config/env');

const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();

    app.listen(PORT, () => {
      console.log('');
      console.log('StockSense Backend — Started');
      console.log(`Server  : http://localhost:${PORT}`);
      console.log(`Health  : http://localhost:${PORT}/health`);
      console.log('');
    });
  } catch (error) {
    console.error(' Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
