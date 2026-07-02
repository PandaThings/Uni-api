import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

import { MemoryRepository } from '@uniai/database';
import { generateEmbedding } from './src/lib/embeddings';

async function inject() {
  const memoryRepo = new MemoryRepository();

  // Your actual Project ID from the database
  const projectId = "51c7e8e9-27dd-445f-8ee7-26ac36f1be03";

  const rules = `
    SENIOR DEVELOPER CODING STANDARDS: 
    Whenever writing code, you must act like a Staff Engineer. 
    1. Every function must have comprehensive Docstrings and Type Hints.
    2. You must include robust error handling (try/except blocks).
    3. You must use modern, modular, and testable architecture. 
    4. Never write basic or amateur scripts.
  `;

  console.log("Generating embedding...");
  const embedding = await generateEmbedding(rules);

  console.log("Saving memory to DigitalOcean...");
  await memoryRepo.create({
    projectId,
    summary: rules,
    embeddingText: rules,
    embedding,
    category: "architecture"
  });

  console.log("✅ Memory successfully injected!");
  process.exit(0);
}

inject();
