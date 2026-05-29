/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";
import { User, Deck, Card, ReviewHistory, GenerationJob } from "../types";

dotenv.config();

let client: MongoClient | null = null;
let dbInstance: Db | null = null;

const DEFAULT_DB = {
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
    {
      id: "sm2-card-1",
      deckId: "sample-deck-sm2",
      front: "Who originally designed the SM-2 Spaced Repetition Algorithm?",
      back: "Piotr Woźniak in the late 1980s for his SuperMemo system.",
      type: "qa" as const,
      sourcePage: 1,
      ease: 2.5,
      interval: 0,
      repetitions: 0,
      nextReviewDate: new Date().toISOString(),
    },
    {
      id: "sm2-card-2",
      deckId: "sample-deck-sm2",
      front: "The starting value for the SM-2 Ease Factor (EF) is {{c1::2.5}}.",
      back: "The starting Ease Factor (EF) is 2.5. This factor determines how fast the review intervals stretch over consecutive successful studies.",
      type: "cloze" as const,
      sourcePage: 1,
      ease: 2.5,
      interval: 0,
      repetitions: 0,
      nextReviewDate: new Date().toISOString(),
    },
    {
      id: "sm2-card-3",
      deckId: "sample-deck-sm2",
      front: "Definition: Ease Factor (EF)",
      back: "A coefficient in spaced repetition algorithms that represents how easy a card is to recall. It scales the next interval recursively (next_interval = prev_interval * EF).",
      type: "definition" as const,
      sourcePage: 2,
      ease: 2.6,
      interval: 4,
      repetitions: 2,
      nextReviewDate: new Date().toISOString(),
    },
    {
      id: "sm2-card-4",
      deckId: "sample-deck-sm2",
      front: "In the SM-2 algorithm, what are the first two review intervals (in days) if you grade a card successfully?",
      back: "Interval 1 is 1 day, and Interval 2 is 6 days. Subsequent intervals are calculated by multiplying the previous interval by the Ease Factor.",
      type: "qa" as const,
      sourcePage: 2,
      ease: 2.5,
      interval: 0,
      repetitions: 0,
      nextReviewDate: new Date().toISOString(),
    },
    {
      id: "sm2-card-5",
      deckId: "sample-deck-sm2",
      front: "What happens to the intervals and repetitions counts of a card if the user grades it 'Again' or receives a rating under 3?",
      back: "The repetition count is reset to 0, and the review interval is reset to 1 day. The Ease Factor remains unchanged or is slightly reduced.",
      type: "qa" as const,
      sourcePage: 3,
      ease: 2.4,
      interval: 0,
      repetitions: 0,
      nextReviewDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "sm2-card-6",
      deckId: "sample-deck-sm2",
      front: "If you remember a card with perfect response synchronization, you select the 'Easy' option, which correlates to a rating of {{c1::5}}.",
      back: "An 'Easy' rating corresponds to 5. Rating options are: 1 (Again), 2 (Hard), 3 (Good), and 4 (Easy) in Anki, often mapped to 0-5 in standard research.",
      type: "cloze" as const,
      sourcePage: 3,
      ease: 2.6,
      interval: 12,
      repetitions: 3,
      nextReviewDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "ww-card-1",
      deckId: "sample-deck-geography",
      front: "In which country is the ancient rose-red city of Petra located?",
      back: "Jordan. It is famous for its rock-cut architecture and water conduit system.",
      type: "qa" as const,
      sourcePage: 1,
      ease: 2.5,
      interval: 0,
      repetitions: 0,
      nextReviewDate: new Date().toISOString(),
    },
    {
      id: "ww-card-2",
      deckId: "sample-deck-geography",
      front: "The Great Pyramid of Giza is the only remaining wonder of the {{c1::Seven Wonders of the Ancient World}}.",
      back: "It is the oldest of the Ancient Wonders and remains largely intact.",
      type: "cloze" as const,
      sourcePage: 1,
      ease: 2.5,
      interval: 0,
      repetitions: 0,
      nextReviewDate: new Date().toISOString(),
    },
    {
      id: "ww-card-3",
      deckId: "sample-deck-geography",
      front: "Definition: Machu Picchu",
      back: "An Incan citadel set high in the Andes Mountains in Peru, built in the 15th century and later abandoned. It is renowned for its sophisticated dry-stone walls.",
      type: "definition" as const,
      sourcePage: 2,
      ease: 2.5,
      interval: 0,
      repetitions: 0,
      nextReviewDate: new Date().toISOString(),
    },
    {
      id: "ww-card-4",
      deckId: "sample-deck-geography",
      front: "In which city state is the Colosseum located?",
      back: "Rome, Italy. It is the largest ancient amphitheater ever built.",
      type: "qa" as const,
      sourcePage: 3,
      ease: 2.5,
      interval: 5,
      repetitions: 2,
      nextReviewDate: new Date().toISOString(),
    },
    {
      id: "ww-card-5",
      deckId: "sample-deck-geography",
      front: "The Taj Mahal is located in the Indian city of {{c1::Agra}}.",
      back: "Built by Emperor Shah Jahan in memory of his favorite wife Mumtaz Mahal.",
      type: "cloze" as const,
      sourcePage: 4,
      ease: 2.7,
      interval: 10,
      repetitions: 3,
      nextReviewDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    }
  ],
  reviews: [] as ReviewHistory[],
  jobs: [] as GenerationJob[],
};

