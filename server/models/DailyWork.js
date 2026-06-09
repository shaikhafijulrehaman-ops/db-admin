const mongoose = require('mongoose');

const dailyWorkSchema = new mongoose.Schema({
  class: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Class', 
    required: true 
  },
  date: { 
    type: String, 
    required: true // YYYY-MM-DD format
  },
  teacher: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Teacher', 
    required: true 
  },
  entries: [
    {
      subject: { 
        type: String, 
        required: true 
      },
      workDetails: { 
        type: String, 
        required: true,
        trim: true // Must contain details or "None"
      }
    }
  ],
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// A class can only have one daily work compilation posted per date
dailyWorkSchema.index({ class: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyWork', dailyWorkSchema);
