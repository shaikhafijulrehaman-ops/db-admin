const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const User = require('./models/User');
const Teacher = require('./models/Teacher');
const Class = require('./models/Class');
const Student = require('./models/Student');
const Setting = require('./models/Setting');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Seed default data if database is empty
    await seedDatabase();
  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
    process.exit(1);
  }
};

const seedDatabase = async () => {
  try {
    // Check if users already exist
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('Database already seeded. Skipping initial seeding.');
      return;
    }

    console.log('Seeding initial data into MongoDB...');

    // 1. Seed System Settings
    await Setting.create({ key: 'attendance_notifications', value: 'ON' });
    console.log('✔ Default settings seeded (Attendance Notifications: ON)');

    // Helper for password hashing
    const salt = bcrypt.genSaltSync(10);
    const adminPasswordHash = bcrypt.hashSync('admin123', salt);
    const teacherPasswordHash = bcrypt.hashSync('teacher123', salt);
    const studentPasswordHash = bcrypt.hashSync('student123', salt);

    // 2. Create Default Admin User
    const adminUser = await User.create({
      username: 'admin',
      passwordHash: adminPasswordHash,
      role: 'admin',
      name: 'System Admin',
      mustChangePassword: false // Admin doesn't need to change password on first login
    });
    console.log('✔ Admin user created: admin / admin123');

    // 3. Create Default Teacher User
    const teacherUser = await User.create({
      username: 'T101',
      passwordHash: teacherPasswordHash,
      role: 'teacher',
      name: 'Alice Johnson',
      mustChangePassword: true // Forces password change on first login
    });

    const teacherProfile = await Teacher.create({
      user: teacherUser._id,
      employeeId: 'T101',
      mobileNumber: '9876543210',
      email: 'alice@school.com',
      gender: 'Female'
    });
    console.log('✔ Teacher created: T101 / teacher123 (Name: Alice Johnson)');

    // 4. Create Default Class (6-A)
    // Dynamic subjects pre-populated as requested in Daily Work requirements
    const defaultClass = await Class.create({
      className: '6',
      section: 'A',
      totalStrength: 3,
      boysStrength: 2,
      girlsStrength: 1,
      classTeacher: teacherProfile._id,
      subjects: ['English', 'Mathematics', 'Science', 'Social', 'Telugu']
    });
    console.log('✔ Class created: 6-A (Assigned to Alice Johnson)');

    // 5. Create Students in 6-A
    const student1User = await User.create({
      username: 'S101',
      passwordHash: studentPasswordHash,
      role: 'student',
      name: 'Bob Smith',
      mustChangePassword: true
    });
    await Student.create({
      user: student1User._id,
      rollNumber: 'S101',
      gender: 'Male',
      dob: new Date('2014-05-15'),
      parentName: 'David Smith',
      parentMobile: '9876543211',
      class: defaultClass._id
    });

    const student2User = await User.create({
      username: 'S102',
      passwordHash: studentPasswordHash,
      role: 'student',
      name: 'Charlie Brown',
      mustChangePassword: true
    });
    await Student.create({
      user: student2User._id,
      rollNumber: 'S102',
      gender: 'Male',
      dob: new Date('2014-06-20'),
      parentName: 'Lucy Brown',
      parentMobile: '9876543212',
      class: defaultClass._id
    });

    const student3User = await User.create({
      username: 'S103',
      passwordHash: studentPasswordHash,
      role: 'student',
      name: 'Diana Prince',
      mustChangePassword: true
    });
    await Student.create({
      user: student3User._id,
      rollNumber: 'S103',
      gender: 'Female',
      dob: new Date('2014-08-12'),
      parentName: 'Hippolyta Prince',
      parentMobile: '9876543213',
      class: defaultClass._id
    });
    console.log('✔ 3 Students created in 6-A (S101, S102, S103 / password: student123)');

    console.log('✔ Database successfully seeded!');
  } catch (error) {
    console.error(`Error seeding database: ${error.message}`);
  }
};

module.exports = connectDB;