/**
 * Lazy Connection to MongoDB
 */
export async function getDB(): Promise<Db> {
  if (dbInstance) return dbInstance;

  // Reload dotenv to verify latest updates
  dotenv.config();

  const uri = process.env.MONGODB_URI;
  if (!uri || uri.trim() === "") {
    throw new Error(
      "MONGODB_URI is not configured yet. Please configure MONGODB_URI in your environment secrets."
    );
  }

  try {
    client = new MongoClient(uri);
    await client.connect();
    
    // Auto-select DB or default to 'spaced_repetition'
    dbInstance = client.db(client.options.dbName || "spaced_repetition");
    console.log(`[MongoDB] Connected successfully to DB: ${dbInstance.databaseName}`);

    // Seed database if empty
    await seedDatabaseIfEmpty(dbInstance);

    return dbInstance;
  } catch (error) {
    console.error(`[MongoDB] Connection error at URI: ${uri.substring(0, 15)}...`, error);
    throw new Error(`MongoDB Connection Failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function seedDatabaseIfEmpty(db: Db): Promise<void> {
  try {
    const usersCount = await db.collection("users").countDocuments();
    const decksCount = await db.collection("decks").countDocuments();

    if (usersCount === 0 && decksCount === 0) {
      console.log("[MongoDB] Seeding database collections for guest user and sample decks...");
      
      await db.collection("users").insertMany(DEFAULT_DB.users);
      await db.collection("decks").insertMany(DEFAULT_DB.decks);
      await db.collection("cards").insertMany(DEFAULT_DB.cards);
      
      // Create indexes for performance and security lookups
      await db.collection("users").createIndex({ id: 1 }, { unique: true });
      await db.collection("users").createIndex({ email: 1 });
      await db.collection("decks").createIndex({ id: 1 }, { unique: true });
      await db.collection("decks").createIndex({ userId: 1 });
      await db.collection("cards").createIndex({ id: 1 }, { unique: true });
      await db.collection("cards").createIndex({ deckId: 1 });
      await db.collection("reviews").createIndex({ id: 1 }, { unique: true });
      await db.collection("reviews").createIndex({ userId: 1 });
      await db.collection("jobs").createIndex({ id: 1 }, { unique: true });
      await db.collection("jobs").createIndex({ id: 1, userId: 1 });

      console.log("[MongoDB] Seeding completed and lookup indexes deployed successfully.");
    }
  } catch (err) {
    console.error("[MongoDB] Failed to seed database:", err);
  }
}

/*
 ============================================================================
 USER OPERATIONS
 ============================================================================
*/

export async function getUserByIdOrEmail(token: string): Promise<User | null> {
  const db = await getDB();
  return await db.collection<User>("users").findOne({
    $or: [
      { id: token },
      { email: token },
      { email: token.toLowerCase() }
    ]
  });
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const db = await getDB();
  return await db.collection<User>("users").findOne({
    email: email.toLowerCase()
  });
}

export async function createUser(user: User): Promise<void> {
  const db = await getDB();
  const normalizedUser = {
    ...user,
    email: user.email.toLowerCase()
  };
  await db.collection<User>("users").insertOne(normalizedUser);
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<void> {
  const db = await getDB();
  await db.collection<User>("users").updateOne(
    { id: userId },
    { $set: updates }
  );
}

/*
 ============================================================================
 DECK OPERATIONS
 ============================================================================
*/

export async function getDecksByUserId(userId: string): Promise<Deck[]> {
  const db = await getDB();
  return await db.collection<Deck>("decks")
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function getDeckById(deckId: string, userId: string): Promise<Deck | null> {
  const db = await getDB();
  return await db.collection<Deck>("decks").findOne({ id: deckId, userId });
}

export async function deleteDeck(deckId: string, userId: string): Promise<boolean> {
  const db = await getDB();
  
  const deckResult = await db.collection<Deck>("decks").deleteOne({ id: deckId, userId });
  if (deckResult.deletedCount && deckResult.deletedCount > 0) {
    // Cascade delete cards under the deck
    await db.collection<Card>("cards").deleteMany({ deckId });
    return true;
  }
  return false;
}

/*
 ============================================================================
 CARD OPERATIONS
 ============================================================================
*/

export async function getCardsByDeckId(deckId: string): Promise<Card[]> {
  const db = await getDB();
  return await db.collection<Card>("cards").find({ deckId }).toArray();
}

export async function getCardsByDeckIds(deckIds: string[]): Promise<Card[]> {
  if (deckIds.length === 0) return [];
  const db = await getDB();
  return await db.collection<Card>("cards").find({ deckId: { $in: deckIds } }).toArray();
}

export async function getDueCards(deckId: string, nowISO: string): Promise<Card[]> {
  const db = await getDB();
  return await db.collection<Card>("cards").find({
    deckId,
    nextReviewDate: { $lte: nowISO }
  }).toArray();
}

export async function getCardById(cardId: string): Promise<Card | null> {
  const db = await getDB();
  return await db.collection<Card>("cards").findOne({ id: cardId });
}

export async function updateCard(cardId: string, updates: Partial<Card>): Promise<void> {
  const db = await getDB();
  await db.collection<Card>("cards").updateOne(
    { id: cardId },
    { $set: updates }
  );
}

/*
 ============================================================================
 REVIEW OPERATIONS
 ============================================================================
*/

export async function addReview(review: ReviewHistory): Promise<void> {
  const db = await getDB();
  await db.collection<ReviewHistory>("reviews").insertOne(review);
}

export async function getReviewsCountByUserId(userId: string): Promise<number> {
  const db = await getDB();
  return await db.collection<ReviewHistory>("reviews").countDocuments({ userId });
}

/*
 ============================================================================
 GENERATION JOBS OPERATIONS
 ============================================================================
*/

export async function createJob(job: GenerationJob): Promise<void> {
  const db = await getDB();
  await db.collection<GenerationJob>("jobs").insertOne(job);
}

export async function getJobById(jobId: string, userId: string): Promise<GenerationJob | null> {
  const db = await getDB();
  return await db.collection<GenerationJob>("jobs").findOne({ id: jobId, userId });
}

export async function updateJobStatus(
  jobId: string,
  status: GenerationJob["status"],
  progress: number,
  extra: Partial<GenerationJob> = {}
): Promise<void> {
  const db = await getDB();
  await db.collection<GenerationJob>("jobs").updateOne(
    { id: jobId },
    {
      $set: {
        status,
        progress,
        ...extra
      }
    }
  );
}

/*
 ============================================================================
 COMPLEX RE-SCHEDULING / CREATION ASSEMBLIES
 ============================================================================
*/

export async function createDeckWithCards(deck: Deck, cards: Card[]): Promise<void> {
  const db = await getDB();
  await db.collection<Deck>("decks").insertOne(deck);
  if (cards.length > 0) {
    await db.collection<Card>("cards").insertMany(cards);
  }
}
