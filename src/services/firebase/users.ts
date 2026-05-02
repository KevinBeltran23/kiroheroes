import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import { User } from '../../types/user';

const db = getFirestore();

export const USERS_COLLECTION = 'users';

export function getUserDocumentRef(userId: string) {
  return doc(db, USERS_COLLECTION, userId);
}

export async function createUserProfile(user: {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}): Promise<User> {
  const userRef = doc(db, USERS_COLLECTION, user.uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    return { uid: user.uid, ...snapshot.data() } as User;
  }

  const newUserProfile: Omit<User, 'createdAt'> = {
    uid: user.uid,
    displayName: user.displayName || 'Drummer',
    email: user.email ?? null,
    photoURL: user.photoURL || null,
    darkMode: false,
    colorBlindMode: 'none',
    highContrast: false,
    hasAcceptedTerms: false,
    skillLevel: 'beginner',
    handedness: 'right',
  };

  await setDoc(userRef, {
    ...newUserProfile,
    createdAt: serverTimestamp(),
  });

  return {
    ...newUserProfile,
    createdAt: new Date(),
  };
}

export async function getUserProfile(userId: string): Promise<User | null> {
  const docSnap = await getDoc(doc(db, USERS_COLLECTION, userId));
  return docSnap.exists() ? ({ uid: userId, ...docSnap.data() } as User) : null;
}

export async function updateUser(
  userId: string,
  data: Partial<User>,
): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, userId), data);
}

export async function updateUserTermsAcceptance(
  userId: string,
  hasAccepted: boolean,
): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, userId), {
    hasAcceptedTerms: hasAccepted,
  });
}
