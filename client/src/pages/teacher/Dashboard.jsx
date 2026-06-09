import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import Card from '../../components/Card';
import Modal from '../../components/Modal';
import { 
  Users, 
  UserCheck, 
  UserX, 
  ClipboardList, 
  FileText, 
  BookOpen, 
  BarChart3, 
  Plus, 
  Edit2, 
  Trash2, 
  Key, 
  Save, 
  Send,
  Calendar,
  Phone,
  Eye
} from 'lucide-react';

const calculateGrade = (percentage) => {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
};

const TeacherDashboard = () => {
  const { apiRequest, user } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();
  const confirm = useConfirm();
  
  // Data States
  const [classInfo, setClassInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Navigation Tab
  const [activeTab, setActiveTab] = useState('students'); // 'students' | 'attendance' | 'dailywork' | 'subjects' | 'reports'

  // Modal Toggle States
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Form States
  const [studentForm, setStudentForm] = useState({
    name: '',
    rollNumber: '',
    gender: 'Male',
    dob: '',
    parentName: '',
    parentMobile: '',
    password: '',
    autoGenerateRoll: false
  });
  const [tempPassword, setTempPassword] = useState('');
  const [formError, setFormError] = useState('');

  // Attendance Form States
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [attendanceSuccess, setAttendanceSuccess] = useState('');
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Daily Work Form States
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [workEntries, setWorkEntries] = useState({});
  const [workSuccess, setWorkSuccess] = useState('');
  const [workLoading, setWorkLoading] = useState(false);
  const [newSubject, setNewSubject] = useState('');

  // Exam Marks Form States
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedExamObj, setSelectedExamObj] = useState(null);
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [enteredMarks, setEnteredMarks] = useState({});
  const [examRemarks, setExamRemarks] = useState('');
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [sessionResults, setSessionResults] = useState([]);
  const [activeExamsList, setActiveExamsList] = useState([]);

  // Exam Progress State
  const [examProgress, setExamProgress] = useState([]);
  const [examProgressLoading, setExamProgressLoading] = useState(false);

  // Send Note Form States
  const [isSendNoteModalOpen, setIsSendNoteModalOpen] = useState(false);
  const [sendNoteForm, setSendNoteForm] = useState({ studentId: '', content: '' });
  const [sendNoteLoading, setSendNoteLoading] = useState(false);

  // Student Profile Extra Tabs States
  const [profileExtra, setProfileExtra] = useState(null);
  const [profileExtraLoading, setProfileExtraLoading] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState('info');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const fetchClassCockpitData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiRequest('/teacher/class-data');
      if (response.success) {
        setClassInfo(response.classInfo);
        setStudents(response.students);
        
        // Initialize attendance map for default date
        await fetchAttendanceForDate(attendanceDate, response.students);
        
        // Initialize daily work entries for default date
        await fetchDailyWorkForDate(workDate, response.classInfo.subjects);
      }
    } catch (err) {
      if (err.message && err.message.includes('No class')) {
        setClassInfo(null);
      } else {
        setError('Error loading class data.');
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceForDate = async (targetDate, studentList) => {
    try {
      const response = await apiRequest(`/teacher/attendance/${targetDate}`);
      if (response.success && response.records.length > 0) {
        const map = {};
        response.records.forEach((rec) => {
          map[rec.student] = rec.status;
        });
        studentList.forEach((s) => {
          if (!map[s._id]) map[s._id] = 'Present';
        });
        setAttendanceMap(map);
      } else {
        const defaultMap = {};
        studentList.forEach((s) => {
          defaultMap[s._id] = 'Present';
        });
        setAttendanceMap(defaultMap);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDailyWorkForDate = async (targetDate, subjects) => {
    try {
      const response = await apiRequest(`/teacher/daily-work/${targetDate}`);
      if (response.success && response.work) {
        const map = {};
        response.work.entries.forEach((ent) => {
          map[ent.subject] = ent.workDetails;
        });
        subjects.forEach((sub) => {
          if (!map[sub]) map[sub] = 'None';
        });
        setWorkEntries(map);
      } else {
        const defaultMap = {};
        subjects.forEach((sub) => {
          defaultMap[sub] = 'None';
        });
        setWorkEntries(defaultMap);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchClassCockpitData();
    fetchActiveExamsList();
  }, []);

  // Fetch when attendance date changes
  const handleAttendanceDateChange = async (newDate) => {
    setAttendanceDate(newDate);
    if (students.length > 0) {
      await fetchAttendanceForDate(newDate, students);
    }
  };

  // Fetch when work date changes
  const handleWorkDateChange = async (newDate) => {
    setWorkDate(newDate);
    if (classInfo) {
      await fetchDailyWorkForDate(newDate, classInfo.subjects);
    }
  };

  const fetchActiveExamsList = async () => {
    try {
      const response = await apiRequest('/teacher/class-exams-progress');
      if (response.success) {
        setActiveExamsList(response.progress);
      }
    } catch (err) {
      console.error('Error fetching active exams list:', err);
    }
  };

  const fetchExamProgress = async () => {
    try {
      setExamProgressLoading(true);
      const response = await apiRequest('/teacher/class-exams-progress');
      if (response.success) {
        setExamProgress(response.progress);
      }
    } catch (err) {
      console.error('Error fetching exam progress:', err);
    } finally {
      setExamProgressLoading(false);
    }
  };

  const resetMarksForm = () => {
    const defaultMarks = {};
    if (selectedExamObj && selectedExamObj.subjects) {
      selectedExamObj.subjects.forEach(sub => {
        defaultMarks[sub.subjectName] = { marksObtained: '', maxMarks: sub.maxMarks };
      });
    } else if (classInfo && classInfo.subjects) {
      classInfo.subjects.forEach(sub => {
        defaultMarks[sub] = { marksObtained: '', maxMarks: 100 };
      });
    }
    setEnteredMarks(defaultMarks);
    setExamRemarks('');
  };

  const fetchExistingMarks = async (studentId, examId) => {
    if (!studentId || !examId) return;
    try {
      const draftKey = `draft_${examId}_${studentId}`;
      const localDraft = localStorage.getItem(draftKey);
      
      if (localDraft) {
        const parsed = JSON.parse(localDraft);
        setEnteredMarks(parsed.marks);
        setExamRemarks(parsed.remarks || '');
        console.log('Restored unsaved draft from browser storage.');
        return;
      }

      const response = await apiRequest(`/teacher/marks?studentId=${studentId}&examId=${examId}`);
      if (response.success && response.result) {
        const marksMap = {};
        response.result.marks.forEach(m => {
          marksMap[m.subject] = {
            marksObtained: m.marksObtained,
            maxMarks: m.maxMarks
          };
        });
        
        if (selectedExamObj && selectedExamObj.subjects) {
          selectedExamObj.subjects.forEach(sub => {
            if (!marksMap[sub.subjectName]) {
              marksMap[sub.subjectName] = { marksObtained: '', maxMarks: sub.maxMarks };
            }
          });
        }
        
        setEnteredMarks(marksMap);
        setExamRemarks(response.result.remarks || '');
      } else {
        resetMarksForm();
      }
    } catch (err) {
      console.error('Error fetching existing marks:', err);
    }
  };

  const fetchSessionResults = async (examId) => {
    if (!examId) return;
    try {
      const response = await apiRequest(`/teacher/class-exams/${examId}/results`);
      if (response.success) {
        setSessionResults(response.results);
      }
    } catch (err) {
      console.error('Error fetching session results:', err);
    }
  };

  const handleSaveMarks = async (e) => {
    if (e) e.preventDefault();
    if (!selectedStudentId || !selectedExamId) {
      showWarning('Please select a student and an exam.');
      return;
    }

    const marksArray = [];
    const subjectsToValidate = selectedExamObj ? selectedExamObj.subjects.map(s => s.subjectName) : classInfo.subjects;

    for (const sub of subjectsToValidate) {
      const data = enteredMarks[sub];
      if (!data || data.marksObtained === '') {
        showWarning(`Please enter marks for ${sub}.`);
        return;
      }
      marksArray.push({
        subject: sub,
        marksObtained: Number(data.marksObtained),
        maxMarks: Number(data.maxMarks) || 100
      });
    }

    try {
      const response = await apiRequest('/teacher/marks', {
        method: 'POST',
        body: JSON.stringify({
          studentId: selectedStudentId,
          examId: selectedExamId,
          date: examDate,
          marks: marksArray,
          remarks: examRemarks
        })
      });
      if (response.success) {
        const draftKey = `draft_${selectedExamId}_${selectedStudentId}`;
        localStorage.removeItem(draftKey);

        showSuccess('Marks saved successfully as Draft.');
        
        await fetchSessionResults(selectedExamId);
        await fetchExamProgress();
        
        setSelectedStudentId('');
        setStudentSearch('');
      }
    } catch (err) {
      showError(err.message || 'Error saving marks.');
    }
  };
  
  const handleStartSession = async (e) => {
    if (e) e.preventDefault();
    if (!selectedExamId) {
      showWarning('Please select an exam first.');
      return;
    }
    setIsSessionStarted(true);
    await fetchSessionResults(selectedExamId);
  };

  const handleExitSession = async () => {
    const confirmed = await confirm({
      title: 'Exit Marks Entry',
      message: 'Are you sure you want to exit the current marks entry session? Any unsaved changes on the active student will be preserved as draft in your browser local storage.',
      danger: false
    });
    if (confirmed) {
      setIsSessionStarted(false);
      setSelectedStudentId('');
      setStudentSearch('');
      resetMarksForm();
    }
  };

  const handleSendNoteSubmit = async (e) => {
    e.preventDefault();
    if (!sendNoteForm.studentId || !sendNoteForm.content.trim()) {
      showWarning('Please select a student and type a note.');
      return;
    }
    
    try {
      setSendNoteLoading(true);
      const response = await apiRequest(`/teacher/students/${sendNoteForm.studentId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ content: sendNoteForm.content.trim() })
      });
      if (response.success) {
        showSuccess('Note sent successfully');
        setIsSendNoteModalOpen(false);
        setSendNoteForm({ studentId: '', content: '' });
      }
    } catch (err) {
      showError(err.message || 'Error sending note.');
    } finally {
      setSendNoteLoading(false);
    }
  };

  const handlePublishResults = async (examId, examName) => {
    const confirmed = await confirm({
      title: 'Publish Results',
      message: `Are you sure you want to publish results for ${examName}? Students will immediately be able to view their marks.`,
      danger: true
    });
    if (!confirmed) {
      return;
    }
    try {
      const response = await apiRequest(`/teacher/class-exams/${examId}/publish`, {
        method: 'POST'
      });
      if (response.success) {
        showSuccess(`Results published successfully for ${examName}`);
        await fetchExamProgress();
        if (isSessionStarted && selectedExamId === examId) {
          await fetchSessionResults(examId);
        }
      }
    } catch (err) {
      showError(err.message || 'Error publishing results.');
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;
    try {
      setSavingNote(true);
      const response = await apiRequest(`/teacher/students/${selectedStudent._id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ content: newNoteContent })
      });
      if (response.success) {
        showSuccess('Note saved successfully!');
        setNewNoteContent('');
        const updatedExtra = await apiRequest(`/teacher/students/${selectedStudent._id}/profile-extra`);
        if (updatedExtra.success) {
          setProfileExtra(updatedExtra);
        }
      }
    } catch (err) {
      showError(err.message || 'Error saving note.');
    } finally {
      setSavingNote(false);
    }
  };

  const handleMarksInputChange = (subject, field, value) => {
    const updated = {
      ...enteredMarks,
      [subject]: {
        ...enteredMarks[subject],
        [field]: value
      }
    };
    setEnteredMarks(updated);

    if (selectedStudentId && selectedExamId) {
      const draftKey = `draft_${selectedExamId}_${selectedStudentId}`;
      localStorage.setItem(draftKey, JSON.stringify({
        marks: updated,
        remarks: examRemarks
      }));
    }
  };

  const handleRemarksChange = (value) => {
    setExamRemarks(value);
    if (selectedStudentId && selectedExamId) {
      const draftKey = `draft_${selectedExamId}_${selectedStudentId}`;
      localStorage.setItem(draftKey, JSON.stringify({
        marks: enteredMarks,
        remarks: value
      }));
    }
  };

  useEffect(() => {
    if (activeTab === 'exam-progress') {
      fetchExamProgress();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedStudentId && selectedExamId) {
      fetchExistingMarks(selectedStudentId, selectedExamId);
    } else {
      resetMarksForm();
    }
  }, [selectedStudentId, selectedExamId, selectedExamObj]);

  useEffect(() => {
    if (selectedExamId) {
      apiRequest(`/teacher/exams/${selectedExamId}`).then(res => {
        if (res.success) {
          setSelectedExamObj(res.exam);
        }
      }).catch(err => {
        console.error('Error fetching exam details:', err);
      });
    } else {
      setSelectedExamObj(null);
    }
  }, [selectedExamId]);

  // ==========================================
  // STUDENT HANDLERS
  // ==========================================
  const handleCreateOpen = () => {
    setSelectedStudent(null);
    setStudentForm({
      name: '',
      rollNumber: '',
      gender: 'Male',
      dob: '',
      parentName: '',
      parentMobile: '',
      password: '',
      autoGenerateRoll: false
    });
    setFormError('');
    setIsStudentModalOpen(true);
  };

  const handleEditOpen = (stud) => {
    setSelectedStudent(stud);
    setStudentForm({
      name: stud.user ? stud.user.name : '',
      rollNumber: stud.rollNumber,
      gender: stud.gender,
      dob: stud.dob ? new Date(stud.dob).toISOString().split('T')[0] : '',
      parentName: stud.parentName,
      parentMobile: stud.parentMobile,
      password: 'dummy-password', // Dummy
      autoGenerateRoll: false
    });
    setFormError('');
    setIsStudentModalOpen(true);
  };

  const handlePasswordOpen = (stud) => {
    setSelectedStudent(stud);
    setTempPassword('');
    setFormError('');
    setIsPasswordModalOpen(true);
  };

  const handleProfileOpen = async (stud) => {
    setSelectedStudent(stud);
    setActiveProfileTab('info');
    setProfileExtra(null);
    setIsProfileModalOpen(true);
    try {
      setProfileExtraLoading(true);
      const response = await apiRequest(`/teacher/students/${stud._id}/profile-extra`);
      if (response.success) {
        setProfileExtra(response);
      }
    } catch (err) {
      console.error('Error fetching student profile extra:', err);
    } finally {
      setProfileExtraLoading(false);
    }
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const { name, rollNumber, gender, dob, parentName, parentMobile, password, autoGenerateRoll } = studentForm;

    if (!name || !gender || !dob || !parentName || !parentMobile || (!selectedStudent && !password)) {
      setFormError('Please fill in all student details.');
      return;
    }

    if (!selectedStudent && !autoGenerateRoll && !rollNumber.trim()) {
      setFormError('Please enter a Roll Number or check "Auto-Generate".');
      return;
    }

    try {
      let response;
      if (selectedStudent) {
        response = await apiRequest(`/teacher/students/${selectedStudent._id}`, {
          method: 'PUT',
          body: JSON.stringify({ name, gender, dob, parentName, parentMobile })
        });
      } else {
        response = await apiRequest('/teacher/students', {
          method: 'POST',
          body: JSON.stringify(studentForm)
        });
      }

      if (response.success) {
        setIsStudentModalOpen(false);
        showSuccess(selectedStudent ? 'Student profile updated successfully' : 'Student enrolled successfully');
        // Reload cockpit data (students and class strength statistics)
        fetchClassCockpitData();
      }
    } catch (err) {
      setFormError(err.message || 'Error processing student details.');
      showError(err.message || 'Failed to save student profile.');
    }
  };

  const handleStudentDelete = async (id, name) => {
    const confirmed = await confirm({
      title: 'Remove Student',
      message: `Are you sure you want to remove student ${name} from your class? This will delete their credentials.`,
      danger: true
    });
    if (!confirmed) {
      return;
    }
    try {
      const response = await apiRequest(`/teacher/students/${id}`, { method: 'DELETE' });
      if (response.success) {
        showSuccess('Student removed from class successfully');
        fetchClassCockpitData();
      }
    } catch (err) {
      showError(err.message || 'Error deleting student profile.');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!tempPassword || tempPassword.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    try {
      const response = await apiRequest(`/teacher/students/${selectedStudent._id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword: tempPassword })
      });
      if (response.success) {
        setIsPasswordModalOpen(false);
        showSuccess('Student password reset successfully! They will be forced to change it on next login.');
      }
    } catch (err) {
      setFormError(err.message || 'Error resetting password.');
      showError(err.message || 'Failed to reset password.');
    }
  };

  // ==========================================
  // ATTENDANCE HANDLER
  // ==========================================
  const toggleAttendanceStatus = (studentId) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === 'Present' ? 'Absent' : 'Present'
    }));
  };

  const handleAttendanceSubmit = async (e) => {
    e.preventDefault();
    setAttendanceLoading(true);
    setAttendanceSuccess('');
    setError('');

    const records = Object.keys(attendanceMap).map((studentId) => ({
      studentId,
      status: attendanceMap[studentId]
    }));

    try {
      const response = await apiRequest('/teacher/attendance', {
        method: 'POST',
        body: JSON.stringify({ date: attendanceDate, records })
      });
      if (response.success) {
        showSuccess('Attendance saved successfully');
        setAttendanceSuccess('Attendance submitted successfully and counts updated!');
        setTimeout(() => setAttendanceSuccess(''), 3000);
      }
    } catch (err) {
      setError('Error saving attendance records.');
      showError('Failed to save attendance records.');
    } finally {
      setAttendanceLoading(false);
    }
  };

  // ==========================================
  // DAILY WORK HANDLER
  // ==========================================
  const handleWorkDetailsChange = (subject, val) => {
    setWorkEntries(prev => ({ ...prev, [subject]: val }));
  };

  const handleWorkSubmit = async (e) => {
    e.preventDefault();
    setWorkLoading(true);
    setWorkSuccess('');
    setError('');

    const entries = Object.keys(workEntries).map((subject) => ({
      subject,
      workDetails: workEntries[subject]
    }));

    for (const ent of entries) {
      if (!ent.workDetails.trim()) {
        setError(`Please enter work details or 'None' for ${ent.subject}.`);
        setWorkLoading(false);
        return;
      }
    }

    try {
      const response = await apiRequest('/teacher/daily-work', {
        method: 'POST',
        body: JSON.stringify({ date: workDate, entries })
      });
      if (response.success) {
        showSuccess('Daily work posted successfully');
        setWorkSuccess('Daily work posted and students notified successfully!');
        setTimeout(() => setWorkSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message || 'Error posting daily work.');
      showError(err.message || 'Failed to post daily work.');
    } finally {
      setWorkLoading(false);
    }
  };

  // ==========================================
  // SUBJECT HANDLERS
  // ==========================================
  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubject.trim()) return;

    if (classInfo.subjects.some(s => s.toLowerCase() === newSubject.trim().toLowerCase())) {
      showWarning('Subject already exists.');
      return;
    }

    const updatedSubjects = [...classInfo.subjects, newSubject.trim()];

    try {
      const response = await apiRequest('/teacher/class-subjects', {
        method: 'PUT',
        body: JSON.stringify({ subjects: updatedSubjects })
      });
      if (response.success) {
        setNewSubject('');
        showSuccess('Subject added successfully');
        setClassInfo(response.classInfo);
        await fetchDailyWorkForDate(workDate, response.classInfo.subjects);
      }
    } catch (err) {
      showError(err.message || 'Error adding subject.');
    }
  };

  const handleRemoveSubject = async (subjectToRemove) => {
    const confirmed = await confirm({
      title: 'Remove Subject',
      message: `Are you sure you want to remove subject "${subjectToRemove}" from your class curriculum?`,
      danger: true
    });
    if (!confirmed) {
      return;
    }
    const updatedSubjects = classInfo.subjects.filter(s => s !== subjectToRemove);

    try {
      const response = await apiRequest('/teacher/class-subjects', {
        method: 'PUT',
        body: JSON.stringify({ subjects: updatedSubjects })
      });
      if (response.success) {
        showSuccess('Subject removed successfully');
        setClassInfo(response.classInfo);
        await fetchDailyWorkForDate(workDate, response.classInfo.subjects);
      }
    } catch (err) {
      showError(err.message || 'Error removing subject.');
    }
  };

  // Counts
  const maleCount = students.filter(s => s.gender === 'Male').length;
  const femaleCount = students.filter(s => s.gender === 'Female').length;

  if (loading && !classInfo) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading classroom data...</div>;
  }

  if (!classInfo) {
    return (
      <div style={{ maxWidth: '600px', margin: '2rem auto' }} className="card text-center">
        <Users size={48} style={{ margin: '0 auto 1.5rem auto', color: 'var(--warning)', opacity: 0.8 }} />
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Class Assigned</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
          Hello {user.name}, you have not been assigned as a Class Teacher to any class by the Administrator yet. 
          Please contact school administration to set up your class.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Welcome & Class Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Class Teacher Panel - {classInfo.className}-{classInfo.section}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Welcome back, teacher **{user.name}**. Manage your students, mark attendance, and post daily work assignments.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => {
              setSendNoteForm({ studentId: '', content: '' });
              setIsSendNoteModalOpen(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Send size={16} />
            <span>Send Note</span>
          </button>
          
          <button 
            className="btn btn-primary" 
            onClick={() => {
              setIsSessionStarted(false);
              setSelectedExamId('');
              setSelectedStudentId('');
              setStudentSearch('');
              resetMarksForm();
              fetchActiveExamsList();
              setActiveTab('marks-entry');
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <ClipboardList size={16} />
            <span>Enter Marks</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: 'var(--danger-light)', color: '#991b1b', padding: '1rem', borderRadius: 'var(--border-radius)', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Class Statistics Cards */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}
      >
        <Card title="Total Students" value={students.length} icon={Users} color="primary" />
        <Card title="Boys Registered" value={maleCount} icon={UserCheck} color="info" />
        <Card title="Girls Registered" value={femaleCount} icon={UserCheck} color="accent" />
      </div>

      {/* Tab Navigation selector */}
      <div 
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '1.5rem',
          gap: '1rem',
          flexWrap: 'wrap'
        }}
      >
        {[
          { id: 'students', label: 'Students Roster', icon: Users },
          { id: 'attendance', label: 'Attendance Roll', icon: ClipboardList },
          { id: 'dailywork', label: 'Daily Work', icon: FileText },
          { id: 'subjects', label: 'Subjects List', icon: BookOpen },
          { id: 'exam-progress', label: 'Exam Progress', icon: BarChart3 },
          { id: 'reports', label: 'Class Reports', icon: BarChart3 }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.75rem 0.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                border: 'none',
                borderBottom: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================
          TAB CONTENT
          ======================================================== */}

      {/* TAB: ENTER MARKS FORM SUB-VIEW */}
      {activeTab === 'marks-entry' && (
        <div style={{ maxWidth: isSessionStarted ? '1100px' : '600px', margin: '0 auto', transition: 'max-width 0.3s' }}>
          
          {/* STEP 1: SESSION NOT STARTED */}
          {!isSessionStarted ? (
            <div className="card" style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: 'var(--border-radius)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--primary)' }}>Start Marks Entry Session</h3>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => setActiveTab('exam-progress')}
                >
                  Back to Progress
                </button>
              </div>

              <form onSubmit={handleStartSession}>
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>1. Select Examination</label>
                  <select 
                    className="form-control"
                    value={selectedExamId}
                    onChange={e => setSelectedExamId(e.target.value)}
                    required
                  >
                    <option value="">-- Select Exam --</option>
                    {activeExamsList.map(exam => (
                      <option key={exam.examId} value={exam.examId}>
                        {exam.examName} ({exam.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>2. Marks Entry Date</label>
                  <input 
                    type="date" 
                    className="form-control"
                    value={examDate}
                    onChange={e => setExamDate(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setActiveTab('exam-progress')}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Start Entry Session
                  </button>
                </div>
              </form>
            </div>
          ) : (
            
            /* STEP 2: SESSION ACTIVE (TWO-COLUMN LAYOUT) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Session Control Header Card */}
              <div className="card" style={{ backgroundColor: '#ffffff', padding: '1rem 1.5rem', borderRadius: 'var(--border-radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderLeft: '4px solid var(--primary)' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Marks Entry Session</div>
                  <h3 style={{ fontSize: '1.2rem', margin: '0.25rem 0 0 0', fontWeight: 700 }}>
                    {selectedExamObj?.name || 'Loading Exam...'}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Class: <strong>{classInfo.className}-{classInfo.section}</strong> &bull; Date: <strong>{new Date(examDate).toLocaleDateString()}</strong>
                  </div>
                </div>
                <button 
                  type="button" 
                  className="btn btn-danger"
                  onClick={handleExitSession}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
                >
                  Exit Session
                </button>
              </div>

              {/* Two Column Layout Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', alignItems: 'start' }} className="grid-responsive-two-col">
                
                {/* Left Column: Marks Entry Form */}
                <div className="card" style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: 'var(--border-radius)' }}>
                  <h4 style={{ fontSize: '1rem', marginBottom: '1.25rem', fontWeight: 600, color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    1. Student Selection & Marks Entry
                  </h4>

                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>Filter/Search Student</label>
                    <input 
                      type="text" 
                      placeholder="Search roll number or name..." 
                      value={studentSearch} 
                      onChange={e => setStudentSearch(e.target.value)} 
                      className="form-control"
                      style={{ marginBottom: '0.5rem' }}
                    />
                    
                    <select 
                      className="form-control"
                      value={selectedStudentId}
                      onChange={e => setSelectedStudentId(e.target.value)}
                    >
                      <option value="">-- Choose Student --</option>
                      {students
                        .filter(s => 
                          s.rollNumber.toLowerCase().includes(studentSearch.toLowerCase()) || 
                          (s.user && s.user.name.toLowerCase().includes(studentSearch.toLowerCase()))
                        )
                        .map(s => {
                          const hasSaved = sessionResults.some(r => r.student === s._id);
                          return (
                            <option key={s._id} value={s._id}>
                              {s.rollNumber} - {s.user ? s.user.name : ''} {hasSaved ? '(✓ Entered)' : '(○ Pending)'}
                            </option>
                          );
                        })
                      }
                    </select>
                  </div>

                  {/* Subject Inputs Form */}
                  {selectedStudentId && selectedExamObj ? (
                    <form onSubmit={handleSaveMarks}>
                      <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                        <h5 style={{ fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 600 }}>
                          Enter Subject Marks for {students.find(s => s._id === selectedStudentId)?.user?.name}
                        </h5>

                        {selectedExamObj.subjects && selectedExamObj.subjects.length === 0 ? (
                          <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>
                            No subjects configured for this exam. Please configure subjects in Exam Management.
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                            {selectedExamObj.subjects?.map(sub => {
                              const marksData = enteredMarks[sub.subjectName] || { marksObtained: '', maxMarks: sub.maxMarks };
                              return (
                                <div 
                                  key={sub.subjectName} 
                                  style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: '2fr 1fr 1fr', 
                                    alignItems: 'center', 
                                    gap: '1rem',
                                    padding: '0.625rem 0.85rem',
                                    backgroundColor: '#f8fafc',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color)'
                                  }}
                                >
                                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{sub.subjectName}</span>
                                  <div>
                                    <input 
                                      type="number" 
                                      className="form-control"
                                      placeholder="Marks"
                                      value={marksData.marksObtained}
                                      min="0"
                                      max={sub.maxMarks}
                                      onChange={e => handleMarksInputChange(sub.subjectName, 'marksObtained', e.target.value)}
                                      required
                                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                                    />
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                    <span>/</span>
                                    <span>{sub.maxMarks}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                          <label className="form-label" style={{ fontWeight: 600 }}>Teacher remarks (Optional)</label>
                          <textarea 
                            className="form-control"
                            rows="2"
                            placeholder="Write brief remarks on performance..."
                            value={examRemarks}
                            onChange={e => handleRemarksChange(e.target.value)}
                            style={{ fontSize: '0.85rem' }}
                          />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-sm" 
                            onClick={() => {
                              setSelectedStudentId('');
                              setStudentSearch('');
                              resetMarksForm();
                            }}
                          >
                            Clear Selection
                          </button>
                          <button type="submit" className="btn btn-primary btn-sm">
                            Save Draft
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', border: '2px dashed var(--border-color)', borderRadius: 'var(--border-radius)', backgroundColor: '#fafafa' }}>
                      <ClipboardList size={36} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
                      <p style={{ fontSize: '0.875rem', margin: 0 }}>Select a student from the dropdown above or from the list on the right to start entering marks.</p>
                    </div>
                  )}
                </div>

                {/* Right Column: Progress Sidebar */}
                <div className="card" style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: 'var(--border-radius)' }}>
                  <h4 style={{ fontSize: '1rem', marginBottom: '1rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Class Progress</span>
                    <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '12px', fontWeight: 700 }}>
                      {sessionResults.length} / {students.length}
                    </span>
                  </h4>

                  {/* Progress Bar */}
                  <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '1.5rem' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${students.length > 0 ? Math.round((sessionResults.length / students.length) * 100) : 0}%`, 
                        backgroundColor: sessionResults.length === students.length ? 'var(--success)' : 'var(--primary)',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>

                  {/* Quick Student Action List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    
                    {/* Pending Section */}
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                        Pending ({students.length - sessionResults.length})
                      </div>
                      
                      <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {students
                          .filter(s => !sessionResults.some(r => r.student === s._id))
                          .map(s => (
                            <div 
                              key={s._id}
                              onClick={() => {
                                setSelectedStudentId(s._id);
                                setStudentSearch(s.user ? s.user.name : '');
                              }}
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.5rem', 
                                padding: '0.4rem 0.625rem', 
                                backgroundColor: selectedStudentId === s._id ? 'var(--primary-light)' : '#f8fafc', 
                                border: `1px solid ${selectedStudentId === s._id ? 'var(--primary)' : 'var(--border-color)'}`, 
                                borderRadius: '4px', 
                                fontSize: '0.75rem', 
                                cursor: 'pointer',
                                transition: 'var(--transition)'
                              }}
                              className="student-list-item"
                            >
                              <span style={{ color: 'var(--text-muted)' }}>○</span>
                              <strong style={{ minWidth: '50px' }}>{s.rollNumber}</strong>
                              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {s.user ? s.user.name : ''}
                              </span>
                            </div>
                          ))
                        }
                        {students.length === sessionResults.length && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontStyle: 'italic', padding: '0.5rem' }}>
                            All marks entered!
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Completed Section */}
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                        Completed ({sessionResults.length})
                      </div>
                      
                      <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {students
                          .filter(s => sessionResults.some(r => r.student === s._id))
                          .map(s => (
                            <div 
                              key={s._id}
                              onClick={() => {
                                setSelectedStudentId(s._id);
                                setStudentSearch(s.user ? s.user.name : '');
                              }}
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.5rem', 
                                padding: '0.4rem 0.625rem', 
                                backgroundColor: selectedStudentId === s._id ? 'var(--success-light)' : '#f8fafc', 
                                border: `1px solid ${selectedStudentId === s._id ? 'var(--success)' : 'var(--border-color)'}`, 
                                borderRadius: '4px', 
                                fontSize: '0.75rem', 
                                cursor: 'pointer',
                                transition: 'var(--transition)'
                              }}
                              className="student-list-item"
                            >
                              <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>✓</span>
                              <strong style={{ minWidth: '50px' }}>{s.rollNumber}</strong>
                              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {s.user ? s.user.name : ''}
                              </span>
                            </div>
                          ))
                        }
                        {sessionResults.length === 0 && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem' }}>
                            No student marks entered yet.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Publish Block */}
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '0.625rem', backgroundColor: sessionResults.length === students.length && selectedExamObj?.status !== 'Published' ? 'var(--success)' : 'var(--text-muted)', borderColor: sessionResults.length === students.length && selectedExamObj?.status !== 'Published' ? 'var(--success)' : 'var(--border-color)', color: '#ffffff' }}
                      disabled={sessionResults.length < students.length}
                      onClick={() => handlePublishResults(selectedExamId, selectedExamObj?.name)}
                    >
                      Publish Results
                    </button>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem', lineHeight: 1.3 }}>
                      {sessionResults.length < students.length 
                        ? `Publishing is locked. Please enter marks for all ${students.length} class students (Current: ${sessionResults.length}).`
                        : "All student marks entered as drafts! You can now publish results to make them visible to students."
                      }
                    </p>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {/* TAB: EXAM PROGRESS */}
      {activeTab === 'exam-progress' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Class Exam Entry Progress</h3>
            <button 
              className="btn btn-primary btn-sm" 
              onClick={() => {
                resetMarksForm();
                setActiveTab('marks-entry');
              }}
            >
              <Plus size={14} />
              <span>Enter Marks</span>
            </button>
          </div>

          {examProgressLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading progress...</div>
          ) : examProgress.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', backgroundColor: '#ffffff', color: 'var(--text-muted)', boxShadow: 'var(--box-shadow-sm)' }}>
              <ClipboardList size={40} style={{ margin: '0 auto 1rem auto', color: 'var(--warning)', opacity: 0.7 }} />
              <h4 style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: '0.5rem', fontWeight: 600 }}>No Active Examinations</h4>
              <p style={{ fontSize: '0.85rem', margin: '0 auto 1.5rem auto', lineHeight: 1.4, maxWidth: '450px' }}>
                There are no active examinations configured by the Administrator yet. 
                Please log in as an <strong>Administrator</strong> (using credentials: <code>admin</code> / <code>admin123</code>) to configure exams first.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {examProgress.map(p => {
                const completionPercentage = p.totalStudents > 0 ? Math.round((p.marksEntered / p.totalStudents) * 100) : 0;
                return (
                  <div key={p.examName} className="card" style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--primary)' }}>{p.examName}</h4>
                        <span 
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '12px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            backgroundColor: p.status === 'Published' ? 'var(--success-light)' : 'var(--warning-light)',
                            color: p.status === 'Published' ? '#065f46' : '#9a3412'
                          }}
                        >
                          {p.status}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                        Entered: <strong>{p.marksEntered}</strong> / {p.totalStudents} students
                      </div>
                      
                      {/* Progress Bar */}
                      <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '1.25rem' }}>
                        <div 
                          style={{ 
                            height: '100%', 
                            width: `${completionPercentage}%`, 
                            backgroundColor: p.status === 'Published' ? 'var(--success)' : 'var(--primary)',
                            borderRadius: '4px' 
                          }}
                        />
                      </div>
                    </div>
 
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, fontSize: '0.75rem', padding: '0.4rem' }}
                        onClick={async () => {
                          setSelectedExamId(p.examId);
                          setSelectedStudentId('');
                          setStudentSearch('');
                          setIsSessionStarted(true);
                          await fetchSessionResults(p.examId);
                          setActiveTab('marks-entry');
                        }}
                      >
                        Edit Marks
                      </button>
                      
                      {p.status === 'Draft' && (
                        <button 
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, fontSize: '0.75rem', padding: '0.4rem', backgroundColor: 'var(--success)', borderColor: 'var(--success)', color: '#ffffff' }}
                          onClick={() => handlePublishResults(p.examId, p.examName)}
                          disabled={p.marksEntered < p.totalStudents}
                        >
                          Publish Results
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 1: STUDENT MANAGEMENT */}
      {activeTab === 'students' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Roster Students ({students.length})</h3>
            <button className="btn btn-primary btn-sm" onClick={handleCreateOpen}>
              <Plus size={14} />
              <span>Enroll Student</span>
            </button>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Roll Number</th>
                  <th>Student Name</th>
                  <th>Gender</th>
                  <th>Date of Birth</th>
                  <th>Parent/Guardian</th>
                  <th>Parent Mobile</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No students enrolled in this class yet. Click "Enroll Student" to register.
                    </td>
                  </tr>
                ) : (
                  students.map((s) => (
                    <tr key={s._id}>
                      <td style={{ fontWeight: 600 }}>{s.rollNumber}</td>
                      <td style={{ fontWeight: 500 }}>{s.user ? s.user.name : ''}</td>
                      <td>{s.gender}</td>
                      <td>{s.dob ? new Date(s.dob).toLocaleDateString() : ''}</td>
                      <td>{s.parentName}</td>
                      <td>{s.parentMobile}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleProfileOpen(s)}
                            style={{ padding: '0.3rem', color: 'var(--primary)' }}
                            title="View Profile"
                          >
                            <Eye size={13} />
                          </button>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => handlePasswordOpen(s)}
                            style={{ padding: '0.3rem', color: 'var(--accent)' }}
                            title="Reset Password"
                          >
                            <Key size={13} />
                          </button>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleEditOpen(s)}
                            style={{ padding: '0.3rem' }}
                            title="Edit Student"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            className="btn btn-danger btn-sm"
                            onClick={() => handleStudentDelete(s._id, s.user ? s.user.name : '')}
                            style={{ padding: '0.3rem' }}
                            title="Delete Student"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE MARKING */}
      {activeTab === 'attendance' && (
        <div>
          {attendanceSuccess && (
            <div style={{ backgroundColor: 'var(--success-light)', color: '#065f46', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              {attendanceSuccess}
            </div>
          )}

          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} style={{ color: 'var(--primary)' }} />
              <label style={{ fontSize: '0.85rem', fontWeight: 600, marginRight: '0.5rem' }}>Attendance Date:</label>
              <input 
                type="date" 
                className="form-control" 
                style={{ width: 'auto', padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                value={attendanceDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => handleAttendanceDateChange(e.target.value)}
                disabled={attendanceLoading}
              />
            </div>
            
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Total: {students.length} • 
              Present: <span style={{ color: 'var(--success)', fontWeight: 600 }}>{Object.values(attendanceMap).filter(v => v === 'Present').length}</span> • 
              Absent: <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{Object.values(attendanceMap).filter(v => v === 'Absent').length}</span>
            </div>
          </div>

          <form onSubmit={handleAttendanceSubmit}>
            <div className="table-container" style={{ marginBottom: '1.5rem' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Student Name</th>
                    <th>Gender</th>
                    <th style={{ textAlign: 'center' }}>Attendance Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No students enrolled.
                      </td>
                    </tr>
                  ) : (
                    students.map((stud) => {
                      const status = attendanceMap[stud._id] || 'Present';
                      const isPresent = status === 'Present';
                      return (
                        <tr key={stud._id}>
                          <td style={{ fontWeight: 600 }}>{stud.rollNumber}</td>
                          <td>{stud.user ? stud.user.name : ''}</td>
                          <td>{stud.gender}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => toggleAttendanceStatus(stud._id)}
                              disabled={attendanceLoading}
                              style={{
                                padding: '0.35rem 1rem',
                                borderRadius: '20px',
                                border: '1px solid',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                minWidth: '100px',
                                transition: 'var(--transition)',
                                backgroundColor: isPresent ? 'var(--success-light)' : 'var(--danger-light)',
                                borderColor: isPresent ? 'var(--success)' : 'var(--danger)',
                                color: isPresent ? '#065f46' : '#991b1b',
                              }}
                            >
                              {status}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {students.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={attendanceLoading}>
                  <ClipboardList size={16} />
                  <span>{attendanceLoading ? 'Saving...' : 'Submit Attendance'}</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* TAB 3: DAILY WORK ASSIGNMENT */}
      {activeTab === 'dailywork' && (
        <div>
          {workSuccess && (
            <div style={{ backgroundColor: 'var(--success-light)', color: '#065f46', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              {workSuccess}
            </div>
          )}

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', backgroundColor: '#ffffff' }}>
            <Calendar size={18} style={{ color: 'var(--primary)' }} />
            <label style={{ fontSize: '0.85rem', fontWeight: 600, marginRight: '0.5rem' }}>Daily Work Date:</label>
            <input 
              type="date" 
              className="form-control" 
              style={{ width: 'auto', padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
              value={workDate}
              onChange={(e) => handleWorkDateChange(e.target.value)}
              disabled={workLoading}
            />
          </div>

          <form onSubmit={handleWorkSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {classInfo.subjects.map((sub) => (
                <div key={sub} className="card" style={{ backgroundColor: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', margin: 0 }}>{sub}</h4>
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}
                      onClick={() => handleWorkDetailsChange(sub, 'None')}
                    >
                      Set 'None'
                    </button>
                  </div>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={workEntries[sub] || ''}
                    onChange={(e) => handleWorkDetailsChange(sub, e.target.value)}
                    placeholder={`Write work details for ${sub} or write 'None'...`}
                    required
                  />
                </div>
              ))}
            </div>

            {classInfo.subjects.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={workLoading}>
                  <Send size={16} />
                  <span>{workLoading ? 'Publishing...' : 'Publish Daily Work'}</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* TAB 4: ASSIGNED SUBJECTS LIST */}
      {activeTab === 'subjects' && (
        <div style={{ maxWidth: '600px' }}>
          <div className="card" style={{ backgroundColor: '#ffffff', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Assign New Subject</h3>
            <form onSubmit={handleAddSubject} style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Enter Subject Name"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">Add</button>
            </form>
          </div>

          <div className="card" style={{ backgroundColor: '#ffffff' }}>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={18} style={{ color: 'var(--primary)' }} />
              <span>Active Curriculum Subjects</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {classInfo.subjects.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No subjects assigned to this class.</p>
              ) : (
                classInfo.subjects.map((sub) => (
                  <div 
                    key={sub}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.625rem 1rem',
                      backgroundColor: '#f8fafc',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius-sm)'
                    }}
                  >
                    <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{sub}</span>
                    <button
                      onClick={() => handleRemoveSubject(sub)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--danger)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 500
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: REPORTS & STATISTICS */}
      {activeTab === 'reports' && (
        <div>
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: '1.5rem',
              marginBottom: '1.5rem'
            }}
          >
            <div className="card" style={{ backgroundColor: '#ffffff' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart3 size={18} style={{ color: 'var(--primary)' }} />
                <span>Class Roster Distribution</span>
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>Boys Enrolled:</span>
                  <strong>{maleCount}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>Girls Enrolled:</span>
                  <strong>{femaleCount}</strong>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span>Total Strengths:</span>
                  <strong>{students.length} students</strong>
                </div>
              </div>
            </div>

            <div className="card" style={{ backgroundColor: '#ffffff' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} style={{ color: 'var(--accent)' }} />
                <span>Class Contact Details</span>
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '0.75rem' }}>
                Quick contact report for guardians. Use this to track parent phone records.
              </p>
              
              <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {students.map((s) => (
                  <div key={s._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '0.35rem', backgroundColor: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                    <span>{s.user ? s.user.name : ''} ({s.rollNumber})</span>
                    <span>{s.parentMobile}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODALS SECTION
          ========================================== */}

      {/* 1. STUDENT REGISTRATION/EDIT MODAL */}
      <Modal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        title={selectedStudent ? 'Edit Student Details' : 'Enroll New Student'}
      >
        {formError && (
          <div style={{ backgroundColor: 'var(--danger-light)', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.8rem', marginBottom: '1rem' }}>
            {formError}
          </div>
        )}

        <form onSubmit={handleStudentSubmit}>
          <div className="form-group">
            <label className="form-label">Student Name</label>
            <input 
              type="text" 
              className="form-control"
              placeholder="Enter Student Name"
              value={studentForm.name}
              onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Roll Number</label>
              <input 
                type="text" 
                className="form-control"
                placeholder={studentForm.autoGenerateRoll ? "Auto-Generated" : "Enter Roll Number"}
                value={studentForm.rollNumber}
                onChange={(e) => setStudentForm({ ...studentForm, rollNumber: e.target.value })}
                disabled={!!selectedStudent || studentForm.autoGenerateRoll}
                autoComplete="new-password"
                required={!studentForm.autoGenerateRoll && !selectedStudent}
              />
              
              {/* Auto Generate Checkbox */}
              {!selectedStudent && (
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', marginTop: '0.35rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={studentForm.autoGenerateRoll}
                    onChange={(e) => setStudentForm({ ...studentForm, autoGenerateRoll: e.target.checked })}
                  />
                  <span>Auto-Generate Roll Number</span>
                </label>
              )}
            </div>
            
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select
                className="form-control"
                value={studentForm.gender}
                onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value })}
                required
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Date of Birth</label>
            <input 
              type="date" 
              className="form-control"
              value={studentForm.dob}
              onChange={(e) => setStudentForm({ ...studentForm, dob: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Parent/Guardian Name</label>
              <input 
                type="text" 
                className="form-control"
                placeholder="Enter Parent/Guardian Name"
                value={studentForm.parentName}
                onChange={(e) => setStudentForm({ ...studentForm, parentName: e.target.value })}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Parent Mobile Number</label>
              <input 
                type="tel" 
                className="form-control"
                placeholder="Enter Parent Mobile Number"
                value={studentForm.parentMobile}
                onChange={(e) => setStudentForm({ ...studentForm, parentMobile: e.target.value })}
                required
              />
            </div>
          </div>

          {!selectedStudent && (
            <div className="form-group">
              <label className="form-label">Initial Password</label>
              <input 
                type="password" 
                className="form-control"
                placeholder="Enter Password (min 6 characters)"
                value={studentForm.password}
                onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                autoComplete="new-password"
                required
              />
            </div>
          )}

          <div className="modal-footer" style={{ margin: '0 -1.5rem -1.5rem -1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsStudentModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Student</button>
          </div>
        </form>
      </Modal>

      {/* 2. PASSWORD RESET MODAL */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title={selectedStudent ? `Reset Password for ${selectedStudent.user ? selectedStudent.user.name : ''}` : 'Reset Password'}
      >
        {formError && (
          <div style={{ backgroundColor: 'var(--danger-light)', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.8rem', marginBottom: '1rem' }}>
            {formError}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit}>
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Temporary Password</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="Enter Password (min 6 characters)"
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
              The student will be forced to change this temporary password on next login.
            </span>
          </div>

          <div className="modal-footer" style={{ margin: '0 -1.5rem -1.5rem -1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsPasswordModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Reset Password</button>
          </div>
        </form>
      </Modal>

      {/* 3. PROFILE POPUP MODAL */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title={selectedStudent ? `${selectedStudent.user ? selectedStudent.user.name : ''} - Profile Cockpit` : 'Student Profile'}
      >
        {selectedStudent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '400px', maxWidth: '600px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {selectedStudent.user ? selectedStudent.user.name.charAt(0) : 'S'}
              </div>
              <div>
                <h4 style={{ margin: 0 }}>{selectedStudent.user ? selectedStudent.user.name : ''}</h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Roll Number: {selectedStudent.rollNumber}</span>
              </div>
            </div>

            {/* Profile Tab Selector */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
              {[
                { id: 'info', label: 'Info' },
                { id: 'attendance', label: 'Attendance' },
                { id: 'dailywork', label: 'Daily Work' },
                { id: 'notes', label: 'Notes' },
                { id: 'marks', label: 'Marks' }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveProfileTab(t.id)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: activeProfileTab === t.id ? 'var(--primary)' : 'transparent',
                    color: activeProfileTab === t.id ? '#ffffff' : 'var(--text-muted)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s'
                  }}
                >
                  {t.id === 'notes' && profileExtra?.notes ? `${t.label} (${profileExtra.notes.length})` : t.label}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            {profileExtraLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Loading extra details...
              </div>
            ) : (
              <div style={{ minHeight: '220px', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                
                {/* 1. INFO TAB */}
                {activeProfileTab === 'info' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
                    <div>
                      <strong>Gender:</strong>
                      <p style={{ color: 'var(--text-muted)', marginTop: '0.15rem' }}>{selectedStudent.gender}</p>
                    </div>
                    <div>
                      <strong>Date of Birth:</strong>
                      <p style={{ color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        {selectedStudent.dob ? new Date(selectedStudent.dob).toLocaleDateString() : ''}
                      </p>
                    </div>
                    <div>
                      <strong>Guardian Name:</strong>
                      <p style={{ color: 'var(--text-muted)', marginTop: '0.15rem' }}>{selectedStudent.parentName}</p>
                    </div>
                    <div>
                      <strong>Guardian Mobile:</strong>
                      <p style={{ color: 'var(--text-muted)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Phone size={12} />
                        <span>{selectedStudent.parentMobile}</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. ATTENDANCE TAB */}
                {activeProfileTab === 'attendance' && profileExtra && (
                  <div style={{ fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                      <span>Attendance Summary:</span>
                      <strong>{profileExtra.attendance.percentage}% ({profileExtra.attendance.presentDays} / {profileExtra.attendance.totalDays} Days)</strong>
                    </div>
                    <h5 style={{ fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>Recent Logs (Last 30 Days)</h5>
                    {profileExtra.attendance.history.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No attendance logs found.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {profileExtra.attendance.history.map(h => (
                          <div key={h._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.75rem' }}>
                            <span>{new Date(h.date).toLocaleDateString()}</span>
                            <span style={{ fontWeight: 600, color: h.status === 'Present' ? 'var(--success)' : 'var(--danger)' }}>{h.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. DAILY WORK TAB */}
                {activeProfileTab === 'dailywork' && profileExtra && (
                  <div style={{ fontSize: '0.85rem' }}>
                    <h5 style={{ fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>Recent Class Work Logs</h5>
                    {profileExtra.dailyWork.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No daily work logs found.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {profileExtra.dailyWork.map(w => (
                          <div key={w._id} style={{ padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.25rem', color: 'var(--primary)' }}>
                              {new Date(w.date).toLocaleDateString()}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem' }}>
                              {w.entries.map(ent => (
                                <div key={ent.subject}>
                                  <strong>{ent.subject}:</strong> {ent.workDetails}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. NOTES TAB */}
                {activeProfileTab === 'notes' && profileExtra && (
                  <div style={{ fontSize: '0.85rem' }}>
                    {/* New Note Form */}
                    <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                      <input 
                        type="text" 
                        placeholder="Write a behavior note / remark..." 
                        value={newNoteContent}
                        onChange={e => setNewNoteContent(e.target.value)}
                        className="form-control"
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.5rem' }}
                        required
                        disabled={savingNote}
                      />
                      <button type="submit" className="btn btn-primary btn-sm" disabled={savingNote}>
                        {savingNote ? 'Saving...' : 'Add Note'}
                      </button>
                    </form>

                    <h5 style={{ fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>Notes History</h5>
                    {profileExtra.notes.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No notes logged for this student.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {profileExtra.notes.map(n => (
                          <div key={n._id} style={{ padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                              <span>Teacher: {n.teacherName}</span>
                              <span>{new Date(n.date || n.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p style={{ margin: 0, fontWeight: 500 }}>{n.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 5. MARKS TAB */}
                {activeProfileTab === 'marks' && profileExtra && (
                  <div style={{ fontSize: '0.85rem' }}>
                    <h5 style={{ fontSize: '0.8rem', marginBottom: '0.75rem', color: 'var(--primary)' }}>Exam Performance Records</h5>
                    {profileExtra.marks.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No exam marks entered yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {profileExtra.marks.map(res => {
                          const totalObtained = res.marks.reduce((acc, m) => acc + m.marksObtained, 0);
                          const totalMax = res.marks.reduce((acc, m) => acc + m.maxMarks, 0);
                          const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 1000) / 10 : 0;
                          
                          return (
                            <div key={res._id} style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem' }}>
                                <strong style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>{res.examName}</strong>
                                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(res.date).toLocaleDateString()}</span>
                                  <span 
                                    style={{
                                      padding: '0.15rem 0.4rem',
                                      borderRadius: '8px',
                                      fontSize: '0.65rem',
                                      fontWeight: 600,
                                      backgroundColor: res.status === 'Published' ? 'var(--success-light)' : 'var(--warning-light)',
                                      color: res.status === 'Published' ? '#065f46' : '#9a3412'
                                    }}
                                  >
                                    {res.status}
                                  </span>
                                </div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.35rem 1rem', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
                                {res.marks.map(m => (
                                  <div key={m.subject} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>{m.subject}:</span>
                                    <strong>{m.marksObtained} / {m.maxMarks}</strong>
                                  </div>
                                ))}
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderTop: '1px dashed #e2e8f0', paddingTop: '0.4rem', marginTop: '0.4rem' }}>
                                <span>Total: <strong>{totalObtained} / {totalMax}</strong></span>
                                <span>Percentage: <strong>{percentage}%</strong></span>
                                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Grade: {calculateGrade(percentage)}</span>
                              </div>

                              {res.remarks && (
                                <div style={{ marginTop: '0.4rem', padding: '0.35rem', backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  <strong>Remarks:</strong> {res.remarks}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

            <div className="modal-footer" style={{ margin: '1rem -1.5rem -1.5rem -1.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsProfileModalOpen(false)}>Close Card</button>
            </div>
          </div>
        )}
      </Modal>

      {/* 4. SEND NOTE MODAL */}
      <Modal
        isOpen={isSendNoteModalOpen}
        onClose={() => setIsSendNoteModalOpen(false)}
        title="Send Important Note to Student"
      >
        <form onSubmit={handleSendNoteSubmit}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ fontWeight: 600 }}>1. Choose Student</label>
            <select
              className="form-control"
              value={sendNoteForm.studentId}
              onChange={e => setSendNoteForm({ ...sendNoteForm, studentId: e.target.value })}
              required
            >
              <option value="">-- Select Student --</option>
              {students.map(s => (
                <option key={s._id} value={s._id}>
                  {s.rollNumber} - {s.user ? s.user.name : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" style={{ fontWeight: 600 }}>2. Write Note Content</label>
            <textarea
              className="form-control"
              rows="4"
              placeholder="Type your important note or remark here..."
              value={sendNoteForm.content}
              onChange={e => setSendNoteForm({ ...sendNoteForm, content: e.target.value })}
              required
            />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
              This note will be displayed prominently on the student's dashboard and trigger a notification alert.
            </span>
          </div>

          <div className="modal-footer" style={{ margin: '0 -1.5rem -1.5rem -1.5rem' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setIsSendNoteModalOpen(false)}
              disabled={sendNoteLoading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={sendNoteLoading}
            >
              {sendNoteLoading ? 'Sending...' : 'Send Note'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default TeacherDashboard;
