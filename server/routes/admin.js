const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Student = require('../models/Student');
const Setting = require('../models/Setting');
const Attendance = require('../models/Attendance');
const ActivityLog = require('../models/ActivityLog');
const DailyWork = require('../models/DailyWork');
const ExamResult = require('../models/ExamResult');
const Exam = require('../models/Exam');
const { protect, authorize } = require('../middleware/auth');

// Apply protection & admin check to all admin routes
router.use(protect);
router.use(authorize('admin'));

// Helper: Log Admin Actions
const logAdminAction = async (adminId, action, details) => {
  await ActivityLog.create({
    user: adminId,
    action,
    details
  });
};

// Helper: Recalculate Class Strengths Automatically
const updateClassStrength = async (classId) => {
  if (!classId) return;
  try {
    const boysCount = await Student.countDocuments({ class: classId, gender: 'Male' });
    const girlsCount = await Student.countDocuments({ class: classId, gender: 'Female' });
    const otherCount = await Student.countDocuments({ class: classId, gender: 'Other' });
    const total = boysCount + girlsCount + otherCount;
    
    await Class.findByIdAndUpdate(classId, {
      boysStrength: boysCount,
      girlsStrength: girlsCount + otherCount,
      totalStrength: total
    });
  } catch (err) {
    console.error(`Error updating class strength for class ${classId}:`, err.message);
  }
};

// ==========================================
// DASHBOARD STATISTICS
// ==========================================
router.get('/stats', async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const totalTeachers = await Teacher.countDocuments();
    const totalClasses = await Class.countDocuments();

    // Get today's attendance metrics
    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const presentCount = await Attendance.countDocuments({ date: todayStr, status: 'Present' });
    const absentCount = await Attendance.countDocuments({ date: todayStr, status: 'Absent' });

    // Recent activity logs (last 15 items)
    const recentActivity = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .limit(15)
      .populate('user', 'name role username');

    res.json({
      success: true,
      stats: {
        totalStudents,
        totalTeachers,
        totalClasses,
        presentStudents: presentCount,
        absentStudents: absentCount,
        todayDate: todayStr
      },
      recentActivity
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error fetching stats' });
  }
});

// ==========================================
// ATTENDANCE OVERVIEW (ABSENTEE DASHBOARD)
// ==========================================
router.get('/attendance/absent', async (req, res) => {
  const { classId, date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    let query = { status: 'Absent', date: targetDate };
    if (classId) {
      query.class = classId;
    }

    const records = await Attendance.find(query)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'name' }
      })
      .populate({
        path: 'class',
        populate: {
          path: 'classTeacher',
          populate: { path: 'user', select: 'name' }
        }
      });

    res.json({ success: true, records });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error fetching absent attendance records' });
  }
});

