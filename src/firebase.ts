import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  onSnapshot, 
  query, 
  where,
  addDoc,
  deleteDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import config from '../firebase-applet-config.json';

const firebaseConfig = config as any;

// Initialize core Firebase App
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Structural firestore error logging wrapper
export function handleFirestoreError(error: any) {
  console.error("Firestore operation error:", error);
  const code = error?.code || 'unknown';
  let message = "A system error occurred. Please try again.";
  let severity: 'error' | 'warning' = 'error';

  if (code === 'permission-denied') {
    message = "Security Gate Access Denied: You do not have permissions to read/write this historical record.";
    severity = 'error';
  } else if (code === 'unauthenticated') {
    message = "Authentication Required: Please log in to complete this operation.";
    severity = 'error';
  } else if (code === 'not-found') {
    message = "Archival resource not found.";
    severity = 'warning';
  } else if (code === 'already-exists') {
    message = "This record already exists in the digital spool index.";
    severity = 'warning';
  }

  return { code, message, severity };
}

// Google Drive integration OAuth helper modules
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/photoslibrary');
googleProvider.addScope('https://www.googleapis.com/auth/photoslibrary.appendonly');
googleProvider.addScope('https://www.googleapis.com/auth/photoslibrary.readonly');

let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const googleSignInForDrive = async () => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Drive OAuth access token from Firebase Auth');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (err: any) {
    console.error("Google Drive Auth popup error:", err);
    throw err;
  } finally {
    isSigningIn = false;
  }
};

export const getCachedAccessToken = () => {
  return cachedAccessToken;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

