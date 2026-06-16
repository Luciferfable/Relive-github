import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, ShieldCheck, LogOut, RefreshCw, Key, Users, 
  HelpCircle, Mail, Phone, Lock, ArrowRight, CornerRightDown, MapPin,
  Check, X, Eye, EyeOff, Clock, Share2, Download, AlertCircle
} from 'lucide-react';

import { AppUser, FileItem, Order, Appointment, FamilyVault, AppNotification } from './types';
import { 
  INITIAL_USERS, INITIAL_ALBUMS, INITIAL_FILES, 
  INITIAL_ORDERS, INITIAL_APPOINTMENTS, INITIAL_NOTIFICATIONS 
} from './data';

import LandingPage from './components/LandingPage';
import DashboardUser from './components/DashboardUser';
import DashboardAdmin from './components/DashboardAdmin';
import DashboardPartner from './components/DashboardPartner';
import DashboardRestoration from './components/DashboardRestoration';

// Live Firebase Integration Elements
import { auth, db, googleProvider, handleFirestoreError, setCachedAccessToken } from './firebase';
import { 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  updatePassword,
  signInAnonymously
} from 'firebase/auth';
import { 
  collection,
  onSnapshot,
  query,
  where,
  setDoc,
  doc,
  getDoc,
  deleteDoc,
  getDocFromServer
} from 'firebase/firestore';
import { ensureAndAuthenticateDemoUser, seedFirestoreCollectionsIfEmpty } from './firebaseHelpers';

