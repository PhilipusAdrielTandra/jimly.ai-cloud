import fs from "fs";
import path from "path";
import pdf from 'pdf-parse/lib/pdf-parse.js'

const papersDir = path.join(process.cwd(), "papers");

const files = fs.readdirSync(papersDir).filter((f) => f.endsWith(".pdf"));

let chunks = [];

for (const file of files) {
  const filePath = path.join(papersDir, file);
  const dataBuffer = fs.readFileSync(filePath);
  const pdfData = await pdf(dataBuffer); 
  const text = pdfData.text;

  const paragraphs = text.match(/(.|[\r\n]){1,1000}/g) || [];

  const chunked = paragraphs.map((t, i) => ({
    id: `${file}-chunk-${i}`,
    text: t.trim(),
    source: file,
  }));

  chunks.push(...chunked);
}

fs.writeFileSync("chunks.json", JSON.stringify(chunks, null, 2));
console.log("Extracted and chunked papers:", files);
