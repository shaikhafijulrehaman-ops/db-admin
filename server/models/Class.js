const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  className: { 
    type: String, 
    required: true,
    trim: true
  }, // e.g. "6"
  section: { 
    type: String, 
    required: true,
    trim: true
  }, // e.g. "A"
  totalStrength: { 
    type: Number, 
    required: true 
  },
  boysStrength: { 
    type: Number, 
    required: true 
  },
  girlsStrength: { 
    type: Number, 
    required: true 
  },
  classTeacher: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Teacher', 
    default: null 
  },
  subjects: [{ 
    type: String, 
    trim: true 
  }] // e.g. ["English", "Mathematics", "Science", "Social", "Telugu"]
});

// Avoid duplicate Class-Section combinations (e.g. 6-A can only exist once)
classSchema.index({ className: 1, section: 1 }, { unique: true });

module.exports = mongoose.model('Class', classSchema);
