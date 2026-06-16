import { AppUser, FileItem, Order, Appointment, FamilyVault, AppNotification } from './types';

// Let's seed realistic initial values for our SaaS demo
export const INITIAL_USERS: AppUser[] = [
  {
    uid: 'user-01',
    email: 'itzmebalustrade@gmail.com',
    displayName: 'Aarav Sharma',
    role: 'user',
    profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
    phone: '+91 98765 43210',
    city: 'Jaipur',
    address: '12, Heritage Lane, C-Scheme, Jaipur, Rajasthan'
  },
  {
    uid: 'admin-01',
    email: 'admin@relive.club',
    displayName: 'Priya Iyer (Managing Director)',
    role: 'admin',
    profilePhoto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&q=80',
    phone: '+91 99999 88888',
    city: 'Jaipur'
  },
  {
    uid: 'partner-delhi',
    email: 'kartik@relive.club',
    displayName: 'Kartik Yadav',
    role: 'partner',
    profilePhoto: 'https://images.unsplash.com/photo-1620122303020-43ec4b6cf7f8?w=150&q=80',
    phone: '+91 98989 77712',
    vehicleType: 'Electric Scooter (Hero Electric)',
    city: 'Jaipur',
    rating: 4.9,
    ordersCount: 142
  },
  {
    uid: 'partner-jaipur',
    email: 'vikram@relive.club',
    displayName: 'Vikram Choudhary',
    role: 'partner',
    profilePhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80',
    phone: '+91 91112 33344',
    vehicleType: 'Motorcycle (Bajaj Pulsar)',
    city: 'Delhi',
    rating: 4.8,
    ordersCount: 89
  },
  {
    uid: 'restorer-01',
    email: 'ananya@relive.club',
    displayName: 'Ananya Sen (Master Colorist)',
    role: 'restorer',
    profilePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
    phone: '+91 95556 12345',
    city: 'Jaipur'
  }
];

export const SERVICE_OPTIONS = [
  {
    id: 'photo-restoration',
    title: 'Photo Restoration (Heritage Pack)',
    description: 'Breathe color, clarity, and life back into physical prints with state-of-the-art scratch removal and AI colorization.',
    price: '₹300 for 10 photos',
    duration: '3-4 Days'
  },
  {
    id: 'vhs-digitization',
    title: 'VHS & Tape Digitization (Cinema Pack)',
    description: 'Safeguard home videos with high-definition digital transfer. Includes dual-layer noise reduction and tracking fix.',
    price: '₹300 for 5 videos',
    duration: '5-7 Days'
  },
  {
    id: 'reel-restoration',
    title: '8mm/16mm Film Reel Restoration',
    description: 'Precision physical cleaning of delicate vintage celluloide reels, scanned at ultra-high 4K resolution frame-by-frame.',
    price: '₹2,499 / reel',
    duration: '10-14 Days'
  },
  {
    id: 'audio-cleanup',
    title: 'Voice & Tape Audio Correction',
    description: 'Surgical frequency isolation to extract clean vocals from hiss, crackle',
    price: '₹999 / cassette',
    duration: '4-5 Days'
  },
  {
    id: 'negative-restoration',
    title: 'Glass Plate & Film Negative scanning',
    description: 'Dynamic chemical scan and digital inversion to restore precious details hidden inside raw archives.',
    price: '₹599 / negative',
    duration: '4-6 Days'
  }
];

export const INITIAL_ALBUMS: FamilyVault[] = [
  {
    id: 'album-01',
    title: 'Royal Wedding in Jaipur (1956)',
    description: 'Grandfather and Grandmother tied the knot. Captured on old monochrome emulsion sheets at the Taj Rambagh Palace.',
    category: 'wedding',
    coverUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
    createdDate: '2026-01-10',
    ownerId: 'user-01',
    sharedWith: ['children@gmail.com', 'cousins@yahoo.com']
  },
  {
    id: 'album-02',
    title: 'Our First Maruti Suzuki 800 (1984)',
    description: 'Preserving the excitement of the family bringing home our very first automobile in Old Delhi. Stained polaroids restored.',
    category: 'childhood',
    coverUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80',
    createdDate: '2026-03-22',
    ownerId: 'user-01',
    sharedWith: ['parents@gmail.com']
  }
];

