require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function run(){
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await User.find({}).select('username verifiedBadge role');
  users.forEach(u => {
    console.log(u.username, '| badge:', u.verifiedBadge, '| role:', u.role);
  });
  process.exit(0);
}
run();