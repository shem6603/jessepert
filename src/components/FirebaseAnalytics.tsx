"use client";

import { useEffect } from "react";
import { getAnalytics, isSupported } from "firebase/analytics";
import { app } from "@/lib/firebase";

/**
 * Initializes Firebase Analytics in the browser only (SSR-safe).
 */
export function FirebaseAnalytics() {
  useEffect(() => {
    void isSupported().then((supported) => {
      if (supported) {
        getAnalytics(app);
      }
    });
  }, []);

  return null;
}
