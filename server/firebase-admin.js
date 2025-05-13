const admin = require('firebase-admin');
const serviceAccount = {
  "type": "service_account",
  "project_id": process.env.PROJECT_ID,
  "private_key_id": process.env.PRIVATE_KEY_ID,
  "private_key": process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
  "client_email": process.env.CLIENT_EMAIL,
  "client_id": process.env.CLIENT_ID,
  "auth_uri": process.env.AUTH_URI,
  "token_uri": process.env.TOKEN_URI,
  "auth_provider_x509_cert_url": process.env.AUTH_PROVIDER_X509_CERT_URL,
  "client_x509_cert_url": process.env.CLIENT_X509_CERT_URL,
  "universe_domain": process.env.UNIVERSE_DOMAIN
};

// Initialize Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

// Export Firebase services
const auth = admin.auth();
const firestore = admin.firestore();
const realtimeDatabase = admin.database();
const storage = admin.storage().bucket();

// Realtime DB helpers
const ref = (path) => realtimeDatabase.ref(path);
const remove = async (path) => await realtimeDatabase.ref(path).remove();
const update = async (path, data) => await realtimeDatabase.ref(path).update(data);

module.exports = {
  admin,
  auth,
  firestore,
  realtimeDatabase,
  storage,
  ref,
  remove,
  update,

  formatDoc: (doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate().toISOString() || null,
    };
  },

  addFolder: async (folderName, userId, parentId, pathArr) => {
    return await firestore.collection('folders').add({
      name: folderName,
      userId,
      parentId,
      path: pathArr,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  },

  // Function to delete a folder
  deleteFolder:  async (folderId) => {
  try {
    // 1. Get the folder document from Firestore
    const folderRef = firestore.collection('folders').doc(folderId);
    const folderDoc = await folderRef.get();

    if (!folderDoc.exists) {
      throw new Error('Folder not found');
    }

    const folderData = folderDoc.data();
    const folderPath = folderData.path || [];  // Path of the folder (if needed for storage cleanup)

    // 2. Delete files in Firebase Storage (if the folder has any files)
    const folderStoragePath = folderPath.join('/');
    const [files] = await storage.getFiles({ prefix: folderStoragePath });

    // Delete files from Firebase Storage
    if (files.length > 0) {
      await Promise.all(files.map(file => file.delete()));
    }

    // 3. Delete the folder document from Firestore
    await folderRef.delete();

    // 4. Optionally, delete related paths from Realtime Database if used
    await remove(`folders/${folderId}`);

    console.log('Folder deleted successfully');
  } catch (error) {
    console.error('Error deleting folder:', error);
    throw error;
  }
 },
};
