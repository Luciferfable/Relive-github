export type UserRole = 'user' | 'admin' | 'partner' | 'restorer';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  profilePhoto?: string;
  phone?: string;
  phoneVerified?: boolean;
  vehicleType?: string; // for partners
  city?: string;
  rating?: number;
  ordersCount?: number;
  address?: string;
  isSandbox?: boolean;
  emailVerified?: boolean;
  previousBills?: PaymentBill[];
}

export type RestorationStage =
  | 'collected'
  | 'cleaning'
  | 'scanning'
  | 'ai_enhancement'
  | 'color_restoration'
  | 'repair'
  | 'quality_check'
  | 'uploaded'
  | 'completed';

export type DeliveryStatus =
  | 'appointment_created'
  | 'partner_assigned'
  | 'partner_accepted'
  | 'on_the_way'
  | 'arrived'
  | 'pickup_verified' // OTP matching verified
  | 'collected'
  | 'processing'
  | 'restoring'
  | 'completed'
  | 'delivered';

export interface PaymentBill {
  id: string;
  orderId: string;
  userId: string;
  userName: string;
  serviceType: string;
  amount: number;
  paymentId: string;
  datePaid: string;
}

export interface FileItem {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'album';
  category?: 'wedding' | 'childhood' | 'heritage' | 'general';
  albumId?: string; // For grouping in Family Vault
  originalUrl: string;
  restoredUrl: string;
  thumbnailUrl?: string;
  createdAt?: string;
  aiEnhancementLog?: string[];
  restorationNotes?: string;
  resolution?: string;
  fileSize?: string;
  dateAdded: string;
  userId: string;
  s3Url?: string;
  uploadedToS3?: boolean;
  previewUrl?: string;
  orderId?: string;
  isLocked?: boolean;
  isShared?: boolean;
}

export interface FamilyVault {
  id: string;
  title: string;
  description: string;
  category: 'wedding' | 'childhood' | 'heritage' | 'general';
  coverUrl: string;
  createdDate: string;
  ownerId: string;
  sharedWith: string[]; // email addresses
}

export interface Appointment {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  alternatePhone?: string;
  address: string;
  city: string;
  scheduledDate: string;
  timeSlot: string;
  status: 'pending' | 'assigned' | 'completed' | 'cancelled';
  notes: string;
  latitude?: number;
  longitude?: number;
}

export interface Order {
  id: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  alternatePhone?: string;
  dateCreated: string;
  serviceType: string; // e.g. "VHS Digitization", "Photo Album Restoration"
  itemCount: number;
  deliveryStatus: DeliveryStatus;
  restorationStage: RestorationStage;
  assignedPartnerId?: string;
  pickupOtp?: string;
  otpVerified: boolean;
  eta?: string;
  address?: string;
  notes?: string;
  courierProgress?: number; // 0 to 100 percentage of route completed
  courierLat?: number;
  courierLng?: number;
  latitude?: number;
  longitude?: number;
  rating?: {
    partnerRating?: number;
    restorationRating?: number;
    feedback?: string;
  };
  isPaid?: boolean;
  paymentId?: string;
  priceAmount?: number;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order' | 'pickup' | 'restoration' | 'delivery' | 'general';
  date: string;
  isRead: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}
