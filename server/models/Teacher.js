const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true 
  },
  employeeId: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  mobileNumber: { 
    type: String, 
    required: true,
    trim: true
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true
  },
  gender: { 
    type: String, 
    enum: ['Male', 'Female', 'Other'], 
    required: true 
  }
});

module.exports = mongoose.model('Teacher', teacherSchema);
