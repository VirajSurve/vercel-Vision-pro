import express from 'express';
import cors from 'cors'; // Import cors package
import bodyParser from 'body-parser';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from "url";

// Your actual API key
const apiKey = "AIzaSyD2JwFzqCf9bzMtm2TsdZzrd2_td-RW6CE"; // Replace with your actual API key
const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors()); // Use cors middleware
app.use(bodyParser.json());

// Initialize chat session outside of endpoints
let chatSession;

async function uploadBase64ToGemini(base64Data, mimeType, filename) {
  const buffer = Buffer.from(base64Data, "base64");
  const tempFilePath = path.join(__dirname, filename);
  fs.writeFileSync(tempFilePath, buffer);

  try {
    const uploadResult = await fileManager.uploadFile(tempFilePath, {
      mimeType,
      displayName: filename,
    });
    const file = uploadResult.file;
    console.log(`Uploaded file ${file.displayName} as: ${file.name}`);
    return file;
  } finally {
    fs.unlinkSync(tempFilePath);
  }
}

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-pro",
  systemInstruction: "You are an image assistant.",
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

// Initialize chat session here
(async () => {
  try {
    const chatSession = await model.startChat({
      generationConfig,
      history: [],
    });
    console.log('Chat session initialized successfully');
  } catch (error) {
    console.error('Error initializing chat session:', error);
  }
})();


app.post('/upload', async (req, res) => {
    const { base64Image, mimeType, filename } = req.body;
    try {
      const file = await uploadBase64ToGemini(base64Image, mimeType, filename);
      if (!file) {
        throw new Error('Failed to upload file');
      }
  
    //   // Ensure chatSession is initialized
    //   if (!chatSession) {
    //     throw new Error('Chat session not initialized');
    //   }

    chatSession = model.startChat({
        generationConfig,
        history: [
          {
            role: "user",
            parts: [
              {
                fileData: {
                  mimeType: file.mimeType,
                  fileUri: file.uri,
                },
              },
            ],
          },
        ],
      });
  
      const result = await chatSession.sendMessage("what do you see");
      console.log(result.response.text());
      res.json(result.response.text());
    } catch (error) {
      console.error('Error (Server) uploading file:', error);
      res.status(500).json({ error: 'Failed to process request' });
    }
  });
  

app.post('/chat', async (req, res) => {
  const { userText } = req.body;
  try {
    const result = await chatSession.sendMessage(userText);
    console.log(result.response.text());
    res.json(result.response.text());
  } catch (err) {
    console.error("Error (server) in sending the text", err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.listen(3001, '0.0.0.0', () => {
  console.log('Server is running on port 3001');
});

