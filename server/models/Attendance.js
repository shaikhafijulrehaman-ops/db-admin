const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Student', 
    required: true 
  },
  class: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Class', 
    required: true 
  },
  date: { 
    type: String, 
    required: true // YYYY-MM-DD format
  },
  status: { 
    type: String, 
    enum: ['Present', 'Absent'], 
    required: true 
  },
  markedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Teacher', 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// A student can only have one attendance status recorded per day
attendanceSchema.index({ student: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
