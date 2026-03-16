import admin from "firebase-admin";

const initFirebaseAdmin = () => {
  if (admin.apps.length) return admin.app();

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (rawServiceAccount) {
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(rawServiceAccount);
    } catch (err) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT must be valid JSON.");
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    return admin.app();
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
    return admin.app();
  }

  throw new Error("Firebase admin credentials are not configured.");
};

export { admin, initFirebaseAdmin };
