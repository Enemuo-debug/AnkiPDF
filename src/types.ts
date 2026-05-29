/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  email: string;
  streak: number;
  lastActiveDate?: string;
  dailyTarget: number; // e.g. 20 cards per day
}

export type CardType = "qa" | "cloze" | "definition";

export interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  type: CardType;
  sourcePage?: number;
  
  // SM-2 Spaced Repetition parameters
  ease: number; // starts at 2.5
  interval: number; // in days, starts at 0 (or 1)
  repetitions: number; // consecutive successful reviews
  nextReviewDate: string; // ISO string text
}

export interface Deck {
  id: string;
  userId: string;
  name: string;
  description: string;
  category: string;
  cardCount: number;
  createdAt: string;
}

export interface ReviewHistory {
  id: string;
  cardId: string;
  userId: string;
  rating: number; // 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
  reviewDate: string;
  nextInterval: number;
}

export interface GenerationJob {
  id: string;
  userId: string;
  deckId?: string;
  deckName: string;
  status: "pending" | "analyzing" | "generating" | "filtering" | "completed" | "failed";
  progress: number;
  error?: string;
  totalCardsCreated?: number;
}

export interface UserStats {
  studyStreak: number;
  cardsDueToday: number;
  totalCardsStudied: number;
  totalDecks: number;
  totalCards: number;
  categoryDistribution: Record<string, number>;
}
