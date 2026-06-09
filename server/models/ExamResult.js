const mongoose = require('mongoose');

const examResultSchema = new mongoose.Schema({
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
  exam: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Exam', 
    required: true 
  },
  examName: { 
    type: String, 
    required: true 
  },
  date: { 
    type: Date, 
    default: Date.now,
    required: true
  },
  marks: [
    {
      subject: { type: String, required: true },
      marksObtained: { type: Number, required: true },
      maxMarks: { type: Number, default: 100, required: true }
    }
  ],
  remarks: { 
    type: String, 
    default: '' 
  },
  status: { 
    type: String, 
    enum: ['Draft', 'Published'], 
    default: 'Draft',
    required: true
  },
  publishedAt: { 
    type: Date 
  }
}, { timestamps: true });

// Enforce unique record per student per exam
examResultSchema.index({ student: 1, exam: 1 }, { unique: true });

module.exports = mongoose.model('ExamResult', examResultSchema);
