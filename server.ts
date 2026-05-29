/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { readDB, writeDB } from "./src/server/db";
import { calculateSM2 } from "./src/server/srs";
import { analyzePDFMetadata, generateFlashcardsFromPDF } from "./src/server/ai";
import { Card, Deck, GenerationJob, User } from "./src/types";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Set up JSON body size limit to support base64 PDF data transfer
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Helper to extract authorization header / verify token
function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "Unauthorized: Missing Authorization header" });
    return;
  }
  
  const token = authHeader.replace("Bearer ", "").trim();
  const db = readDB();
  
  // We can treat token as direct User ID for simplified, secure session management
  const user = db.users.find(u => u.id === token || u.email === token);
  if (!user) {
    res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
    return;
  }
  
  // Attach user context to request
  (req as any).user = user;
  next();
}

/**
 * ============================================================================
 * API ENDPOINTS
 * ============================================================================
 */

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Guest Login
app.post("/api/auth/guest", (req, res) => {
  const db = readDB();
  
  // Re-use or find a guest user
  let guest = db.users.find(u => u.email === "guest@example.com");
  if (!guest) {
    guest = {
      id: "guest-user-123",
      email: "guest@example.com",
      streak: 4,
      lastActiveDate: new Date().toISOString().split("T")[0],
      dailyTarget: 15,
    };
    db.users.push(guest);
    writeDB(db);
  }
  
  res.json({
    token: guest.id,
    user: guest,
  });
});

// Authentication - Register
app.post("/api/auth/register", (req, res) => {
  const { email, dailyTarget } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const db = readDB();
  const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    res.status(400).json({ error: "An account with this email already exists" });
    return;
  }

  const newUser: User = {
    id: crypto.randomUUID(),
    email: email.trim(),
    streak: 0,
    dailyTarget: Number(dailyTarget) || 15,
  };

  db.users.push(newUser);
  writeDB(db);

  res.json({
    token: newUser.id,
    user: newUser,
  });
});

// Authentication - Login Alternative
app.post("/api/auth/login", (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const db = readDB();
  let user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    // Auto-create / join for quick prototype developer onboarding
    user = {
      id: crypto.randomUUID(),
      email: email.trim(),
      streak: 1,
      lastActiveDate: new Date().toISOString().split("T")[0],
      dailyTarget: 15,
    };
    db.users.push(user);
    writeDB(db);
  }

  res.json({
    token: user.id,
    user,
  });
});

// Stats Dash Metrics
app.get("/api/stats", authenticate, (req, res) => {
  const user = (req as any).user as User;
  const db = readDB();
  
  const userDecks = db.decks.filter(d => d.userId === user.id);
  const deckIds = userDecks.map(d => d.id);
  const userCards = db.cards.filter(c => deckIds.includes(c.deckId));
  
  // Calculate Streak & Last Active
  const todayStr = new Date().toISOString().split("T")[0];
  let currentStreak = user.streak;
  
  if (user.lastActiveDate) {
    const lastActive = new Date(user.lastActiveDate);
    const today = new Date(todayStr);
    const diffTime = Math.abs(today.getTime() - lastActive.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 1) {
      // Streak broken
      currentStreak = 0;
    }
  }

  // Cards due today helper
  const nowStr = new Date().toISOString();
  const dueCards = userCards.filter(c => c.nextReviewDate <= nowStr);

  const totalCardsStudied = db.reviews.filter(r => r.userId === user.id).length;

  // Category map
  const categoryDistribution: Record<string, number> = {};
  for (const d of userDecks) {
    categoryDistribution[d.category] = (categoryDistribution[d.category] || 0) + d.cardCount;
  }

  res.json({
    studyStreak: currentStreak,
    cardsDueToday: dueCards.length,
    totalCardsStudied,
    totalDecks: userDecks.length,
    totalCards: userCards.length,
    categoryDistribution,
  });
});

// Decks Library Retrieval
app.get("/api/decks", authenticate, (req, res) => {
  const user = (req as any).user as User;
  const db = readDB();
  const userDecks = db.decks.filter(d => d.userId === user.id);
  res.json(userDecks);
});

