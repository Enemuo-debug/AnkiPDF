/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import { User, Deck, Card, ReviewHistory, GenerationJob } from "../types";

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "db.json");

interface DatabaseSchema {
  users: User[];
  decks: Deck[];
  cards: Card[];
  reviews: ReviewHistory[];
  jobs: GenerationJob[];
}

const DEFAULT_DB: DatabaseSchema = {
  users: [
    {
      id: "guest-user-123",
      email: "guest@example.com",
      streak: 4,
      lastActiveDate: new Date().toISOString().split("T")[0],
      dailyTarget: 15,
    },
  ],
  decks: [
    {
      id: "sample-deck-sm2",
      userId: "guest-user-123",
      name: "Spaced Repetition & SM-2 Mechanics",
      description: "Learn how the SM-2 algorithm works, its history, and key formulas for spaced repetition.",
      category: "Computer Science",
      cardCount: 6,
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "sample-deck-geography",
      userId: "guest-user-123",
      name: "Incredible World Wonders",
      description: "Fascinating facts about human-made and natural world wonders across the globe.",
      category: "Geography",
      cardCount: 5,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    }
  ],
  cards: [
    // SM-2 Deck
    {
      id: "sm2-card-1",
      deckId: "sample-deck-sm2",
      front: "Who originally designed the SM-2 Spaced Repetition Algorithm?",
      back: "Piotr Woźniak in the late 1980s for his SuperMemo system.",
      type: "qa",
      sourcePage: 1,
      ease: 2.5,
      interval: 0,
      repetitions: 0,
      nextReviewDate: new Date().toISOString(), // Due today
    },
    {
      id: "sm2-card-2",
      deckId: "sample-deck-sm2",
      front: "The starting value for the SM-2 Ease Factor (EF) is {{c1::2.5}}.",
      back: "The starting Ease Factor (EF) is 2.5. This factor determines how fast the review intervals stretch over consecutive successful studies.",
      type: "cloze",
      sourcePage: 1,
      ease: 2.5,
      interval: 0,
      repetitions: 0,
      nextReviewDate: new Date().toISOString(), // Due today
    },
    {
      id: "sm2-card-3",
      deckId: "sample-deck-sm2",
      front: "Definition: Ease Factor (EF)",
      back: "A coefficient in spaced repetition algorithms that represents how easy a card is to recall. It scales the next interval recursively (next_interval = prev_interval * EF).",
      type: "definition",
      sourcePage: 2,
      ease: 2.6,
      interval: 4,
      repetitions: 2,
      nextReviewDate: new Date().toISOString(), // Due today
    },
    {
      id: "sm2-card-4",
      deckId: "sample-deck-sm2",
      front: "In the SM-2 algorithm, what are the first two review intervals (in days) if you grade a card successfully?",
      back: "Interval 1 is 1 day, and Interval 2 is 6 days. Subsequent intervals are calculated by multiplying the previous interval by the Ease Factor.",
      type: "qa",
      sourcePage: 2,
      ease: 2.5,
      interval: 0,
      repetitions: 0,
      nextReviewDate: new Date().toISOString(), // Due text
    },
    {
      id: "sm2-card-5",
      deckId: "sample-deck-sm2",
      front: "What happens to the intervals and repetitions counts of a card if the user grades it 'Again' or receives a rating under 3?",
      back: "The repetition count is reset to 0, and the review interval is reset to 1 day. The Ease Factor remains unchanged or is slightly reduced.",
      type: "qa",
      sourcePage: 3,
      ease: 2.4,
      interval: 0,
      repetitions: 0,
      nextReviewDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    },
    {
      id: "sm2-card-6",
      deckId: "sample-deck-sm2",
      front: "If you remember a card with perfect response synchronization, you select the 'Easy' option, which correlates to a rating of {{c1::5}}.",
      back: "An 'Easy' rating corresponds to 5. Rating options are: 1 (Again), 2 (Hard), 3 (Good), and 4 (Easy) in Anki, often mapped to 0-5 in standard research.",
      type: "cloze",
      sourcePage: 3,
      ease: 2.6,
      interval: 12,
      repetitions: 3,
      nextReviewDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // Future
    },
    // World Wonders Deck
    {
      id: "ww-card-1",
      deckId: "sample-deck-geography",
      front: "In which country is the ancient rose-red city of Petra located?",
      back: "Jordan. It is famous for its rock-cut architecture and water conduit system.",
      type: "qa",
      sourcePage: 1,
      ease: 2.5,
      interval: 0,
      repetitions: 0,
      nextReviewDate: new Date().toISOString(), // Due today
    },
    {
      id: "ww-card-2",
      deckId: "sample-deck-geography",
      front: "The Great Pyramid of Giza is the only remaining wonder of the {{c1::Seven Wonders of the Ancient World}}.",
      back: "It is the oldest of the Ancient Wonders and remains largely intact.",
      type: "cloze",
      sourcePage: 1,
      ease: 2.5,
      interval: 0,
      repetitions: 0,
      nextReviewDate: new Date().toISOString(), // Due today
    },
    {
      id: "ww-card-3",
      deckId: "sample-deck-geography",
      front: "Definition: Machu Picchu",
      back: "An Incan citadel set high in the Andes Mountains in Peru, built in the 15th century and later abandoned. It is renowned for its sophisticated dry-stone walls.",
      type: "definition",
      sourcePage: 2,
      ease: 2.5,
      interval: 0,
      repetitions: 0,
      nextReviewDate: new Date().toISOString(), // Due today
    },
    {
      id: "ww-card-4",
      deckId: "sample-deck-geography",
      front: "In which city state is the Colosseum located?",
      back: "Rome, Italy. It is the largest ancient amphitheater ever built.",
      type: "qa",
      sourcePage: 3,
      ease: 2.5,
      interval: 5,
      repetitions: 2,
      nextReviewDate: new Date().toISOString(), // Due today
    },
    {
      id: "ww-card-5",
      deckId: "sample-deck-geography",
      front: "The Taj Mahal is located in the Indian city of {{c1::Agra}}.",
      back: "Built by Emperor Shah Jahan in memory of his favorite wife Mumtaz Mahal.",
      type: "cloze",
      sourcePage: 4,
      ease: 2.7,
      interval: 10,
      repetitions: 3,
      nextReviewDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(), // Future
    }
  ],
  reviews: [],
  jobs: [],
};

// Ensure data folder exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Bootstrap file database
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), "utf-8");
}

export function readDB(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return DEFAULT_DB;
    }
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to read local DB. Returning defaults.", err);
    return DEFAULT_DB;
  }
}

export function writeDB(data: DatabaseSchema): void {
  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error("Failed to write to local DB.", err);
  }
}
