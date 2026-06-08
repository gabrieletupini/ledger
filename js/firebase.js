import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js';
import {
  getFirestore, collection, addDoc, deleteDoc, doc, updateDoc,
  serverTimestamp, onSnapshot, query, orderBy
} from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js';
import {
  getAuth, signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider
} from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js';

const ALLOWED_EMAILS = ['gabritupini@gmail.com', 'gabritupini3@gmail.com'];

const COL_EVENTS = 'events';

let db, auth;
let syncStatusCallback = null;

// TODO: create a dedicated Firebase project for Ledger (e.g. "ledger-journal-db")
// and replace the values below with the project's web-app config. Until then,
// the app will fail to initialise — set the project, then this works the same
// way stoa does.
export function initFirebase() {
  const app = initializeApp({
    apiKey: "REPLACE_ME",
    authDomain: "ledger-journal-db.firebaseapp.com",
    projectId: "ledger-journal-db",
    storageBucket: "ledger-journal-db.firebasestorage.app",
    messagingSenderId: "REPLACE_ME",
    appId: "REPLACE_ME",
  });
  db = getFirestore(app);
  auth = getAuth(app);
}

export function onAuthReady(callback) {
  onAuthStateChanged(auth, (user) => {
    if (user && ALLOWED_EMAILS.includes(user.email)) {
      callback(user);
    } else if (user) {
      signOut(auth);
      callback(null);
    } else {
      callback(null);
    }
  });
}

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    if (!ALLOWED_EMAILS.includes(result.user.email)) {
      await signOut(auth);
      return { error: 'unauthorized' };
    }
    return { user: result.user };
  } catch (err) {
    return { error: err.message };
  }
}

export async function logout() {
  await signOut(auth);
}

export function onSyncStatus(callback) {
  syncStatusCallback = callback;
}
function emit(status) { if (syncStatusCallback) syncStatusCallback(status); }

// ===== Events =====
export function subscribeToEvents(callback) {
  emit('connecting');
  return onSnapshot(
    query(collection(db, COL_EVENTS), orderBy('date', 'desc')),
    (snap) => {
      emit('synced');
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    },
    (err) => {
      console.error('subscribeToEvents', err);
      emit('error');
    }
  );
}

export async function createEvent(data) {
  emit('syncing');
  const ref = await addDoc(collection(db, COL_EVENTS), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  emit('synced');
  return ref.id;
}

export async function updateEvent(id, data) {
  emit('syncing');
  await updateDoc(doc(db, COL_EVENTS, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
  emit('synced');
}

export async function deleteEvent(id) {
  emit('syncing');
  await deleteDoc(doc(db, COL_EVENTS, id));
  emit('synced');
}
