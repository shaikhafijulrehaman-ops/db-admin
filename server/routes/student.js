const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const DailyWork = require('../models/DailyWork');
const Notification = require('../models/Notification');
const Notice = require('../models/Notice');
const StudentNote = require('../models/StudentNote');
const ExamResult = require('../models/ExamResult');
const { protect, authorize } = require('../middleware/auth');

// Apply protection & student check
router.use(protect);
router.use(authorize('student'));

// Helper: Get student profile and class
const getStudentProfile = async (userId) => {
  const student = await Student.findOne({ user: userId })
    .populate('class')
    .populate({
      path: 'class',
      populate: {
        path: 'classTeacher',
        populate: { path: 'user', select: 'name mobileNumber' }
      }
    });

  if (!student) {
    throw new Error('Student profile not found');
  }
  return student;
};

// @desc    Get student dashboard data (notifications, attendance stats, profile)
// @route   GET /api/student/dashboard
// @access  Private (Student)
router.get('/dashboard', async (req, res) => {
  try {
    const student = await getStudentProfile(req.user._id);

    // Get notifications
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    // Calculate attendance percentage
    const totalDays = await Attendance.countDocuments({ student: student._id });
    const presentDays = await Attendance.countDocuments({ student: student._id, status: 'Present' });
    const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

    // Get recent daily attendance logs (last 30 entries)
    const attendanceHistory = await Attendance.find({ student: student._id })
      .sort({ date: -1 })
      .limit(30);

    // Get active notices
    const notices = await Notice.find()
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      profile: {
        id: student._id,
        rollNumber: student.rollNumber,
        gender: student.gender,
        dob: student.dob,
        parentName: student.parentName,
        parentMobile: student.parentMobile,
        classInfo: student.class
      },
      attendance: {
        totalDays,
        presentDays,
        percentage: attendancePercentage,
        history: attendanceHistory
      },
      notifications,
      notices
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// @desc    Get Daily Work for student's class
// @route   GET /api/student/daily-work
// @access  Private (Student)
router.get('/daily-work', async (req, res) => {
  const dateStr = req.query.date || new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    const student = await getStudentProfile(req.user._id);
    const assignedClass = student.class;

    if (!assignedClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    // Find daily work for class on date
    const work = await DailyWork.findOne({ class: assignedClass._id, date: dateStr });

    // Format output as subject-wise
    // If no work is created for the date, fill all subjects with "No Work Assigned"
    const formattedEntries = assignedClass.subjects.map((subject) => {
      let details = 'No Work Assigned';
      if (work) {
        const matchingEntry = work.entries.find(
          (e) => e.subject.toLowerCase() === subject.toLowerCase()
        );
        if (matchingEntry) {
          details = matchingEntry.workDetails;
        }
      }
      return { subject, workDetails: details };
    });

    res.json({
      success: true,
      date: dateStr,
      entries: formattedEntries,
      hasPost: !!work
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error retrieving daily work' });
  }
});

// @desc    Mark a notification as read
// @route   PUT /api/student/notifications/:id/read
// @access  Private (Student)
router.put('/notifications/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, notification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Mark all notifications as read
// @route   PUT /api/student/notifications/read-all
// @access  Private (Student)
router.put('/notifications/read-all', async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Get student profile extra tabs (Attendance, Daily Work, Notes, Marks)
// @route   GET /api/student/profile-extra
// @access  Private (Student)
router.get('/profile-extra', async (req, res) => {
  try {
    const student = await getStudentProfile(req.user._id);
    const assignedClass = student.class;

    if (!assignedClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    const totalDays = await Attendance.countDocuments({ student: student._id });
    const presentDays = await Attendance.countDocuments({ student: student._id, status: 'Present' });
    const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;
    
    const attendanceHistory = await Attendance.find({ student: student._id })
      .sort({ date: -1 })
      .limit(30);

    const dailyWorkLogs = await DailyWork.find({ class: assignedClass._id })
      .sort({ date: -1 })
      .limit(10);

    const notes = await StudentNote.find({ student: student._id })
      .sort({ createdAt: -1 });

    // Only Published exam results are returned to the student
    const marks = await ExamResult.find({ student: student._id, status: 'Published' })
      .populate('exam')
      .sort({ date: -1 });

    res.json({
      success: true,
      attendance: {
        totalDays,
        presentDays,
        percentage: attendancePercentage,
        history: attendanceHistory
      },
      dailyWork: dailyWorkLogs,
      notes,
      marks
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error fetching profile card tabs.' });
  }
});

module.exports = router;
