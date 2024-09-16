const mongoose = require('mongoose');
const schema = mongoose.Schema;

// CreateUser Schema
const createUserSchema = new schema({
  fullName: {
    type: String,
    required: true,
  },
  contact: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  aboutYou: {
    type: String,
  },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
  date_time: {
    type: Date,
    default: Date.now,
  },
  status:{
    type: String,
    enum: ['active', 'blocked'],
    default: 'active'
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  }
});

// Create the model
const CreateUser = mongoose.model('CreateUser', createUserSchema);

// Export the model
module.exports = CreateUser;
