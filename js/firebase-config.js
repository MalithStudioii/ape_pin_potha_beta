/**
 * ============================================================================
 * පිං පොත | Firebase Configuration & Initialization
 * ============================================================================
 * ඔබේ සජීවී Firebase Cloud Project (pin-ketha-app) එකේ Configuration Keys.
 */

export const firebaseConfig = {
  apiKey: "AIzaSyDjdIcbUa5kBEj0r7GcDLLMauaxixq5rTg",
  authDomain: "pin-ketha-app.firebaseapp.com",
  projectId: "pin-ketha-app",
  storageBucket: "pin-ketha-app.firebasestorage.app",
  messagingSenderId: "628672023264",
  appId: "1:628672023264:web:4f0eea97e5e3f8b6d7de85",
  measurementId: "G-WMY697P4XC",
  // Firebase App Check disabled to eliminate 60s timeout delay & ensure instant connection
  recaptchaSiteKey: ""
};

/**
 * Checks whether user has entered real Firebase credentials
 */
export function isFirebaseConfigured() {
  return (
    firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.includes("YOUR_API_KEY_HERE") &&
    firebaseConfig.projectId !== "pin-potha"
  );
}

export const COLLECTIONS = {
  POSTS: "merit_posts",
  USERS: "users",
  COMMENTS: "comments",
  NEEDS: "charity_needs",
  NOTIFICATIONS: "notifications",
  SETTINGS: "admin_settings",
  ARANYA: "aranya_senasana"
};
