const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const Review = require('../models/Review');
const Booking = require('../models/Booking');

const initialCourses = [
  {
    title: 'Beginner Kickstart Course',
    slug: 'beginner-kickstart',
    badge: 'MOST POPULAR',
    description: 'Perfect for total novices. Master clutch control, mirror routines, junctions, and parking manoeuvres with confidence.',
    price: 360,
    duration: '10 Hours (5 x 2hr sessions)',
    hours: 10,
    transmission: 'Both',
    features: [
      'DVSA Grade A 1-on-1 coaching',
      'Dual-control modern tuition car',
      'Pick up & drop off from home/work',
      'Free Theory & Hazard Perception App access',
      'Progress tracking dashboard & mock evaluation'
    ],
    isPopular: true,
    order: 1
  },
  {
    title: 'Complete Driving Mastery',
    slug: 'complete-mastery',
    badge: 'BEST VALUE',
    description: 'Our most comprehensive package covering all UK driving competencies, complex roundabouts, dual carriageways & mock tests.',
    price: 680,
    duration: '20 Hours (10 x 2hr sessions)',
    hours: 20,
    transmission: 'Both',
    features: [
      'All 27 DVSA driving competency units',
      'Full Mill Hill & Barnet test routes practice',
      'Show Me, Tell Me vehicle safety questions',
      'Emergency stop & all 4 parking manoeuvres',
      'Dedicated instructor support up to test day'
    ],
    isPopular: false,
    isFeatured: true,
    order: 2
  },
  {
    title: 'Intensive Fast-Track Pass',
    slug: 'intensive-fast-track',
    badge: 'FASTEST PASS',
    description: 'Pass your practical driving test in just 1 to 2 weeks. Accelerated immersive daily training tailored to your test date.',
    price: 990,
    duration: '30 Hours Intensive',
    hours: 30,
    transmission: 'Both',
    features: [
      'Daily 3-4 hour intensive driving blocks',
      'Priority test cancellation slot booking support',
      '2 Full DVSA mock driving exams included',
      'Independent driving navigation practice',
      'Car hire included for your practical test day'
    ],
    isPopular: false,
    order: 3
  },
  {
    title: 'Test Readiness & Mock Exam',
    slug: 'mock-exam-refresher',
    badge: 'TEST PREP',
    description: 'Designed for learners with previous driving experience or approaching their test date who need examiner-level scrutiny.',
    price: 220,
    duration: '6 Hours (3 x 2hr sessions)',
    hours: 6,
    transmission: 'Both',
    features: [
      'Realistic mock test under official DVSA scoring',
      'Fault analysis & remediation breakdown',
      'Mill Hill / Borehamwood tricky test route coaching',
      'Confidence building & test anxiety coping tools'
    ],
    isPopular: false,
    order: 4
  }
];

const initialReviews = [
  {
    name: 'Tariq A.',
    rating: 5,
    passType: '1st Time Pass (0 Minors)',
    testCentre: 'Mill Hill',
    comment: 'Mr Sam is an unbelievable instructor. Passed first time with zero faults at Mill Hill! His calm demeanor and methodical approach on tricky roundabouts made all the difference.',
    initials: 'TA',
    minors: 0,
    verified: true,
    date: 'Sep 2026'
  },
  {
    name: 'Sophie R.',
    rating: 5,
    passType: '1st Time Pass',
    testCentre: 'Barnet',
    comment: 'I was extremely anxious about driving after failing with another driving school. Mr Sam rebuilt my confidence step by step. Passed in 3 weeks!',
    initials: 'SR',
    minors: 2,
    verified: true,
    date: 'Aug 2026'
  },
  {
    name: 'Kwame O.',
    rating: 5,
    passType: '1st Time Pass',
    testCentre: 'Hendon',
    comment: 'Top quality coaching. The way he breaks down parallel parking and bay parking made it second nature. Highly recommended!',
    initials: 'KO',
    minors: 1,
    verified: true,
    date: 'Jul 2026'
  }
];

async function seedDatabase() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is not defined in .env');

    console.log('🔄 Connecting to MongoDB Atlas for seeding...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB Atlas.');

    // 1. Create Master Admin if not exists
    const adminEmail = 'admin@mrsamdrivingschool.co.uk';
    let adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Mr Sam (Head Examiner & Admin)',
        email: adminEmail,
        password: 'AdminPass#2026!',
        role: 'admin',
        licenceLast4: '0001',
        theoryStatus: 'passed',
        theoryPassed: true,
        currentStep: 4,
        progress: 100
      });
      console.log(`👑 Master Admin account created: ${adminEmail} (Password: AdminPass#2026!)`);
    } else {
      console.log(`👑 Master Admin account already present: ${adminEmail}`);
    }

    // 2. Seed Courses
    for (const c of initialCourses) {
      await Course.findOneAndUpdate({ slug: c.slug }, c, { upsert: true, new: true });
    }
    console.log(`📚 Seeded ${initialCourses.length} driving courses.`);

    // 3. Seed Reviews
    const reviewCount = await Review.countDocuments();
    if (reviewCount === 0) {
      await Review.insertMany(initialReviews);
      console.log(`⭐ Seeded ${initialReviews.length} student reviews.`);
    }

    console.log('🎉 Database seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding Error:', err);
    process.exit(1);
  }
}

seedDatabase();
