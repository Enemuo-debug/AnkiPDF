/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Calculates updated SM-2 Spaced Repetition parameters.
 * 
 * Ratings Mapping:
 * - 1: AGAIN (Incorrect, needs restudy)
 * - 3: HARD (Correct with serious recall difficulty)
 * - 4: GOOD (Correct after simple hesitation / normal recall)
 * - 5: EASY (Perfect response, effortless recall)
 */
export function calculateSM2(
  rating: number, // 1, 3, 4, 5
  previousEase: number,
  previousInterval: number, // in days
  previousRepetitions: number
): { ease: number; interval: number; repetitions: number; nextReviewDate: string } {
  let ease = previousEase;
  let interval = previousInterval;
  let repetitions = previousRepetitions;

  if (rating < 3) {
    // Student failed to recall. Reset intervals & count
    repetitions = 0;
    interval = 1; // Review again tomorrow (1 day)
  } else {
    // Recalled successfully
    if (repetitions === 0) {
      interval = 1; // 1 day
    } else if (repetitions === 1) {
      interval = 6; // 6 days
    } else {
      interval = Math.round(previousInterval * ease);
    }
    repetitions++;
  }

  // Adjust Ease Factor (original SM-2 formula bounds between 0 and 5)
  // EF' = EF + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
  // Ensure we round/bound rating between 1 and 5
  const q = Math.max(1, Math.min(5, rating));
  ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

  // Cap lowest Ease Factor at 1.3 (per Woźniak guidelines)
  if (ease < 1.3) {
    ease = 1.3;
  }

  // Cap highest Ease Factor at 5.0 to avoid runaway intervals
  if (ease > 5.0) {
    ease = 5.0;
  }

  // Calculate next study timestamp
  const now = new Date();
  // Adds interval in days
  now.setDate(now.getDate() + interval);
  
  return {
    ease: parseFloat(ease.toFixed(2)),
    interval,
    repetitions,
    nextReviewDate: now.toISOString(),
  };
}
