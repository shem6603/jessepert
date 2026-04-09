"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { FirebaseError } from "firebase/app";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithGoogle: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Completes Google sign-in after signInWithRedirect (full page navigation)
    void getRedirectResult(auth).catch((err) => {
      if (
        err instanceof FirebaseError &&
        err.code === "auth/operation-not-allowed"
      ) {
        console.error(
          "[Firebase Auth] Google sign-in is disabled for this project. In Firebase Console: Authentication → Sign-in method → enable Google, set a support email, then Save.",
          err,
        );
      }
    });

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      if (
        error instanceof FirebaseError &&
        error.code === "auth/popup-blocked"
      ) {
        await signInWithRedirect(auth, provider);
        return;
      }
      if (
        error instanceof FirebaseError &&
        error.code === "auth/operation-not-allowed"
      ) {
        console.error(
          "[Firebase Auth] Google sign-in is disabled for this project. In Firebase Console: Authentication → Sign-in method → enable Google, set a support email, then Save.",
          error,
        );
        throw error;
      }
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
