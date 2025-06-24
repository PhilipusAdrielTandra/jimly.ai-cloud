import fs from "fs";
import "dotenv/config";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const chunks = JSON.parse(fs.readFileSync("./chunks.json", "utf-8"));
const embedded = [];

const embedText = async (text) => {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
  });

  return response.data[0].embedding;
};

const run = async () => {
  for (const chunk of chunks) {
    try {
      const embedding = await embedText(chunk.text);
      embedded.push({ ...chunk, embedding });
      console.log(`✅ Embedded: ${chunk.id}`);
    } catch (err) {
      console.error(`❌ Failed embedding ${chunk.id}:`, err.message);
    }
  }

  fs.writeFileSync("./embedded.json", JSON.stringify(embedded, null, 2));
  console.log("All chunks embedded and saved to embedded.json");
};

run();
