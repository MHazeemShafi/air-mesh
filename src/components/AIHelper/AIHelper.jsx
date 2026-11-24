import { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Maximize2,
  Minus,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import './AIHelper.css';

const SUGGESTED_QUESTIONS = [
  'What is PM2.5?',
  'Is the air safe right now?',
  "Explain today's readings.",
  'How do I set up email alerts?'
];

const API_ERROR_MESSAGES = {
  AI_NOT_CONFIGURED:
    'AirMesh Assistant is not configured yet. Please contact the site administrator.',
  AI_INVALID_API_KEY:
    'AirMesh Assistant has a server authentication problem. Please contact the site administrator.',
  AI_ACCESS_DENIED:
    'AirMesh Assistant cannot access its AI service right now. Please try again later.',
  APP_RATE_LIMITED:
    'You’ve sent several messages quickly. Please wait a minute and try again.',
  AI_PROVIDER_RATE_LIMITED:
    'The AI service is busy right now. Please wait a moment and try again.',
  AI_MODEL_UNAVAILABLE:
    'The assistant model is temporarily unavailable. Please try again later.',
  AI_TIMEOUT:
    'AirMesh Assistant took too long to respond. Please try again.',
  AI_PROVIDER_UNAVAILABLE:
    'Could not reach the AI service. Please try again shortly.',
  AI_SERVER_ERROR:
    'AirMesh Assistant encountered a server error. Please try again later.'
};

function getHttpErrorMessage(status, code) {
  if (API_ERROR_MESSAGES[code]) return API_ERROR_MESSAGES[code];
  if (status === 404 || status === 405) {
    return 'AirMesh Assistant is unavailable at this address. Please refresh the page.';
  }
  if (status === 429) {
    return 'Too many requests. Please wait a minute and try again.';
  }
  if (status === 502 || status === 503) {
    return 'AirMesh Assistant is temporarily unavailable. Please try again shortly.';
  }
  if (status >= 500) {
    return 'AirMesh Assistant encountered a server error. Please try again later.';
  }
  return 'Unable to send your message. Please check it and try again.';
}

async function sendMessage(chatHistory, pageContext) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 25_000);
  let response;
  try {
    response = await fetch('/api/ai-assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        messages: chatHistory,
        pageContext
      }),
      signal: controller.signal
    });
  } catch (requestError) {
    if (requestError.name === 'AbortError') {
      throw new Error('AirMesh Assistant timed out. Please try again.');
    }
    if (requestError instanceof TypeError) {
      throw new Error('Network connection failed. Check your connection and try again.');
    }
    throw new Error('AirMesh Assistant could not be reached. Please try again.');
  } finally {
    window.clearTimeout(timeoutId);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(getHttpErrorMessage(response.status));
  }

  if (!data || typeof data !== 'object') {
    throw new Error(getHttpErrorMessage(response.status));
  }
  if (!response.ok) {
    throw new Error(getHttpErrorMessage(response.status, data.code));
  }
  if (typeof data.answer !== 'string' || !data.answer.trim()) {
    throw new Error('AirMesh Assistant returned an invalid response.');
  }

  return data.answer;
}

function createMessage(role, content) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content
  };
}

