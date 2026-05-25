import dotenv from 'dotenv'
import express from 'express'
import { createServer as createViteServer } from 'vite'
import { ChatGoogle } from '@langchain/google/node'
import { createAgent, tool } from 'langchain'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

dotenv.config()

const app = express()
const port = Number(process.env.PORT) || 5173
const isProduction = process.env.NODE_ENV === 'production'
const model = 'gemini-2.5-flash'

const getCurrentDateTime = tool(
  ({ timeZone }) => {
    const resolvedTimeZone = timeZone || 'Asia/Calcutta'
    const now = new Date()

    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'full',
      timeStyle: 'long',
      timeZone: resolvedTimeZone,
    }).format(now)
  },
  {
    name: 'get_current_datetime',
    description: 'Get the current date and time for a requested IANA timezone.',
    schema: z.object({
      timeZone: z
        .string()
        .optional()
        .describe('IANA timezone such as Asia/Calcutta or America/New_York.'),
    }),
  },
)

const calculateExpression = tool(
  ({ expression }) => {
    const sanitizedExpression = expression.trim().replaceAll('^', '**')

    if (!/^[\d\s+\-*/().%*]+$/.test(sanitizedExpression)) {
      return 'Only arithmetic expressions with numbers, parentheses, +, -, *, /, %, and ^ are supported.'
    }

    try {
      const result = Function(`"use strict"; return (${sanitizedExpression})`)()

      if (typeof result !== 'number' || !Number.isFinite(result)) {
        return 'The calculation did not produce a finite number.'
      }

      return String(result)
    } catch {
      return 'The arithmetic expression could not be evaluated.'
    }
  },
  {
    name: 'calculate_expression',
    description: 'Calculate a numeric arithmetic expression.',
    schema: z.object({
      expression: z
        .string()
        .describe('Arithmetic expression, for example: (12.5 * 4) / 2 + 7.'),
    }),
  },
)

const analyzeTextStats = tool(
  ({ text }) => {
    const words = text.trim().split(/\s+/).filter(Boolean)
    const sentences = text.split(/[.!?]+/).map((sentence) => sentence.trim()).filter(Boolean)

    return JSON.stringify({
      characters: text.length,
      words: words.length,
      sentences: sentences.length,
    })
  },
  {
    name: 'analyze_text_stats',
    description: 'Count characters, words, and sentences in a piece of text.',
    schema: z.object({
      text: z.string().describe('Text to analyze.'),
    }),
  },
)

const agentTools = [getCurrentDateTime, calculateExpression, analyzeTextStats]

const systemPrompt = `You are MythilAi, a warm, concise, practical AI agent.
You can answer normally, and you may use tools when they help.
Use get_current_datetime for current date or time questions.
Use calculate_expression for arithmetic.
Use analyze_text_stats for word, character, or sentence counts.
When a tool result is useful, incorporate it naturally instead of exposing raw tool chatter.`

app.use(express.json({ limit: '1mb' }))

app.post('/api/chat', async (request, response) => {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    response.status(500).json({
      error: 'Missing GEMINI_API_KEY. Add it to .env, then restart the dev server.',
    })
    return
  }

  const messages = Array.isArray(request.body?.messages) ? request.body.messages : []
  const agentMessages = messages
    .map((message) => {
      const text = String(message?.content ?? '').trim()

      if (!text) {
        return null
      }

      return {
        role: message?.role === 'assistant' ? 'assistant' : 'user',
        content: text,
      }
    })
    .filter(Boolean)

  if (agentMessages.length === 0) {
    response.status(400).json({ error: 'Send at least one message.' })
    return
  }

  try {
    const chatModel = new ChatGoogle({
      model,
      apiKey,
      temperature: 0.4,
    })
    const agent = createAgent({
      model: chatModel,
      tools: agentTools,
      systemPrompt,
    })
    const result = await agent.invoke({ messages: agentMessages })
    const finalMessage = result.messages.at(-1)
    const reply = stringifyMessageContent(finalMessage?.content)

    response.json({ reply: reply || 'I could not produce a response this time.' })
  } catch (error) {
    console.error(error)
    response.status(500).json({
      error: 'The LangChain agent could not respond right now. Check your API key and try again.',
    })
  }
})

function stringifyMessageContent(content) {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part
        }

        if (part && typeof part === 'object' && 'text' in part) {
          return part.text
        }

        return ''
      })
      .filter(Boolean)
      .join('\n')
  }

  return ''
}

if (isProduction) {
  app.use(express.static('dist'))
  app.get(/.*/, (_request, response) => {
    response.sendFile(fileURLToPath(new URL('./dist/index.html', import.meta.url)))
  })
} else {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  })

  app.use(vite.middlewares)
}

app.listen(port, () => {
  console.log(`MythilAi is running at http://127.0.0.1:${port}`)
  console.log(`Gemini model: ${model}`)
})