// ==========================================
// SETTINGS MANAGEMENT
// ==========================================
router.get('/settings', async (req, res) => {
  try {
    let setting = await Setting.findOne({ key: 'attendance_notifications' });
    if (!setting) {
      setting = await Setting.create({ key: 'attendance_notifications', value: 'ON' });
    }
    res.json({ success: true, settings: { attendance_notifications: setting.value } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error fetching settings' });
  }
});

router.put('/settings', async (req, res) => {
  const { attendance_notifications } = req.body;
  if (!attendance_notifications || !['ON', 'OFF'].includes(attendance_notifications)) {
    return res.status(400).json({ success: false, message: 'Invalid settings value. Use ON or OFF' });
  }
  try {
    let setting = await Setting.findOne({ key: 'attendance_notifications' });
    if (!setting) {
      setting = new Setting({ key: 'attendance_notifications' });
    }
    setting.value = attendance_notifications;
    await setting.save();

    await logAdminAction(req.user._id, 'Setting Update', `Changed attendance notifications toggle to ${attendance_notifications}`);

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error updating settings' });
  }
});

// ==========================================
// CLASS MANAGEMENT
// ==========================================
router.get('/classes', async (req, res) => {
  try {
    const classes = await Class.find().populate('classTeacher', 'employeeId user').populate({
      path: 'classTeacher',
      populate: { path: 'user', select: 'name' }
    });
    res.json({ success: true, classes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error retrieving classes' });
  }
});

// Get a single class details including its students list
router.get('/classes/:id', async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id)
      .populate('classTeacher')
      .populate({
        path: 'classTeacher',
        populate: { path: 'user', select: 'name' }
      });

    if (!classItem) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    const students = await Student.find({ class: classItem._id }).populate('user', 'name username');

    res.json({ success: true, classItem, students });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error retrieving class details' });
  }
});

// @desc    Get Daily Work history for class on specific date (Admin view)
// @route   GET /api/admin/classes/:id/daily-work/:date
// @access  Private (Admin)
router.get('/classes/:id/daily-work/:date', async (req, res) => {
  const { id, date } = req.params;
  try {
    const classItem = await Class.findById(id);
    if (!classItem) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }
    const work = await DailyWork.findOne({ class: id, date });
    res.json({ success: true, work: work || null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error retrieving daily work' });
  }
});

router.post('/classes', async (req, res) => {
  const { className, section, classTeacher } = req.body;

  if (!className || !section) {
    return res.status(400).json({ success: false, message: 'Class Name and Section are required' });
  }

  try {
    // Check if class-section exists
    const classExists = await Class.findOne({ className, section });
    if (classExists) {
      return res.status(400).json({ success: false, message: `Class ${className}-${section} already exists` });
    }

    const newClass = new Class({
      className,
      section,
      totalStrength: 0, // Starts at 0, updates automatically as students are added
      boysStrength: 0,
      girlsStrength: 0,
      classTeacher: classTeacher || null,
      subjects: ['English', 'Mathematics', 'Science', 'Social', 'Telugu'] // Pre-populated defaults
    });

    await newClass.save();

    await logAdminAction(req.user._id, 'Class Creation', `Created class ${className}-${section}`);

    res.status(201).json({ success: true, data: newClass });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error creating class' });
  }
});

router.put('/classes/:id', async (req, res) => {
  const { className, section, classTeacher, subjects } = req.body;

  try {
    const classItem = await Class.findById(req.params.id);
    if (!classItem) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    // Check unique constraint if name/section is changing
    if (className !== classItem.className || section !== classItem.section) {
      const classExists = await Class.findOne({ className, section });
      if (classExists) {
        return res.status(400).json({ success: false, message: `Class ${className}-${section} already exists` });
      }
    }

    classItem.className = className;
    classItem.section = section;
    classItem.classTeacher = classTeacher || null;
    if (subjects) classItem.subjects = subjects;

    await classItem.save();

    // Recalculate strength just in case
    await updateClassStrength(classItem._id);

    await logAdminAction(req.user._id, 'Class Update', `Updated class ${className}-${section}`);

    res.json({ success: true, data: classItem });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error updating class' });
  }
});

router.delete('/classes/:id', async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id);
    if (!classItem) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    // Check if students belong to this class
    const studentCount = await Student.countDocuments({ class: classItem._id });
    if (studentCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete class. There are still ${studentCount} students assigned to this class. Remove or transfer students first.`
      });
    }

    await Class.findByIdAndDelete(req.params.id);

    await logAdminAction(req.user._id, 'Class Deletion', `Deleted class ${classItem.className}-${classItem.section}`);

    res.json({ success: true, message: 'Class deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error deleting class' });
  }
});

// ==========================================
// TEACHER MANAGEMENT
// ==========================================
router.get('/teachers', async (req, res) => {
  try {
    const teachers = await Teacher.find().populate('user', 'name username');
    res.json({ success: true, teachers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error retrieving teachers' });
  }
});

router.post('/teachers', async (req, res) => {
  const { name, employeeId, mobileNumber, email, gender, password } = req.body;

  if (!name || !employeeId || !mobileNumber || !email || !gender || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required to register a teacher' });
  }

  try {
    const userExists = await User.findOne({ username: employeeId });
    if (userExists) {
      return res.status(400).json({ success: false, message: `User with Employee ID '${employeeId}' already exists` });
    }

    const emailExists = await Teacher.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ success: false, message: 'Teacher with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      username: employeeId,
      passwordHash,
      role: 'teacher',
      name,
      mustChangePassword: true
    });

    const newTeacher = await Teacher.create({
      user: newUser._id,
      employeeId,
      mobileNumber,
      email,
      gender
    });

    await logAdminAction(req.user._id, 'Teacher Creation', `Registered teacher: ${name} (ID: ${employeeId})`);

    res.status(201).json({ success: true, data: newTeacher });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error creating teacher' });
  }
});

router.put('/teachers/:id', async (req, res) => {
  const { name, mobileNumber, email, gender } = req.body;
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher profile not found' });
    }

    if (email !== teacher.email) {
      const emailExists = await Teacher.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ success: false, message: 'Email is already in use' });
      }
    }

    teacher.mobileNumber = mobileNumber;
    teacher.email = email;
    teacher.gender = gender;
    await teacher.save();

    const user = await User.findById(teacher.user);
    if (user) {
      user.name = name;
      await user.save();
    }

    await logAdminAction(req.user._id, 'Teacher Update', `Updated teacher profile for ${name}`);

    res.json({ success: true, data: teacher });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error updating teacher' });
  }
});

router.delete('/teachers/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher profile not found' });
    }

    await Class.updateMany({ classTeacher: teacher._id }, { classTeacher: null });

    await User.findByIdAndDelete(teacher.user);
    await Teacher.findByIdAndDelete(req.params.id);

    await logAdminAction(req.user._id, 'Teacher Deletion', `Deleted teacher: Employee ID ${teacher.employeeId}`);

    res.json({ success: true, message: 'Teacher deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error deleting teacher' });
  }
});

// ==========================================
// STUDENT MANAGEMENT (NESTED / CLASS-CENTRIC)
// ==========================================
router.get('/students', async (req, res) => {
  try {
    const students = await Student.find()
      .populate('user', 'name username')
      .populate('class', 'className section');
    res.json({ success: true, students });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error retrieving students' });
  }
});

router.post('/students', async (req, res) => {
  const { name, rollNumber, gender, dob, parentName, parentMobile, classId, password } = req.body;

  if (!name || !rollNumber || !gender || !dob || !parentName || !parentMobile || !classId || !password) {
    return res.status(400).json({ success: false, message: 'All student parameters are required' });
  }

  try {
    const userExists = await User.findOne({ username: rollNumber });
    if (userExists) {
      return res.status(400).json({ success: false, message: `User with Roll Number '${rollNumber}' already exists` });
    }

    const targetClass = await Class.findById(classId);
    if (!targetClass) {
      return res.status(404).json({ success: false, message: 'Selected Class does not exist' });
    }

    // 1. Create user credential
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      username: rollNumber,
      passwordHash,
      role: 'student',
      name,
      mustChangePassword: true
    });

    // 2. Create student profile
    const newStudent = await Student.create({
      user: newUser._id,
      rollNumber,
      gender,
      dob: new Date(dob),
      parentName,
      parentMobile,
      class: classId
    });

    // Automatically recalculate target class strengths
    await updateClassStrength(classId);

    await logAdminAction(req.user._id, 'Student Creation', `Registered student: ${name} (Roll: ${rollNumber}) in class ${targetClass.className}-${targetClass.section}`);

    res.status(201).json({ success: true, data: newStudent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error creating student' });
  }
});

router.put('/students/:id', async (req, res) => {
  const { name, gender, dob, parentName, parentMobile } = req.body;
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const oldGender = student.gender;
    student.gender = gender;
    student.dob = new Date(dob);
    student.parentName = parentName;
    student.parentMobile = parentMobile;
    await student.save();

    // Update user display name
    const user = await User.findById(student.user);
    if (user) {
      user.name = name;
      await user.save();
    }

    // Recalculate strength if gender changed
    if (oldGender !== gender) {
      await updateClassStrength(student.class);
    }

    await logAdminAction(req.user._id, 'Student Update', `Updated student details for ${name}`);

    res.json({ success: true, data: student });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error updating student' });
  }
});

router.delete('/students/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const classId = student.class;

    // Delete base user and profile
    await User.findByIdAndDelete(student.user);
    await Student.findByIdAndDelete(req.params.id);

    // Auto recalculate old class strength
    await updateClassStrength(classId);

    await logAdminAction(req.user._id, 'Student Deletion', `Deleted student: Roll Number ${student.rollNumber}`);

    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error deleting student' });
  }
});

// Student Transfer Endpoint
router.put('/students/:id/transfer', async (req, res) => {
  const { targetClassId } = req.body;

  if (!targetClassId) {
    return res.status(400).json({ success: false, message: 'Target class ID is required for transfer' });
  }

  try {
    const student = await Student.findById(req.params.id).populate('user', 'name');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const sourceClassId = student.class;
    if (sourceClassId.toString() === targetClassId.toString()) {
      return res.status(400).json({ success: false, message: 'Student is already in the target class' });
    }

    const targetClass = await Class.findById(targetClassId);
    if (!targetClass) {
      return res.status(404).json({ success: false, message: 'Target class not found' });
    }

    const sourceClass = await Class.findById(sourceClassId);

    // Update student's class
    student.class = targetClassId;
    await student.save();

    // Recalculate strengths for BOTH classes
    await updateClassStrength(sourceClassId);
    await updateClassStrength(targetClassId);

    const sourceLabel = sourceClass ? `${sourceClass.className}-${sourceClass.section}` : 'Unknown';
    const targetLabel = `${targetClass.className}-${targetClass.section}`;

    await logAdminAction(
      req.user._id, 
      'Student Transfer', 
      `Transferred student ${student.user.name} from Class ${sourceLabel} to Class ${targetLabel}`
    );

    res.json({ success: true, message: `Student transferred successfully to Class ${targetLabel}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error transferring student' });
  }
});