export default function AIHelper({ pageContext }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const requestLock = useRef(false);
  const lastRequest = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && !isMinimized) inputRef.current?.focus();
  }, [isOpen, isMinimized]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, error, isOpen, isMinimized]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setIsMinimized(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const requestReply = async history => {
    if (requestLock.current) return;
    requestLock.current = true;
    setIsLoading(true);
    setError('');

    try {
      const answer = await sendMessage(history, pageContext);
      setMessages(current => [
        ...current,
        createMessage('assistant', answer)
      ].slice(-12));
      lastRequest.current = null;
    } catch (requestError) {
      setError(requestError.message || 'Unable to contact AirMesh Assistant.');
    } finally {
      requestLock.current = false;
      setIsLoading(false);
    }
  };

  const submitMessage = async (value = draft) => {
    const content = value.trim();
    if (!content || requestLock.current) return;

    const history = [
      ...messages,
      createMessage('user', content)
    ].slice(-12);

    setMessages(history);
    setDraft('');
    lastRequest.current = history.map(({ role, content: message }) => ({
      role,
      content: message
    }));
    await requestReply(lastRequest.current);
  };

  const retryLastMessage = () => {
    if (lastRequest.current) {
      requestReply(lastRequest.current);
    }
  };

  const clearConversation = () => {
    if (requestLock.current) return;
    setMessages([]);
    setDraft('');
    setError('');
    lastRequest.current = null;
    inputRef.current?.focus();
  };

  const handleSubmit = event => {
    event.preventDefault();
    submitMessage();
  };

  const handleKeyDown = event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitMessage();
    }
  };

  return (
    <div className="ai-helper">
      {isOpen && (
        <section
          id="ai-helper-panel"
          className={`ai-helper-panel${isMinimized ? ' is-minimized' : ''}`}
          role="dialog"
          aria-labelledby="ai-helper-title"
          aria-modal="false"
        >
          <header className="ai-helper-header">
            <div className="ai-helper-brand">
              <span className="ai-helper-brand-icon" aria-hidden="true">
                <Bot size={19} />
              </span>
              <div>
                <h2 id="ai-helper-title">AirMesh Assistant</h2>
                <p>Your guide to understanding air quality</p>
              </div>
            </div>
            <div className="ai-helper-header-actions">
              {messages.length > 0 && (
                <button
                  type="button"
                  className="ai-helper-icon-button"
                  onClick={clearConversation}
                  disabled={isLoading}
                  aria-label="Clear conversation"
                  title="Clear conversation"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button
                type="button"
                className="ai-helper-icon-button"
                onClick={() => setIsMinimized(value => !value)}
                aria-label={isMinimized ? 'Restore assistant' : 'Minimize assistant'}
                title={isMinimized ? 'Restore' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 size={16} /> : <Minus size={16} />}
              </button>
              <button
                type="button"
                className="ai-helper-icon-button"
                onClick={() => {
                  setIsOpen(false);
                  setIsMinimized(false);
                }}
                aria-label="Close assistant"
                title="Close"
              >
                <X size={17} />
              </button>
            </div>
          </header>

          {!isMinimized && (
            <>
              <div className="ai-helper-status">
                <span className="ai-helper-status-dot" />
                <span>Live readings checked when relevant</span>
              </div>

              <div className="ai-helper-messages" aria-live="polite">
                <div className="ai-helper-welcome">
                  <span className="ai-helper-avatar" aria-hidden="true">
                    <Sparkles size={16} />
                  </span>
                  <div className="ai-helper-message-content">
                    <p>
                      Hi! I can help explain AirMesh, air-quality readings,
                      pollutants, and health guidance.
                    </p>
                  </div>
                </div>

                {messages.length === 0 && (
                  <div className="ai-helper-suggestions">
                    <p>Try asking</p>
                    <div className="ai-helper-suggestion-list">
                      {SUGGESTED_QUESTIONS.map(question => (
                        <button
                          key={question}
                          type="button"
                          className="ai-helper-suggestion"
                          onClick={() => submitMessage(question)}
                          disabled={isLoading}
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map(message => (
                  <div
                    className={`ai-helper-message is-${message.role}`}
                    key={message.id}
                  >
                    {message.role === 'assistant' && (
                      <span className="ai-helper-avatar" aria-hidden="true">
                        <Sparkles size={15} />
                      </span>
                    )}
                    <div className="ai-helper-message-content">
                      <p>{message.content}</p>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="ai-helper-message is-assistant">
                    <span className="ai-helper-avatar" aria-hidden="true">
                      <Sparkles size={15} />
                    </span>
                    <div
                      className="ai-helper-typing"
                      role="status"
                      aria-label="AirMesh Assistant is typing"
                    >
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="ai-helper-error" role="alert">
                    <p>{error}</p>
                    <button
                      type="button"
                      onClick={retryLastMessage}
                      disabled={isLoading || !lastRequest.current}
                    >
                      <RotateCcw size={14} />
                      Try again
                    </button>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form className="ai-helper-composer" onSubmit={handleSubmit}>
                <label className="ai-helper-sr-only" htmlFor="ai-helper-input">
                  Message AirMesh Assistant
                </label>
                <textarea
                  id="ai-helper-input"
                  ref={inputRef}
                  value={draft}
                  onChange={event => setDraft(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about air quality..."
                  rows={1}
                  maxLength={2000}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  className="ai-helper-send"
                  aria-label="Send message"
                  disabled={isLoading || !draft.trim()}
                >
                  <Send size={17} />
                </button>
                <p className="ai-helper-composer-hint">
                  Enter to send · Shift + Enter for a new line
                </p>
              </form>
            </>
          )}
        </section>
      )}

      <button
        type="button"
        className={`ai-helper-pill${isOpen ? ' is-open' : ''}`}
        aria-expanded={isOpen && !isMinimized}
        aria-controls="ai-helper-panel"
        aria-haspopup="dialog"
        onClick={() => {
          if (isOpen && !isMinimized) {
            setIsOpen(false);
          } else {
            setIsOpen(true);
            setIsMinimized(false);
          }
        }}
      >
        <Sparkles size={18} aria-hidden="true" />
        <span>Ask AirMesh</span>
        {!isOpen && <span className="ai-helper-pill-dot" aria-hidden="true" />}
      </button>
    </div>
  );
}
