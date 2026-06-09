const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const DailyWork = require('../models/DailyWork');
const Setting = require('../models/Setting');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const ExamResult = require('../models/ExamResult');
const StudentNote = require('../models/StudentNote');
const Exam = require('../models/Exam');
const { protect, authorize } = require('../middleware/auth');

// Apply protection & teacher check
router.use(protect);
router.use(authorize('teacher'));

// Helper: Get Teacher Profile and populate User info
const getTeacherProfile = async (userId) => {
  const teacher = await Teacher.findOne({ user: userId }).populate('user', 'name');
  if (!teacher) {
    throw new Error('Teacher profile not found');
  }
  return teacher;
};

// Helper: Get Assigned Class
const getAssignedClass = async (teacherId) => {
  const classItem = await Class.findOne({ classTeacher: teacherId });
  return classItem;
};

// Helper: Recalculate Class Strengths automatically
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

// Helper: Log Teacher action with specific format
const logTeacherAction = async (teacherUser, classItem, action, details) => {
  const classLabel = classItem ? `Class ${classItem.className}-${classItem.section}` : 'N/A';
  await ActivityLog.create({
    user: teacherUser._id,
    action,
    details: `Teacher ${teacherUser.name} (${classLabel}) - ${details}`
  });
};

// ==========================================
// CLASS DETAILS & METADATA
// ==========================================

