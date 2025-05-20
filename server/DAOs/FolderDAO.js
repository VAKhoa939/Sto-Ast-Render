const { db, FieldValue } = require("../firebase-admin-setup");

module.exports = {
  // Function to create a folder
  createFolderInDB: async (folderName, userId, parentId, pathArr) => {
    try {
      return await db.collection("folders").add({
        name: folderName,
        userId,
        parentId,
        path: pathArr,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error("Error adding folder:", error);
      throw error;
    }
  },

  // Function to update a folder
  updateFolderInDB: async (folderId, folderName) => {
    try {
      const folderRef = db.collection("folders").doc(folderId);
      await folderRef.update({
        name: folderName,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating folder:", error);
      throw error;
    }
  },

  // Function to delete a folder
  deleteFolderAndFilesFromDB: async (folderId) => {
    try {
      // 1. Get all files belonging to this folder
      const filesSnapshot = await db
        .collection("files")
        .where("folderId", "==", folderId)
        .get();

      const batch = db.batch();

      // 2. Delete each file document
      filesSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 3. Delete the folder document
      const folderRef = db.collection("folders").doc(folderId);
      batch.delete(folderRef);

      // 4. Commit all deletes at once
      await batch.commit();
    } catch (error) {
      console.error("Error deleting folder:", error);
      throw error;
    }
  },

  // Function to fetch a folder by ID
  getFolderByIdFromDB: async (folderId) => {
    try {
      const doc = await db.collection("folders").doc(folderId).get();
      if (!doc.exists) {
        throw new Error("Folder not found");
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error("Error fetching folder:", error);
      throw error;
    }
  },
};
