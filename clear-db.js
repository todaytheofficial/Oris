require('dotenv').config();
const mongoose = require('mongoose');

async function clear() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  await mongoose.connection.db.dropDatabase();
  console.log('Database "oris" completely dropped');

  process.exit(0);
}

clear().catch(err => {
  console.error(err);
  process.exit(1);
});