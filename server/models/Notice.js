const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true
  },
  content: { 
    type: String, 
    required: true,
    trim: true
  },
  type: { 
    type: String, 
    enum: ['General Notice', 'Holiday Notice', 'Examination Notice', 'Event Notice'], 
    required: true 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Notice', noticeSchema);