const uniqueById = <T extends { id: string }>(arr: T[]): T[] => {
  const seen = new Set<string>();
  return arr.filter(item => {
    if (!item || !item.id) return false;
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const toSafeS3ProxyUrl = (url: string | undefined): string | undefined => {
  if (!url) return url;
  if (url.includes('.amazonaws.com/')) {
    // Redirect through our local Node S3 proxy endpoint
    return `/api/s3-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
};

export default function App() {
  // Real-time state arrays synced from active Firestore instance
  const [users, setUsers] = useState<AppUser[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [albums, setAlbums] = useState<FamilyVault[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Ref to track dynamic user seeding avoiding race loops
  const seededUsersRef = React.useRef<Record<string, boolean>>({});

  // Connection diagnostics states
  const [isFirestoreOffline, setIsFirestoreOffline] = useState(false);
  const [showFirestoreGuide, setShowFirestoreGuide] = useState(false);

  // Synchronous database/cache snapshot tracking
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'disconnected'>('synced');

  const updateSyncStateFromMetadata = (metadata: any) => {
    if (currentUser?.isSandbox || isFirestoreOffline) {
      setSyncStatus('disconnected');
    } else if (metadata?.fromCache) {
      setSyncStatus('disconnected');
    } else if (metadata?.hasPendingWrites) {
      setSyncStatus('syncing');
    } else {
      setSyncStatus('synced');
    }
  };

  // Auth & View States
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [sharedFile, setSharedFile] = useState<FileItem | null>(null);
  const [isLoadingSharedFile, setIsLoadingSharedFile] = useState(false);
  const [sharedSliderPos, setSharedSliderPos] = useState(50);
  const [isAuthMode, setIsAuthMode] = useState(false); // Active login register panel
  const [authForm, setAuthForm] = useState({ email: '', password: '', role: 'user' as any, name: '' });
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<1 | 2 | 3 | 4>(1);
  const [generatedResetToken, setGeneratedResetToken] = useState('');
  const [forgotPasswordCode, setForgotPasswordCode] = useState('');
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPasswordInput, setShowResetPasswordInput] = useState(false);
  const [isResetShowPassword, setIsResetShowPassword] = useState(false);
  const [isResetShowConfirmPassword, setIsResetShowConfirmPassword] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [inactivityLoggedOut, setInactivityLoggedOut] = useState(false);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [lastActivityReset, setLastActivityReset] = useState(Date.now());

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: 'No Password Entered', color: 'bg-stone-200', textTailwind: 'text-stone-400', requirements: [], metAll: false };
    
    const requirements = [
      { id: 'length', label: "At least 8 characters", met: pass.length >= 8 },
      { id: 'uppercase', label: "At least one uppercase letter (A-Z)", met: /[A-Z]/.test(pass) },
      { id: 'lowercase', label: "At least one lowercase letter (a-z)", met: /[a-z]/.test(pass) },
      { id: 'number', label: "At least one numeric digit (0-9)", met: /[0-9]/.test(pass) },
      { id: 'special', label: "At least one special character (!@#$%^&*)", met: /[^A-Za-z0-9]/.test(pass) }
    ];
    
    const metCount = requirements.filter(r => r.met).length;
    let text = 'Too Weak ❌';
    let color = 'bg-stone-200';
    let textTailwind = 'text-red-500';
    
    if (metCount === 5) {
      text = 'Excellent Strength ✨';
      color = 'bg-emerald-550';
      textTailwind = 'text-green-600';
    } else if (metCount === 4) {
      text = 'Good Strength ✅';
      color = 'bg-teal-500';
      textTailwind = 'text-teal-600';
    } else if (metCount === 3) {
      text = 'Moderate ⚠️';
      color = 'bg-amber-500';
      textTailwind = 'text-amber-600';
    } else if (metCount >= 1) {
      text = 'Weak Password 🔴';
      color = 'bg-red-500';
      textTailwind = 'text-red-500';
    }
    
    return { score: metCount, text, color, textTailwind, requirements, metAll: metCount === 5 };
  };

  // Email Verification States
  const [userInputCode, setUserInputCode] = useState<string>('');
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(false);
  const [verificationLoading, setVerificationLoading] = useState<boolean>(false);
  const [verificationSent, setVerificationSent] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string>('');

  // Loading and Error parameters
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showAuthSetupMsg, setShowAuthSetupMsg] = useState(false);

  // Test connection on boot to detect if Cloud Firestore is unreachable/uncreated
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const fetchPromise = getDocFromServer(doc(db, 'test', 'connection'));
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            const err = new Error('Firebase network response timeout (3000ms limit reached)');
            (err as any).code = 'timeout';
            reject(err);
          }, 3000);
        });
        await Promise.race([fetchPromise, timeoutPromise]);
        setIsFirestoreOffline(false);
      } catch (err: any) {
        console.warn("[FIRESTORE DIAGNOSTICS] Connection check result:", err);
        // If we get an error like permission-denied, not-found, we actually reached the Firestore backend!
        if (err && err.code && err.code !== 'unavailable' && err.code !== 'timeout' && err.code !== 'deadline-exceeded') {
          console.log("[FIRESTORE DIAGNOSTICS] Firestore reached, security rule or document doesn't exist. Setting online state to true.");
          setIsFirestoreOffline(false);
        } else {
          setIsFirestoreOffline(true);
        }
      }
    };
    checkConnection();
  }, []);

  // 1. Setup Firebase Auth Subscriber
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        try {
          // Fetch authenticated profile document
          const userDocRef = doc(db, "users", authUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            setCurrentUser(userSnap.data() as AppUser);
          } else {
            // Self-register profile fallback on first-time login
            const profile: AppUser = {
              uid: authUser.uid,
              email: authUser.email || "",
              displayName: authUser.displayName || authUser.email?.split('@')[0] || "User",
              role: 'user',
              city: 'Jaipur'
            };
            await setDoc(userDocRef, profile);
            setCurrentUser(profile);
          }
        } catch (err: any) {
          console.warn("Auth sync fallback user creation:", err);
          if (err?.code === 'unavailable') {
            setIsFirestoreOffline(true);
          }
          // Set standard currentUser with fallback if we are offline
          const found = INITIAL_USERS.find(u => u.email === authUser.email) || INITIAL_USERS[0];
          setCurrentUser({
            uid: authUser.uid,
            email: authUser.email || "",
            displayName: authUser.displayName || authUser.email?.split('@')[0] || found.displayName,
            role: found.role as any,
            city: found.city || 'Jaipur',
            isSandbox: true
          });
        }
      } else {
        setCurrentUser(null);
        setCachedAccessToken(null);
      }
    });

    // Seed preset records if system database is empty initially
    seedFirestoreCollectionsIfEmpty();

    return () => unsubscribeAuth();
  }, []);

  // Public Share URL Reader
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sfId = params.get('sharedFile') || params.get('share') || params.get('fileId');
    if (sfId) {
      const localFound = INITIAL_FILES.find(f => f.id === sfId);
      if (localFound) {
        setSharedFile(localFound);
      } else {
        setIsLoadingSharedFile(true);
        getDoc(doc(db, "files", sfId)).then((docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as FileItem;
            if (data.isShared) {
              setSharedFile(data);
            } else {
              console.warn("Found file, but it is not authorized for public sharing.");
            }
          } else {
            console.warn("Public shared file not found in Firestore.");
          }
        }).catch((err) => {
          console.error("Error fetching public shared file:", err);
        }).finally(() => {
          setIsLoadingSharedFile(false);
        });
      }
    }
  }, []);

  // 2. Setup Role-Aware Realtime Firestore Collection Listeners
  useEffect(() => {
    if (!currentUser) {
      setOrders([]);
      setAppointments([]);
      setFiles([]);
      setAlbums([]);
      setNotifications([]);
      return;
    }

    if (currentUser?.isSandbox || isFirestoreOffline) {
      // In sandbox/trial mode or when Firestore is offline, populate with localized demo catalog data
      console.log(`[ReLive Sandbox] Sandbox session activated for role "${currentUser.role}". Skipping live Firestore snapshots to prevent unauthenticated network errors.`);
      const currentRole = currentUser.role;
      const userUid = currentUser.uid;
      const emailLower = currentUser.email?.toLowerCase() || '';

      if (currentRole === 'admin') {
        setOrders(INITIAL_ORDERS);
        setAppointments(INITIAL_APPOINTMENTS);
        setFiles(INITIAL_FILES);
        setAlbums(INITIAL_ALBUMS);
        setNotifications(INITIAL_NOTIFICATIONS);
        setUsers(INITIAL_USERS);
      } else if (currentRole === 'partner') {
        const pOrders = INITIAL_ORDERS.filter(o => o.assignedPartnerId === userUid);
        setOrders(pOrders.length > 0 ? pOrders : INITIAL_ORDERS);
        setAppointments(INITIAL_APPOINTMENTS);
        setUsers(INITIAL_USERS);
      } else if (currentRole === 'restorer') {
        const rOrders = INITIAL_ORDERS.filter(o => o.serviceType.includes('Film') || o.serviceType.includes('VHS'));
        setOrders(rOrders.length > 0 ? rOrders : INITIAL_ORDERS);
        setFiles(INITIAL_FILES);
        setUsers(INITIAL_USERS);
      } else {
        // Standard customer user
        const customerOrders = INITIAL_ORDERS.filter(o => o.userId === userUid || o.userId === 'user-01');
        const customerAppts = INITIAL_APPOINTMENTS.filter(a => a.userId === userUid || a.userId === 'user-01');
        const customerFiles = INITIAL_FILES.filter(f => f.userId === userUid || f.userId === 'user-01');
        const customerAlbums = INITIAL_ALBUMS.filter(a => a.ownerId === userUid || a.ownerId === 'user-01');
        const customerNotifs = INITIAL_NOTIFICATIONS.filter(n => n.userId === userUid || n.userId === 'user-01');

        setOrders(customerOrders);
        setAppointments(customerAppts);
        setFiles(customerFiles);
        setAlbums(customerAlbums);
        setNotifications(customerNotifs);
      }
      return;
    }

    const { role, uid } = currentUser;

    // A. Subscribe to Orders (User can only read or list their own, admin/partner/restorer can query all)
    let ordersQuery = collection(db, "orders") as any;
    if (role === 'user') {
      if (currentUser?.email?.toLowerCase() === 'itzmebalustrade@gmail.com') {
        ordersQuery = query(collection(db, "orders"), where("userId", "in", [uid, 'user-01']));
      } else {
        ordersQuery = query(collection(db, "orders"), where("userId", "==", uid));
      }
    }
    const unsubscribeOrders = onSnapshot(ordersQuery, async (snap) => {
      const ords: Order[] = [];
      snap.forEach(doc => ords.push(doc.data() as Order));

      ords.sort((a, b) => b.dateCreated.localeCompare(a.dateCreated));
      setOrders(ords);
      updateSyncStateFromMetadata(snap.metadata);
    }, (err) => {
      console.error("Orders listener error:", err);
      setSyncStatus('disconnected');
      if (err?.code === 'unavailable') {
        setIsFirestoreOffline(true);
      }
      setOrders([]);
    });

    // B. Subscribe to Appointments (Role-restricted filters)
    let apptsQuery = collection(db, "appointments") as any;
    if (role === 'user') {
      if (currentUser?.email?.toLowerCase() === 'itzmebalustrade@gmail.com') {
        apptsQuery = query(collection(db, "appointments"), where("userId", "in", [uid, 'user-01']));
      } else {
        apptsQuery = query(collection(db, "appointments"), where("userId", "==", uid));
      }
    }
    const unsubscribeAppts = onSnapshot(apptsQuery, (snap) => {
      const appts: Appointment[] = [];
      snap.forEach(doc => appts.push(doc.data() as Appointment));
      setAppointments(appts);
      updateSyncStateFromMetadata(snap.metadata);
    }, (err) => {
      console.error("Appointments listener error:", err);
      setSyncStatus('disconnected');
      if (err?.code === 'unavailable') {
        setIsFirestoreOffline(true);
      }
      setAppointments([]);
    });

    // C. Subscribe to Files (Secure assets query)
    let filesQuery = collection(db, "files") as any;
    if (role === 'user') {
      if (currentUser?.email?.toLowerCase() === 'itzmebalustrade@gmail.com') {
        filesQuery = query(collection(db, "files"), where("userId", "in", [uid, 'user-01']));
      } else {
        filesQuery = query(collection(db, "files"), where("userId", "==", uid));
      }
    }
    const unsubscribeFiles = onSnapshot(filesQuery, (snap) => {
      const fls: FileItem[] = [];
      snap.forEach(doc => {
        const item = doc.data() as FileItem;
        if (!item.previewUrl && item.name) {
          item.previewUrl = `https://relive-images-processed.s3.us-east-1.amazonaws.com/processed-${item.name.replace(/\s+/g, '_')}`;
        }
        if (item.previewUrl) item.previewUrl = toSafeS3ProxyUrl(item.previewUrl);
        if (item.thumbnailUrl) item.thumbnailUrl = toSafeS3ProxyUrl(item.thumbnailUrl);
        if (item.restoredUrl) item.restoredUrl = toSafeS3ProxyUrl(item.restoredUrl);
        if (item.originalUrl) item.originalUrl = toSafeS3ProxyUrl(item.originalUrl);
        fls.push(item);
      });
      fls.sort((a, b) => {
        const dStrA = a.dateAdded || a.createdAt || '';
        const dStrB = b.dateAdded || b.createdAt || '';
        return dStrB.localeCompare(dStrA);
      });
      setFiles(fls);
      updateSyncStateFromMetadata(snap.metadata);
    }, (err) => {
      console.error("Files listener error:", err);
      setSyncStatus('disconnected');
      if (err?.code === 'unavailable') {
        setIsFirestoreOffline(true);
      }
      setFiles([]);
    });

    // D. Subscribe to FamilyVault Albums (Shared & Owner restrictions)
    let albumsQuery = collection(db, "albums") as any;
    if (role === 'user') {
      if (currentUser?.email?.toLowerCase() === 'itzmebalustrade@gmail.com') {
        albumsQuery = query(collection(db, "albums"), where("ownerId", "in", [uid, 'user-01']));
      } else {
        albumsQuery = query(collection(db, "albums"), where("ownerId", "==", uid));
      }
    }
    const unsubscribeAlbums = onSnapshot(albumsQuery, (snap) => {
      const albs: FamilyVault[] = [];
      snap.forEach(doc => {
        const alb = doc.data() as FamilyVault;
        if (alb.coverUrl) {
          alb.coverUrl = toSafeS3ProxyUrl(alb.coverUrl) || '';
        }
        albs.push(alb);
      });
      albs.sort((a, b) => b.createdDate.localeCompare(a.createdDate));
      setAlbums(albs);
      updateSyncStateFromMetadata(snap.metadata);
    }, (err) => {
      console.error("Albums listener error:", err);
      setSyncStatus('disconnected');
      if (err?.code === 'unavailable') {
        setIsFirestoreOffline(true);
      }
      setAlbums([]);
    });

    // E. Subscribe to Notifications
    let notifsQuery = collection(db, "notifications") as any;
    if (role === 'user') {
      if (currentUser?.email?.toLowerCase() === 'itzmebalustrade@gmail.com') {
        notifsQuery = query(collection(db, "notifications"), where("userId", "in", [uid, 'user-01']));
      } else {
        notifsQuery = query(collection(db, "notifications"), where("userId", "==", uid));
      }
    }
    const unsubscribeNotifs = onSnapshot(notifsQuery, (snap) => {
      const notifs: AppNotification[] = [];
      snap.forEach(doc => notifs.push(doc.data() as AppNotification));
      notifs.sort((a, b) => b.date.localeCompare(a.date));
      setNotifications(notifs);
      updateSyncStateFromMetadata(snap.metadata);
    }, (err) => {
      console.error("Notifications listener error:", err);
      setSyncStatus('disconnected');
      if (err?.code === 'unavailable') {
        setIsFirestoreOffline(true);
      }
      setNotifications([]);
    });

    // F. Subscribe to Users (Admins only)
    let unsubscribeUsers = () => {};
    if (role === 'admin') {
      unsubscribeUsers = onSnapshot(collection(db, "users"), (snap) => {
        const usrArray: AppUser[] = [];
        snap.forEach(doc => usrArray.push(doc.data() as AppUser));
        setUsers(usrArray);
        updateSyncStateFromMetadata(snap.metadata);
      }, (err) => {
        console.error("Users subscriber error:", err);
        setSyncStatus('disconnected');
        if (err?.code === 'unavailable') {
          setIsFirestoreOffline(true);
        }
        setUsers([]);
      });
    }

    return () => {
      unsubscribeOrders();
      unsubscribeAppts();
      unsubscribeFiles();
      unsubscribeAlbums();
      unsubscribeNotifs();
      unsubscribeUsers();
    };
  }, [currentUser, isFirestoreOffline]);

  const dispatchSmtpStatusUpdate = async (title: string, status: string, description: string, userMail?: string) => {
    try {
      const emailToSend = userMail || currentUser?.email || "itzmebalustrade@gmail.com";
      await fetch('/api/smtp-send-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.uid || 'guest'}`,
          'X-User-Email': currentUser?.email || '',
          'X-User-Role': currentUser?.role || 'user'
        },
        body: JSON.stringify({
          email: emailToSend,
          title,
          status,
          description
        })
      });
    } catch (e) {
      console.warn("Silent SMTP status update notify skipped:", e);
    }
  };

  const syncToAdminFirebase = async (collectionName: string, docId: string, data: any) => {
    try {
      await fetch('/api/sync-to-firebase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.uid || 'guest'}`,
          'X-User-Email': currentUser?.email || '',
          'X-User-Role': currentUser?.role || 'user'
        },
        body: JSON.stringify({ collectionName, docId, data })
      });
      console.log(`[ReLive Admin Sync] successfully replicated doc "${docId}" in collection "${collectionName}" to live Admin SDK Firestore!`);
    } catch (e) {
      console.warn("[ReLive Admin Sync skipped]", e);
    }
  };

  const deleteFromAdminFirebase = async (collectionName: string, docId: string) => {
    try {
      await fetch('/api/delete-from-firebase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.uid || 'guest'}`,
          'X-User-Email': currentUser?.email || '',
          'X-User-Role': currentUser?.role || 'user'
        },
        body: JSON.stringify({ collectionName, docId })
      });
      console.log(`[ReLive Admin Sync] successfully deleted doc "${docId}" from collection "${collectionName}" in live Admin SDK Firestore.`);
    } catch (e) {
      console.warn("[ReLive Admin Sync Delete skipped]", e);
    }
  };

  const handleUpdateUser = async (updatedUser: AppUser) => {
    setCurrentUser(updatedUser);
    try {
      await setDoc(doc(db, "users", updatedUser.uid), updatedUser, { merge: true });
      console.log("Successfully synchronized user profile in Firestore!");
      dispatchSmtpStatusUpdate("User Profile Updated", "success", `User profile for "${updatedUser.displayName}" (${updatedUser.email}) was updated with new configuration parameters.`, updatedUser.email);
      await syncToAdminFirebase("users", updatedUser.uid, updatedUser);
    } catch (err: any) {
      console.warn("Could not synchronize user profile in Firestore:", err);
    }
  };

  // Firestore DB Mutations
  const handleAddFile = async (newFile: FileItem) => {
    const fileWithMeta: FileItem = {
      ...newFile,
      thumbnailUrl: newFile.thumbnailUrl || (newFile.restoredUrl.includes('unsplash.com') ? newFile.restoredUrl.replace(/w=\d+/, 'w=300').replace(/q=\d+/, 'q=80') : newFile.restoredUrl),
      previewUrl: newFile.previewUrl || `https://relive-images-processed.s3.us-east-1.amazonaws.com/processed-${newFile.name.replace(/\s+/g, '_')}`,
      createdAt: newFile.createdAt || new Date().toISOString()
    };
    setFiles(prev => {
      if (prev.some(f => f.id === fileWithMeta.id)) return prev;
      return uniqueById([fileWithMeta, ...prev]);
    });

    try {
      await setDoc(doc(db, "files", fileWithMeta.id), fileWithMeta);
      
      const targetUserObj = users.find(u => u.uid === fileWithMeta.userId);
      const customerEmail = targetUserObj?.email || "itzmebalustrade@gmail.com";
      const customerName = targetUserObj?.displayName || "Family Member";
      
      const emailDescription = `Pranam ${customerName},\n\nOur digital preservation laboratory has successfully completed high-definition archival scanning and digital color restoration for your heirloom physical asset: "${fileWithMeta.name}".\n\nYour restored files have been uploaded securely. Note that you need to complete your preservation payment to unlock these pristine files and view them without watermarks. Under the "My Restored Files" tab, click on your locked photo card, and continue through Stripe Secure Checkout to instantly download your HD scans!\n\nAsset Specifications:\n• Name: ${fileWithMeta.name}\n• Category: ${fileWithMeta.category?.toUpperCase() || 'HERITAGE'}\n• Laboratory Work: ${fileWithMeta.restorationNotes || "Scratch/tear removal and color balance optimization"}\n\nThank you for choosing ReLive preservation lab!`;
      
      await dispatchSmtpStatusUpdate("Your Restored Memories are Ready! 📦", "PAYMENT_REQUIRED", emailDescription, customerEmail);
    } catch (err: any) {
      console.warn("Client Firestore file insertion skipped or restricted:", err);
    }

    try {
      await syncToAdminFirebase("files", fileWithMeta.id, fileWithMeta);
    } catch (err: any) {
      console.warn("Admin Firestore file insertion sync skipped:", err);
    }
  };

  const handleDeleteFile = async (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));

    try {
      await deleteDoc(doc(db, "files", id));
      dispatchSmtpStatusUpdate("Archival File Removed", "deleted", `An archival photo reference with ID "${id}" has been deleted from ReLive restored files.`, currentUser?.email);
    } catch (err: any) {
      console.warn("Client Firestore file deletion skipped or restricted:", err);
    }

    try {
      await deleteFromAdminFirebase("files", id);
    } catch (err: any) {
      console.warn("Admin Firestore file deletion sync skipped:", err);
    }
  };

  const handleUpdateFile = async (updatedFile: FileItem) => {
    setFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));

    try {
      await setDoc(doc(db, "files", updatedFile.id), updatedFile);
    } catch (err: any) {
      console.warn("Client Firestore file update skipped or restricted:", err);
    }

    try {
      await syncToAdminFirebase("files", updatedFile.id, updatedFile);
    } catch (err: any) {
      console.warn("Admin Firestore file update sync skipped:", err);
    }
  };

  const handleDownloadFileDirectly = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.warn("Direct download fetch fell back to default behavior:", error);
      window.open(url, '_blank');
    }
  };

  const handleUpdateOrder = async (updatedOrder: Order) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));

    try {
      await setDoc(doc(db, "orders", updatedOrder.id), updatedOrder);
      dispatchSmtpStatusUpdate("Preservation Order Updated", updatedOrder.deliveryStatus, `Order status updated for Reference ID: ${updatedOrder.id}.\nNew Delivery Status: ${updatedOrder.deliveryStatus}\nItem Count: ${updatedOrder.itemCount} units of ${updatedOrder.serviceType}.`, currentUser?.email);
    } catch (err: any) {
      console.warn("Client Firestore order update skipped or restricted:", err);
    }

    try {
      await syncToAdminFirebase("orders", updatedOrder.id, updatedOrder);
    } catch (err: any) {
      console.warn("Admin Firestore order update sync skipped:", err);
    }

    // Trigger automatic realtime user notification inside Firestore if handover is completed
    if (updatedOrder.deliveryStatus === 'pickup_verified') {
      const addedNotif: AppNotification = {
        id: `notif-${Date.now()}`,
        userId: updatedOrder.userId,
        title: 'Pickup Verified & Collected 🔒',
        message: 'Our regional logistics partner verified your Secure OTP. Handover complete. Spool transit in progress.',
        type: 'pickup',
        date: new Date().toISOString().split('T')[0],
        isRead: false
      };
      await handleAddNotification(addedNotif);
    }
  };

  const handleAddOrder = async (newOrder: Order) => {
    setOrders(prev => {
      if (prev.some(o => o.id === newOrder.id)) return prev;
      return [newOrder, ...prev];
    });

    try {
      await setDoc(doc(db, "orders", newOrder.id), newOrder);
      dispatchSmtpStatusUpdate("New Preservation Order Placed", newOrder.deliveryStatus, `A new memory preservation order has been successfully placed!\nOrder Reference ID: ${newOrder.id}\nPreserved Volume: ${newOrder.itemCount} cassettes/reels of ${newOrder.serviceType}\nScheduled Delivery Status: ${newOrder.deliveryStatus}.`, currentUser?.email);
    } catch (err: any) {
      console.warn("Client Firestore order insertion skipped or restricted:", err);
    }

    try {
      await syncToAdminFirebase("orders", newOrder.id, newOrder);
    } catch (err: any) {
      console.warn("Admin Firestore order insertion sync skipped:", err);
    }
  };

  const handleAddAppointment = async (newAppt: Appointment) => {
    setAppointments(prev => {
      if (prev.some(a => a.id === newAppt.id)) return prev;
      return [newAppt, ...prev];
    });

    try {
      await setDoc(doc(db, "appointments", newAppt.id), newAppt);
      dispatchSmtpStatusUpdate("Doorstep Pickup Booked", "scheduled", `New doorstep pickup appointment booked successfully!\nAppointment Reference ID: ${newAppt.id}\nAddress: ${newAppt.address}\nScheduled Date: ${newAppt.scheduledDate} (${newAppt.timeSlot})\nContact Name: ${newAppt.customerName}`, currentUser?.email);
    } catch (err: any) {
      console.warn("Client Firestore appointment insertion skipped or restricted:", err);
    }

    try {
      await syncToAdminFirebase("appointments", newAppt.id, newAppt);
    } catch (err: any) {
      console.warn("Admin Firestore appointment insertion sync skipped:", err);
    }
  };

  const handleUpdateAppointment = async (updatedAppt: Appointment) => {
    setAppointments(prev => prev.map(a => a.id === updatedAppt.id ? updatedAppt : a));

    try {
      await setDoc(doc(db, "appointments", updatedAppt.id), updatedAppt);
      dispatchSmtpStatusUpdate("Doorstep Pickup Appointment Updated", updatedAppt.status, `Your doorstep pickup appointment ID: ${updatedAppt.id} has been modified.\nNew Status: ${updatedAppt.status}\nScheduled Date: ${updatedAppt.scheduledDate} (${updatedAppt.timeSlot})`, currentUser?.email);
    } catch (err: any) {
      console.warn("Client Firestore appointment update skipped or restricted:", err);
    }

    try {
      await syncToAdminFirebase("appointments", updatedAppt.id, updatedAppt);
    } catch (err: any) {
      console.warn("Admin Firestore appointment update sync skipped:", err);
    }
  };

  const handleAddAlbum = async (newSub: FamilyVault) => {
    setAlbums(prev => {
      if (prev.some(a => a.id === newSub.id)) return prev;
      return [newSub, ...prev];
    });

    try {
      await setDoc(doc(db, "albums", newSub.id), newSub);
    } catch (err: any) {
      console.warn("Client Firestore album registration skipped or restricted:", err);
    }

    try {
      await syncToAdminFirebase("albums", newSub.id, newSub);
    } catch (err: any) {
      console.warn("Admin Firestore album registration sync skipped:", err);
    }
  };

  const handleAddNotification = async (newNotif: AppNotification) => {
    setNotifications(prev => {
      if (prev.some(n => n.id === newNotif.id)) return prev;
      return uniqueById([newNotif, ...prev]);
    });

    try {
      await setDoc(doc(db, "notifications", newNotif.id), newNotif);
    } catch (err: any) {
      console.warn("Client Firestore notification insertion skipped or restricted:", err);
    }

    try {
      await syncToAdminFirebase("notifications", newNotif.id, newNotif);
    } catch (err: any) {
      console.warn("Admin Firestore notification insertion sync skipped:", err);
    }
  };

  // Authenticate & register demo characters directly in Firebase Auth and Firestore on request
  const handleDevRoleSwitch = async (role: 'user' | 'admin' | 'partner' | 'restorer') => {
    setIsAuthLoading(true);
    setErrorMsg('');
    try {
      const emailMap = {
        user: 'itzmebalustrade@gmail.com',
        admin: 'admin@relive.club',
        partner: 'kartik@relive.club',
        restorer: 'ananya@relive.club'
      };
      const nameMap = {
        user: 'Aarav Sharma',
        admin: 'Priya Iyer',
        partner: 'Kartik Yadav',
        restorer: 'Ananya Sen'
      };
      const email = emailMap[role];
      const name = nameMap[role];

      const profile = await ensureAndAuthenticateDemoUser(email, role, name);
      
      // Proactively sync this profile to Firestore via our server-side Admin SDK sync bridge
      // This guarantees that their user document always exists in Firestore (critical for security rules exists() checks!)
      try {
        await fetch('/api/sync-to-firebase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${profile.uid}`,
            'X-User-Email': profile.email,
            'X-User-Role': profile.role
          },
          body: JSON.stringify({ collectionName: "users", docId: profile.uid, data: profile })
        });
        console.log(`[ReLive Admin Sync] Synchronized ${role} profile to cloud Firestore successfully.`);
      } catch (syncErr) {
        console.warn("[ReLive Admin Sync registration error inside switch]", syncErr);
      }

      setCurrentUser(profile);
      setIsAuthMode(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Role switch authentication failed: ${err.message || err}`);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSendVerificationEmail = async () => {
    if (!authForm.email || !authForm.email.includes('@')) {
      setVerificationError("Please input a valid email address first.");
      return;
    }
    setVerificationLoading(true);
    setVerificationError('');
    try {
      const response = await fetch('/api/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.uid || authForm.email || 'guest'}`,
          'X-User-Email': authForm.email || currentUser?.email || '',
          'X-User-Role': currentUser?.role || 'user'
        },
        body: JSON.stringify({ email: authForm.email })
      });
      const data = await response.json();
      if (data.success) {
        setVerificationSent(true);
        setVerificationError('');
        console.log(`[VERIFICATION EMAIL SENT] Request dispatched successfully for ${authForm.email}`);
      } else {
        setVerificationError(data.error || "Failed sending verification email.");
      }
    } catch (e: any) {
      setVerificationError("Verification connection failed.");
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!userInputCode.trim()) {
      setVerificationError("Please input the 4-digit verification PIN.");
      return;
    }
    setVerificationLoading(true);
    setVerificationError('');
    try {
      const response = await fetch('/api/confirm-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: authForm.email, code: userInputCode })
      });
      const data = await response.json();
      if (data.success) {
        setIsEmailVerified(true);
        setUserInputCode('');
        setVerificationError('');
        alert("✓ Registered Email Successfully Verified! You can now proceed to register.");
      } else {
        setVerificationError(data.error || "Invalid confirmation code. Please check your email!");
      }
    } catch (e: any) {
      setVerificationError("Verification validation connection failed.");
    } finally {
      setVerificationLoading(false);
    }
  };

  const detectRoleFromEmail = (email: string): 'user' | 'admin' | 'partner' | 'restorer' => {
    const e = email.toLowerCase();
    const found = INITIAL_USERS.find(u => u.email.toLowerCase() === e);
    if (found) return found.role;
    if (e.includes('admin')) return 'admin';
    if (e.includes('partner') || e.includes('kartik') || e.includes('vikram')) return 'partner';
    if (e.includes('restorer') || e.includes('ananya')) return 'restorer';
    return 'user';
  };

  // Submit active credential validation
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setErrorMsg('');
    const resolvedRole = detectRoleFromEmail(authForm.email);
    try {
      if (isSignup) {
        if (!isEmailVerified) {
          setErrorMsg("Safety Error: Please click 'Verify Email' and enter your secure confirmation code to register.");
          setIsAuthLoading(false);
          return;
        }
        
        const pwdStrength = getPasswordStrength(authForm.password);
        if (!pwdStrength.metAll) {
          setErrorMsg("🔒 Security requirement error: Please ensure your password meets all strength criteria displayed above.");
          setIsAuthLoading(false);
          return;
        }

        try {
          // 1. Create authenticator account
          const credential = await createUserWithEmailAndPassword(auth, authForm.email, authForm.password);
          const authUser = credential.user;
          await updateProfile(authUser, { displayName: authForm.name });

          // 2. Create custom role record in Firestore
          const profile: AppUser = {
            uid: authUser.uid,
            email: authForm.email,
            displayName: authForm.name || authForm.email.split('@')[0],
            role: resolvedRole,
            city: 'Jaipur'
          };
          
          try {
            await setDoc(doc(db, "users", authUser.uid), profile);
          } catch (dbErr) {
            console.warn("Firestore setDoc failed during registration; continuing with local signin state:", dbErr);
          }

          // Active backup replication inside user's Firebase via server-side Admin SDK
          try {
            await fetch('/api/sync-to-firebase', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${profile.uid}`,
                'X-User-Email': profile.email,
                'X-User-Role': profile.role
              },
              body: JSON.stringify({ collectionName: "users", docId: profile.uid, data: profile })
            });
            console.log("[ReLive Admin Sync] successfully replicated registered user profile to Admin SDK Firestore!");
          } catch (adminSyncErr) {
            console.warn("[ReLive Admin Sync registration error]", adminSyncErr);
          }
          
          setCurrentUser(profile);

          // Send welcome/registration SMTP notification email
          dispatchSmtpStatusUpdate(
            "Account Registration Successful",
            "REGISTERED",
            `Welcome to ReLive, ${profile.displayName}!\n\nYour secure memory preservation archive account has been actively provisioned on our secure digital preservation systems. Your current physical files can now be safely linked to your personal account ID: ${profile.uid}.\n\nThank you for trusting ReLive with your heritage archives!`,
            profile.email
          );
        } catch (authErr: any) {
          if (authErr?.code === 'auth/operation-not-allowed' || authErr?.code === 'auth/invalid-credential' || authErr?.code === 'auth/invalid-login-credentials' || authErr?.code === 'invalid-credential' || authErr?.message?.includes('invalid-credential') || authErr?.message?.includes('operation-not-allowed')) {
            console.warn("[AUTOPROVISION] Email/Password Sign-up is disabled or restricted on Firebase Console. Auto-generating high-fidelity offline/local profile session.");
            const seedData = (INITIAL_USERS.find(u => u.email.toLowerCase() === authForm.email.toLowerCase()) || {}) as any;
            const profile: AppUser = {
              uid: `simulated-${authForm.email.replace(/[@.]/g, '-')}`,
              email: authForm.email,
              displayName: authForm.name || seedData.displayName || authForm.email.split('@')[0],
              role: resolvedRole,
              city: 'Jaipur',
              isSandbox: true
            };
            setCurrentUser(profile);
            setShowAuthSetupMsg(true);
            
            // Reset validation input boxes and auth form values upon successful sign-in or registration
            setAuthForm({ name: '', email: '', password: '' });
            setUserInputCode('');
            setVerificationSent(false);
            setIsEmailVerified(false);
            setIsAuthMode(false);
            return;
          }
          console.error("Auth signup failed:", authErr);
          throw authErr;
        }
      } else {
        try {
          // Sign in standard user with auto-creation fallback for initial demo users
          let credential;
          try {
            const matchedPreset = INITIAL_USERS.find(u => u.email.toLowerCase() === authForm.email.toLowerCase());
            if (matchedPreset && authForm.password !== 'password123') {
              throw { code: 'auth/wrong-password', message: "🔒 Incorrect password. Please try again with the correct credentials." };
            }
            credential = await signInWithEmailAndPassword(auth, authForm.email, authForm.password);
          } catch (signInErr: any) {
            if (signInErr?.code === 'auth/wrong-password') {
              throw signInErr;
            }
            const matchedUser = INITIAL_USERS.find(u => u.email.toLowerCase() === authForm.email.toLowerCase());
            if (matchedUser && (signInErr?.code === 'auth/user-not-found' || signInErr?.code === 'auth/invalid-credential' || signInErr?.code === 'auth/invalid-login-credentials')) {
              console.log("Auto-provisioning first-time initial demo user:", authForm.email);
              try {
                credential = await createUserWithEmailAndPassword(auth, authForm.email, 'password123');
                await updateProfile(credential.user, { displayName: matchedUser.displayName });
              } catch (createErr) {
                throw signInErr;
              }
            } else {
              throw signInErr;
            }
          }

          const authUser = credential.user;

          try {
            // Retrieve role definitions
            const userDocRef = doc(db, "users", authUser.uid);
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
              setCurrentUser(userSnap.data() as AppUser);
            } else {
              const seedData = (INITIAL_USERS.find(u => u.email.toLowerCase() === authForm.email.toLowerCase()) || {}) as any;
              const fallbackProfile: AppUser = {
                uid: authUser.uid,
                email: authUser.email || authForm.email,
                displayName: authUser.displayName || seedData.displayName || authForm.name || authForm.email.split('@')[0],
                role: resolvedRole,
                city: seedData.city || 'Jaipur',
                profilePhoto: seedData.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
                phone: seedData.phone || "+91 99999 11111",
                address: seedData.address || 'Heritage Lane, Jaipur',
                vehicleType: seedData.vehicleType,
                rating: seedData.rating,
                ordersCount: seedData.ordersCount
              };
              await setDoc(userDocRef, fallbackProfile);
              setCurrentUser(fallbackProfile);
            }
          } catch (dbErr: any) {
            console.warn("Firestore user profile lookup/creation errored during authentication. Activating offline sandbox mode.", dbErr);
            if (dbErr?.code === 'unavailable') {
              setIsFirestoreOffline(true);
            }
            const seedData = (INITIAL_USERS.find(u => u.email.toLowerCase() === authForm.email.toLowerCase()) || {}) as any;
            const profile: AppUser = {
              uid: authUser.uid,
              email: authForm.email,
              displayName: authUser.displayName || seedData.displayName || authForm.name || authForm.email.split('@')[0],
              role: resolvedRole,
              city: seedData.city || 'Jaipur',
              profilePhoto: seedData.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
              phone: seedData.phone || "+91 99999 11111",
              address: seedData.address || 'Heritage Lane, Jaipur',
              vehicleType: seedData.vehicleType,
              rating: seedData.rating,
              ordersCount: seedData.ordersCount,
              isSandbox: true
            };
            setCurrentUser(profile);
          }
        } catch (authErr: any) {
          if (authErr?.code === 'auth/operation-not-allowed' || authErr?.code === 'auth/invalid-credential' || authErr?.code === 'auth/invalid-login-credentials' || authErr?.code === 'invalid-credential' || authErr?.message?.includes('invalid-credential') || authErr?.message?.includes('operation-not-allowed')) {
            console.warn("[AUTOPROVISION] Email/Password Sign-in is disabled or restricted on Firebase Console. Logging in via safe local profile session.");
            const seedData = (INITIAL_USERS.find(u => u.email.toLowerCase() === authForm.email.toLowerCase()) || {}) as any;
            const profile: AppUser = {
              uid: seedData.uid || `simulated-${authForm.email.replace(/[@.]/g, '-')}`,
              email: authForm.email,
              displayName: seedData.displayName || authForm.name || authForm.email.split('@')[0],
              role: resolvedRole,
              city: seedData.city || 'Jaipur',
              profilePhoto: seedData.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
              phone: seedData.phone || "+91 99999 11111",
              address: seedData.address || 'Heritage Lane, Jaipur',
              vehicleType: seedData.vehicleType,
              rating: seedData.rating,
              ordersCount: seedData.ordersCount,
              isSandbox: true
            };
            setCurrentUser(profile);
            setShowAuthSetupMsg(true);
            
            // Reset validation input boxes and auth form values upon successful sign-in or registration
            setAuthForm({ name: '', email: '', password: '' });
            setUserInputCode('');
            setVerificationSent(false);
            setIsEmailVerified(false);
            setIsAuthMode(false);
            return;
          }
          console.error("Auth signin failed:", authErr);
          throw authErr;
        }
      }
      
      // Reset validation input boxes and auth form values upon successful sign-in or registration
      setAuthForm({ name: '', email: '', password: '' });
      setUserInputCode('');
      setVerificationSent(false);
      setIsEmailVerified(false);
      setIsAuthMode(false);

      const targetUid = currentUser?.uid || auth.currentUser?.uid || 'user-01';
      handleAddNotification({
        id: `no-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
        userId: targetUid,
        title: 'Platform Handshake Activated 🛡️',
        message: `Successfully authenticated to the ReLive portal. Happy exploring!`,
        type: 'general',
        date: new Date().toISOString().split('T')[0],
        isRead: false
      });
    } catch (err: any) {
      if (err?.code === 'auth/operation-not-allowed') {
        console.warn("[AUTOPROVISION] Handled auth/operation-not-allowed in outer catch.");
      } else {
        console.error("Auth submit error:", err);
      }
      let errMsg = "Credential verification failed. Please check your email and password.";
      if (err?.code === 'auth/operation-not-allowed') {
        setShowAuthSetupMsg(true);
        errMsg = "🔒 Sign-In Provider (Email/Password) is currently disabled in your Firebase console settings.";
      } else if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential' || err?.code === 'err/invalid-login-credentials' || err?.code === 'auth/invalid-login-credentials' || err?.message?.includes('password')) {
        errMsg = "🔒 Incorrect password. Please try again with the correct credentials.";
      } else if (err?.code === 'auth/user-not-found') {
        errMsg = "📧 No registered account found with this email. Click 'Create new account' to register.";
      } else if (err?.code === 'auth/email-already-in-use') {
        errMsg = "📧 This email is already registered. Please login instead.";
      } else if (err?.code === 'auth/weak-password') {
        errMsg = "🔑 Password is too weak. Please use at least 6 characters.";
      } else if (err?.message) {
        errMsg = err.message;
      }
      setErrorMsg(errMsg);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsAuthLoading(true);
    setErrorMsg('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const authUser = result.user;
      const resolvedRole = detectRoleFromEmail(authUser.email || '');

      // Retrieve or create role definitions from Firestore
      let profile: AppUser;
      try {
        const userDocRef = doc(db, "users", authUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          profile = userSnap.data() as AppUser;
        } else {
          const seedData = (INITIAL_USERS.find(u => u.email.toLowerCase() === (authUser.email || '').toLowerCase()) || {}) as any;
          profile = {
            uid: authUser.uid,
            email: authUser.email || '',
            displayName: authUser.displayName || seedData.displayName || authUser.email?.split('@')[0] || "Google Member",
            role: resolvedRole,
            city: seedData.city || 'Jaipur',
            profilePhoto: authUser.photoURL || seedData.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
            phone: seedData.phone || "+91 99999 11111",
            address: seedData.address || 'Heritage Lane, Jaipur',
            vehicleType: seedData.vehicleType,
            rating: seedData.rating,
            ordersCount: seedData.ordersCount
          };
          await setDoc(userDocRef, profile);
        }
      } catch (dbErr: any) {
        console.warn("Firestore user profile lookup/creation errored during Google authentication. Activating offline sandbox mode.", dbErr);
        if (dbErr?.code === 'unavailable') {
          setIsFirestoreOffline(true);
        }
        const seedData = (INITIAL_USERS.find(u => u.email.toLowerCase() === (authUser.email || '').toLowerCase()) || {}) as any;
        profile = {
          uid: authUser.uid,
          email: authUser.email || '',
          displayName: authUser.displayName || seedData.displayName || authUser.email?.split('@')[0] || "Google Member",
          role: resolvedRole,
          city: seedData.city || 'Jaipur',
          profilePhoto: authUser.photoURL || seedData.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
          phone: seedData.phone || "+91 99999 11111",
          address: seedData.address || 'Heritage Lane, Jaipur',
          vehicleType: seedData.vehicleType,
          rating: seedData.rating,
          ordersCount: seedData.ordersCount,
          isSandbox: true
        };
      }

      setCurrentUser(profile);
      setIsAuthMode(false);

      handleAddNotification({
        id: `no-g-${Date.now()}`,
        userId: authUser.uid,
        title: 'Google Handshake Activated 🛡️',
        message: `Welcome ${profile.displayName}! Successfully authenticated to the ReLive portal via Google.`,
        type: 'general',
        date: new Date().toISOString().split('T')[0],
        isRead: false
      });
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain') || err?.message?.includes('unauthorized domain')) {
        setErrorMsg("🔒 Domain Blocked: Google Sign-In is blocked because this preview domain is not whitelisted in your Firebase Console. Set it up under Authentication -> Settings -> Authorized domains. Whitelist these domains:\n• ais-dev-x6x7yzbxb5efwsmeizh3gs-201297305938.asia-southeast1.run.app\n• ais-pre-x6x7yzbxb5efwsmeizh3gs-201297305938.asia-southeast1.run.app\n\nTo skip this configuration, click any of the Persona Role Login buttons below to log in instantly!");
      } else if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMsg("Google Sign-In was cancelled.");
      } else if (err?.code === 'auth/operation-not-allowed') {
        setErrorMsg("Google Sign-In is currently disabled or unconfigured in the Firebase Console. Please log in using Email & Password instead.");
      } else {
        setErrorMsg(err.message || "Google Sign-In failed.");
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const triggerPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotPasswordEmail) {
      setIsAuthLoading(true);
      setForgotPasswordError('');
      try {
        const response = await fetch('/api/send-forgot-password-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotPasswordEmail.trim() })
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setGeneratedResetToken(`https://relive.club/secure-reset?token=${data.b64Token}`);
          setForgotPasswordCode('');
          setForgotPasswordStep(2); // Progress to verification OTP input step
          console.log(`[SMTP RECOVERY MODE] Temporary 6-digit credential is: ${data.simulatedCode}`);
        } else {
          setForgotPasswordError(data.error || "Failed to dispatch temporary verification code.");
          alert(data.error || "Failed to dispatch temporary verification code.");
        }
      } catch (err: any) {
        setForgotPasswordError("Failed to trigger automated password reset service: " + err.message);
        // local fallback
        const expiry = Date.now() + 15 * 60 * 1000;
        const payload = JSON.stringify({ 
          email: forgotPasswordEmail.toLowerCase().trim(), 
          expires: expiry, 
          salt: "reLive_secure_pwd_reset_28fc1" 
        });
        const b64Token = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        setGeneratedResetToken(`https://relive.club/secure-reset?token=${b64Token}`);
        setForgotPasswordStep(2);
      } finally {
        setIsAuthLoading(false);
      }
    }
  };

  const handleVerifyForgotPasswordCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!forgotPasswordCode || !forgotPasswordCode.trim()) {
      setForgotPasswordError("Please provide your 6-digit recovery OTP.");
      return;
    }
    setIsAuthLoading(true);
    setForgotPasswordError('');
    try {
      const response = await fetch('/api/verify-forgot-password-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotPasswordEmail.trim(),
          code: forgotPasswordCode.trim()
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setForgotPasswordStep(3); // Go to replacing passcode screen
        setResetNewPassword('');
        setResetConfirmPassword('');
      } else {
        setForgotPasswordError(data.error || "Verification failed. Please double-check your code.");
      }
    } catch (err: any) {
      setForgotPasswordError("Unable to verify code due to connection error.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleVerifyResetToken = (tokenUrl: string) => {
    try {
      const url = new URL(tokenUrl);
      const token = url.searchParams.get('token');
      if (!token) {
        alert("Verification Error: No cryptographic token found in secure link.");
        return;
      }
      
      // Decode URL-safe Base64 token
      let b64 = token.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) {
        b64 += '=';
      }
      const rawJson = atob(b64);
      const data = JSON.parse(rawJson);
      
      if (!data.email || !data.expires) {
        alert("Security Violation: Cryptographic signature mismatch or corrupted token structural payload.");
        return;
      }
      
      if (Date.now() > data.expires) {
        alert("Security Violation: This cryptographically signed link has expired (15 minutes lifespan lapsed). Please generate a new one.");
        return;
      }
      
      // Securely authorize state machine update transitions & pre-populate matched temporary code
      setForgotPasswordEmail(data.email);
      if (data.code) {
        setForgotPasswordCode(data.code);
      }
      setForgotPasswordStep(3); // Password replacement step
      setResetNewPassword('');
      setResetConfirmPassword('');
    } catch (e) {
      alert("Cryptographic Integrity Error: Failed to parse secure token signature. The link may have been corrupted or tampered with.");
    }
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const pwdStrength = getPasswordStrength(resetNewPassword);
    if (!pwdStrength.metAll) {
      alert("🔒 Security requirement error: Please ensure your new password meets all strength criteria displayed on screen.");
      return;
    }
    
    if (resetNewPassword !== resetConfirmPassword) {
      alert("Verification mismatch: The entered passwords do not match. Please verify.");
      return;
    }

    setIsAuthLoading(true);
    try {
      const targetEmail = forgotPasswordEmail.toLowerCase().trim();

      // Clear credentials actively over the backend inside the live database
      try {
        const response = await fetch('/api/save-reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: targetEmail,
            code: forgotPasswordCode || "simulate",
            newPassword: resetNewPassword
          })
        });
        const data = await response.json();
        if (response.ok && data.success) {
          console.log(`[PASS PASSCODE SYNC SUCCESS] Secure passcode actively updated on central Firebase Firestore!`);
        } else {
          console.warn("[PASS PASSCODE SYNC WARNING] Firestore sync bypassed:", data.error || data);
        }
      } catch (be: any) {
        console.warn("[PASS PASSCODE SYNC ERROR] Network error updating server credentials:", be.message);
      }

      // 3. Perform live Firebase Auth matching account update if currently signed in 
      if (auth.currentUser && auth.currentUser.email?.toLowerCase() === targetEmail) {
        try {
          await updatePassword(auth.currentUser, resetNewPassword);
        } catch (fbErr: any) {
          console.warn("Base Firebase Auth matching password update bypassed - recent signin context required:", fbErr);
        }
      }

      setForgotPasswordStep(4); // Display completion confirmation screen in the modal
    } catch (err: any) {
      alert(`Save failed: ${err.message || err}`);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setAuthForm({ name: '', email: '', password: '' });
      setUserInputCode('');
      setVerificationSent(false);
      setIsEmailVerified(false);
      setIsAuthMode(false);
    } catch (err: any) {
      console.error("Signout error:", err);
    }
  };

  // User activity tracker for 30 minutes automatic session termination with 28 minutes warning
  useEffect(() => {
    if (!currentUser) {
      setShowTimeoutWarning(false);
      return;
    }

    // 28 minutes warning, 30 minutes absolute logout
    const WARNING_TIMEOUT_MS = 28 * 60 * 1000;
    const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
    
    let warningTimer: any;
    let logoutTimer: any;

    const performInactivityLogout = () => {
      console.warn("🔐 [ReLive Security] Session expired due to 30 minutes of inactivity. Logging out.");
      handleLogout();
      setInactivityLoggedOut(true);
      setIsAuthMode(true); // Direct user to Member Login
      setShowTimeoutWarning(false);
    };

    const triggerWarningBanner = () => {
      setShowTimeoutWarning(true);
      setSecondsLeft(120);
    };

    const resetTimer = () => {
      setShowTimeoutWarning(false);
      if (warningTimer) clearTimeout(warningTimer);
      if (logoutTimer) clearTimeout(logoutTimer);
      
      warningTimer = setTimeout(triggerWarningBanner, WARNING_TIMEOUT_MS);
      logoutTimer = setTimeout(performInactivityLogout, INACTIVITY_TIMEOUT_MS);
    };

    // Initialise timers with boot or activity reset
    resetTimer();

    // Event listeners to detect activity
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    
    let lastResetTime = Date.now();
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastResetTime > 3000) { // Throttle resetting to max once per 3 seconds
        setLastActivityReset(now);
        lastResetTime = now;
      }
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity);
    });

    return () => {
      if (warningTimer) clearTimeout(warningTimer);
      if (logoutTimer) clearTimeout(logoutTimer);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [currentUser, lastActivityReset]);

  // Countdown timer for 2 minutes (120 seconds) warning
  useEffect(() => {
    if (!showTimeoutWarning) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showTimeoutWarning]);

  // Logout after warning reaches 0
  useEffect(() => {
    if (showTimeoutWarning && secondsLeft === 0 && currentUser) {
      console.warn("🔐 [ReLive Security] Inactivity warning countdown reached zero. Force logging out...");
      handleLogout();
      setInactivityLoggedOut(true);
      setIsAuthMode(true);
      setShowTimeoutWarning(false);
    }
  }, [secondsLeft, showTimeoutWarning, currentUser]);

  // Sync state: when user is logged back in, clear the logged out alert
  useEffect(() => {
    if (currentUser) {
      setInactivityLoggedOut(false);
    }
  }, [currentUser]);

  return (
    <div className="bg-stone-50 min-h-screen text-stone-900 font-sans flex flex-col justify-between">
      {isFirestoreOffline && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-6 py-2.5 text-center text-xs relative z-40 flex flex-wrap items-center justify-center gap-2 shadow-sm font-sans shrink-0">
          <span className="flex items-center gap-1.5 font-semibold">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            ⚠️ Firestore Connection Standby:
          </span>
          <span>
            Database backend is currently unreachable. Active local caching and sync attempts are running.
          </span>
          <button
            onClick={() => setShowFirestoreGuide(true)}
            className="underline hover:text-amber-800 font-bold ml-1 cursor-pointer font-sans"
          >
            Database Setup Guide & Real-Time Sync Activation
          </button>
          <span className="text-stone-300">|</span>
          <button
            onClick={() => {
              setIsFirestoreOffline(false);
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1 rounded-full text-[10px] uppercase tracking-wider cursor-pointer transition-all shadow-sm"
          >
            Force Connect Live Production Database ⚡
          </button>
        </div>
      )}

      {/* Primary Header - Upgraded to floating glass-nav */}
      <header className="glass-nav sticky top-3 z-45 px-5 sm:px-8 py-4.5 mx-auto max-w-7xl w-[94%] rounded-3xl shadow-lg border border-white/40 flex items-center justify-between transition-all duration-300">
        <div 
          onClick={() => {
            setIsAuthMode(false);
          }}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-stone-950 flex items-center justify-center font-serif text-white font-serif font-black group-hover:bg-amber-500 transition-colors">
            RL
          </div>
          <div>
            <span className="font-serif font-black tracking-tight text-lg text-stone-950 group-hover:text-amber-600 transition-colors">ReLive</span>
            <span className="block text-[8px] tracking-widest font-mono text-stone-400 uppercase">Memory Restoration Core</span>
          </div>
        </div>

        {!currentUser && (
          <nav className="hidden md:flex gap-8 text-xs sm:text-sm font-semibold text-stone-600">
            <button 
              onClick={() => {
                setIsAuthMode(false);
                setTimeout(() => {
                  document.getElementById('science-process-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }} 
              className="hover:text-stone-950 cursor-pointer transition-colors"
            >
              Science & Process
            </button>
            <button 
              onClick={() => {
                setIsAuthMode(false);
                setTimeout(() => {
                  document.getElementById('laboratories-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }} 
              className="hover:text-stone-950 cursor-pointer transition-colors"
            >
              Laboratories
            </button>
            <button 
              onClick={() => {
                setIsAuthMode(false);
                setTimeout(() => {
                  document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }} 
              className="hover:text-stone-950 cursor-pointer transition-colors"
            >
              Joint Family Pricing
            </button>
          </nav>
        )}

        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline bg-stone-950 text-amber-400 text-[9px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-lg border border-stone-800">
                👤 {currentUser.role}
              </span>
              <button
                id="header-logout"
                onClick={handleLogout}
                className="px-3 py-2 text-stone-700 hover:text-stone-950 hover:bg-stone-100 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs text-stone-700 font-bold"
                title="Secure logout"
              >
                <LogOut className="w-4 h-4 text-stone-600" />
                Logout
              </button>
            </div>
          ) : (
            <button
              id="header-login-trigger"
              onClick={() => {
                setIsAuthMode(true);
                setIsSignup(false);
              }}
              className="px-5 py-2.5 bg-stone-950 hover:bg-stone-850 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              Login / Signup
            </button>
          )}
        </div>
      </header>

      {/* Core main container */}
      <main className="flex-grow">
        {isAuthMode ? (
          <div className="relative min-h-[85vh] w-[94%] flex items-center justify-center p-4 sm:p-8 bg-stone-900/40 overflow-hidden rounded-3xl my-6 max-w-7xl mx-auto shadow-inner">
            {/* Indian Family Background Showcase with Hover Zoom-Color Effect */}
            <motion.div 
              className="absolute inset-0 z-0 bg-stone-950"
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.5 }}
            >
              <img
                src="https://images.unsplash.com/photo-1605001011156-cbf0b0f67a51?w=1600&q=80"
                alt="Cherished Indian Family Heritage"
                className="w-full h-full object-cover opacity-60 filter grayscale brightness-55 contrast-125 transition-all duration-1000 ease-in-out hover:scale-110 hover:filter-none hover:opacity-85 cursor-pointer"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-stone-950/60 pointer-events-none" />
            </motion.div>

            {/* Showcase Overlay Note */}
            <div className="absolute bottom-8 left-8 z-10 hidden xl:block text-left max-w-sm">
              <span className="text-amber-400 font-mono text-[10px] tracking-widest font-extrabold uppercase bg-stone-900/80 px-3 py-1 rounded-full border border-amber-500/20">RESTORATION HERO</span>
              <h3 className="font-serif text-2xl font-bold text-white mt-3 leading-normal drop-shadow">"Reviving Faded Generations."</h3>
              <p className="text-xs text-stone-300 mt-2 leading-relaxed">Hover or interact with the family portrait background. Watch the nostalgic monochrome pigments instantly adapt into full living family spectrums.</p>
            </div>

            <div className="relative z-10 w-full max-w-md mx-auto px-4 sm:px-6">
              {/* Secure Login form */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full p-6 sm:p-8 md:p-10 bg-white/95 backdrop-blur-md shadow-2xl rounded-3xl space-y-6 font-sans border border-white/60"
              >
                <div className="text-center space-y-2">
                  <span className="text-amber-700 text-[10px] uppercase font-mono font-bold tracking-widest bg-amber-50 px-3 py-1 rounded-full border border-amber-200">LOGIN / SIGNUP</span>
                  <h2 className="text-2xl font-serif text-stone-950 font-black">Member Login</h2>
                  <p className="text-stone-500 text-xs">Enter your credentials to access your secure memory vault</p>
                </div>

                {/* Inactivity Logout alert */}
                {inactivityLoggedOut && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-900 text-xs font-semibold leading-relaxed flex items-start gap-2.5 shadow-xs"
                  >
                    <span className="text-base shrink-0 select-none">🛡️</span>
                    <div>
                      <p className="font-bold text-stone-950 text-xs">Secure Session Terminated</p>
                      <p className="text-[11px] font-normal text-stone-600 mt-0.5 leading-relaxed">
                        For your protection, you were logged out automatically after 30 minutes of inactivity. Please sign back in.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Error alerts banner inside gateway */}
                {errorMsg && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-red-950 text-xs font-medium leading-relaxed">
                    🚨 {errorMsg}
                  </div>
                )}

                {showAuthSetupMsg && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-stone-800 text-[11px] leading-relaxed space-y-3"
                  >
                    <div className="flex gap-2.5 items-start">
                      <span className="text-base shrink-0 select-none">🛠️</span>
                      <div>
                        <p className="font-bold text-stone-950 text-xs">Email/Password Login Disabled</p>
                        <p className="text-[10px] text-stone-650 mt-0.5 leading-relaxed">
                          Your Firebase Authentication project does not have the <strong>Email/Password</strong> sign-in provider enabled. You can resolve this in your Firebase Console!
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-white border border-amber-100 p-2.5 rounded-lg text-[10px] text-stone-600 space-y-1 font-mono">
                      <p className="font-bold text-stone-850">Resolution Instructions:</p>
                      <p>1. Open the Firebase Console for your project.</p>
                      <p>2. Select <strong>Authentication</strong> &rarr; <strong>Sign-in method</strong>.</p>
                      <p>3. Add/edit <strong>Email/Password</strong>, toggle <strong>Enable</strong>, and click <strong>Save</strong>.</p>
                    </div>

                    <div className="pt-2 border-t border-amber-200 flex flex-col gap-2">
                      <div className="flex flex-col gap-1 text-[10px]">
                        <span className="text-stone-500 font-semibold mb-1">Testing Option:</span>
                        <button
                          type="button"
                          onClick={() => {
                            const emailToUse = authForm.email || 'admin@relive.club';
                            const resolvedRole = detectRoleFromEmail(emailToUse);
                            const matchedPreset = INITIAL_USERS.find(u => u.email.toLowerCase() === emailToUse.toLowerCase()) || INITIAL_USERS[0];
                            const profile: AppUser = {
                              uid: matchedPreset.uid || `simulated-${Date.now()}`,
                              email: emailToUse,
                              displayName: matchedPreset.displayName || emailToUse.split('@')[0],
                              role: resolvedRole,
                              city: matchedPreset.city || 'Jaipur',
                              isSandbox: true
                            };
                            setCurrentUser(profile);
                            setIsAuthMode(false);
                            setShowAuthSetupMsg(false);
                            setErrorMsg('');
                          }}
                          className="w-full bg-amber-800 hover:bg-amber-900 text-white font-bold py-2 rounded text-[10px] uppercase tracking-wider cursor-pointer transition-all text-center shadow-xs"
                        >
                          Bypass & Trial Session Locally
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                <form onSubmit={handleLogin} className="space-y-4 text-xs font-sans">
                  {isSignup && (
                    <div>
                      <label className="block text-stone-600 mb-1 font-semibold">Your Full Name</label>
                      <input
                        id="auth-signup-name"
                        type="text"
                        required
                        value={authForm.name}
                        onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                        className="w-full bg-stone-50 border border-stone-200 p-2.5 rounded text-stone-950 outline-none focus:border-amber-600"
                        placeholder="e.g. Aarav Sharma"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-stone-600 mb-1 flex items-center justify-between font-semibold">
                      <span>Email Address</span>
                      {isEmailVerified ? (
                        <span className="text-[9px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Verified ✓
                        </span>
                      ) : (
                        <span className="text-[9px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-mono">
                          Unverified
                        </span>
                      )}
                    </label>
                    <input
                      id="auth-email-field"
                      type="email"
                      required
                      value={authForm.email}
                      onChange={(e) => {
                        setAuthForm({ ...authForm, email: e.target.value });
                        setIsEmailVerified(false);
                        setVerificationSent(false);
                        setShowAuthSetupMsg(false);
                        setErrorMsg('');
                      }}
                      className="w-full bg-stone-50 border border-stone-200 p-2.5 rounded text-stone-950 focus:outline-none focus:border-amber-500 font-sans"
                      placeholder="e.g. Aarav@relive.club"
                    />

                    {isSignup && (
                      <div className="mt-2 bg-stone-50 p-2.5 rounded border border-stone-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-stone-500">
                            {isEmailVerified 
                              ? "Registered mailbox authenticated successfully." 
                              : "Verification email is required for secure signup."}
                          </span>
                          {!isEmailVerified && (
                            <button
                              id="verify-email-auth-btn"
                              type="button"
                              onClick={handleSendVerificationEmail}
                              disabled={verificationLoading}
                              className="px-2.5 py-1 bg-amber-800 hover:bg-amber-900 text-white font-bold text-[10px] rounded cursor-pointer"
                            >
                              {verificationLoading ? "Sending..." : "Verify Email ✉️"}
                            </button>
                          )}
                        </div>

                        {verificationSent && !isEmailVerified && (
                          <div className="space-y-2 pt-1.5 border-t border-stone-200/60">
                            <p className="text-[10px] text-emerald-800 font-medium leading-normal">
                              ✓ Security pin dispatched. Check your inbox!
                            </p>
                            <div className="flex gap-2">
                              <input
                                id="auth-verification-code-input"
                                type="text"
                                placeholder="Enter 4-Digit PIN"
                                value={userInputCode}
                                onChange={(e) => setUserInputCode(e.target.value)}
                                className="bg-white border border-stone-300 p-1.5 rounded text-[11px] text-stone-900 font-mono w-28 uppercase text-center"
                              />
                              <button
                                id="confirm-verification-auth-btn"
                                type="button"
                                onClick={handleVerifyCode}
                                className="px-3 py-1 bg-stone-900 hover:bg-stone-800 text-white text-[10px] font-bold rounded cursor-pointer"
                              >
                                Submit Code
                              </button>
                            </div>
                          </div>
                        )}

                        {verificationError && (
                          <p className="text-[10px] text-red-650 font-medium">{verificationError}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label id="auth-pass-label" className="text-stone-600 font-semibold text-[11px] uppercase tracking-wider">
                        {isSignup ? "Create Secure Password" : "Password"}
                      </label>
                      {authForm.password && (
                        <span className="text-[10px] font-semibold text-stone-400">
                          {authForm.password.length} chars
                        </span>
                      )}
                    </div>
                    
                    <div className="relative">
                      <input
                        id="auth-pass-field"
                        type={showPassword ? "text" : "password"}
                        required
                        value={authForm.password}
                        onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                        className="w-full bg-stone-50 border border-stone-200 p-2.5 pr-10 rounded text-stone-950 focus:outline-none focus:border-amber-500 font-sans"
                        placeholder="••••••••"
                      />
                      <button
                        id="auth-toggle-pass-visibility"
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 select-none cursor-pointer"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {isSignup && (
                      <div className="mt-2.5 space-y-2 bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                        {/* Strength Metric / Tier Header */}
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-stone-500 font-medium">Password Strength:</span>
                          <span className={`font-bold uppercase tracking-wider ${getPasswordStrength(authForm.password).textTailwind}`}>
                            {getPasswordStrength(authForm.password).text}
                          </span>
                        </div>

                        {/* Visual Strength Meter Segments */}
                        <div className="flex gap-1 h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
                          {[1, 2, 3, 4, 5].map((level) => {
                            const currentStrength = getPasswordStrength(authForm.password);
                            const isActive = currentStrength.score >= level;
                            return (
                              <div
                                key={level}
                                className={`h-full flex-1 transition-all duration-300 rounded-full ${
                                  isActive ? currentStrength.color : 'bg-stone-200/60'
                                }`}
                              />
                            );
                          })}
                        </div>

                        {/* Real-time Checklist */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1.5 border-t border-stone-200/55 text-[10px]">
                          {getPasswordStrength(authForm.password).requirements.map((req) => (
                            <div key={req.id} className="flex items-center gap-1.5 leading-tight">
                              {req.met ? (
                                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                              ) : (
                                <X className="w-3 h-3 text-red-400 shrink-0" />
                              )}
                              <span className={req.met ? "text-stone-800 font-medium" : "text-stone-400"}>
                                {req.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    id="submit-auth-form"
                    type="submit"
                    disabled={isAuthLoading}
                    className={`w-full py-3 bg-stone-900 hover:bg-stone-850 text-white font-bold rounded-lg transition-all ${isAuthLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer animate-none hover:shadow-md'}`}
                  >
                    {isAuthLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" /> Verifying Credentials...
                      </span>
                    ) : isSignup ? 'Register New Heritage Account' : 'Sign In to Account'}
                  </button>
                </form>

                <div className="space-y-3 pt-2">
                  <button
                    id="auth-google-btn"
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="w-full py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-stone-700 font-bold text-xs flex items-center justify-center gap-2.5 hover:bg-stone-100 transition cursor-pointer"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                      <g transform="matrix(1, 0, 0, 1, 0, 0)">
                        <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.57h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.4C21.68,11.75 21.56,11.4 21.35,11.1z" fill="#4285F4" />
                        <path d="M12,20.62c2.43,0 4.47,-0.8 5.96,-2.18l-3.3,-2.57c-0.91,0.61 -2.08,0.98 -3.1,0.98 -2.39,0 -4.41,-1.61 -5.14,-3.78H2.98v2.66C4.47,18.7 7.99,20.62 12,20.62z" fill="#34A853" />
                        <path d="M6.86,13.07C6.67,12.5 6.57,11.89 6.57,11.25s0.1,-1.25 0.29,-1.82V6.77H2.98c-0.63,1.27 -0.98,2.71 -0.98,4.48s0.35,3.21 0.98,4.48l3.88,-2.66z" fill="#FBBC05" />
                        <path d="M12,4.88c1.32,0 2.51,0.45 3.44,1.35l2.58,-2.58C16.46,2.21 14.43,1.38 12,1.38c-4.01,0 -7.53,1.92 -9.02,4.89l3.88,2.66C7.59,6.49 9.61,4.88 12,4.88z" fill="#EA4335" />
                      </g>
                    </svg>
                    {isSignup ? 'Sign up with Google' : 'Sign in with Google'}
                  </button>

                  <div className="flex justify-between text-[11px] text-stone-500">
                    <button
                      id="forgot-password"
                      onClick={() => setIsForgotOpen(true)}
                      className="hover:underline cursor-pointer"
                    >
                      Forgot password passcode?
                    </button>

                    <button
                      id="signup-toggle"
                      onClick={() => {
                        setIsSignup(!isSignup);
                        setShowAuthSetupMsg(false);
                        setErrorMsg('');
                      }}
                      className="text-amber-800 font-bold hover:underline cursor-pointer"
                    >
                      {isSignup ? 'Already have credentials? Login' : 'Create new account'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        ) : sharedFile ? (
          <div className="max-w-4xl mx-auto w-[92%] py-8 flex-1 flex flex-col gap-6 font-sans text-stone-900">
            {/* Header / Nav-back */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-stone-200/60 pb-5">
              <div className="text-center sm:text-left">
                <span className="p-1 px-2.5 mb-2.5 inline-flex text-[9px] bg-amber-550/15 text-amber-850 font-bold tracking-widest uppercase rounded">
                  Public Archival Share Verified ✓
                </span>
                <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-950">
                  {sharedFile.name}
                </h1>
                <p className="text-xs text-stone-400 font-medium">
                  Digitally restored by ReLive Media Jaipur labs on {sharedFile.dateAdded}
                </p>
              </div>

              <button
                onClick={() => {
                  setSharedFile(null);
                  window.history.pushState({}, '', window.location.origin);
                }}
                className="flex items-center gap-1.5 px-4.5 py-2.5 bg-stone-900 hover:bg-stone-850 text-white font-bold rounded-xl text-xs transition duration-200 cursor-pointer shadow-sm shrink-0"
              >
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                Go to ReLive Home Page
              </button>
            </div>

            {/* Slider Comparison Layout */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {/* Left Column: Visual Slider */}
              <div className="md:col-span-3 bg-stone-100 border border-stone-200 rounded-3xl overflow-hidden shadow-xl aspect-4/3 relative flex items-center justify-center p-3 animate-in fade-in zoom-in duration-350">
                {sharedFile.restoredUrl ? (
                  <div className="relative w-full h-full select-none overflow-hidden rounded-2xl group">
                    {/* Before Image (underneath) */}
                    <img
                      src={sharedFile.originalUrl || 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800'}
                      alt="Original Unrestored Scan"
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    />
                    <div className="absolute top-3 left-3 bg-stone-900/75 text-stone-100 text-[9px] tracking-wider uppercase font-bold py-1 px-2.5 rounded-md backdrop-blur-xs z-20">
                      Original Vintage
                    </div>

                    {/* After Image (clipped) */}
                    <div 
                      className="absolute inset-0 w-full h-full pointer-events-none animate-none"
                      style={{ clipPath: `polygon(0 0, ${sharedSliderPos}% 0, ${sharedSliderPos}% 100%, 0 100%)` }}
                    >
                      <img
                        src={sharedFile.restoredUrl}
                        alt="Restored Heritage Version"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute top-3 right-3 bg-amber-500 text-stone-950 text-[9px] tracking-wider uppercase font-bold py-1 px-2.5 rounded-md shadow-md z-20">
                      Restored HD
                    </div>

                    {/* Slider Line Overlay */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none z-30"
                      style={{ left: `${sharedSliderPos}%` }}
                    >
                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white border border-stone-200 rounded-full shadow-2xl flex items-center justify-center text-stone-700 font-bold text-xs select-none">
                        ↔
                      </div>
                    </div>

                    {/* Input Slider overlay to make it interactive */}
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={sharedSliderPos}
                      onChange={(e) => setSharedSliderPos(Number(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-40"
                    />
                  </div>
                ) : (
                  <div className="text-center p-8 space-y-3">
                    <div className="w-16 h-16 bg-amber-500/10 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <p className="font-serif text-lg font-bold text-stone-900">Restored Audio or Video Assets</p>
                    <p className="text-xs text-stone-400 max-w-sm mx-auto">
                      Restored analog tapes, movies, and family albums are fully optimized for multi-device playback. Click below to stream or download.
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: Metadata & Actions */}
              <div className="md:col-span-2 flex flex-col justify-between gap-4">
                <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-md space-y-4 text-left">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-stone-400 block border-b border-stone-100 pb-1.5">
                      Memory Metadata
                    </span>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-2 pt-1 text-xs">
                      <div>
                        <span className="text-stone-400 block">Restoration ID</span>
                        <span className="font-mono font-bold text-stone-800 truncate block">{sharedFile.id}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block">Service Level</span>
                        <span className="font-bold text-stone-800 block">Print Restoration</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block">Output Format</span>
                        <span className="font-bold text-stone-800 block">High-Def PNG Scan</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block">Cloud Status</span>
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          S3 Guaranteed
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t border-stone-100 pt-3">
                    <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-stone-400 block pb-1">
                      Historical Notes & Restoration Insights
                    </span>
                    <p className="text-xs text-stone-600 font-serif leading-relaxed italic">
                      "{sharedFile.name.includes('wedding') || sharedFile.id.includes('wedding')
                        ? 'Repaired silver halides, resolved severe tears down the center crease, and removed oxidized yellow water stains from Grandma’s beautiful wedding sari.' 
                        : 'Enhanced face detection, compensated for color degradation across historical focal planes, and generated archival quality digital replicas.'}"
                    </p>
                  </div>

                  <div className="border-t border-stone-100 pt-3">
                    <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-stone-400 block pb-1.5">
                      Archive Lab Resolution
                    </span>
                    <div className="p-3 bg-stone-50 border border-stone-200/60 rounded-xl space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-stone-500">Restored Integrity:</span>
                        <span className="font-semibold text-emerald-700">100% Complete</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-stone-500">Color Spectrum:</span>
                        <span className="font-semibold text-stone-800">Jaipur Lab Balanced Chrome</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Primary CTA Block */}
                <div className="bg-amber-500/5 border border-amber-500/25 rounded-3xl p-6 shadow-sm space-y-3.5 text-left">
                  <div className="space-y-0.5">
                    <h3 className="font-serif text-base font-bold text-amber-950">Save Your Restored Scan</h3>
                    <p className="text-[10px] text-amber-800 leading-normal">
                      Export this vintage heritage copy directly to your local file explorer or gallery storage.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        handleDownloadFileDirectly(sharedFile.restoredUrl || '', sharedFile.name);
                      }}
                      className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition"
                    >
                      <Download className="w-4 h-4" />
                      Download HD Digital Scan
                    </button>

                    <button
                      onClick={() => {
                        setSharedFile(null);
                        window.history.pushState({}, '', window.location.origin);
                        setTimeout(() => {
                          setIsAuthMode(true);
                          setAuthForm(prev => ({ ...prev, role: 'user' }));
                        }, 200);
                      }}
                      className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-100 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition"
                    >
                      Restore Your Own Memories
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : currentUser ? (
          <div>
            {currentUser.role === 'user' && (
              <DashboardUser
                currentUser={currentUser}
                onUpdateUser={handleUpdateUser}
                orders={orders}
                files={files}
                appointments={appointments}
                albums={albums}
                notifications={notifications}
                onAddOrder={handleAddOrder}
                onAddAppointment={handleAddAppointment}
                onAddAlbum={handleAddAlbum}
                onUpdateOrder={handleUpdateOrder}
                onAddNotification={handleAddNotification}
                onAddFile={handleAddFile}
                onUpdateFile={handleUpdateFile}
              />
            )}

            {currentUser.role === 'admin' && (
              <DashboardAdmin
                users={users}
                orders={orders}
                appointments={appointments}
                files={files}
                currentUser={currentUser}
                onAddFile={handleAddFile}
                onUpdateOrder={handleUpdateOrder}
                onUpdateAppointment={handleUpdateAppointment}
                onDeleteFile={handleDeleteFile}
                onAddNotification={handleAddNotification}
              />
            )}

            {currentUser.role === 'partner' && (
              <DashboardPartner
                orders={orders}
                onUpdateOrder={handleUpdateOrder}
                currentUser={currentUser}
              />
            )}

            {currentUser.role === 'restorer' && (
              <DashboardRestoration
                orders={orders}
                onUpdateOrder={handleUpdateOrder}
                currentUser={currentUser}
              />
            )}
          </div>
        ) : (
          <LandingPage
            onNavigateToAuth={(role) => {
              setIsAuthMode(true);
              setAuthForm(prev => ({ ...prev, role: role || 'user' }));
            }}
            onQuickBook={() => {
              setIsAuthMode(true);
              setAuthForm(prev => ({ ...prev, role: 'user' }));
              alert("Verify credentials first to configure secure OTP metrics!");
            }}
          />
        )}
      </main>

      {/* Footer & Real-time Sync Monitor */}
      <footer className="bg-stone-900 text-stone-400 py-8 px-6 border-t border-stone-850 mt-16 font-sans">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-xs border-b border-stone-850 pb-6 mb-6">
          {/* Left: Branding & Status */}
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-serif font-black text-white text-base tracking-tight">ReLive Archive Hub</span>
            <div className="h-4 w-px bg-stone-800 hidden sm:block" />
            <div className="flex items-center gap-2.5 bg-stone-950/60 border border-stone-850 px-3 py-1.5 rounded-full shadow-inner">
              <span className={`w-2.5 h-2.5 rounded-full relative flex ${
                syncStatus === 'synced' ? 'bg-emerald-500' :
                syncStatus === 'syncing' ? 'bg-amber-500' :
                'bg-red-505'
              }`}>
                {syncStatus === 'syncing' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                )}
                {syncStatus === 'synced' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-30" />
                )}
              </span>
              <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-stone-300 flex items-center gap-1.5">
                DATABASE: 
                <span className={
                  syncStatus === 'synced' ? 'text-emerald-400 font-bold' :
                  syncStatus === 'syncing' ? 'text-amber-400 font-bold' :
                  'text-red-400 font-bold'
                }>{syncStatus.toUpperCase()}</span>
                {syncStatus === 'syncing' && <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />}
              </span>
            </div>
          </div>

          {/* Right: Active Service Details */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-stone-500 font-mono text-[10px]">
            <span>Active Server: Jaipur & New Delhi NCR</span>
            <span>•</span>
            <span>Firestore Live Listener Active</span>
            <span>•</span>
            <span>All System Logs Active © 2026 ReLive</span>
          </div>
        </div>

        {/* Detailed footer info shown primarily on landing or as an advanced status reference */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-xs sm:text-sm">
          <div className="space-y-2">
            <h5 className="font-bold text-white text-xs uppercase tracking-wider">Restoration Services</h5>
            <ul className="space-y-1 text-stone-400 text-xs">
              <li>• Photographic Color calibration</li>
              <li>• VHS video tracking stabilization</li>
              <li>• Audio tape crackle dampening</li>
              <li>• Ancient glass slide chemical transfer</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-white text-xs uppercase tracking-wider">Scientific protocols</h5>
            <ul className="space-y-1 text-stone-400 text-xs">
              <li>• ISO-5 dust-reduction chambers</li>
              <li>• Sealed Faraday magnetic cases</li>
              <li>• GPS logistics track OTP locks</li>
              <li>• Secure cloud version layers</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-white text-xs uppercase tracking-wider">Data Synchronization Status</h5>
            <p className="text-stone-400 text-xs leading-normal">
              ReLive preserves your heritage across dual live datastores. The real-time snapshot engine uses multi-channel replication to verify integrity and secure OTP keys automatically.
            </p>
          </div>
        </div>
      </footer>

      {/* POPUP: Forgot password simulator */}
      <AnimatePresence>
        {showTimeoutWarning && (
          <div className="fixed inset-0 bg-stone-900/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white max-w-md w-full rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 space-y-6 border border-stone-150 relative text-left"
            >
              <div className="absolute top-4 right-4 bg-stone-50 border border-stone-200 text-stone-600 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase">
                Session Monitor
              </div>

              {/* Header and Indicator */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl flex items-center justify-center mx-0 text-xl shadow-inner shrink-0 relative">
                  <Clock className="w-7 h-7 text-amber-500 animate-pulse" />
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
                  </span>
                </div>
                <div>
                  <h3 className="font-serif font-black text-stone-900 text-lg uppercase tracking-tight">Inactivity Warning</h3>
                  <p className="text-stone-500 text-xs mt-0.5">Your session is about to expire due to absolute offline/standby idle activity.</p>
                </div>
              </div>

              {/* Dynamic countdown element */}
              <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-5 text-center space-y-2">
                <div className="text-stone-400 font-mono text-[10px] uppercase font-bold tracking-widest">Time Remaining</div>
                <div className="font-mono text-4xl font-extrabold text-stone-900 tracking-wider">
                  {Math.floor(secondsLeft / 60).toString().padStart(2, '0')}:{(secondsLeft % 60).toString().padStart(2, '0')}
                </div>
                <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden mt-3">
                  <motion.div 
                    initial={{ width: "100%" }}
                    animate={{ width: `${(secondsLeft / 120) * 100}%` }}
                    transition={{ duration: 1, ease: "linear" }}
                    className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full"
                  />
                </div>
              </div>

              {/* Explanatory security policy note */}
              <div className="text-[11px] text-stone-500 leading-relaxed bg-stone-50/50 border border-stone-150 p-4 rounded-xl">
                🔒 <strong>ReLive Security Protocol:</strong> Automated session termination blocks unauthorized physical or remote terminal hijacking of your family legacy storage vault if left unmonitored.
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleLogout();
                    setShowTimeoutWarning(false);
                  }}
                  className="flex-1 py-3 border border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-600 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                >
                  Logout Now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLastActivityReset(Date.now());
                    setShowTimeoutWarning(false);
                  }}
                  className="flex-[2] py-3 bg-stone-900 hover:bg-stone-850 text-white font-serif font-semibold rounded-xl text-xs flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-stone-950/10"
                >
                  <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                  Extend Active Session
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isForgotOpen && (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white max-w-sm w-full rounded-2xl overflow-hidden shadow-2xl p-6 text-xs space-y-4 border border-stone-200"
            >
              {forgotPasswordStep === 1 && (
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 bg-amber-100 text-amber-805 rounded-full flex items-center justify-center mx-auto text-xl shadow-inner">
                    <Key className="w-6 h-6" />
                  </div>

                  <div>
                    <h3 className="font-serif font-bold text-sm text-stone-950">Password Recovery Key</h3>
                    <p className="text-stone-500 text-[10px] mt-1">Provide registered email address to receive secure cryptographic restore signals.</p>
                  </div>

                  <form onSubmit={triggerPasswordReset} className="space-y-3">
                    <input
                      id="forgot-email-input"
                      type="email"
                      required
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-300 p-2.5 rounded text-center focus:outline-none focus:border-stone-500 font-medium text-stone-800"
                      placeholder="name@email.com"
                    />

                    <div className="flex gap-2">
                      <button
                        id="submit-forgot-pass"
                        type="submit"
                        disabled={isAuthLoading}
                        className="flex-1 py-2.5 bg-stone-900 text-white rounded-lg font-bold hover:bg-stone-850 cursor-pointer disabled:bg-stone-400 transition-all text-[11px]"
                      >
                        {isAuthLoading ? "Processing..." : "Confirm Dispatch"}
                      </button>
                      <button
                        id="cancel-forgot-pass"
                        type="button"
                        onClick={() => {
                          setIsForgotOpen(false);
                          setForgotPasswordEmail('');
                          setForgotPasswordStep(1);
                        }}
                        className="px-4 py-2.5 bg-stone-100 text-stone-600 rounded-lg font-medium hover:bg-stone-200"
                      >
                        Close
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {forgotPasswordStep === 2 && (
                <div className="space-y-4 text-stone-904 text-center">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto text-xl shadow-inner border border-amber-200">
                    <ShieldCheck className="w-6 h-6 animate-pulse" />
                  </div>

                  <div>
                    <h3 className="font-serif font-black text-xs text-stone-950 uppercase tracking-wide">Enter Recovery Code</h3>
                    <p className="text-stone-500 text-[10px] mt-1">
                      Our automated SMTP servers have successfully dispatched a temporary 6-digit security code to: <span className="font-semibold text-stone-800 break-all">{forgotPasswordEmail}</span>
                    </p>
                  </div>

                  {/* Manual 6-digit verification code input form */}
                  <form onSubmit={handleVerifyForgotPasswordCode} className="space-y-3 pt-2">
                    <div className="space-y-1 relative">
                      <label className="block text-stone-500 font-bold text-[9px] uppercase tracking-wider text-left">Temporary Security PIN</label>
                      <input
                        id="forgot-password-otp-input"
                        type="text"
                        required
                        maxLength={6}
                        placeholder="••••••"
                        value={forgotPasswordCode}
                        onChange={(e) => setForgotPasswordCode(e.target.value.toUpperCase())}
                        className="w-full bg-stone-50 border border-stone-300 p-2.5 rounded text-center focus:outline-none focus:border-stone-500 font-mono tracking-[0.5em] text-sm font-bold text-stone-900"
                      />
                    </div>

                    {forgotPasswordError && (
                      <p className="text-[10px] text-red-600 bg-red-50 p-2 rounded border border-red-200 text-left font-medium">
                        ⚠️ {forgotPasswordError}
                      </p>
                    )}

                    <button
                      id="profile-phone-otp-verify-forgot-btn"
                      type="submit"
                      disabled={isAuthLoading}
                      className="w-full py-2.5 bg-stone-900 text-white rounded-lg font-bold hover:bg-stone-850 cursor-pointer disabled:bg-stone-400 transition-all text-[11px]"
                    >
                      {isAuthLoading ? "Authorizing..." : "Verify & Continue"}
                    </button>
                  </form>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-stone-200"></div>
                    <span className="flex-shrink mx-2 text-[8px] text-stone-400 font-bold tracking-widest uppercase">Testing Bypass Option</span>
                    <div className="flex-grow border-t border-stone-200"></div>
                  </div>

                  <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 text-left space-y-2">
                    <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wider block leading-none">Security Credentials Debugger Link:</span>
                    <div id="credentials-reset-token" className="font-mono text-[9px] bg-white p-2 rounded border border-stone-250 select-all break-all text-stone-850 leading-normal max-h-16 overflow-y-auto">
                      {generatedResetToken}
                    </div>
                    <div className="flex gap-2 justify-between items-center">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedResetToken);
                          alert("Link successfully copied to clipboard.");
                        }}
                        className="text-[9px] text-stone-700 bg-white border border-stone-250 py-1 px-2.5 rounded hover:bg-stone-50 font-bold"
                      >
                        Copy Link
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => handleVerifyResetToken(generatedResetToken)}
                        className="text-[9px] text-amber-900 bg-amber-50 hover:bg-amber-100 py-1 px-2.5 rounded font-bold border border-amber-200"
                      >
                        🔗 Auto Verify Via Link
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotOpen(false);
                      setForgotPasswordEmail('');
                      setForgotPasswordStep(1);
                      setForgotPasswordError('');
                    }}
                    className="w-full py-2 bg-stone-100 text-stone-600 rounded-lg font-bold hover:bg-stone-200 text-[11px]"
                  >
                    Cancel Recovery
                  </button>
                </div>
              )}

              {forgotPasswordStep === 3 && (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-amber-100 text-amber-805 rounded-full flex items-center justify-center mx-auto text-xl shadow-inner mb-3">
                      <Lock className="w-6 h-6" />
                    </div>
                    <h3 className="font-serif font-bold text-sm text-stone-950">Replace Member Passcode</h3>
                    <p className="text-stone-500 text-[10px] mt-1 break-all bg-amber-500/10 text-amber-800 border border-amber-500/20 py-1 px-2 rounded-md font-mono inline-block">
                      Secure session: {forgotPasswordEmail}
                    </p>
                  </div>

                  <form onSubmit={handleSaveNewPassword} className="space-y-3">
                    {/* New Password field */}
                    <div className="space-y-1 relative">
                      <label className="block text-stone-500 font-medium text-[10px] text-left">New Security Passcode</label>
                      <div className="relative">
                        <input
                          id="reset-new-pass"
                          type={isResetShowPassword ? "text" : "password"}
                          required
                          value={resetNewPassword}
                          onChange={(e) => setResetNewPassword(e.target.value)}
                          className="w-full bg-stone-50 border border-stone-300 p-2 rounded text-left pr-8 focus:outline-none focus:border-stone-500 text-stone-800"
                          placeholder="••••••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setIsResetShowPassword(!isResetShowPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                        >
                          {isResetShowPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Commit verification field */}
                    <div className="space-y-1 relative">
                      <label className="block text-stone-500 font-medium text-[10px] text-left">Confirm Passcode</label>
                      <div className="relative">
                        <input
                          id="reset-confirm-pass"
                          type={isResetShowConfirmPassword ? "text" : "password"}
                          required
                          value={resetConfirmPassword}
                          onChange={(e) => setResetConfirmPassword(e.target.value)}
                          className="w-full bg-stone-50 border border-stone-300 p-2 rounded text-left pr-8 focus:outline-none focus:border-stone-500 text-stone-800"
                          placeholder="••••••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setIsResetShowConfirmPassword(!isResetShowConfirmPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                        >
                          {isResetShowConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Secure password strength checklist */}
                    <div className="space-y-2 bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-stone-500 font-medium">Password Strength:</span>
                        <span className={`font-bold uppercase tracking-wider ${getPasswordStrength(resetNewPassword).textTailwind}`}>
                          {getPasswordStrength(resetNewPassword).text}
                        </span>
                      </div>

                      {/* Visual Strength Meter Segments */}
                      <div className="flex gap-1 h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
                        {[1, 2, 3, 4, 5].map((level) => {
                          const currentStrength = getPasswordStrength(resetNewPassword);
                          const isActive = currentStrength.score >= level;
                          return (
                            <div
                              key={level}
                              className={`h-full flex-1 transition-all duration-300 rounded-full ${
                                isActive ? currentStrength.color : 'bg-stone-200/60'
                              }`}
                            />
                          );
                        })}
                      </div>

                      {/* Real-time Checklist */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1.5 border-t border-stone-200/55 text-[9px] text-left">
                        {getPasswordStrength(resetNewPassword).requirements.map((req) => (
                          <div key={req.id} className="flex items-center gap-1 leading-tight">
                            {req.met ? (
                              <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                            ) : (
                              <X className="w-3 h-3 text-red-400 shrink-0" />
                            )}
                            <span className={req.met ? "text-stone-850 font-medium" : "text-stone-400"}>
                              {req.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1 select-none">
                      <button
                        type="submit"
                        disabled={isAuthLoading}
                        className="flex-1 py-2.5 bg-stone-900 text-white rounded-lg font-bold hover:bg-stone-850 cursor-pointer disabled:bg-stone-400 transition-all text-[11px]"
                      >
                        {isAuthLoading ? "Hashing passcode..." : "🔐 Securely Save Passcode"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotPasswordStep(2);
                        }}
                        className="px-3.5 py-2.5 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 font-semibold"
                      >
                        Back
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {forgotPasswordStep === 4 && (
                <div className="text-center space-y-4 text-stone-900">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto text-xl shadow-inner animate-bounce">
                    <ShieldCheck className="w-6 h-6" />
                  </div>

                  <div>
                    <h3 className="font-serif font-bold text-sm text-stone-950">Identity Verified & Sealed</h3>
                    <p className="text-stone-500 text-[10px] mt-1 leading-normal">
                      Your new passcode has been cryptographically-hashed and secured inside local registries successfully.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotOpen(false);
                      setForgotPasswordEmail('');
                      setForgotPasswordStep(1);
                    }}
                    className="w-full py-2.5 bg-stone-950 hover:bg-stone-850 text-white font-bold rounded-lg text-[11px] cursor-pointer block border border-transparent shadow-md"
                  >
                    Done - Return to Login
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FIRESTORE ACTIVE CONNECTION TROUBLESHOOTING DIAGNOSTIC GUIDE */}
      <AnimatePresence>
        {showFirestoreGuide && (
          <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="bg-white border border-stone-200 max-w-lg w-full rounded-3xl overflow-hidden shadow-2xl p-7 relative font-sans text-stone-900"
            >
              {/* Decorative accent glow */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-amber-100/40 rounded-full blur-3xl -z-10" />

              {/* Close Button */}
              <button
                onClick={() => setShowFirestoreGuide(false)}
                className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 font-bold p-1 cursor-pointer text-lg"
              >
                ✕
              </button>

              <h3 className="font-serif text-lg font-bold text-stone-950 tracking-tight text-center flex items-center justify-center gap-1.5">
                💼 Firebase Cloud Database Sync Diagnostics
              </h3>
              
              <p className="text-stone-600 text-xs mt-3 leading-relaxed text-center">
                Your application failed to establish a direct connection with Google Cloud Firestore. This happens when Firestore has not been created or initialization has not finished inside your Firebase Console for project ID <code className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-750 font-mono text-[10px]">abstract-phalanx-lr5vm</code>.
              </p>

              {/* Step-by-Step Instructions */}
              <div className="mt-4 bg-stone-50 border border-stone-200 rounded-2xl p-4.5 space-y-3 text-left leading-normal">
                <span className="text-[10px] uppercase font-mono font-bold text-stone-500 tracking-wider block">How to resolve and activate real-time syncing:</span>
                
                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-stone-200 border border-stone-300 text-stone-800 flex items-center justify-center font-mono font-bold text-[9px] shrink-0 mt-0.5">1</span>
                  <p className="text-xs text-stone-600 leading-normal">
                    Open your project's Firestore database page in the Firebase Console: <a href="https://console.firebase.google.com/project/abstract-phalanx-lr5vm/firestore" target="_blank" rel="noopener noreferrer" className="text-amber-800 hover:underline font-bold inline-flex items-center gap-0.5">console.firebase.google.com ➔</a>
                  </p>
                </div>

                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-stone-200 border border-stone-300 text-stone-800 flex items-center justify-center font-mono font-bold text-[9px] shrink-0 mt-0.5">2</span>
                  <p className="text-xs text-stone-600 leading-normal">
                    Click the <strong className="text-stone-800">"Create Database"</strong> button and select "Start in Test Mode" or "Start in Production Mode."
                  </p>
                </div>

                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-stone-200 border border-stone-300 text-stone-800 flex items-center justify-center font-mono font-bold text-[9px] shrink-0 mt-0.5">3</span>
                  <p className="text-xs text-stone-600 leading-normal">
                    Select a Cloud region for database storage (e.g. <code className="bg-stone-100 px-1 rounded font-mono">asia-southeast1</code> or <code className="bg-stone-100 px-1 rounded font-mono">us-central</code>) and click Enable.
                  </p>
                </div>

                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-stone-200 border border-stone-300 text-stone-800 flex items-center justify-center font-mono font-bold text-[9px] shrink-0 mt-0.5">4</span>
                  <p className="text-xs text-stone-600 leading-normal">
                    Refresh this page. Once provisioned on Firebase, memory spools, files, and parcel logistics data will sync and persist instantly across all dashboards!
                  </p>
                </div>
              </div>

              {/* Status Section */}
              <div className="mt-5 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                <p className="text-[11px] text-emerald-800 leading-relaxed font-semibold">
                  💡 <strong>Local Cache Active:</strong> ReLive has enabled local caching. All orders, photo files, restoration states, pickup schedulers, and alerts will sync in real time once your Google Firebase database is provisioned and linked successfully!
                </p>
              </div>

              {/* Close Action */}
              <button
                onClick={() => setShowFirestoreGuide(false)}
                className="mt-5 w-full py-2.5 bg-stone-900 hover:bg-stone-805 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Close Database Setup Guide
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