// ==========================================
// USER PASSWORD RESET (FOR TEACHERS/STUDENTS)
// ==========================================
router.post('/users/:id/reset-password', async (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Please provide a password of at least 6 characters' });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found' });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.mustChangePassword = true; // User must change password again on their next login
    await user.save();

    await logAdminAction(
      req.user._id, 
      'Password Reset', 
      `Forced password reset and change-on-login flag for ${user.name} (${user.role})`
    );

    res.json({ success: true, message: `Password reset successfully. The ${user.role} must change it on their next login.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error resetting password' });
  }
});

// @desc    Get all exams
// @route   GET /api/admin/exams
// @access  Private (Admin)
router.get('/exams', async (req, res) => {
  try {
    const exams = await Exam.find().sort({ startDate: -1 });
    res.json({ success: true, exams });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error retrieving exams.' });
  }
});

// @desc    Create a new exam
// @route   POST /api/admin/exams
// @access  Private (Admin)
router.post('/exams', async (req, res) => {
  const { name, startDate, endDate, subjects } = req.body;

  if (!name || !startDate || !endDate || !subjects || !Array.isArray(subjects) || subjects.length === 0) {
    return res.status(400).json({ success: false, message: 'All fields are required and subjects list must not be empty.' });
  }

  try {
    const examExists = await Exam.findOne({ name: name.trim() });
    if (examExists) {
      return res.status(400).json({ success: false, message: `An exam named "${name}" already exists.` });
    }

    const exam = await Exam.create({
      name: name.trim(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      subjects: subjects.map(s => ({
        subjectName: s.subjectName.trim(),
        maxMarks: Number(s.maxMarks) || 100
      }))
    });

    await logAdminAction(req.user._id, 'Create Exam', `Created exam "${name}"`);
    res.status(201).json({ success: true, exam });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error creating exam.' });
  }
});

// @desc    Edit exam details
// @route   PUT /api/admin/exams/:id
// @access  Private (Admin)
router.put('/exams/:id', async (req, res) => {
  const { name, startDate, endDate, subjects } = req.body;

  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found.' });
    }

    if (name && name.trim() !== exam.name) {
      const examExists = await Exam.findOne({ name: name.trim() });
      if (examExists) {
        return res.status(400).json({ success: false, message: `An exam named "${name}" already exists.` });
      }
      exam.name = name.trim();
    }

    if (startDate) exam.startDate = new Date(startDate);
    if (endDate) exam.endDate = new Date(endDate);
    if (subjects && Array.isArray(subjects)) {
      exam.subjects = subjects.map(s => ({
        subjectName: s.subjectName.trim(),
        maxMarks: Number(s.maxMarks) || 100
      }));
    }

    await exam.save();
    await logAdminAction(req.user._id, 'Edit Exam', `Edited exam details for "${exam.name}"`);
    res.json({ success: true, exam });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error updating exam.' });
  }
});

// @desc    Archive exam
// @route   POST /api/admin/exams/:id/archive
// @access  Private (Admin)
router.post('/exams/:id/archive', async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found.' });
    }

    exam.status = 'Archived';
    await exam.save();

    await logAdminAction(req.user._id, 'Archive Exam', `Archived exam "${exam.name}"`);
    res.json({ success: true, exam });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error archiving exam.' });
  }
});

// @desc    Delete exam (only if no marks exist)
// @route   DELETE /api/admin/exams/:id
// @access  Private (Admin)
router.delete('/exams/:id', async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found.' });
    }

    const resultsCount = await ExamResult.countDocuments({ exam: exam._id });
    if (resultsCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete exam "${exam.name}" because student marks already exist for it. Please Archive the exam instead.` 
      });
    }

    await Exam.findByIdAndDelete(req.params.id);
    await logAdminAction(req.user._id, 'Delete Exam', `Deleted exam "${exam.name}"`);
    res.json({ success: true, message: 'Exam deleted successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error deleting exam.' });
  }
});

