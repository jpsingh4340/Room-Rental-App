
import React, { createContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail as firebaseSendPasswordReset,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Listen for auth changes & load Firestore profile
  useEffect(() => {
    return onAuthStateChanged(auth, async fbUser => {
      if (!fbUser) {
        setUser(null);
        return;
      }
      const ref = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        // default missing isApproved→true
        const isApproved = data.isApproved === undefined ? true : data.isApproved;
        setUser({ uid: fbUser.uid, ...data, isApproved });
      } else {
        // fallback guest
        setUser({ uid: fbUser.uid, email: fbUser.email, role: 'guest', isApproved: true });
      }
    });
  }, []);

  // Register: landlords get isApproved=false and are immediately signed out
  const register = async (fullName, email, password, role) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', cred.user.uid), {
      fullName,
      email,
      role,
      createdAt: new Date().toISOString(),
      isApproved: role === 'landlord' ? false : true
    });
    if (role === 'landlord') {
      // force logout so they see PendingApproval only
      await signOut(auth);
    }
  };

  // Login: block any landlord who isn’t approved
  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const snap = await getDoc(doc(db, 'users', cred.user.uid));
    if (!snap.exists()) throw new Error('User record not found');
    const data = snap.data();
    if (data.role === 'landlord' && !data.isApproved) {
      await signOut(auth);
      throw new Error('Your landlord account is pending admin approval.');
    }
    // else onAuthStateChanged will set user
  };

  // Google login (auto-create guest)
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const ref = doc(db, 'users', cred.user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        fullName: cred.user.displayName,
        email: cred.user.email,
        role: 'guest',
        createdAt: new Date().toISOString(),
        isApproved: true
      });
    }
  };

  const resetPassword = email => firebaseSendPasswordReset(auth, email);
  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{
      user,
      register,
      login,
      loginWithGoogle,
      resetPassword,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};