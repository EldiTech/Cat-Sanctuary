import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Firestore, getFirestore, setLogLevel } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCw_WtLOsd1M3oCYC600l7P0vZg4a_7HzE',
  authDomain: 'cat-sanctuary-74998.firebaseapp.com',
  projectId: 'cat-sanctuary-74998',
  storageBucket: 'cat-sanctuary-74998.firebasestorage.app',
  messagingSenderId: '155916245482',
  appId: '1:155916245482:android:3ef3de532e82297a9cba93',
};

const firebaseApp: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db: Firestore = getFirestore(firebaseApp);

// Reduce noisy Firestore transport warnings while keeping actual errors visible.
setLogLevel('error');

export { db, firebaseApp, firebaseConfig };
