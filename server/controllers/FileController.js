const { admin, db, remove, update } = require("../firebase-admin-setup");

module.exports = {
  //Function to upload a file
  uploadFile: async (req, res) => {
    const { name, content, path, folderId } = req.body;
    const user = req.user;
    console.log("Received body:", req.body);
    if (!name || !content || !path || !folderId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const filePath = `files/${user.uid}/${path}`;

      await admin.database().ref(filePath).set({
        name,
        content, // Base64 string
        path,
        folderId,
        userId: user.uid,
        createdAt: admin.database.ServerValue.TIMESTAMP,
      });

      res.status(200).json({ message: "File uploaded successfully" });
    } catch (err) {
      console.error("Error uploading file to Firebase:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Function to update a file
  updateFile: async (req, res) => {
    const { userId, fileId } = req.params;
    const { name, content } = req.body;

    if (!name || !content) {
      return res
        .status(400)
        .json({ success: false, error: "Missing name or content" });
    }

    try {
      await update(`files/${userId}/${fileId}`, {
        name: name.trim(),
        content,
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating file:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Function to delete a file
  deleteFile: async (req, res) => {
    const { userId, fileId } = req.params;

    try {
      await realtimeDatabase.ref(`files/${userId}/${fileId}`).remove();
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Function to fetch files by folderPath
  fetchFilesByFolderPath: async (req, res) => {
    const { folderPath } = req.query;
    const { uid: userId } = req.decodedToken;
    if (!folderPath)
      return res.status(400).json({ error: "Missing folderPath or userId" });

    try {
      const query = db
        .collection("files")
        .where("folderPath", "==", folderPath)
        .where("userId", "==", userId);
      const snapshot = await query.get();
      const files = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      res.json({ files });
    } catch (error) {
      console.error("Fetch files error:", error.message);
      res.status(500).json({ error: "Failed to fetch files" });
    }
  },
};
