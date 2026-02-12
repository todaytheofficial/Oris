require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function run(){
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOneAndUpdate(
    {username:'todayidk'},
    {role:'creator', verifiedBadge:true},
    {new:true}
  );
  if(user){
    console.log('OK:', user.username);
    console.log('role:', user.role);
    console.log('verifiedBadge:', user.verifiedBadge);
  } else {
    console.log('User not found!');
    const all = await User.find({}).select('username');
    console.log('Users in DB:', all.map(u=>u.username));
  }
  process.exit(0);
}
run();