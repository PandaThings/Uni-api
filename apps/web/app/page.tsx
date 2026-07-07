"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Bot,
  Send,
  Sparkles,
  UserRound,
} from "lucide-react";

type Role = "user" | "assistant";

type Message = {
  id: string;
  role: Role;
  content: string;
};

const starterPrompts = [
  "Review this backend API design.",
  "Help me debug a production deployment issue.",
  "Plan a clean architecture for a SaaS feature.",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const chatIdRef = useRef(crypto.randomUUID());

  const isEmpty = messages.length === 0;

  useEffect(() => {
    messagesRef.current?.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, isSending]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = prompt.trim();

    if (!content || isSending) {
      return;
    }

    setError("");
    setPrompt("");
    setIsSending(true);

    const userMessage = createMessage("user", content);
    setMessages((current) => [...current, userMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: content, chatId: chatIdRef.current }),
      });
      const payload = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(payload.message || payload.error || "Request failed");
      }

      const assistantMessage = createMessage("assistant", payload.answer);
      setMessages((current) => [...current, assistantMessage]);
      setRemaining(typeof payload.remaining === "number" ? payload.remaining : null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setIsSending(false);
    }
  }

  function submitStarter(value: string) {
    setPrompt(value);
  }

  return (
    <main className="shell">
      <section className={`chatPanel ${isEmpty ? "is-empty" : ""}`}>
        <header className="topbar">
          <div className="brandMark" aria-hidden="true">
            U
          </div>
          <div>
            <p className="eyebrow">Uni AI</p>
          </div>
          <div className="statusPill">
            <span>Guest</span>
            {remaining !== null && (
              <span className="remainingBadge">{remaining}</span>
            )}
          </div>
        </header>

        <div className="messages" ref={messagesRef}>
          {isEmpty ? (
            <section className="emptyState">
              <h1>What can I help you build?</h1>
              <div className="starterGrid">
                {starterPrompts.map((value) => (
                  <button key={value} type="button" onClick={() => submitStarter(value)}>
                    {value}
                  </button>
                ))}
              </div>
            </section>
          ) : (
            messages.map((message) => (
              <article className={`message ${message.role}`} key={message.id}>
                <div className="avatar" aria-hidden="true">
                  {message.role === "assistant" ? (
                    <Bot size={20} strokeWidth={2} />
                  ) : (
                    <UserRound size={20} strokeWidth={2} />
                  )}
                </div>
                <div className="messageBody">
                  <p className="messageAuthor">
                    {message.role === "assistant" ? "Uni AI" : "You"}
                  </p>
                  <div className="messageText">
                    {message.role === "assistant" ? (
                      <MarkdownMessage content={message.content} />
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              </article>
            ))
          )}

          {isSending && (
            <article className="message assistant">
              <div className="avatar" aria-hidden="true">
                <Bot size={20} strokeWidth={2} />
              </div>
              <div className="messageBody">
                <p className="messageAuthor">Uni AI</p>
                <div className="typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </article>
          )}
        </div>

        <footer className="composerArea">
          {error && <p className="errorText">{error}</p>}
          <form className="composer" onSubmit={handleSubmit}>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Message Uni AI..."
              rows={1}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <button
              className="sendButton"
              type="submit"
              disabled={!prompt.trim() || isSending}
              aria-label="Send message"
              title="Send message"
            >
              <Send size={18} strokeWidth={2} />
            </button>
          </form>
          <p className="finePrint">
            Guest session &mdash; resets on refresh.
          </p>
        </footer>
      </section>
    </main>
  );
}

function createMessage(role: Role, content: string): Message {
  return {
    id: crypto.randomUUID(),
    role,
    content,
  };
}

async function readJsonResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      error: "Invalid server response",
      message: response.ok
        ? "The server returned a response the app could not read."
        : "The server failed before returning JSON. Check the terminal logs.",
    };
  }
}

function MarkdownMessage({ content }: { content: string }) {
  // Split the content by code blocks: ```language\n code \n```
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="markdownMessage">
      {parts.map((part, index) => {
        if (!part.trim()) return null;

        // Check if this part is a code block
        if (part.startsWith("```") && part.endsWith("```")) {
          const lines = part.split("\n");
          // Remove the first line (```language) and the last line (```)
          const code = lines.slice(1, -1).join("\n");
          const language = lines[0].slice(3).trim();

          return (
            <div key={index} className="codeBlockWrapper">
              {language && <div className="codeLanguage">{language}</div>}
              <pre className="codeBlock">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        // Parse regular text line by line to support headings anywhere
        const lines = part.split("\n");
        const elements: React.ReactNode[] = [];
        let currentParagraph: React.ReactNode[] = [];
        let currentList: React.ReactNode[] = [];

        const flushParagraph = () => {
          if (currentParagraph.length > 0) {
            elements.push(<p key={`p-${elements.length}`}>{currentParagraph}</p>);
            currentParagraph = [];
          }
        };

        const flushList = () => {
          if (currentList.length > 0) {
            elements.push(<ul key={`ul-${elements.length}`}>{currentList}</ul>);
            currentList = [];
          }
        };

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();

          if (!line) {
            flushParagraph();
            flushList();
            continue;
          }

          if (line.startsWith("### ")) {
            flushParagraph();
            flushList();
            elements.push(<h4 key={`h4-${elements.length}`}>{renderInlineMarkdown(line.slice(4))}</h4>);
          } else if (line.startsWith("## ")) {
            flushParagraph();
            flushList();
            elements.push(<h3 key={`h3-${elements.length}`}>{renderInlineMarkdown(line.slice(3))}</h3>);
          } else if (line.startsWith("# ")) {
            flushParagraph();
            flushList();
            elements.push(<h2 key={`h2-${elements.length}`}>{renderInlineMarkdown(line.slice(2))}</h2>);
          } else if (line.startsWith("- ") || line.startsWith("* ")) {
            flushParagraph();
            currentList.push(<li key={`li-${currentList.length}`}>{renderInlineMarkdown(line.slice(2))}</li>);
          } else {
            flushList();
            if (currentParagraph.length > 0) {
              currentParagraph.push(<br key={`br-${i}`} />);
            }
            currentParagraph.push(<span key={`span-${i}`}>{renderInlineMarkdown(line)}</span>);
          }
        }

        flushParagraph();
        flushList();

        return (
          <div key={index} className="markdownContent">
            {elements}
          </div>
        );
      })}
    </div>
  );
}

function renderInlineMarkdown(text: string) {
  // Split by bold (**bold**)
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);

  return boldParts.map((bPart, bIndex) => {
    if (bPart.startsWith("**") && bPart.endsWith("**")) {
      return <strong key={bIndex}>{bPart.slice(2, -2)}</strong>;
    }

    // Inside non-bold text, split by inline code (`code`)
    const codeParts = bPart.split(/(`[^`]+`)/g);

    return (
      <span key={bIndex}>
        {codeParts.map((cPart, cIndex) => {
          if (cPart.startsWith("`") && cPart.endsWith("`")) {
            return (
              <code className="inlineCode" key={cIndex}>
                {cPart.slice(1, -1)}
              </code>
            );
          }
          return <span key={cIndex}>{cPart}</span>;
        })}
      </span>
    );
  });
}
