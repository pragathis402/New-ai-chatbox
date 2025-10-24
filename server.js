// server.js
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000; // Use env or default to 4000

// --- Fix __dirname for ES modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Middleware ---
app.use(express.static(__dirname)); // Serve frontend files from same folder
app.use(express.json({ limit: "10mb" }));

// --- Gemini API Configuration ---
const MODEL = "gemini-2.5-flash";
const API_KEY = process.env.GOOGLE_API_KEY;

if (!API_KEY) {
  console.error("⚠️ GOOGLE_API_KEY not set in .env file!");
}

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

console.log("Using API URL:", API_URL);

// --- Routes ---

// ✅ Generate Text Endpoint
app.post("/generate", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) return res.status(400).json({ error: "No prompt provided." });
  if (!API_KEY) return res.status(500).json({ error: "API key is missing." });

  try {
    const body = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    };

    console.log("Request body:", JSON.stringify(body));

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const rawText = await response.text();
    console.log("Raw API response:", response.status, rawText);

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Google API returned ${response.status}`,
        details: rawText,
      });
    }

    const data = JSON.parse(rawText);
    const aiText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No text returned from Gemini API.";

    return res.json({ response: aiText });
  } catch (err) {
    console.error("🔥 Error in /generate:", err);
    return res.status(500).json({ error: err.message });
  }
});

// ✅ Generate Image Endpoint
app.post("/generateImage", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) return res.status(400).json({ error: "No prompt provided." });
  if (!API_KEY) return res.status(500).json({ error: "API key is missing." });

  try {
    const imageUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateImage?key=${API_KEY}`;

    const response = await fetch(imageUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const rawText = await response.text();
    console.log("Raw image API response:", response.status, rawText);

    const data = JSON.parse(rawText);
    const out =
      data.imageUrl ||
      data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ||
      null;

    return res.json({ imageUrl: out });
  } catch (err) {
    console.error("🔥 Error in /generateImage:", err);
    return res.status(500).json({ error: err.message });
  }
});

// --- Start the server ---
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
