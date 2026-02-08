// server/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String, required: true, unique: true, trim: true,
    minlength: 3, maxlength: 30,
    match: [/^[a-zA-Z0-9_]+$/, 'Только латиница, цифры и _']
  },
  email: {
    type: String, required: true, unique: true, lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Некорректный email']
  },
  password: {
    type: String, required: true, minlength: 8, select: false
  },
  displayName: { type: String, maxlength: 50, default: '' },
  bio: { type: String, maxlength: 300, default: '' },
  avatar: { type: String, default: '' },
  avatarPath: { type: String, default: '' },
  banner: { type: String, default: '' },
  bannerPath: { type: String, default: '' },
  isVerified: { type: Boolean, default: false },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  followersCount: { type: Number, default: 0 },
  followingCount: { type: Number, default: 0 },
    isAdmin: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  hasBadge: { type: Boolean, default: false },  // галочка верификации
  banReason: { type: String, default: '' }
}, { timestamps: true });

userSchema.index({ username: 'text', displayName: 'text' });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);