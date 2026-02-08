// server/config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Mongoose 7+ не требует useNewUrlParser и useUnifiedTopology
    });
    console.log(`✅ MongoDB подключена: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Ошибка MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;