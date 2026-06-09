const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    unique: true,
    trim: true
  },
  startDate: { 
    type: Date, 
    required: true 
  },
  endDate: { 
    type: Date, 
    required: true 
  },
  subjects: [
    {
      subjectName: { type: String, required: true },
      maxMarks: { type: Number, default: 100, required: true }
    }
  ],
  status: { 
    type: String, 
    enum: ['Active', 'Archived'], 
    default: 'Active',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Exam', examSchema);