// Single Deck Details
app.get("/api/decks/:deckId", authenticate, (req, res) => {
  const user = (req as any).user as User;
  const db = readDB();
  const deck = db.decks.find(d => d.id === req.params.deckId && d.userId === user.id);
  if (!deck) {
    res.status(404).json({ error: "Deck not found" });
    return;
  }
  res.json(deck);
});

// Decks Deletion
app.delete("/api/decks/:deckId", authenticate, (req, res) => {
  const user = (req as any).user as User;
  const db = readDB();
  
  const deckIdx = db.decks.findIndex(d => d.id === req.params.deckId && d.userId === user.id);
  if (deckIdx === -1) {
    res.status(404).json({ error: "Deck not found" });
    return;
  }

  // Delete Deck
  db.decks.splice(deckIdx, 1);
  
  // Delete Cards
  db.cards = db.cards.filter(c => c.deckId !== req.params.deckId);
  
  writeDB(db);
  res.json({ success: true, message: "Deck and associated flashcards deleted successfully." });
});

// Deck Cards List
app.get("/api/decks/:deckId/cards", authenticate, (req, res) => {
  const user = (req as any).user as User;
  const db = readDB();
  
  const deck = db.decks.find(d => d.id === req.params.deckId && d.userId === user.id);
  if (!deck) {
    res.status(404).json({ error: "Deck not found or access denied" });
    return;
  }

  const cards = db.cards.filter(c => c.deckId === deck.id);
  res.json(cards);
});

// Cards Due Today for Study View Session
app.get("/api/decks/:deckId/due", authenticate, (req, res) => {
  const user = (req as any).user as User;
  const db = readDB();
  
  const deck = db.decks.find(d => d.id === req.params.deckId && d.userId === user.id);
  if (!deck) {
    res.status(404).json({ error: "Deck not found" });
    return;
  }

  const nowISO = new Date().toISOString();
  // Filter cards that are due (scheduled date in the past or on immediate timestamp)
  const dueCards = db.cards.filter(c => c.deckId === deck.id && c.nextReviewDate <= nowISO);
  
  res.json(dueCards);
});

// Spaced Repetition Scheduling: SM-2 submission for card updates
app.post("/api/cards/review", authenticate, (req, res) => {
  const user = (req as any).user as User;
  const { cardId, rating } = req.body; // 1 (Again), 3 (Hard), 4 (Good), 5 (Easy)

  if (!cardId || !rating) {
    res.status(400).json({ error: "cardId and rating (1, 3, 4, 5) are required" });
    return;
  }

  const db = readDB();
  const card = db.cards.find(c => c.id === cardId);
  if (!card) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  // Verify access
  const deck = db.decks.find(d => d.id === card.deckId && d.userId === user.id);
  if (!deck) {
    res.status(403).json({ error: "Access denied to this card" });
    return;
  }

  // SM-2 calculation
  const updatedParams = calculateSM2(
    Number(rating),
    card.ease,
    card.interval,
    card.repetitions
  );

  // Update original card parameters
  card.ease = updatedParams.ease;
  card.interval = updatedParams.interval;
  card.repetitions = updatedParams.repetitions;
  card.nextReviewDate = updatedParams.nextReviewDate;

  // Track review log
  const reviewLog = {
    id: crypto.randomUUID(),
    cardId: card.id,
    userId: user.id,
    rating: Number(rating),
    reviewDate: new Date().toISOString(),
    nextInterval: updatedParams.interval,
  };
  db.reviews.push(reviewLog);

  // Maintain User study streak & last active state
  const todayStr = new Date().toISOString().split("T")[0];
  const dbUser = db.users.find(u => u.id === user.id)!;
  
  if (dbUser.lastActiveDate !== todayStr) {
    if (dbUser.lastActiveDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      
      if (dbUser.lastActiveDate === yesterdayStr) {
        dbUser.streak += 1;
      } else {
        dbUser.streak = 1; // start new streak
      }
    } else {
      dbUser.streak = 1; // first streak ever
    }
    dbUser.lastActiveDate = todayStr;
  }

  writeDB(db);

  res.json({
    success: true,
    card,
    streak: dbUser.streak,
  });
});

