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
const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const fallbackModels = (process.env.GEMINI_FALLBACK_MODELS || 'gemini-2.0-flash,gemini-2.0-flash-lite')
  .split(',')
  .map((fallbackModel) => fallbackModel.trim())
  .filter((fallbackModel) => fallbackModel && fallbackModel !== model)
const models = [model, ...fallbackModels]
const maxQuotaRetryMs = 5_000

const getCurrentDateTime = tool(
  ({ timeZone }) => {
    const resolvedTimeZone = timeZone || 'Asia/Calcutta'
    const now = new Date()

    return JSON.stringify({
      datetime: new Intl.DateTimeFormat('en-US', {
        dateStyle: 'full',
        timeStyle: 'long',
        timeZone: resolvedTimeZone,
      }).format(now),
      timeZone: resolvedTimeZone,
    })
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
    const sanitizedExpression = String(expression || '').trim().replaceAll('^', '**')

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
    const value = String(text || '')
    const words = value.trim().split(/\s+/).filter(Boolean)
    const sentences = value.split(/[.!?]+/).map((sentence) => sentence.trim()).filter(Boolean)

    return JSON.stringify({
      characters: value.length,
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

const convertUnits = tool(
  ({ value, fromUnit, toUnit }) => {
    const normalizeUnit = (unit) => {
      const normalized = unit.toLowerCase().trim()
      const aliases = {
        kilometer: 'km',
        kilometers: 'km',
        kilometre: 'km',
        kilometres: 'km',
        mile: 'mile',
        miles: 'mile',
        kilogram: 'kg',
        kilograms: 'kg',
        pound: 'lb',
        pounds: 'lb',
        lbs: 'lb',
        celsius: 'c',
        fahrenheit: 'f',
      }

      return aliases[normalized] || normalized
    }
    const normalizedFrom = normalizeUnit(fromUnit)
    const normalizedTo = normalizeUnit(toUnit)
    const conversions = {
      'km:mile': value * 0.621371,
      'mile:km': value / 0.621371,
      'kg:lb': value * 2.20462,
      'lb:kg': value / 2.20462,
      'c:f': (value * 9) / 5 + 32,
      'f:c': ((value - 32) * 5) / 9,
    }
    const key = `${normalizedFrom}:${normalizedTo}`
    const result = conversions[key]

    if (result === undefined) {
      return `Unsupported conversion from ${fromUnit} to ${toUnit}. Supported examples: km to mile, kg to lb, celsius to fahrenheit.`
    }

    return JSON.stringify({ value, fromUnit, toUnit, result: Number(result.toFixed(4)) })
  },
  {
    name: 'convert_units',
    description: 'Convert common distance, weight, and temperature units.',
    schema: z.object({
      value: z.number().describe('Numeric value to convert.'),
      fromUnit: z.string().describe('Source unit, for example km, mile, kg, lb, celsius, fahrenheit.'),
      toUnit: z.string().describe('Target unit, for example km, mile, kg, lb, celsius, fahrenheit.'),
    }),
  },
)

const createTodoList = tool(
  ({ task, count }) => {
    const total = Math.min(Math.max(count || 5, 1), 10)

    return JSON.stringify({
      task,
      todos: Array.from({ length: total }, (_, index) => `${index + 1}. ${task} - step ${index + 1}`),
    })
  },
  {
    name: 'create_todo_list',
    description: 'Create a small actionable todo list for a task or goal.',
    schema: z.object({
      task: z.string().describe('The task or goal to break into todos.'),
      count: z.number().optional().describe('Number of todo items, between 1 and 10.'),
    }),
  },
)

const summarizeNotes = tool(
  ({ text }) => {
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean)
    const keyPoints = sentences.slice(0, 4)

    return JSON.stringify({
      keyPoints,
      shortSummary: keyPoints.join(' '),
    })
  },
  {
    name: 'summarize_notes',
    description: 'Extract a compact summary and key points from pasted notes.',
    schema: z.object({
      text: z.string().describe('Notes or paragraph text to summarize.'),
    }),
  },
)

const agentTools = [
  getCurrentDateTime,
  calculateExpression,
  analyzeTextStats,
  convertUnits,
  createTodoList,
  summarizeNotes,
]

const systemPrompt = `You are MythilAi, a warm, concise, practical AI agent.
You can answer normally, and you may use tools when they help.
Use get_current_datetime for current date or time questions.
Use calculate_expression for arithmetic.
Use analyze_text_stats for word, character, or sentence counts.
Use convert_units for unit conversion.
Use create_todo_list to break a task into small steps.
Use summarize_notes when the user pastes notes or asks for key points.
When a tool result is useful, incorporate it naturally instead of exposing raw tool chatter.`

app.use(express.json({ limit: '10mb' }))

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
    const systemContext = String(request.body?.systemContext || '').trim()
    const activeTool = String(request.body?.activeTool || '').trim()
    const attachment = request.body?.attachment
    const additionalContext = [
      systemContext,
      activeTool ? `Active UI mode: ${activeTool}.` : '',
      attachment?.name ? `The user attached a file named ${attachment.name} (${attachment.type || 'unknown type'}). The frontend currently sends file metadata only.` : '',
    ]
      .filter(Boolean)
      .join('\n')

    const result = await invokeAgentWithFallbacks(apiKey, agentMessages, additionalContext)
    const finalMessage = result.messages.at(-1)
    const reply = stringifyMessageContent(finalMessage?.content)

    response.json({
      reply: reply || 'I could not produce a response this time.',
      model: result.modelName,
    })
  } catch (error) {
    console.error(error)

    if (isTransientModelError(error)) {
      response.json({
        reply: createLocalFallbackReply(agentMessages),
        model: 'local-fallback',
        limited: true,
      })
      return
    }

    const handledError = toClientError(error)

    response.status(handledError.status).json({
      error: handledError.message,
    })
  }
})