export const INITIAL_FILES: FileItem[] = [
  {
    id: 'file-01',
    name: 'Grandfather Royal Jaipur Wedding Portait.png',
    type: 'image',
    category: 'wedding',
    albumId: 'album-01',
    originalUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&q=80&blend=black&blend-mode=color', // Simulated faded/tinted vintage
    restoredUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80', // Beautiful sharp, clear
    thumbnailUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=300&q=80',
    createdAt: '2026-05-12T00:00:00.000Z',
    aiEnhancementLog: [
      'Scanned with high-dynamic range CCD scanning elements at 1200 DPI.',
      'AI restoration core initiated: 432 scratches isolated.',
      'Neural color synthesis applied for Jaipur Royal Emulsion style.',
      'Super-resolution scale factor x4 applied.'
    ],
    restorationNotes: 'Physical crease lines successfully filled with chemical color inference. Eye definitions enhanced using ancestral face anchors.',
    resolution: '3840 x 2880 (4K UHD)',
    fileSize: '4.8 MB',
    dateAdded: '2026-05-12',
    userId: 'user-01'
  },
  {
    id: 'file-02',
    name: 'Brothers playing in Haveli Courtyard.png',
    type: 'image',
    category: 'childhood',
    albumId: 'album-02',
    originalUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&q=80&sepia=100', // sepia faded
    restoredUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80', // sharp detail
    thumbnailUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80',
    createdAt: '2026-05-18T00:00:00.000Z',
    aiEnhancementLog: [
      'Identified extreme silver deterioration.',
      'Dynamic thresholding applied to reveal hidden shadow depth.',
      'Facial structure auto-realigning active.'
    ],
    restorationNotes: 'Corrected contrast. Removed heavy tea-staining on the left border.',
    resolution: '4096 x 3072',
    fileSize: '5.2 MB',
    dateAdded: '2026-05-18',
    userId: 'user-01'
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'order-101',
    userId: 'user-01',
    customerName: 'Aarav Sharma',
    customerPhone: '+91 98765 43210',
    dateCreated: '2026-05-24',
    serviceType: '8mm Film Reel & Photo Album Heritage Restoration',
    itemCount: 4,
    deliveryStatus: 'partner_accepted',
    restorationStage: 'collected',
    assignedPartnerId: 'partner-delhi', // Kartik
    pickupOtp: '4820',
    otpVerified: false,
    eta: 'Today by 5:30 PM',
  },
  {
    id: 'order-102',
    userId: 'user-01',
    customerName: 'Aarav Sharma',
    customerPhone: '+91 98765 43210',
    dateCreated: '2026-05-10',
    serviceType: '1 VHS Cassette Digitization (Shimla Summer Vacation 1995)',
    itemCount: 1,
    deliveryStatus: 'delivered',
    restorationStage: 'completed',
    assignedPartnerId: 'partner-jaipur', // Vikram
    pickupOtp: '1947',
    otpVerified: true,
    eta: 'Completed',
    rating: {
      partnerRating: 5,
      restorationRating: 5,
      feedback: 'Incredible experience! The entire family was in tears watching my grandparents walk around the cottage in 1995!'
    }
  }
];

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'appt-01',
    userId: 'user-01',
    customerName: 'Aarav Sharma',
    customerEmail: 'itzmebalustrade@gmail.com',
    customerPhone: '+91 98765 43210',
    address: '12, Heritage Lane, C-Scheme, Jaipur',
    city: 'Jaipur',
    scheduledDate: '2026-05-30',
    timeSlot: '10:00 AM - 01:00 PM',
    status: 'pending',
    notes: 'Please bring protective archival boxes. The old photographic albums are fragile and have paper mold.'
  }
];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-01',
    userId: 'user-01',
    title: 'Delivery Partner Assigned',
    message: 'Kartik Yadav is assigned for your pickup order #101 today.',
    type: 'pickup',
    date: '2026-05-28',
    isRead: false
  },
  {
    id: 'notif-02',
    userId: 'user-01',
    title: 'Restoration Completed 🎉',
    message: 'Your tape Shimla vacation 1995 is ready! You can now download files.',
    type: 'restoration',
    date: '2026-05-15',
    isRead: true
  }
];

export const TEAM_MEMBERS = [
  {
    name: 'Priya Iyer',
    role: 'Co-Founder & Digital Anthropologist',
    bio: 'Preserved archives for state museums across Rajasthan. Graduated from Oxford in Archival Studies and Culture Preservation Science.',
    img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&q=80'
  },
  {
    name: 'Ananya Sen',
    role: 'Lead AI Image Scientist & Colorist',
    bio: 'Spent 8 years modifying neural networks to restore original historical pigment parameters on stained materials.',
    img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80'
  },
  {
    name: 'Rohit Deshmukh',
    role: 'VHS & Analog Media Engineer',
    bio: 'Expert at reconstructing physically molded magnetic tapes. Maintains vintage custom tape heads and playback machines.',
    img: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&q=80'
  }
];

export const FAQS = [
  {
    q: 'How does the secure home pickup and delivery work?',
    a: 'We understand your memories are irreplaceable. A certified ReLive Delivery Partner arrives with high-impact, static-free, waterproof hard cases. We verify pickup using our Secure OTP Protocol. Your items are logged under camera supervision and secured immediately.'
  },
  {
    q: 'Is it safe to scan moldy VHS tapes or peeling photos?',
    a: 'Yes. Our specialized restoration team cleans vintage assets chemically in an dust-free ISO-5 Class clean room before scanning. We use advanced thermal tape baking for sticky-shed VHS cassettes and gentle non-abrasive optical scans for decaying prints.'
  },
  {
    q: 'Are our family photos private?',
    a: 'Absolutely. We follow strict local and role-based access rules. Files are stored and encrypted securely, and only assigned restoration artists ever view them for quality check purposes. They are never shared or indexed on public databases.'
  },
  {
    q: 'Can I export the restored memories to Google Drive or order printed copies?',
    a: 'Yes, your user panel includes a one-click Google Drive Sync function. You can also export as zipped ultra HD files, download individual files, or order premium physical albums directly through our print fulfillment link.'
  }
];
