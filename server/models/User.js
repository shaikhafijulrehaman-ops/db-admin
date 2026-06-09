const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true,
    index: true 
  }, // Admin username, Teacher Employee ID, Student Roll Number
  passwordHash: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['admin', 'teacher', 'student'], 
    required: true 
  },
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  mustChangePassword: { 
    type: Boolean, 
    default: true, 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('User', userSchema);
