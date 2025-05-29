import React, { createContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (current) => {
      if (current) {
        const userDoc = await getDoc(doc(db, 'users', current.uid));
        setUser({ uid: current.uid, email: current.email, ...userDoc.data() });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};