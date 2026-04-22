# AI College FAQ Chatbot

A full-stack, lightweight AI-powered FAQ chatbot designed for college students. This project provides instant answers to common college-related questions (admissions, placements, hostilites, etc.) by fetching data dynamically from a Google Sheet and enhancing responses using Hugging Face's open-source models.

## Features

- **Dynamic FAQ Data Source:** Automatically fetches and caches FAQ data from a public Google Sheets CSV at runtime.
- **Hybrid AI Matching:** Uses lightweight string similarity (Levenshtein distance) for rapid answer retrieval, backed by a Hugging Face LLM to refine responses and handle conversational intent.
- **Context-Aware Conversations:** Maintains chat history so the AI can understand conversational follow-ups.
- **AI Fallback:** Intelligently handles out-of-context questions using general AI knowledge when a match isn't found in the database.
- **Feedback & Sentiment Analysis:** Users can provide feedback (thumbs up/down) or text feedback, which is optionally analyzed for sentiment and can be pushed to a webhook.
- **Suggested Questions:** Automatically provides 3 random suggested questions from the database to guide new users.
- **Serverless Ready:** Configured to be easily deployed on Vercel as a Serverless function via `vercel.json` and the `/api/index.js` setup.

## Tech Stack

- **Frontend:** Vanilla HTML, CSS (Inter font for a modern look), and JavaScript. Uses `marked.js` for clean Markdown rendering.
- **Backend:** Node.js, Express.js.
- **AI/ML Integration:** for generating human-like text and sentiment analysis.
- **Data Handling:** `csv-parser` and `axios` to stream and parse Google Sheets data. `string-similarity` for finding the best matching question.

## Prerequisites

- [Node.js](https://nodejs.org/en/) (v16 or higher recommended)
- A Hugging Face account and an API Token (to power the generative AI fallback/formatting)
- A published Google Sheet in CSV format containing `Question` and `Answer` columns.

## Setup & Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-link>
   cd <repository-folder>
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory based on `.env.local` or provide your own configurations:
   ```env
   # The URL of your published Google Sheets CSV
   GOOGLE_SHEET_URL="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"

   # Hugging Face Configuration
   HF_TOKEN="your_hugging_face_token_here"
   HF_MODEL_ID="meta-llama/Llama-3.2-1B-Instruct"

   # Optional: Webhook URL for logging unanswered questions and feedback
   WEBHOOK_URL="your_webhook_url_here"

   # Port configuration for local development
   PORT=3000
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   # or
   npm start
   ```

5. **Access the Chatbot:**
   The Express server listens on port 3000 out-of-the-box for backend API calls. To view the chat interface locally, serve the `public/` folder using an extension like Live Server in VS Code (or open `public/index.html` directly in your browser).

## Deployment

This project is structured for easy deployment on [Vercel]() using a serverless architecture. 

1. Push your code to a GitHub/GitLab/Bitbucket repository.
2. Sign in to Vercel and create a new Project.
3. Import your repository.
4. **Important**: Add all your Environment Variables (`HF_TOKEN`, `GOOGLE_SHEET_URL`, etc.) in the Vercel project settings before deploying.
5. Deploy the project!
   - Vercel will automatically read `vercel.json` to route `/chat`, `/feedback`, and `/questions` endpoints directly to the serverless function in `api/index.js`.
   - The frontend assets in the `public` folder will be served automatically at the root.