// @desc    Get teacher's assigned class metadata & students list
// @route   GET /api/teacher/class-data
// @access  Private (Teacher)
router.get('/class-data', async (req, res) => {
  try {
    const teacher = await getTeacherProfile(req.user._id);
    const assignedClass = await getAssignedClass(teacher._id);

    if (!assignedClass) {
      return res.status(404).json({ 
        success: false, 
        message: 'No class has been assigned to you by the Administrator.' 
      });
    }

    // Retrieve students in this class
    const students = await Student.find({ class: assignedClass._id })
      .populate('user', 'name username')
      .sort({ rollNumber: 1 });

    res.json({
      success: true,
      classInfo: assignedClass,
      students
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// ==========================================
// STUDENT CRUD (MANAGED EXCLUSIVELY BY CLASS TEACHER)
// ==========================================

// @desc    Enroll a student into the teacher's assigned class
// @route   POST /api/teacher/students
// @access  Private (Teacher)
router.post('/students', async (req, res) => {
  const { name, rollNumber, gender, dob, parentName, parentMobile, password, autoGenerateRoll } = req.body;

  if (!name || !gender || !dob || !parentName || !parentMobile || !password) {
    return res.status(400).json({ success: false, message: 'All student details are required.' });
  }

  try {
    const teacher = await getTeacherProfile(req.user._id);
    const assignedClass = await getAssignedClass(teacher._id);

    if (!assignedClass) {
      return res.status(403).json({ success: false, message: 'Not authorized: No class assigned to you' });
    }

    // Auto-generate roll number if checkbox is checked
    let finalRollNumber = rollNumber;
    if (autoGenerateRoll || !rollNumber) {
      const randNum = Math.floor(1000 + Math.random() * 9000);
      finalRollNumber = `S${assignedClass.className}${assignedClass.section}-${randNum}`;
    }

    // Check if roll number username is already taken
    const userExists = await User.findOne({ username: finalRollNumber });
    if (userExists) {
      return res.status(400).json({ success: false, message: `Roll Number '${finalRollNumber}' is already registered.` });
    }

    // 1. Create base auth user
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      username: finalRollNumber,
      passwordHash,
      role: 'student',
      name,
      mustChangePassword: true
    });

    // 2. Create student profile
    const newStudent = await Student.create({
      user: newUser._id,
      rollNumber: finalRollNumber,
      gender,
      dob: new Date(dob),
      parentName,
      parentMobile,
      class: assignedClass._id
    });

    // 3. Update class strengths
    await updateClassStrength(assignedClass._id);

    // 4. Log Action
    await logTeacherAction(
      teacher.user, 
      assignedClass, 
      'Student Added', 
      `added Student ${name} (Roll: ${finalRollNumber})`
    );

    res.status(201).json({ success: true, student: newStudent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error enrolling student' });
  }
});

// @desc    Update student profile details
// @route   PUT /api/teacher/students/:id
// @access  Private (Teacher)
router.put('/students/:id', async (req, res) => {
  const { name, gender, dob, parentName, parentMobile } = req.body;

  try {
    const teacher = await getTeacherProfile(req.user._id);
    const assignedClass = await getAssignedClass(teacher._id);

    if (!assignedClass) {
      return res.status(403).json({ success: false, message: 'Not authorized: No class assigned' });
    }

    const student = await Student.findById(req.params.id);
    if (!student || student.class.toString() !== assignedClass._id.toString()) {
      return res.status(404).json({ success: false, message: 'Student not found in your class' });
    }

    const oldGender = student.gender;
    student.gender = gender;
    student.dob = new Date(dob);
    student.parentName = parentName;
    student.parentMobile = parentMobile;
    await student.save();

    // Update login credentials name
    const user = await User.findById(student.user);
    if (user) {
      user.name = name;
      await user.save();
    }

    // Update strengths if gender changes
    if (oldGender !== gender) {
      await updateClassStrength(assignedClass._id);
    }

    await logTeacherAction(
      teacher.user, 
      assignedClass, 
      'Student Updated', 
      `updated details for Student ${name} (Roll: ${student.rollNumber})`
    );

    res.json({ success: true, student });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error updating student details' });
  }
});

// @desc    Remove/Delete student from class
// @route   DELETE /api/teacher/students/:id
// @access  Private (Teacher)
router.delete('/students/:id', async (req, res) => {
  try {
    const teacher = await getTeacherProfile(req.user._id);
    const assignedClass = await getAssignedClass(teacher._id);

    if (!assignedClass) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const student = await Student.findById(req.params.id).populate('user', 'name');
    if (!student || student.class.toString() !== assignedClass._id.toString()) {
      return res.status(404).json({ success: false, message: 'Student not found in your class' });
    }

    const studentName = student.user ? student.user.name : 'Unknown';
    const rollNumber = student.rollNumber;

    // Delete base User (cascades profile deletion)
    await User.findByIdAndDelete(student.user._id);
    await Student.findByIdAndDelete(req.params.id);

    // Recalculate strengths
    await updateClassStrength(assignedClass._id);

    await logTeacherAction(
      teacher.user, 
      assignedClass, 
      'Student Removed', 
      `removed Student ${studentName} (Roll: ${rollNumber})`
    );

    res.json({ success: true, message: 'Student removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error deleting student profile' });
  }
});

// @desc    Reset student password by class teacher
// @route   POST /api/teacher/students/:id/reset-password
// @access  Private (Teacher)
router.post('/students/:id/reset-password', async (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
  }

  try {
    const teacher = await getTeacherProfile(req.user._id);
    const assignedClass = await getAssignedClass(teacher._id);

    if (!assignedClass) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const student = await Student.findById(req.params.id).populate('user');
    if (!student || student.class.toString() !== assignedClass._id.toString()) {
      return res.status(404).json({ success: false, message: 'Student not found in your class' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    student.user.passwordHash = passwordHash;
    student.user.mustChangePassword = true; // Student must reset it upon next login
    await student.user.save();

    await logTeacherAction(
      teacher.user, 
      assignedClass, 
      'Password Reset', 
      `reset password for Student ${student.user.name} (Roll: ${student.rollNumber})`
    );

    res.json({ success: true, message: 'Student password reset successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error resetting student password' });
  }
});

// ==========================================
// ATTENDANCE MANAGEMENT
// ==========================================

// @desc    Mark attendance for students of assigned class
// @route   POST /api/teacher/attendance
// @access  Private (Teacher)
router.post('/attendance', async (req, res) => {
  const { date, records } = req.body;

  if (!date || !records || !Array.isArray(records)) {
    return res.status(400).json({ success: false, message: 'Invalid attendance parameters' });
  }

  try {
    const teacher = await getTeacherProfile(req.user._id);
    const assignedClass = await getAssignedClass(teacher._id);

    if (!assignedClass) {
      return res.status(403).json({ success: false, message: 'Not authorized: No class assigned to you' });
    }

    const notificationSetting = await Setting.findOne({ key: 'attendance_notifications' });
    const notificationsOn = notificationSetting ? notificationSetting.value === 'ON' : true;

    // Save records
    const attendancePromises = records.map(async (record) => {
      const student = await Student.findById(record.studentId);
      if (!student || student.class.toString() !== assignedClass._id.toString()) {
        return; 
      }

      await Attendance.findOneAndUpdate(
        { student: student._id, date },
        { 
          class: assignedClass._id,
          status: record.status, 
          markedBy: teacher._id 
        },
        { upsert: true, new: true }
      );

      if (record.status === 'Absent' && notificationsOn) {
        await Notification.create({
          user: student.user,
          title: 'Attendance Alert',
          message: 'You were marked absent today. If there is any discrepancy, please contact your class teacher or school administration.'
        });
      }
    });

    await Promise.all(attendancePromises);

    // Format log: e.g. "Ravi Kumar submitted attendance for Class 6-A"
    await logTeacherAction(
      teacher.user, 
      assignedClass, 
      'Attendance Submitted', 
      'submitted attendance'
    );

    res.json({ success: true, message: 'Attendance submitted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error submitting attendance' });
  }
});

// @desc    Get attendance history for assigned class
// @route   GET /api/teacher/attendance/:date
// @access  Private (Teacher)
router.get('/attendance/:date', async (req, res) => {
  const { date } = req.params;

  try {
    const teacher = await getTeacherProfile(req.user._id);
    const assignedClass = await getAssignedClass(teacher._id);

    if (!assignedClass) {
      return res.status(403).json({ success: false, message: 'No class assigned' });
    }

    const attendanceRecords = await Attendance.find({
      class: assignedClass._id,
      date
    });

    res.json({ success: true, records: attendanceRecords });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error retrieving attendance' });
  }
});

// ==========================================
// DAILY WORK MANAGEMENT
// ==========================================

// @desc    Assign Daily Work for assigned class
// @route   POST /api/teacher/daily-work
// @access  Private (Teacher)
router.post('/daily-work', async (req, res) => {
  const { date, entries } = req.body;

  if (!date || !entries || !Array.isArray(entries)) {
    return res.status(400).json({ success: false, message: 'Date and subject-wise entries are required' });
  }

  try {
    const teacher = await getTeacherProfile(req.user._id);
    const assignedClass = await getAssignedClass(teacher._id);

    if (!assignedClass) {
      return res.status(403).json({ success: false, message: 'Not authorized: No class assigned to you' });
    }

    const classSubjects = assignedClass.subjects;
    for (const sub of classSubjects) {
      const entry = entries.find(e => e.subject === sub);
      if (!entry || !entry.workDetails.trim()) {
        return res.status(400).json({ 
          success: false, 
          message: `Subject '${sub}' must contain either work details or 'None'. Empty values are not allowed.` 
        });
      }
    }

    // Save Daily Work
    await DailyWork.findOneAndUpdate(
      { class: assignedClass._id, date },
      { 
        teacher: teacher._id,
        entries: entries.map(e => ({ subject: e.subject, workDetails: e.workDetails.trim() }))
      },
      { upsert: true, new: true }
    );

    // Notify students
    const students = await Student.find({ class: assignedClass._id });
    const notifyPromises = students.map(async (stud) => {
      await Notification.create({
        user: stud.user,
        title: 'New Daily Work Posted',
        message: "Your class teacher has posted today's class work. Please review the work details."
      });
    });

    await Promise.all(notifyPromises);

    // Format log: e.g. "Suresh Kumar posted Daily Work for Class 7-B"
    await logTeacherAction(
      teacher.user, 
      assignedClass, 
      'Daily Work Posted', 
      'posted Daily Work'
    );

    res.json({ success: true, message: 'Daily work posted and students notified successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error posting daily work' });
  }
});

// @desc    Get Daily Work history for class on specific date
// @route   GET /api/teacher/daily-work/:date
// @access  Private (Teacher)
router.get('/daily-work/:date', async (req, res) => {
  const { date } = req.params;

  try {
    const teacher = await getTeacherProfile(req.user._id);
    const assignedClass = await getAssignedClass(teacher._id);

    if (!assignedClass) {
      return res.status(403).json({ success: false, message: 'No class assigned' });
    }

    const work = await DailyWork.findOne({
      class: assignedClass._id,
      date
    });

    res.json({ success: true, work: work || null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error retrieving daily work' });
  }
});

// @desc    Update subjects for teacher's assigned class
// @route   PUT /api/teacher/class-subjects
// @access  Private (Teacher)
router.put('/class-subjects', async (req, res) => {
  const { subjects } = req.body;

  if (!subjects || !Array.isArray(subjects)) {
    return res.status(400).json({ success: false, message: 'Subjects array is required' });
  }

  try {
    const teacher = await getTeacherProfile(req.user._id);
    const assignedClass = await Class.findOne({ classTeacher: teacher._id });

    if (!assignedClass) {
      return res.status(404).json({ success: false, message: 'No class has been assigned to you.' });
    }

    assignedClass.subjects = subjects;
    await assignedClass.save();

    await logTeacherAction(
      teacher.user,
      assignedClass,
      'Class Subjects Updated',
      `updated class subjects to: ${subjects.join(', ')}`
    );

    res.json({ success: true, classInfo: assignedClass });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error updating class subjects' });
  }
});

// @desc    Get exam entry progress for teacher's class
// @route   GET /api/teacher/class-exams-progress
// @access  Private (Teacher)
router.get('/class-exams-progress', async (req, res) => {
  try {
    const teacher = await getTeacherProfile(req.user._id);
    const assignedClass = await getAssignedClass(teacher._id);

    if (!assignedClass) {
      return res.status(404).json({ success: false, message: 'No class assigned.' });
    }

    const students = await Student.find({ class: assignedClass._id });
    const studentCount = students.length;

    // Fetch active exams configured by Admin
    const activeExams = await Exam.find({ status: 'Active' }).sort({ startDate: -1 });
    
    const progressList = await Promise.all(activeExams.map(async (exam) => {
      const results = await ExamResult.find({ 
        class: assignedClass._id, 
        exam: exam._id 
      });
      
      const enteredCount = results.length;
      const pendingCount = studentCount - enteredCount;
      const isPublished = results.some(r => r.status === 'Published');
      const status = isPublished ? 'Published' : 'Draft';

      return {
        examId: exam._id,
        examName: exam.name,
        totalStudents: studentCount,
        marksEntered: enteredCount,
        pending: pendingCount >= 0 ? pendingCount : 0,
        status
      };
    }));

    res.json({ success: true, progress: progressList });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error fetching exam progress.' });
  }
});

// @desc    Get exam details (including subjects & max marks)
// @route   GET /api/teacher/exams/:examId
// @access  Private (Teacher)
router.get('/exams/:examId', async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found.' });
    }
    res.json({ success: true, exam });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error retrieving exam details.' });
  }
});

// @desc    Get student marks for a specific exam
// @route   GET /api/teacher/marks
// @access  Private (Teacher)
router.get('/marks', async (req, res) => {
  const { studentId, examId } = req.query;

  if (!studentId || !examId) {
    return res.status(400).json({ success: false, message: 'studentId and examId are required.' });
  }

  try {
    const teacher = await getTeacherProfile(req.user._id);
    const assignedClass = await getAssignedClass(teacher._id);

    if (!assignedClass) {
      return res.status(403).json({ success: false, message: 'No class assigned.' });
    }

    const result = await ExamResult.findOne({ 
      student: studentId, 
      exam: examId 
    });

    res.json({ success: true, result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error retrieving marks.' });
  }
});

// @desc    Save/update student marks for an exam
// @route   POST /api/teacher/marks
// @access  Private (Teacher)
router.post('/marks', async (req, res) => {
  const { studentId, examId, date, marks, remarks } = req.body;

  if (!studentId || !examId || !marks || !Array.isArray(marks)) {
    return res.status(400).json({ success: false, message: 'studentId, examId, and marks array are required.' });
  }

  try {
    const teacher = await getTeacherProfile(req.user._id);
    const assignedClass = await getAssignedClass(teacher._id);

    if (!assignedClass) {
      return res.status(403).json({ success: false, message: 'No class assigned.' });
    }

    const student = await Student.findById(studentId).populate('user', 'name');
    if (!student || student.class.toString() !== assignedClass._id.toString()) {
      return res.status(404).json({ success: false, message: 'Student not found in your class.' });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam configuration not found.' });
    }

    const examDate = date ? new Date(date) : new Date();
    let result = await ExamResult.findOne({ student: studentId, exam: examId });
    
    const marksData = marks.map(m => ({
      subject: m.subject,
      marksObtained: Number(m.marksObtained),
      maxMarks: Number(m.maxMarks) || 100
    }));

    if (result) {
      result.date = examDate;
      result.marks = marksData;
      result.remarks = remarks || '';
      await result.save();
    } else {
      result = await ExamResult.create({
        student: studentId,
        class: assignedClass._id,
        exam: examId,
        examName: exam.name,
        date: examDate,
        marks: marksData,
        remarks: remarks || '',
        status: 'Draft'
      });
    }

    await logTeacherAction(
      teacher.user,
      assignedClass,
      'Marks Entered',
      `entered marks for Student ${student.user.name} for ${exam.name}`
    );

    res.json({ success: true, result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error saving marks.' });
  }
});

// @desc    Publish results for class exam
// @route   POST /api/teacher/class-exams/:examId/publish
// @access  Private (Teacher)
router.post('/class-exams/:examId/publish', async (req, res) => {
  const { examId } = req.params;

  try {
    const teacher = await getTeacherProfile(req.user._id);
    const assignedClass = await getAssignedClass(teacher._id);

    if (!assignedClass) {
      return res.status(403).json({ success: false, message: 'No class assigned.' });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam configuration not found.' });
    }

    // Verify all class students have entered marks before publishing
    const students = await Student.find({ class: assignedClass._id });
    const studentCount = students.length;
    
    const enteredResultsCount = await ExamResult.countDocuments({
      class: assignedClass._id,
      exam: examId
    });

    if (enteredResultsCount < studentCount) {
      return res.status(400).json({
        success: false,
        message: `Cannot publish results yet. Marks must be entered for all class students (${enteredResultsCount} / ${studentCount} completed).`
      });
    }

    const updateResult = await ExamResult.updateMany(
      { class: assignedClass._id, exam: examId },
      { status: 'Published', publishedAt: new Date() }
    );
    
    const notifyPromises = students.map(async (stud) => {
      const resultExists = await ExamResult.findOne({ student: stud._id, exam: examId });
      if (resultExists) {
        await Notification.create({
          user: stud.user,
          title: 'Result Published',
          message: `Your ${exam.name} results have been published. Please login to view your marks.`
        });
      }
    });

    await Promise.all(notifyPromises);

    await logTeacherAction(
      teacher.user,
      assignedClass,
      'Results Published',
      `published results for ${exam.name}`
    );

    res.json({ 
      success: true, 
      message: `Successfully published ${exam.name} results.`,
      modifiedCount: updateResult.modifiedCount 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error publishing results.' });
  }
});

// @desc    Get student profile extra tabs (Attendance, Daily Work, Notes, Marks)
// @route   GET /api/teacher/students/:id/profile-extra
// @access  Private (Teacher)
router.get('/students/:id/profile-extra', async (req, res) => {
  try {
    const teacher = await getTeacherProfile(req.user._id);
    const assignedClass = await getAssignedClass(teacher._id);

    if (!assignedClass) {
      return res.status(403).json({ success: false, message: 'No class assigned.' });
    }

    const student = await Student.findById(req.params.id);
    if (!student || student.class.toString() !== assignedClass._id.toString()) {
      return res.status(404).json({ success: false, message: 'Student not found in your class.' });
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

    const marks = await ExamResult.find({ student: student._id })
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

// @desc    Add a note for a student
// @route   POST /api/teacher/students/:id/notes
// @access  Private (Teacher)
router.post('/students/:id/notes', async (req, res) => {
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, message: 'Note content is required.' });
  }

  try {
    const teacher = await getTeacherProfile(req.user._id);
    const assignedClass = await getAssignedClass(teacher._id);

    if (!assignedClass) {
      return res.status(403).json({ success: false, message: 'No class assigned.' });
    }

    const student = await Student.findById(req.params.id);
    if (!student || student.class.toString() !== assignedClass._id.toString()) {
      return res.status(404).json({ success: false, message: 'Student not found in your class.' });
    }

    const note = await StudentNote.create({
      student: student._id,
      teacherName: teacher.user.name,
      content: content.trim(),
      date: new Date()
    });

    // Also trigger a real-time Notification for the student!
    await Notification.create({
      user: student.user,
      title: 'Important Note from Teacher',
      message: `Your class teacher ${teacher.user.name} has posted an important note: "${content.trim()}"`
    });

    await logTeacherAction(
      teacher.user,
      assignedClass,
      'Note Added',
      `added a note under Student ${student.rollNumber}`
    );

    res.status(201).json({ success: true, note });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error adding student note.' });
  }
});

// @desc    Get all student marks in teacher's class for a specific exam
// @route   GET /api/teacher/class-exams/:examId/results
// @access  Private (Teacher)
router.get('/class-exams/:examId/results', async (req, res) => {
  try {
    const teacher = await getTeacherProfile(req.user._id);
    const assignedClass = await getAssignedClass(teacher._id);

    if (!assignedClass) {
      return res.status(403).json({ success: false, message: 'No class assigned.' });
    }

    const results = await ExamResult.find({ 
      class: assignedClass._id, 
      exam: req.params.examId 
    });

    res.json({ success: true, results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error fetching class exam results.' });
  }
});

module.exports = router;
