require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Import Firebase helper
const { auth, firestore: db, ref, remove, update, addFolder, deleteFolder } = require('./firebase-admin');

// Gemini AI setup
const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Express setup
const app = express();
const PORT = 5000;

// Allow larger request bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware
app.use(cors({
  origin: ['https://localhost:3000', 'http://localhost:3000', process.env.FRONTEND_URL],
  credentials: true,
}));
app.use(express.json());
app.use(helmet({
  xFrameOptions: { action: "sameorigin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", process.env.FRONTEND_URL, "https://localhost:3000", "https://apis.google.com", "https://www.gstatic.com"],
      styleSrc: ["'self'", process.env.FRONTEND_URL, "https://localhost:3000"],
      imgSrc: ["'self'", "data:", "https://firebasestorage.googleapis.com", "https://*.googleusercontent.com"],
      connectSrc: ["'self'", process.env.FRONTEND_URL, process.env.BACKEND_URL, "https://localhost:5000", "http://localhost:3000", "https://generativelanguage.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      formAction: ["'self'"],
      frameSrc: ["'self'", "https://auth-development-f6d07.firebaseapp.com", "https://apis.google.com"], // Allowing framing of Google Auth
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"],
    },
  },
}));
app.disable('x-powered-by');

// --- AI Routes ---
app.post('/api/ai', async (req, res) => {
  const { input, task, isImage = false, mimeType = "image/jpeg" } = req.body;
  if (!input || !task) return res.status(400).json({ error: 'Missing input or task' });

  try {
    const result = await runAI(input, task, isImage, mimeType);
    res.json({ result });
  } catch (err) {
    console.error("AI Error:", err);
    res.status(500).json({ error: 'AI processing failed' });
  }
});

app.post('/api/chatbot', async (req, res) => {
  const { input } = req.body;
  if (!input) return res.status(400).json({ error: 'Input required' });

  try {
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(input);
    const response = await result.response;
    res.json({ result: await response.text() });
  } catch (error) {
    console.error('Chatbot error:', error.message);
    res.status(500).json({ error: 'Chatbot failed' });
  }
});
//addFolder function
app.post('/api/folders', async (req, res) => {
  try {
    const { userId, folderName, parentId, pathArr } = req.body;
    console.log("Received data:", { userId, folderName, parentId, pathArr });
    if (!userId || !folderName) {
      return res.status(400).json({ error: 'Missing userId or folderName' });
    }
    // Call the addFolder function from firebase-admin.js
    const folderDoc = await addFolder(folderName, userId, parentId, pathArr);

    console.log("Folder added:", folderDoc.id);

    res.status(200).json({ success: true, folderId: folderDoc.id });
  } catch (error) {
    console.error('Error adding folder:', error);
    res.status(500).json({ error: 'Failed to add folder' });
  }
});
//deleteFolder function
app.post('/api/folders/delete', async (req, res) => {
  const { folderId } = req.body;

  if (!folderId) {
    return res.status(400).json({ error: 'Missing folderId' });
  }

  try {
    // Call deleteFolder function that you wrote earlier
    await deleteFolder(folderId);
    res.status(200).json({ success: true, message: 'Folder deleted successfully' });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});


// TODO: addFile function
app.post("/api/upload-file", async (req, res) => {
  const { name, content, path, folderId } = req.body;
  const user = req.user;
  console.log("Received body:", req.body);
  if (!name || !content || !path || !folderId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const filePath = `files/${user.uid}/${path}`;

    await admin
      .database()
      .ref(filePath)
      .set({
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
});


// --- Folder/Files API ---
app.get('/api/folder/:folderId', async (req, res) => {
  try {
    const doc = await db.collection('folders').doc(req.params.folderId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Folder not found' });
    res.json({ folder: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error('Fetch folder error:', error.message);
    res.status(500).json({ error: 'Failed to fetch folder' });
  }
});

app.get('/api/folders', async (req, res) => {
  const { parentId, userId } = req.query;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const foldersRef = db.collection('folders')
      .where('userId', '==', userId)
      .where('parentId', '==', parentId || null);

    const snapshot = await foldersRef.get();
    const folders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ folders });
  } catch (error) {
    console.error("Error fetching folders:", error.message);
    res.status(500).json({ error: "Failed to fetch folders" });
  }
});

app.get('/api/files', async (req, res) => {
  const { folderPath, userId } = req.query;
  if (!folderPath || !userId) return res.status(400).json({ error: 'Missing folderPath or userId' });

  try {
    const query = db.collection('files')
      .where('folderPath', '==', folderPath)
      .where('userId', '==', userId);
    const snapshot = await query.get();
    const files = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ files });
  } catch (error) {
    console.error('Fetch files error:', error.message);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

app.delete('/api/files/:userId/:fileId', async (req, res) => {
  const { userId, fileId } = req.params;

  try {
    await remove(`files/${userId}/${fileId}`);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/files/:userId/:fileId', async (req, res) => {
  const { userId, fileId } = req.params;
  const { name, content } = req.body;

  if (!name || !content) {
    return res.status(400).json({ success: false, error: "Missing name or content" });
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
});

// --- AI core logic ---
async function runAI(input, task, isImage = false, mimeType = "image/jpeg") {
  const model = client.getGenerativeModel({ model: isImage ? "gemini-pro-vision" : "gemini-2.0-flash" });
  const prompt = isImage
    ? (task === "describe" ? "Describe the image." : "Identify objects in the image.")
    : (task === "summarize" ? `${input}\nSummarize.` : `${input}\nExtract keywords.`);

  if (isImage) {
    return (await model.generateContent({
      contents: [{ parts: [prompt, { inlineData: { mimeType, data: input } }] }]
    })).response.text();
  } else {
    return (await model.generateContent(prompt)).response.text();
  }
}

// --- HTTPS Server ---
if (process.env.HTTPS === 'true') {
  const https = require('https');
  const fs = require('fs');

  // --- HTTPS Server ---
  const options = {
    key: fs.readFileSync(path.join(__dirname, 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'cert.pem')),
  };

  https.createServer(options, app).listen(PORT, () => {
    console.log(`✅ HTTPS server running at https://localhost:${PORT}`);
  });
} else {
  // --- HTTP Server ---
  app.listen(PORT, () => {
    console.log(`✅ HTTP server running at http://localhost:${PORT}`);
  });
}