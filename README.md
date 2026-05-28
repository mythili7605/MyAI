# MyAi

A Vite + React + TypeScript chat UI backed by a LangChain AI agent using Gemini 2.5 Flash through a local Node server.

## Setup

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Then start the app:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

The browser talks to `/api/chat`; the server uses LangChain's `createAgent()` with `@langchain/google` and `gemini-2.5-flash`, so your Gemini API key stays out of the client bundle.

The agent has local tools for:

- Current date/time lookup
- Arithmetic calculation
- Text statistics

## Scripts

```bash
npm run dev
npm run build
npm run lint
```
