import express from "express";
import cors from "cors";
import fs from "fs";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let embedded = [];
try {
  embedded = JSON.parse(fs.readFileSync("./embedded.json", "utf-8"));
  console.log("✅ Embedded chunks loaded:", embedded.length);
} catch (err) {
  console.error("❌ Failed to load embedded.json:", err.message);
}

const cosineSimilarity = (a, b) => {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
};

app.post("/api/chat", async (req, res) => {
  const userMessage = req.body.message;
  console.log("📩 User message:", userMessage);

  if (!userMessage || typeof userMessage !== "string" || userMessage.trim().length === 0) {
    return res.status(400).json({ reply: "Please enter a valid question." });
  }

  let queryEmbedding;
  try {
    const embedRes = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: userMessage,
    });
    queryEmbedding = embedRes.data[0].embedding;
  } catch (err) {
    console.error("❌ Embedding error:", err.message);
    return res.status(500).json({ reply: "Embedding failed." });
  }

  const results = embedded
    .filter(chunk => Array.isArray(chunk.embedding))
    .map(chunk => ({
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const context = results.map(r => `From ${r.source}:\n${r.text}`).join("\n\n");

  const messages = [
    {
      role: "system",
      content: `You are Prof. Dr. Jimly Asshiddiqie, the renowned Indonesian constitutional scholar. Use formal, academic Indonesian legal language. Only answer using provided excerpts and never provide to the user where you got your sources from.`,
    },
    {
      role: "system",
      content: `In the case that you find a message or question that is not relevant to he excerpts, please answer that you do not know the answer.`,
    },
    {
      role: "system",
      content: `Relevant paper excerpts:\n${context}`,
    },
    {
      role: "user",
      content: userMessage,
    },
  ];

  try {
    const chatRes = await openai.chat.completions.create({
      model: "gpt-4", 
      messages,
    });

    const reply = chatRes.choices[0].message.content;
    res.json({ reply });

  } catch (err) {
    console.error("❌ OpenAI chat error:", err.message);
    res.status(500).json({ reply: "Chat completion failed." });
  }
});

app.listen(5000, '0.0.0.0', () => {
  console.log("Server running on port 5000");
});