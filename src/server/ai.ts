/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { CardType } from "../types";

let aiClient: GoogleGenAI | null = null;

export function getGenAIClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY is not configured. Please add it to your environment secrets in the AI Studio sidebar.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

export interface GeneratedMeta {
  deckName: string;
  description: string;
  category: string;
  pageCount: number;
}

export interface GeneratedCard {
  front: string;
  back: string;
  type: CardType;
  sourcePage?: number;
}

/**
 * Analyzes the uploaded PDF metadata to create a matching Deck title, description and subject group.
 */
export async function analyzePDFMetadata(base64Pdf: string): Promise<GeneratedMeta> {
  const ai = getGenAIClient();
  
  // Clean potential base64 prefix
  const cleanBase64 = base64Pdf.replace(/^data:application\/pdf;base64,/, "");

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [
      {
        inlineData: {
          data: cleanBase64,
          mimeType: "application/pdf"
        }
      },
      "Analyze this PDF document and summarize its identity. Recommend a concise study deck name (max 5 words), a clear explanation description (max 20 words), a general school subject category (e.g. History, Medicine, Physics, Biology, Law, Engineering, Languages), and tell me the total pages you found."
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          deckName: { type: Type.STRING, description: "A high-quality educational deck name summarizing this PDF, max 5 words." },
          description: { type: Type.STRING, description: "Brief overview of what this deck will teach, max 20 words." },
          category: { type: Type.STRING, description: "One school/academic category for organization." },
          pageCount: { type: Type.INTEGER, description: "Estimated total page count of this PDF." }
        },
        required: ["deckName", "description", "category", "pageCount"]
      }
    }
  });

  if (!response.text) {
    throw new Error("Gemini returned empty metadata mapping.");
  }

  const parsed = JSON.parse(response.text.trim()) as GeneratedMeta;
  return {
    deckName: parsed.deckName || "Smart PDF Deck",
    description: parsed.description || "Generated study deck",
    category: parsed.category || "General Studies",
    pageCount: parsed.pageCount || 1
  };
}

/**
 * Generates flashcards based on the uploaded PDF.
 */
export async function generateFlashcardsFromPDF(base64Pdf: string, meta: GeneratedMeta): Promise<GeneratedCard[]> {
  const ai = getGenAIClient();
  const cleanBase64 = base64Pdf.replace(/^data:application\/pdf;base64,/, "");

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [
      {
        inlineData: {
          data: cleanBase64,
          mimeType: "application/pdf"
        }
      },
      `You are an elite professor and educational cognitive specialist. Extract a comprehensive, high-quality deck of active recall flashcards from this PDF document to help students understand and review topics.
      
      Generate between 12 to 20 outstanding cards total, ensuring coverage of:
      - Core vocabulary, key terms, definitions (type: "definition")
      - Major processes, questions & answers, formulas (type: "qa")
      - Fill-in-the-blanks style cards (type: "cloze")
      
      Formatting Instructions:
      1. For QA 'qa' card: Front is a direct question (e.g. "What is the capital of France?"), Back is the concise answer.
      2. For CLOZE 'cloze' card: Front has double brackets wrapping the term to hide, e.g. "Water boils at {{c1::100 degrees Celsius}} under standard pressure.", Back is a short context notes or trivia about the term.
      3. For DEFINITION 'definition' card: Front is ONLY the term name (e.g., "Mitochondria"), Back is the strict academic definition.
      4. Try to estimate the true page index of where the concept appears and list it as sourcePage.`
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            front: { type: Type.STRING, description: "Front side of the card. Use {{c1::...}} for cloze type." },
            back: { type: Type.STRING, description: "Back / answer side of the card." },
            type: { type: Type.STRING, description: "Card style: 'qa', 'cloze', or 'definition'." },
            sourcePage: { type: Type.INTEGER, description: "The source page estimate (integer)." }
          },
          required: ["front", "back", "type"]
        },
        description: "List of generated unique, clear, study cards."
      }
    }
  });

  if (!response.text) {
    throw new Error("Gemini returned empty flashcard array.");
  }

  const cards = JSON.parse(response.text.trim()) as GeneratedCard[];
  
  // Quality Filtering Pass:
  // 1. Remove duplicate fronts
  // 2. Filter empty strings
  // 3. Ensure card type is valid
  const seenFronts = new Set<string>();
  const sanitized: GeneratedCard[] = [];

  for (const c of cards) {
    if (!c.front || !c.back || !c.type) continue;
    const cleanFront = c.front.trim().toLowerCase();
    if (seenFronts.has(cleanFront)) continue; // skip duplicates
    
    seenFronts.add(cleanFront);
    
    // Validate card types
    let validType: CardType = "qa";
    if (c.type === "cloze" || c.type === "definition") {
      validType = c.type;
    }

    sanitized.push({
      front: c.front.trim(),
      back: c.back.trim(),
      type: validType,
      sourcePage: c.sourcePage || undefined
    });
  }

  return sanitized;
}