app.post('/api/image', async (request, response) => {
  const apiKey = process.env.GEMINI_API_KEY
  const prompt = String(request.body?.prompt || '').trim()

  if (!apiKey) {
    response.status(500).json({
      error: 'Missing GEMINI_API_KEY. Add it to .env, then restart the dev server.',
    })
    return
  }

  if (!prompt) {
    response.status(400).json({ error: 'Send an image prompt.' })
    return
  }

  try {
    const imageResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1 },
        }),
      },
    )
    const data = await imageResponse.json().catch(() => ({}))

    if (!imageResponse.ok) {
      throw createGoogleApiError(imageResponse, data)
    }

    const image = data.predictions?.[0]?.bytesBase64Encoded

    if (!image) {
      response.status(502).json({ error: 'The image service did not return image data.' })
      return
    }

    response.json({ image })
  } catch (error) {
    console.error(error)
    const handledError = toClientError(error)

    response.status(handledError.status).json({
      error: handledError.message,
    })
  }
})

app.post('/api/tts', async (request, response) => {
  const apiKey = process.env.GEMINI_API_KEY
  const text = String(request.body?.text || '').trim().slice(0, 300)

  if (!apiKey) {
    response.status(500).json({
      error: 'Missing GEMINI_API_KEY. Add it to .env, then restart the dev server.',
    })
    return
  }

  if (!text) {
    response.status(400).json({ error: 'Send text to speak.' })
    return
  }

  try {
    const ttsResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' },
              },
            },
          },
          model: 'gemini-2.5-flash-preview-tts',
        }),
      },
    )
    const data = await ttsResponse.json().catch(() => ({}))

    if (!ttsResponse.ok) {
      throw createGoogleApiError(ttsResponse, data)
    }

    response.json(data)
  } catch (error) {
    console.error(error)
    const handledError = toClientError(error)

    response.status(handledError.status).json({
      error: handledError.message,
    })
  }
})

async function invokeAgentWithFallbacks(apiKey, messages, additionalContext = '') {
  let lastError

  for (const modelName of models) {
    try {
      return {
        ...(await invokeAgentWithQuotaRetry(createAgentForModel(apiKey, modelName, additionalContext), messages)),
        modelName,
      }
    } catch (error) {
      lastError = error

      if (!isTransientModelError(error)) {
        throw error
      }
    }
  }

  throw lastError
}

function createAgentForModel(apiKey, modelName, additionalContext = '') {
  const chatModel = new ChatGoogle({
    model: modelName,
    apiKey,
    temperature: 0.4,
  })

  return createAgent({
    model: chatModel,
    tools: agentTools,
    systemPrompt: additionalContext ? `${systemPrompt}\n\n${additionalContext}` : systemPrompt,
  })
}

function createGoogleApiError(fetchResponse, data) {
  const error = new Error(data?.error?.message || `Google API request failed with status ${fetchResponse.status}.`)
  error.statusCode = fetchResponse.status
  error.data = data

  return error
}

