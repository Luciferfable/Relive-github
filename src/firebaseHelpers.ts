import { 
  auth, db, handleFirestoreError 
} from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  signInAnonymously
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs,
  query, 
  where,
  addDoc,
  deleteDoc,
  orderBy
} from 'firebase/firestore';
import { AppUser, FileItem, Order, Appointment, FamilyVault, AppNotification } from './types';
import { 
  INITIAL_USERS, INITIAL_ALBUMS, INITIAL_FILES, 
  INITIAL_ORDERS, INITIAL_APPOINTMENTS, INITIAL_NOTIFICATIONS 
} from './data';

// Standard passcode for our demo presets
export const DEMO_PASSWORD = "password123";

/**
 * Ensures a pre-registered or custom demo user exists in both Firebase Auth and Firestore.
 * Automatically provisions users using the standard credentials protocol.
 */
export async function ensureAndAuthenticateDemoUser(email: string, role: string, displayName: string): Promise<AppUser> {
  try {
    let authUser;
    try {
      // Attempt to sign in
      const credential = await signInWithEmailAndPassword(auth, email, DEMO_PASSWORD);
      authUser = credential.user;
    } catch (err: any) {
      if (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
        // Authenticator doesn't have them; sign up
        const credential = await createUserWithEmailAndPassword(auth, email, DEMO_PASSWORD);
        authUser = credential.user;
        await updateProfile(authUser, { displayName });
      } else {
        throw err;
      }
    }

    // Now check if Firestore profile doc exists
    const userDocRef = doc(db, "users", authUser.uid);
    const snap = await getDoc(userDocRef);

    let profileData: AppUser;
    if (!snap.exists()) {
      // Find matching seeding params from templates
      const seedData = (INITIAL_USERS.find(u => u.email === email) || {}) as any;
      profileData = {
        uid: authUser.uid,
        email: authUser.email || email,
        displayName: displayName || seedData.displayName || authUser.email?.split('@')[0] || "User",
        role: (role || seedData.role || 'user') as any,
        profilePhoto: seedData.profilePhoto || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80`,
        phone: seedData.phone || "+91 99999 11111",
        city: seedData.city || 'Jaipur',
        address: seedData.address || 'Heritage Lane, Jaipur',
        vehicleType: seedData.vehicleType || undefined,
        rating: seedData.rating || undefined,
        ordersCount: seedData.ordersCount || undefined
      };
      // Write profile doc - satisfying our Firestore rules (role specification match)
      await setDoc(userDocRef, profileData);
    } else {
      profileData = snap.data() as AppUser;
    }

    return profileData;
  } catch (error: any) {
    console.warn("Failed to authenticating demo user in Firebase with Email/Password:", error);
    
    // Attempt Live Anonymous Auth Connection so that the app stays online in production level instead of falling back to sandbox!
    try {
      console.info("Trying Anonymous authentication to allow direct live Firestore connectivity in production environment...");
      const credential = await signInAnonymously(auth);
      const authUser = credential.user;
      const seedData = (INITIAL_USERS.find(u => u.email === email) || {}) as any;
      return {
        uid: authUser.uid,
        email: email,
        displayName: displayName || seedData.displayName || email.split('@')[0],
        role: (role || seedData.role || 'user') as any,
        profilePhoto: seedData.profilePhoto || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80`,
        phone: seedData.phone || "+91 99999 11111",
        city: seedData.city || 'Jaipur',
        address: seedData.address || 'Heritage Lane, Jaipur',
        vehicleType: seedData.vehicleType || undefined,
        rating: seedData.rating || undefined,
        ordersCount: seedData.ordersCount || undefined,
        isSandbox: false // Maintain live connection to production Cloud Firestore!
      };
    } catch (anonErr) {
      console.warn("Firebase Auth operation is disabled in Console (auth/operation-not-allowed). Falling back to safe simulated local profile to allow seamless preview testing:", anonErr);
      const seedData = (INITIAL_USERS.find(u => u.email === email) || {}) as any;
      return {
        uid: `simulated-${email.replace(/[@.]/g, '-')}`,
        email: email,
        displayName: displayName || seedData.displayName || email.split('@')[0],
        role: (role || seedData.role || 'user') as any,
        profilePhoto: seedData.profilePhoto || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80`,
        phone: seedData.phone || "+91 99999 11111",
        city: seedData.city || 'Jaipur',
        address: seedData.address || 'Heritage Lane, Jaipur',
        vehicleType: seedData.vehicleType || undefined,
        rating: seedData.rating || undefined,
        ordersCount: seedData.ordersCount || undefined,
        isSandbox: true
      };
    }
  }
}

/**
 * Ensures the system preset users are synchronized in Firestore.
 */
export async function seedFirestoreCollectionsIfEmpty() {
  try {
    console.log("Checking preset user profiles in Firestore...");
    // Always upsert/synchronize the preset user profiles (INITIAL_USERS) to Firestore so their updated details (admin, partner, etc.) are always correct and available in the database.
    for (const u of INITIAL_USERS) {
      const userRef = doc(db, "users", u.uid);
      await setDoc(userRef, u, { merge: true });
      console.log(`Synchronized profile for preset user: ${u.email} to Firestore`);
    }

    console.log("Database checked and preset profiles synchronized successfully.");
  } catch (error) {
    console.warn("Seeding failed (perhaps rules prevented self-creation on unauthenticated startup, this is expected):", error);
  }
}
