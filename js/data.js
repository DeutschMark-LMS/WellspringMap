/**
 * Campus Map Data & Configuration
 * Wellspring University, Benin City, Edo State, Nigeria
 * Coords Center: [6.280986, 5.585459]
 */

const CAMPUS_CONFIG = {
  name: 'Wellspring University',
  shortName: 'Wellspring',
  center: [6.280986, 5.585459],
  defaultZoom: 17,
  minZoom: 15,
  maxZoom: 19,
  // Default user spawn location at the Main Campus Gate & Welcome Plaza
  defaultUserLocation: [6.281850, 5.584300],
  // Campus perimeter boundary polygon (lat, lng)
  perimeter: [
    [6.282800, 5.583500],
    [6.282900, 5.588000],
    [6.280000, 5.588800],
    [6.278500, 5.587000],
    [6.278200, 5.583800],
    [6.280500, 5.583000],
    [6.282800, 5.583500]
  ],
  maxBounds: [
    [6.265000, 5.565000], // Southwest
    [6.295000, 5.605000]  // Northeast
  ]
};

const CATEGORIES = {
  academic: {
    id: 'academic',
    label: 'Academics',
    color: '#2563eb', // Blue
    bgLight: '#eff6ff',
    icon: 'graduation-cap'
  },
  library: {
    id: 'library',
    label: 'Libraries',
    color: '#7c3aed', // Purple
    bgLight: '#f5f3ff',
    icon: 'book-open'
  },
  administrative: {
    id: 'administrative',
    label: 'Admin',
    color: '#475569', // Slate
    bgLight: '#f1f5f9',
    icon: 'building-2'
  },
  cafeteria: {
    id: 'cafeteria',
    label: 'Food & Dining',
    color: '#ea580c', // Orange
    bgLight: '#fff7ed',
    icon: 'utensils'
  },
  hostel: {
    id: 'hostel',
    label: 'Hostels & Housing',
    color: '#059669', // Emerald Green
    bgLight: '#ecfdf5',
    icon: 'bed'
  },
  sports: {
    id: 'sports',
    label: 'Sports & Rec',
    color: '#e11d48', // Rose Red
    bgLight: '#fff1f2',
    icon: 'trophy'
  }
};

