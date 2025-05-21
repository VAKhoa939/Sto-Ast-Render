const {
  uploadFile,
  updateFileInDB,
  deleteFileFromDB,
  getFileByFolderPathFromDB,
  getFilesByFolderIdFromDB,
} = require("../DAOs/FileDAO");

module.exports = {
  //Function to upload a file
  uploadFile: async (req, res) => {
    const { name, content, path, folderId } = req.body;
    const { uid: userId } = req.decodedToken;

    if (!name || !content || !path || !folderId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      console.log("Uploading file:", name);

      await uploadFile(name.trim(), content, path, folderId, userId);

      console.log("File uploaded successfully");

      res.status(200).json({ message: "File uploaded successfully" });
    } catch (err) {
      console.error("Error uploading file to Firebase:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Function to update a file
  updateFile: async (req, res) => {
    const { fileId } = req.params;
    const { name, content } = req.body;
    const { uid: userId } = req.decodedToken;

    if (!name || !content) {
      return res
        .status(400)
        .json({ success: false, error: "Missing name or content" });
    }

    try {
      console.log("Updating file with ID:", fileId);

      await updateFileInDB(userId, fileId, name.trim(), content);

      console.log("File updated successfully");

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating file:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Function to delete a file
  deleteFile: async (req, res) => {
    const { fileId } = req.params;
    const { uid: userId } = req.decodedToken;

    try {
      console.log("Deleting file with ID:", fileId);

      await deleteFileFromDB(userId, fileId);

      console.log("File deleted successfully");

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
      console.log("Fetching files in folder:", folderPath);

      const files = await getFileByFolderPathFromDB(folderPath, userId);

      console.log("Files fetched successfully");

      res.json({ files });
    } catch (error) {
      console.error("Fetch files error:", error.message);
      res.status(500).json({ error: "Failed to fetch files" });
    }
  },

  // Function to fetch files by folderId
  fetchFilesByFolderId: async (req, res) => {
    const { folderId } = req.params;
    const { uid: userId } = req.decodedToken;

    try {
      console.log("Fetching files in folder with ID:", folderId);

      const files = await getFilesByFolderIdFromDB(folderId, userId);

      console.log("Files fetched successfully");

      res.json({ files });
    } catch (error) {
      console.error("Fetch files error:", error.message);
      res.status(500).json({ error: "Failed to fetch files" });
    }
  },
};
