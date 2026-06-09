const mongoose = require('mongoose');

const studentNoteSchema = new mongoose.Schema({
  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Student', 
    required: true 
  },
  teacherName: { 
    type: String, 
    required: true 
  },
  content: { 
    type: String, 
    required: true 
  },
  date: { 
    type: Date, 
    default: Date.now,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('StudentNote', studentNoteSchema);