const CAMPUS_LANDMARKS = [
  {
    id: 'senate-admin-complex',
    name: 'University Senate & Administration Complex',
    code: 'ADM-01',
    coords: [6.281200, 5.585200],
    category: 'administrative',
    description: 'Central administrative headquarters housing the Vice Chancellor’s Office, Registrar, Admissions, Bursary, and Academic Affairs.',
    floors: 3,
    hours: '8:00 AM – 5:00 PM (Mon–Fri)',
    facilities: ['Vice Chancellor Office', 'Admissions Help Desk', 'Bursary', 'Conference Hall', 'Wheelchair Accessible', 'Wi-Fi'],
    image: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=800&q=80',
    contact: 'admin@wellspring.edu.ng | (052) 800-100'
  },
  {
    id: 'central-library',
    name: 'Wellspring Central University Library',
    code: 'LIB-01',
    coords: [6.280986, 5.585459],
    category: 'library',
    description: 'The academic heart of the campus featuring e-library workstations, physical textbook repositories, research cubicles, and 24/7 quiet study halls.',
    floors: 3,
    hours: '8:00 AM – 10:00 PM (Mon–Sat)',
    facilities: ['E-Library Hub', 'Quiet Study Pods', 'Research Archives', 'High-Speed Wi-Fi', 'Printing & Photocopying', 'Air Conditioned'],
    image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80',
    contact: 'library@wellspring.edu.ng | Ext. 201'
  },
  {
    id: 'faculty-of-science-computing',
    name: 'College of Natural & Applied Sciences',
    code: 'SCI-01',
    coords: [6.281450, 5.586100],
    category: 'academic',
    description: 'Houses Computer Science, Software Engineering, Microbiology, and Biochemistry laboratories with cutting-edge IT infrastructure.',
    floors: 3,
    hours: '7:30 AM – 8:00 PM',
    facilities: ['Software Development Lab', 'Biochemistry Labs', 'Smart Lecture Rooms', 'Wi-Fi 6', 'Restrooms'],
    image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80',
    contact: 'science@wellspring.edu.ng | Ext. 301'
  },
  {
    id: 'faculty-social-management-sciences',
    name: 'College of Social & Management Sciences',
    code: 'SMS-01',
    coords: [6.280500, 5.586300],
    category: 'academic',
    description: 'Academic home for Accounting, Business Administration, Mass Communication, Economics, and International Relations.',
    floors: 3,
    hours: '8:00 AM – 7:00 PM',
    facilities: ['Mass Comm Studio', 'Moot Court', 'Auditorium Lecture Rooms', 'Wi-Fi', 'Faculty Offices'],
    image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80',
    contact: 'sms@wellspring.edu.ng | Ext. 305'
  },
  {
    id: 'multipurpose-hall',
    name: 'University Multi-Purpose Auditorium & Hall',
    code: 'AUD-01',
    coords: [6.280200, 5.585100],
    category: 'administrative',
    description: 'Grand event auditorium for matriculation ceremonies, convocations, academic conferences, guest lectures, and campus gatherings.',
    floors: 2,
    hours: 'Event Dependent / 8:00 AM – 6:00 PM',
    facilities: ['1,500 Seat Capacity', 'Stage & Sound Rig', 'Stage Dressing Rooms', 'Wheelchair Ramps', 'Air Conditioned'],
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    contact: 'events@wellspring.edu.ng | Ext. 108'
  },
  {
    id: 'campus-cafeteria',
    name: 'The Wellspring Dining Hall & Food Court',
    code: 'DIN-01',
    coords: [6.280450, 5.584600],
    category: 'cafeteria',
    description: 'Central campus cafeteria serving diverse hot Nigerian delicacies, continental dishes, fresh smoothies, and bakery snacks.',
    floors: 1,
    hours: '7:00 AM – 9:00 PM (Daily)',
    facilities: ['Hot Buffet Meals', 'Snack & Coffee Kiosk', 'Spacious Seating', 'POS & Mobile Pay', 'Outdoor Shaded Seats'],
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    contact: 'dining@wellspring.edu.ng | Ext. 401'
  },
  {
    id: 'female-hostel-complex',
    name: 'Queen Esther Female Residence Hall',
    code: 'HST-01',
    coords: [6.279600, 5.585800],
    category: 'hostel',
    description: 'Comfortable on-campus female student accommodation with 24-hour security, constant power and water supply, common study areas, and laundry.',
    floors: 3,
    hours: '24/7 Resident Access',
    facilities: ['24/7 Porter Desk', 'Solar Inverter Backup', 'Common Study Lounge', 'Kitchenette', 'Laundry Space'],
    image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
    contact: 'hostel.female@wellspring.edu.ng | Ext. 501'
  },
  {
    id: 'male-hostel-complex',
    name: 'King David Male Residence Hall',
    code: 'HST-02',
    coords: [6.279400, 5.584700],
    category: 'hostel',
    description: 'Spacious male student hall of residence featuring ventilated en-suite rooms, common recreation rooms, and study cubicles.',
    floors: 3,
    hours: '24/7 Resident Access',
    facilities: ['24/7 Porter Security', 'Constant Water Supply', 'Recreation Room', 'Study Hall', 'Wi-Fi'],
    image: 'https://images.unsplash.com/photo-1595846519845-68e298c2edd8?auto=format&fit=crop&w=800&q=80',
    contact: 'hostel.male@wellspring.edu.ng | Ext. 502'
  },
  {
    id: 'sports-complex',
    name: 'Wellspring Sports Arena & Football Pitch',
    code: 'SPT-01',
    coords: [6.281700, 5.587200],
    category: 'sports',
    description: 'Outdoor athletics facility with a standard football pitch, volleyball and basketball courts, running tracks, and spectator pavilion.',
    floors: 1,
    hours: '6:30 AM – 7:00 PM',
    facilities: ['Football Pitch', 'Basketball Court', 'Volleyball Court', 'Spectator Pavilion', 'Locker Rooms'],
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
    contact: 'sports@wellspring.edu.ng | Ext. 601'
  },
  {
    id: 'university-health-center',
    name: 'Wellspring University Medical Centre',
    code: 'HLT-01',
    coords: [6.281500, 5.584800],
    category: 'administrative',
    description: 'On-campus clinic offering outpatient medical consultations, 24/7 nursing care, pharmacy dispensaries, and emergency response services.',
    floors: 1,
    hours: '24 Hours Emergency | Clinic: 8:00 AM – 6:00 PM',
    facilities: ['24/7 Ambulance Bay', 'Pharmacy Dispensary', 'Observation Wards', 'Emergency First Aid', 'Wheelchair Accessible'],
    image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
    contact: 'health@wellspring.edu.ng | Emergency: Ext. 911'
  },
  {
    id: 'main-gate-security',
    name: 'Main Security Gate & Visitor Welcome Plaza',
    code: 'SEC-01',
    coords: [6.281850, 5.584300],
    category: 'administrative',
    description: 'Official entrance into Wellspring University campus with vehicular security checkpoints, visitor registration, and campus guide kiosk.',
    floors: 1,
    hours: '24/7 Campus Security Control',
    facilities: ['Visitor Registration', 'Security Post', 'Drop-off & Pick-up Zone', 'Campus Directory Board'],
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    contact: 'security@wellspring.edu.ng | Emergency: (052) 800-911'
  },
  {
    id: 'university-chapel',
    name: 'Wellspring University Chapel of Praise',
    code: 'CHP-01',
    coords: [6.280800, 5.584300],
    category: 'academic',
    description: 'Spiritual development center for university chapel services, student fellowship meetings, choir rehearsals, and quiet meditation.',
    floors: 2,
    hours: '6:00 AM – 9:00 PM',
    facilities: ['Worship Sanctuary', 'Chaplaincy Office', 'Choir Gallery', 'Wheelchair Ramps', 'Air Conditioned'],
    image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80',
    contact: 'chaplaincy@wellspring.edu.ng | Ext. 701'
  }
];