// @desc    Get exam monitoring status for all classes
// @route   GET /api/admin/exams-monitoring
// @access  Private (Admin)
router.get('/exams-monitoring', async (req, res) => {
  try {
    const classes = await Class.find().populate({
      path: 'classTeacher',
      populate: { path: 'user', select: 'name' }
    });

    const activeExams = await Exam.find({ status: 'Active' }).sort({ startDate: -1 });
    const monitoringData = [];

    for (const cls of classes) {
      const studentCount = await Student.countDocuments({ class: cls._id });

      for (const exam of activeExams) {
        const results = await ExamResult.find({ class: cls._id, exam: exam._id });
        const enteredCount = results.length;
        const isPublished = results.some(r => r.status === 'Published');
        
        let status = 'Draft';
        if (enteredCount === 0) {
          status = 'Not Started';
        } else if (isPublished) {
          status = 'Published';
        }

        monitoringData.push({
          classId: cls._id,
          className: `${cls.className}-${cls.section}`,
          teacherName: cls.classTeacher && cls.classTeacher.user ? cls.classTeacher.user.name : 'Not Assigned',
          examName: exam.name,
          examId: exam._id,
          marksCompleted: `${enteredCount} / ${studentCount}`,
          enteredCount,
          totalStudents: studentCount,
          status
        });
      }
    }

    res.json({ success: true, monitoringData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error retrieving exam monitoring data.' });
  }
});

module.exports = router;
