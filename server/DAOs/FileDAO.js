const { db } = require("../firebase-admin-setup");

module.exports = {
  deleteFile: async (fileId) => {
    try {
      return await db.collection("files").doc(fileId).delete();
    } catch (error) {
      console.error("Error deleting file:", error);
      throw error;
    }
  },
};
