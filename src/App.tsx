import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import './App.css'

type IconProps = {
  className?: string
}

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const WriteIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
)

const LearnIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="m22 10-10-5-10 5 10 5 10-5Z" />
    <path d="M6 12.5v4.4c1.7 1.5 3.7 2.2 6 2.2s4.3-.7 6-2.2v-4.4" />
    <path d="M22 10v6" />
  </svg>
)

const CodeIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="m9 18-6-6 6-6" />
    <path d="m15 6 6 6-6 6" />
    <path d="m14 4-4 16" />
  </svg>
)

const CupIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 8h12v7a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5Z" />
    <path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17" />
    <path d="M8 3v2" />
    <path d="M12 3v2" />
    <path d="M16 3v2" />
  </svg>
)

const BulbIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M8.2 15.3a6.5 6.5 0 1 1 7.6 0c-.8.6-.8 1.5-.8 2.7H9c0-1.2 0-2.1-.8-2.7Z" />
  </svg>
)

const MicIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
    <path d="M19 11a7 7 0 0 1-14 0" />
    <path d="M12 18v3" />
    <path d="M8 21h8" />
  </svg>
)

const ChevronIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
)

const SendIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 19V5" />
    <path d="m5 12 7-7 7 7" />
  </svg>
)

const actions = [
  {
    label: 'Write',
    Icon: WriteIcon,
    prompt: 'Help me write a warm, clear message about ',
  },
  {
    label: 'Learn',
    Icon: LearnIcon,
    prompt: 'Teach me the basics of ',
  },
  {
    label: 'Code',
    Icon: CodeIcon,
    prompt: 'Help me build or debug this code: ',
  },
  {
    label: 'Life stuff',
    Icon: CupIcon,
    prompt: 'Help me think through ',
  },
  {
    label: "Gemini's choice",
    Icon: BulbIcon,
    prompt: 'Surprise me with a useful idea for today.',
  },
]

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`

const BrandMark = ({ className = '' }: IconProps) => (
  <span className={`brand-mark ${className}`} aria-hidden="true">
    {Array.from({ length: 12 }).map((_, index) => (
      <span key={index} style={{ '--ray': index } as CSSProperties} />
    ))}
  </span>
)

function App() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const threadEndRef = useRef<HTMLDivElement>(null)

  const hasMessages = messages.length > 0
  const canSend = input.trim().length > 0 && !isSending

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending, error])

  const sendMessage = async () => {
    const content = input.trim()

    if (!content || isSending) {
      return
    }

    const userMessage: ChatMessage = {
      id: createId(),
      role: 'user',
      content,
    }
    const nextMessages = [...messages, userMessage]

    setMessages(nextMessages)
    setInput('')
    setError('')
    setIsSending(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content: messageContent }) => ({
            role,
            content: messageContent,
          })),
        }),
      })
      const data = (await response.json().catch(() => ({}))) as {
        reply?: string
        error?: string
      }

      if (!response.ok) {
        throw new Error(data.error || 'Gemini could not respond.')
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createId(),
          role: 'assistant',
          content: data.reply || 'I could not produce a response this time.',
        },
      ])
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Something went wrong.')
    } finally {
      setIsSending(false)
      requestAnimationFrame(() => textareaRef.current?.focus())
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void sendMessage()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendMessage()
    }
  }

  const choosePrompt = (prompt: string) => {
    setInput(prompt)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  return (
    <main className={`chat-shell ${hasMessages ? 'has-thread' : ''}`}>
      <section className="prompt-panel" aria-label="Gemini chat">
        {!hasMessages && (
          <h1>
            <BrandMark />
            <span>Good afternoon, mythili</span>
          </h1>
        )}

        {hasMessages && (
          <div className="thread" aria-live="polite">
            {messages.map((message) => (
              <article key={message.id} className={`chat-message ${message.role}`}>
                {message.role === 'assistant' && <BrandMark className="message-mark" />}
                <div className="bubble">{message.content}</div>
              </article>
            ))}

            {isSending && (
              <article className="chat-message assistant">
                <BrandMark className="message-mark" />
                <div className="bubble thinking">
                  <span />
                  <span />
                  <span />
                </div>
              </article>
            )}

            {error && <p className="chat-error">{error}</p>}
            <div ref={threadEndRef} />
          </div>
        )}

        <form className="composer" aria-label="Message composer" onSubmit={handleSubmit}>
          <textarea
            ref={textareaRef}
            aria-label="Message"
            placeholder="Type / for skills"
            rows={2}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="composer-footer">
            <button className="icon-button plus-button" type="button" aria-label="Add attachment">
              <span aria-hidden="true" />
            </button>

            <div className="composer-tools">
              <button className="model-button" type="button">
                <span className="model-label">Gemini 2.5 Flash Agent</span>
                <ChevronIcon className="tool-icon chevron" />
              </button>
              <button className="icon-button" type="button" aria-label="Use microphone">
                <MicIcon className="tool-icon" />
              </button>
              {input.trim() || isSending ? (
                <button className="send-button" type="submit" disabled={!canSend}>
                  {isSending ? (
                    <span className="send-loading" aria-hidden="true" />
                  ) : (
                    <SendIcon className="tool-icon" />
                  )}
                  <span className="sr-only">Send message</span>
                </button>
              ) : (
                <button className="voice-button" type="button" aria-label="Voice mode">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </button>
              )}
            </div>
          </div>
        </form>

        {!hasMessages && (
          <div className="quick-actions" aria-label="Suggested actions">
            {actions.map(({ label, Icon, prompt }) => (
              <button
                key={label}
                className="action-chip"
                type="button"
                onClick={() => choosePrompt(prompt)}
              >
                <Icon className="chip-icon" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

export default App