async function invokeAgentWithQuotaRetry(agent, messages) {
  try {
    return await agent.invoke({ messages })
  } catch (error) {
    const retryMs = getRetryDelayMs(error)

    if (!retryMs || retryMs > maxQuotaRetryMs) {
      throw error
    }

    await sleep(retryMs + 1_000)
    return agent.invoke({ messages })
  }
}

function toClientError(error) {
  const statusCode = Number(error?.statusCode || error?.data?.error?.code)
  const status = String(error?.data?.error?.status || '')
  const message = String(error?.data?.error?.message || error?.message || '')
  const retryMs = getRetryDelayMs(error)

  if (statusCode === 429 || status === 'RESOURCE_EXHAUSTED') {
    const retryText = retryMs ? ` Try again in about ${Math.ceil(retryMs / 1000)} seconds.` : ''

    return {
      status: 429,
      message: `Gemini is temporarily rate limited for this API key.${retryText}`,
    }
  }

  if (isModelUnavailableError(error)) {
    return {
      status: 503,
      message: 'Gemini is temporarily busy. Please try again in a moment.',
    }
  }

  if (statusCode === 400 || statusCode === 401 || statusCode === 403) {
    return {
      status: statusCode,
      message: 'Gemini rejected the API key or model access. Check the key in .env, then restart the server.',
    }
  }

  if (/quota|rate limit|too many requests/i.test(message)) {
    return {
      status: 429,
      message: 'Gemini is temporarily rate limited for this API key. Please wait a moment and try again.',
    }
  }

  return {
    status: 500,
    message: 'The AI service could not respond right now. Please try again.',
  }
}

function isQuotaError(error) {
  const statusCode = Number(error?.statusCode || error?.data?.error?.code)
  const status = String(error?.data?.error?.status || '')
  const message = String(error?.data?.error?.message || error?.message || '')

  return statusCode === 429 || status === 'RESOURCE_EXHAUSTED' || /quota|rate limit|too many requests/i.test(message)
}

function isModelUnavailableError(error) {
  const statusCode = Number(error?.statusCode || error?.data?.error?.code)
  const status = String(error?.data?.error?.status || '')
  const message = String(error?.data?.error?.message || error?.message || '')

  return statusCode === 503 || status === 'UNAVAILABLE' || /high demand|service unavailable|try again later/i.test(message)
}

function isTransientModelError(error) {
  return isQuotaError(error) || isModelUnavailableError(error)
}

function getRetryDelayMs(error) {
  const retryInfo = error?.data?.error?.details?.find?.(
    (detail) => typeof detail?.retryDelay === 'string',
  )
  const retryDelay = retryInfo?.retryDelay
  const message = String(error?.data?.error?.message || error?.message || '')
  const match = retryDelay?.match(/^([\d.]+)s$/) || message.match(/retry in ([\d.]+)s/i)
  const seconds = match ? Number(match[1]) : 0

  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds * 1000) : 0
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function createLocalFallbackReply(messages) {
  const lastMessage = messages.at(-1)?.content || ''
  const normalizedMessage = lastMessage.toLowerCase()
  const arithmeticMatch = lastMessage.match(/[-+*/().%\d\s^]{3,}/)

  if (/^(hi|hii|hello|hey)\b/.test(normalizedMessage)) {
    return 'Hi Mythili! I am here. Gemini is temporarily rate limited for this key, so I am using a small local fallback for now.'
  }

  if (/\b(time|date|today|now)\b/.test(normalizedMessage)) {
    return `Gemini is temporarily rate limited, but locally I can tell you it is ${new Intl.DateTimeFormat('en-US', {
      dateStyle: 'full',
      timeStyle: 'long',
      timeZone: 'Asia/Calcutta',
    }).format(new Date())}.`
  }

  if (arithmeticMatch) {
    const expression = arithmeticMatch[0].trim().replaceAll('^', '**')

    if (/^[\d\s+\-*/().%*]+$/.test(expression)) {
      try {
        const result = Function(`"use strict"; return (${expression})`)()

        if (typeof result === 'number' && Number.isFinite(result)) {
          return `Gemini is temporarily rate limited, but I calculated this locally: ${result}.`
        }
      } catch {
        // Fall through to the general fallback.
      }
    }
  }

  return 'Gemini is temporarily rate limited for this API key, so full AI replies are paused for a moment. I can still answer simple local requests like greetings, time/date, and basic calculations until the quota resets.'
}

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

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`MythilAi is running at http://127.0.0.1:${port}`)
    console.log(`Gemini model: ${model}`)
  })
}

export default app
