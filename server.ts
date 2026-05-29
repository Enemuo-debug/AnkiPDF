/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import {
  getUserByIdOrEmail,
  getUserByEmail,
  createUser,
  updateUser,
  getDecksByUserId,
  getDeckById,
  deleteDeck,
  getCardsByDeckId,
  getCardsByDeckIds,
  getDueCards,
  getCardById,
  updateCard,
  addReview,
  getReviewsCountByUserId,
  createJob,
  getJobById,
  updateJobStatus,
  createDeckWithCards
} from "./src/server/db";
import { calculateSM2 } from "./src/server/srs";
import { analyzePDFMetadata, generateFlashcardsFromPDF } from "./src/server/ai";
import { Card, Deck, GenerationJob, User } from "./src/types";

// Load environment variables
const envPath = path.join(process.cwd(), ".env");
const envExamplePath = path.join(process.cwd(), ".env.example");
if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  try {
    fs.copyFileSync(envExamplePath, envPath);
    console.log("[dotenv] Created .env file successfully from .env.example template");
  } catch (err) {
    console.error("[dotenv] Failed to copy .env.example to .env:", err);
  }
}
dotenv.config();

const app = express();
const PORT = 3000;

// Set up JSON body size limit to support base64 PDF data transfer
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Helper to extract authorization header / verify token
async function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: "Unauthorized: Missing Authorization header" });
      return;
    }
    
    const token = authHeader.replace("Bearer ", "").trim();
    const user = await getUserByIdOrEmail(token);
    if (!user) {
      res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
      return;
    }
    
    // Attach user context to request
    (req as any).user = user;
    next();
  } catch (err) {
    console.error("Authentication check failed:", err);
    res.status(500).json({ error: "Database authentication connection is not established." });
  }
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
app.post("/api/auth/guest", async (req, res) => {
  try {
    // Re-use or find a guest user
    let guest = await getUserByEmail("guest@example.com");
    if (!guest) {
      guest = {
        id: "guest-user-123",
        email: "guest@example.com",
        streak: 4,
        lastActiveDate: new Date().toISOString().split("T")[0],
        dailyTarget: 15,
      };
      await createUser(guest);
    }
    
    res.json({
      token: guest.id,
      user: guest,
    });
  } catch (err) {
    console.error("Guest login failed:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Authentication - Register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, dailyTarget } = req.body;
    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const existing = await getUserByEmail(email);
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

    await createUser(newUser);

    res.json({
      token: newUser.id,
      user: newUser,
    });
  } catch (err) {
    console.error("User registration failed:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Authentication - Login Alternative
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    let user = await getUserByEmail(email);
    if (!user) {
      // Auto-create / join for quick prototype developer onboarding
      user = {
        id: crypto.randomUUID(),
        email: email.trim(),
        streak: 1,
        lastActiveDate: new Date().toISOString().split("T")[0],
        dailyTarget: 15,
      };
      await createUser(user);
    }

    res.json({
      token: user.id,
      user,
    });
  } catch (err) {
    console.error("User login failed:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Stats Dash Metrics
app.get("/api/stats", authenticate, async (req, res) => {
  try {
    const user = (req as any).user as User;
    
    const userDecks = await getDecksByUserId(user.id);
    const deckIds = userDecks.map(d => d.id);
    const userCards = await getCardsByDeckIds(deckIds);
    
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

    const totalCardsStudied = await getReviewsCountByUserId(user.id);

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
  } catch (err) {
    console.error("Stats fetching failed:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Decks Library Retrieval
app.get("/api/decks", authenticate, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const userDecks = await getDecksByUserId(user.id);
    res.json(userDecks);
  } catch (err) {
    console.error("Decks retrieval failed:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Single Deck Details
app.get("/api/decks/:deckId", authenticate, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const deck = await getDeckById(req.params.deckId, user.id);
    if (!deck) {
      res.status(404).json({ error: "Deck not found" });
      return;
    }
    res.json(deck);
  } catch (err) {
    console.error("Deck details retrieval failed:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Decks Deletion
app.delete("/api/decks/:deckId", authenticate, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const success = await deleteDeck(req.params.deckId, user.id);
    if (!success) {
      res.status(404).json({ error: "Deck not found" });
      return;
    }
    res.json({ success: true, message: "Deck and associated flashcards deleted successfully." });
  } catch (err) {
    console.error("Deck deletion failed:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Deck Cards List
app.get("/api/decks/:deckId/cards", authenticate, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const deck = await getDeckById(req.params.deckId, user.id);
    if (!deck) {
      res.status(404).json({ error: "Deck not found or access denied" });
      return;
    }

    const cards = await getCardsByDeckId(deck.id);
    res.json(cards);
  } catch (err) {
    console.error("Cards list fetch failed:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Cards Due Today for Study View Session
app.get("/api/decks/:deckId/due", authenticate, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const deck = await getDeckById(req.params.deckId, user.id);
    if (!deck) {
      res.status(404).json({ error: "Deck not found" });
      return;
    }

    const nowISO = new Date().toISOString();
    const dueCards = await getDueCards(deck.id, nowISO);
    res.json(dueCards);
  } catch (err) {
    console.error("Cards due fetch failed:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Spaced Repetition Scheduling: SM-2 submission for card updates
app.post("/api/cards/review", authenticate, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const { cardId, rating } = req.body; // 1 (Again), 3 (Hard), 4 (Good), 5 (Easy)

    if (!cardId || !rating) {
      res.status(400).json({ error: "cardId and rating (1, 3, 4, 5) are required" });
      return;
    }

    const card = await getCardById(cardId);
    if (!card) {
      res.status(404).json({ error: "Card not found" });
      return;
    }

    // Verify access
    const deck = await getDeckById(card.deckId, user.id);
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
    await updateCard(card.id, {
      ease: updatedParams.ease,
      interval: updatedParams.interval,
      repetitions: updatedParams.repetitions,
      nextReviewDate: updatedParams.nextReviewDate,
    });

    // Track review log
    const reviewLog = {
      id: crypto.randomUUID(),
      cardId: card.id,
      userId: user.id,
      rating: Number(rating),
      reviewDate: new Date().toISOString(),
      nextInterval: updatedParams.interval,
    };
    await addReview(reviewLog);

    // Maintain User study streak & last active state
    const todayStr = new Date().toISOString().split("T")[0];
    const dbUser = await getUserByIdOrEmail(user.id);
    let updatedStreak = user.streak;

    if (dbUser) {
      if (dbUser.lastActiveDate !== todayStr) {
        if (dbUser.lastActiveDate) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split("T")[0];
          
          if (dbUser.lastActiveDate === yesterdayStr) {
            updatedStreak = dbUser.streak + 1;
          } else {
            updatedStreak = 1; // start new streak
          }
        } else {
          updatedStreak = 1; // first streak ever
        }
        await updateUser(user.id, {
          streak: updatedStreak,
          lastActiveDate: todayStr,
        });
      }
    }

    res.json({
      success: true,
      card: {
        ...card,
        ease: updatedParams.ease,
        interval: updatedParams.interval,
        repetitions: updatedParams.repetitions,
        nextReviewDate: updatedParams.nextReviewDate,
      },
      streak: updatedStreak,
    });
  } catch (err) {
    console.error("Card scheduling update failed:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// PDF Ingestion Job triggers
app.post("/api/upload-pdf", authenticate, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const { pdfBase64, customTitle } = req.body;

    if (!pdfBase64) {
      res.status(400).json({ error: "Missing PDF base64 file data" });
      return;
    }

    const jobId = crypto.randomUUID();

    const newJob: GenerationJob = {
      id: jobId,
      userId: user.id,
      deckName: customTitle ? customTitle.trim() : "Analyzing content...",
      status: "pending",
      progress: 5,
    };

    await createJob(newJob);

    // Respond immediately, processing in the background to bypass gateway timeouts
    res.json({ jobId, message: "Upload received. Standard flashcard processing started." });

    // Begin background generation
    runFlashcardGenerationPipeline(jobId, pdfBase64, user.id, customTitle).catch(async err => {
      console.error(`Background job ${jobId} crashed:`, err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      await updateJobStatus(jobId, "failed", 100, { error: errorMsg });
    });
  } catch (err) {
    console.error("Pipeline initiation failed:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Polling generation status check
app.get("/api/upload-status/:jobId", authenticate, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const job = await getJobById(req.params.jobId, user.id);
    
    if (!job) {
      res.status(404).json({ error: "Job ID not found" });
      return;
    }

    res.json(job);
  } catch (err) {
    console.error("Job status check failed:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
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
  try {
    // 1. Analyze PDF Meta (Subject Category, Estimated Pages, Suggested Title)
    await updateJobStatus(jobId, "analyzing", 20);
    const meta = await analyzePDFMetadata(base64Pdf);
    
    const deckName = customTitle ? customTitle.trim() : meta.deckName;
    await updateJobStatus(jobId, "generating", 45, { deckName });

    // 2. Generate flashcards from PDF content using Gemini-3.5-flash
    const cards = await generateFlashcardsFromPDF(base64Pdf, meta);

    if (cards.length === 0) {
      throw new Error("Generative engine failed to produce high quality cards. Please try another PDF style.");
    }

    // 3. Assemble Deck
    await updateJobStatus(jobId, "filtering", 85, { totalCardsCreated: cards.length });

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

    // Save cards matching DB schemas
    const nowISO = new Date().toISOString();
    const cardsToInsert: Card[] = cards.map(c => ({
      id: crypto.randomUUID(),
      deckId,
      front: c.front,
      back: c.back,
      type: c.type,
      sourcePage: c.sourcePage,
      ease: 2.5, // start ease standard Anki/SM-2 factor
      interval: 0, // due immediately
      repetitions: 0,
      nextReviewDate: nowISO,
    }));

    await createDeckWithCards(newDeck, cardsToInsert);

    // Mark job as fully completed
    await updateJobStatus(jobId, "completed", 100, { deckId, totalCardsCreated: cards.length });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await updateJobStatus(jobId, "failed", 100, { error: errorMsg });
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
