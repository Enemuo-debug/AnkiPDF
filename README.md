# PDF Flashcards Generator

An intelligent study platform that extracts content from your uploaded PDFs and automatically generates high-impact spaced-repetition flashcards using Gemini AI. 

🔗 **Access the Application:** [AI Studio App Applet](https://ai.studio/apps/b21726f5-9c7c-440d-b20c-45568a67d3cd)

---

## 🌟 Key Features

- **Automated AI Flashcard Generation**: Upload any academic or professional PDF document. Our backend extracts context and passes it to the `gemini-3.5-flash` model using `@google/genai` to automatically isolate core definitions, Q&A blocks, and cloze deletion prompts.
- **Classic SM-2 Spaced Repetition**: Combines scientific spacing mechanics with active recall. Calculated ease factors (starting at 2.5), intervals, and repetitions ensure items are re-scheduled optimally.
- **Dynamic Analytics Dashboard**: Detailed review logs tracking historical card activity, user study streaks, daily target thresholds, and content categories.
- **Robust Cloud Database**: Scaled and secured via high-performance MongoDB indexing and concurrency-safe collection routing.

---

## 🛠️ Architecture & Tech Stack

Our full-stack application utilizes a decoupled, high-throughput React and Node architecture:

- **Frontend**: Single Page Application built on **React (TypeScript)**, **Vite**, and styled with **Tailwind CSS**. Dynamic transitions are powered by physical spring physics in **motion**.
- **Backend**: **Express (TSP)** proxy engine routing requests, secure headers, and handling background worker jobs for documents.
- **Database**: Cloud-hosted **MongoDB** (collections for `users`, `decks`, `cards`, `reviews`, and `jobs`).
- **AI Core**: The unified **Google GenAI** model suite.

---

## ⚙️ Environment Configuration

Ensure the following variables are configured in your development environment or AI Studio settings:

```env
# Google Gemini API Access Key
GEMINI_API_KEY="your-gemini-api-key"

# MongoDB Connection String (Atlas or Local Instance)
MONGODB_URI="mongodb+srv://<username>:<password>@cluster.mongodb.net/spaced_repetition"
```

---

## 🚀 Running Locally

1. Install background and styling packages:
   ```bash
   npm install
   ```

2. Kick-start the local server and web preview:
   ```bash
   npm run dev
   ```

---

*This project is built and optimized for fast-cold starts inside stateless Cloud Run container architectures client-proxied through AI Studio.*