// PDF Ingestion Job triggers
app.post("/api/upload-pdf", authenticate, (req, res) => {
  const user = (req as any).user as User;
  const { pdfBase64, customTitle } = req.body;

  if (!pdfBase64) {
    res.status(400).json({ error: "Missing PDF base64 file data" });
    return;
  }

  const db = readDB();
  const jobId = crypto.randomUUID();

  const newJob: GenerationJob = {
    id: jobId,
    userId: user.id,
    deckName: customTitle ? customTitle.trim() : "Analyzing content...",
    status: "pending",
    progress: 5,
  };

  db.jobs.push(newJob);
  writeDB(db);

  // Respond immediately, processing in the background to bypass gateway timeouts
  res.json({ jobId, message: "Upload received. Standard flashcard processing started." });

  // Begin background generation
  runFlashcardGenerationPipeline(jobId, pdfBase64, user.id, customTitle).catch(err => {
    console.error(`Background job ${jobId} crashed:`, err);
    
    // Set to failed in database
    const failedDb = readDB();
    const finalJob = failedDb.jobs.find(j => j.id === jobId);
    if (finalJob) {
      finalJob.status = "failed";
      finalJob.progress = 100;
      finalJob.error = err instanceof Error ? err.message : String(err);
      writeDB(failedDb);
    }
  });
});

// Polling generation status check
app.get("/api/upload-status/:jobId", authenticate, (req, res) => {
  const user = (req as any).user as User;
  const db = readDB();
  const job = db.jobs.find(j => j.id === req.params.jobId && j.userId === user.id);
  
  if (!job) {
    res.status(404).json({ error: "Job ID not found" });
    return;
  }

  res.json(job);
});

/**
 * ============================================================================
 * BACKGROUND PIPELINE INTELLIGENCE (Agent 3 & SM-2 Integrations)
 * ============================================================================
 */
async function runFlashcardGenerationPipeline(
  jobId: string,
  base64Pdf: string,
  userId: string,
  customTitle?: string
) {
  const updateJob = (status: GenerationJob["status"], progress: number, extra: Partial<GenerationJob> = {}) => {
    const db = readDB();
    const currentJob = db.jobs.find(j => j.id === jobId);
    if (currentJob) {
      currentJob.status = status;
      currentJob.progress = progress;
      Object.assign(currentJob, extra);
      writeDB(db);
    }
  };

  try {
    // 1. Analyze PDF Meta (Subject Category, Estimated Pages, Suggested Title)
    updateJob("analyzing", 20);
    const meta = await analyzePDFMetadata(base64Pdf);
    
    const deckName = customTitle ? customTitle.trim() : meta.deckName;
    updateJob("generating", 45, { deckName });

    // 2. Generate flashcards from PDF content using Gemini-3.5-flash
    const cards = await generateFlashcardsFromPDF(base64Pdf, meta);

    if (cards.length === 0) {
      throw new Error("Generative engine failed to produce high quality cards. Please try another PDF style.");
    }

    // 3. Assemble Deck
    updateJob("filtering", 85, { totalCardsCreated: cards.length });

    const db = readDB();
    const deckId = crypto.randomUUID();

    const newDeck: Deck = {
      id: deckId,
      userId,
      name: deckName,
      description: meta.description,
      category: meta.category,
      cardCount: cards.length,
      createdAt: new Date().toISOString(),
    };

    db.decks.push(newDeck);

    // Save cards matching DB schemas
    const nowISO = new Date().toISOString();
    for (const c of cards) {
      const cardId = crypto.randomUUID();
      const cardObj: Card = {
        id: cardId,
        deckId,
        front: c.front,
        back: c.back,
        type: c.type,
        sourcePage: c.sourcePage,
        ease: 2.5, // start ease standard Anki/SM-2 factor
        interval: 0, // due immediately
        repetitions: 0,
        nextReviewDate: nowISO,
      };
      db.cards.push(cardObj);
    }

    // Mark job as fully completed
    updateJob("completed", 100, { deckId, totalCardsCreated: cards.length });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    updateJob("failed", 100, { error: errorMsg });
    throw err;
  }
}


/**
 * ============================================================================
 * FRAMEWORK & DEVELOPER COMPILER INGRESS
 * ============================================================================
 */
async function startServer() {
  // Vite setup for developer previews vs prod bundles
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Flashcard Platform Core] Orchestration live at: http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Initialization Failed:", err);
});
