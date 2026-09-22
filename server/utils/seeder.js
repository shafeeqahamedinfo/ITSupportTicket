const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Department = require('../models/Department');
const Category = require('../models/Category');
const SLAConfig = require('../models/SLAConfig');
const KnowledgeArticle = require('../models/KnowledgeArticle');
const Ticket = require('../models/Ticket');

const connectDB = require('../config/db');

const seedData = async () => {
  try {
    await connectDB();
    console.log('🌱 Starting MongoDB Atlas Database Seeding...');

    // Clear existing collections completely
    await mongoose.connection.dropDatabase();
    console.log('🧹 Database wiped & indexes recreated.');

    // 1. Create Departments
    const departments = await Department.create([
      { name: 'Computer Science & Engineering', code: 'CSE', description: 'Department of Computer Science & Engineering', location: 'Main Block, Floor 2', contactEmail: 'cse@smartcampus.edu' },
      { name: 'Information Technology', code: 'IT', description: 'Department of Information Technology', location: 'IT Block, Floor 1', contactEmail: 'it@smartcampus.edu' },
      { name: 'Electronics & Communication', code: 'ECE', description: 'Department of ECE', location: 'Block B, Floor 3', contactEmail: 'ece@smartcampus.edu' },
      { name: 'Electrical & Electronics', code: 'EEE', description: 'Department of EEE', location: 'Block C, Floor 1', contactEmail: 'eee@smartcampus.edu' },
      { name: 'Mechanical Engineering', code: 'MECH', description: 'Department of Mechanical Engineering', location: 'Workshop Block', contactEmail: 'mech@smartcampus.edu' },
      { name: 'Civil Engineering', code: 'CIVIL', description: 'Department of Civil Engineering', location: 'Block A, Floor 1', contactEmail: 'civil@smartcampus.edu' },
      { name: 'Administration', code: 'ADMIN', description: 'Campus Administrative Department', location: 'Admin Building', contactEmail: 'admin@smartcampus.edu' }
    ]);
    console.log(`✅ Seeded ${departments.length} Departments`);

    // 2. Create Categories with slugs
    const categoriesData = [
      { name: 'Hardware Issue', slug: 'hardware-issue', description: 'Problems with PC, Monitor, Keyboard, Mouse, Printer, Projector', icon: 'Monitor' },
      { name: 'Software / OS Issue', slug: 'software-os-issue', description: 'OS installation, software crashes, updates, IDEs, licenses', icon: 'Code' },
      { name: 'Network & Wi-Fi', slug: 'network-wifi', description: 'Campus Wi-Fi connectivity, LAN port, VPN, router issues', icon: 'Wifi' },
      { name: 'Account & Password', slug: 'account-password', description: 'Portal login, password reset, email access, LMS credentials', icon: 'UserCheck' },
      { name: 'Lab Infrastructure', slug: 'lab-infrastructure', description: 'Lab system setup, server access, lab projector/smart board', icon: 'Server' },
      { name: 'Other Support', slug: 'other-support', description: 'General IT support queries and non-categorized requests', icon: 'HelpCircle' }
    ];
    const categories = await Category.create(categoriesData);
    console.log(`✅ Seeded ${categories.length} Ticket Categories`);

    // 3. Create SLA Configurations
    await SLAConfig.create([
      { priority: 'CRITICAL', resolutionTimeHours: 2, responseTimeHours: 0.5, escalateAfterBreachHours: 1 },
      { priority: 'HIGH', resolutionTimeHours: 6, responseTimeHours: 1, escalateAfterBreachHours: 2 },
      { priority: 'MEDIUM', resolutionTimeHours: 24, responseTimeHours: 2, escalateAfterBreachHours: 4 },
      { priority: 'LOW', resolutionTimeHours: 72, responseTimeHours: 4, escalateAfterBreachHours: 8 }
    ]);
    console.log('✅ Seeded SLA Configurations');

    // 4. Create Default Users (Admin, IT Support Staff, Student)
    const adminUser = await User.create({
      fullName: 'System Administrator',
      email: 'admin@smartcampus.edu',
      password: 'admin123',
      role: 'admin',
      userType: 'administrator',
      phone: '+91 9876543210',
      employeeId: 'ADM001',
      departmentName: 'Administration',
      department: departments[6]._id,
      isEmailVerified: true
    });

    const staffUser1 = await User.create({
      fullName: 'Ravi Kumar (IT Support)',
      email: 'itstaff@smartcampus.edu',
      password: 'staff123',
      role: 'it_staff',
      userType: 'it_support',
      phone: '+91 9876543211',
      employeeId: 'ITS001',
      departmentName: 'Information Technology',
      department: departments[1]._id,
      specialization: ['Hardware Issue', 'Network & Wi-Fi'],
      isEmailVerified: true
    });

    const staffUser2 = await User.create({
      fullName: 'Priya Sharma (Software Specialist)',
      email: 'priya.it@smartcampus.edu',
      password: 'staff123',
      role: 'it_staff',
      userType: 'it_support',
      phone: '+91 9876543212',
      employeeId: 'ITS002',
      departmentName: 'Computer Science & Engineering',
      department: departments[0]._id,
      specialization: ['Software / OS Issue', 'Account & Password'],
      isEmailVerified: true
    });

    const studentUser = await User.create({
      fullName: 'Arun Kumar S',
      email: 'student@smartcampus.edu',
      password: 'student123',
      role: 'user',
      userType: 'student',
      phone: '+91 9876543213',
      employeeId: 'CS2023001',
      departmentName: 'Computer Science & Engineering',
      department: departments[0]._id,
      isEmailVerified: true
    });

    console.log(`✅ Seeded Default Accounts:`);
    console.log(`   👑 Admin    : admin@smartcampus.edu / admin123`);
    console.log(`   👔 IT Staff : itstaff@smartcampus.edu / staff123`);
    console.log(`   🎓 Student  : student@smartcampus.edu / student123`);

    // 5. Create Sample Ticket
    const sampleTicket = await Ticket.create({
      ticketId: 'TCK-1001',
      title: 'Lab 301 Wi-Fi disconnects frequently during practical exams',
      description: 'The wireless access point in CSE Computer Lab 301 drops connection every 15-20 minutes when more than 30 students connect simultaneously.',
      category: 'Wi-Fi',
      department: 'Computer Science & Engineering',
      priority: 'HIGH',
      status: 'ASSIGNED',
      createdBy: studentUser._id,
      assignedTo: staffUser1._id,
      location: { building: 'Main Block', room: 'Lab 301', floor: '2nd Floor' }
    });
    console.log(`✅ Seeded Sample Support Ticket: ${sampleTicket.ticketId}`);

    // 6. Create Knowledge Base Articles
    await KnowledgeArticle.create([
      {
        title: 'How to Connect to Campus High-Speed Wi-Fi',
        slug: 'connect-campus-wifi',
        content: 'Step 1: Select SmartCampus_Student_5G WiFi network.\nStep 2: Enter your campus email and password.\nStep 3: Accept the security certificate.',
        category: 'Network & Wi-Fi',
        author: adminUser._id,
        isPublished: true,
        tags: ['wifi', 'network', 'connect']
      },
      {
        title: 'How to Reset Your SmartCampus Student Portal Password',
        slug: 'reset-student-portal-password',
        content: 'Go to Login page -> Click Forgot Password -> Enter registered campus email -> Check inbox for reset link.',
        category: 'Account & Access',
        author: adminUser._id,
        isPublished: true,
        tags: ['password', 'login', 'reset']
      }
    ]);
    console.log('✅ Seeded Knowledge Base Articles');

    console.log('\n🎉 MongoDB Atlas Online Database Seeding Completed Successfully!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding Error:', err);
    process.exit(1);
  }
};

seedData();
