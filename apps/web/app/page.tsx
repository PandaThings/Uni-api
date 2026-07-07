"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Bot,
  ChevronLeft,
  Menu,
  MessageSquarePlus,
  PanelLeftClose,
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

type Chat = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
};

const starterPrompts = [
  "Review this backend API design.",
  "Help me debug a production deployment issue.",
  "Plan a clean architecture for a SaaS feature.",
];

export default function ChatPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const messagesRef = useRef<HTMLDivElement>(null);

  const activeChat = chats.find((chat) => chat.id === activeChatId);
  const messages = activeChat?.messages ?? [];

  useEffect(() => {
    setSidebarOpen(window.innerWidth > 860);
    loadChats();
  }, []);

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

    const chatId = activeChatId || createNewChat();
    const userMessage = createMessage("user", content);

    upsertChatMessage(chatId, userMessage, content);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: content, chatId }),
      });
      const payload = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(payload.message || payload.error || "Request failed");
      }

      const assistantMessage = createMessage("assistant", payload.answer);
      upsertChatMessage(chatId, assistantMessage);
      renameChat(chatId, payload.title);
      setRemaining(typeof payload.remaining === "number" ? payload.remaining : null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setIsSending(false);
    }
  }

  function createNewChat() {
    const chat = createChat();
    setChats((current) => [chat, ...current]);
    setActiveChatId(chat.id);
    setError("");
    return chat.id;
  }

  async function loadChats() {
    try {
      const response = await fetch("/api/chats", {
        cache: "no-store",
      });
      const payload = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(payload.message || payload.error || "Could not load chats");
      }

      if (Array.isArray(payload.chats) && payload.chats.length > 0) {
        setChats(payload.chats);
        setActiveChatId(payload.chats[0].id);
      } else {
        const chat = createChat();
        setChats([chat]);
        setActiveChatId(chat.id);
      }

      setRemaining(typeof payload.remaining === "number" ? payload.remaining : null);
    } catch (caught) {
      const chat = createChat();
      setChats([chat]);
      setActiveChatId(chat.id);
      setError(caught instanceof Error ? caught.message : "Could not load chats.");
    } finally {
      setIsLoadingChats(false);
    }
  }

  function upsertChatMessage(chatId: string, message: Message, titleSeed?: string) {
    setChats((current) =>
      current.map((chat) => {
        if (chat.id !== chatId) {
          return chat;
        }

        const nextMessages = [...chat.messages, message];
        const title =
          chat.title === "New chat" && titleSeed ? createTitle(titleSeed) : chat.title;

        return {
          ...chat,
          title,
          messages: nextMessages,
          updatedAt: Date.now(),
        };
      })
    );
  }

  function renameChat(chatId: string, title?: string) {
    if (!title) {
      return;
    }

    setChats((current) =>
      current.map((chat) => (chat.id === chatId ? { ...chat, title } : chat))
    );
  }

  function submitStarter(value: string) {
    setPrompt(value);
  }

  return (
    <main className="shell">
      <aside className={sidebarOpen ? "sidebar" : "sidebar sidebarClosed"}>
        <div className="sidebarHeader">
          <div className="brandMark">U</div>
          <div>
            <p className="brandName">Uni AI</p>
            <p className="brandMeta">Guest workspace</p>
          </div>
          <button
            className="iconButton sidebarToggle"
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
            title="Close sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        <button className="newChatButton" type="button" onClick={createNewChat}>
          <MessageSquarePlus size={18} />
          <span>New chat</span>
        </button>

        <div className="chatList">
          {isLoadingChats && <div className="chatListState">Loading chats...</div>}
          {chats.map((chat) => (
            <button
              className={chat.id === activeChatId ? "chatItem activeChatItem" : "chatItem"}
              key={chat.id}
              type="button"
              onClick={() => {
                setActiveChatId(chat.id);
                setError("");
              }}
            >
              <span>{chat.title}</span>
            </button>
          ))}
        </div>

        <div className="sidebarFooter">
          <p>Guest access</p>
          <strong>{remaining === null ? "300" : remaining} messages left today</strong>
        </div>
      </aside>

      <section className="chatPanel">
        <header className="topbar">
          {!sidebarOpen && (
            <button
              className="iconButton"
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              title="Open sidebar"
            >
              <Menu size={19} />
            </button>
          )}
          <button
            className="mobileBack"
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open chats"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <p className="eyebrow">Uni AI Web</p>
            <h1>What are we building today?</h1>
          </div>
          <div className="statusPill">
            <Sparkles size={16} />
            <span>Guest mode</span>
          </div>
        </header>

        <div className="messages" ref={messagesRef}>
          {isLoadingChats ? (
            <section className="emptyState">
              <div className="emptyMark">
                <Bot size={30} />
              </div>
              <h2>Opening your workspace.</h2>
              <p>Loading guest chats and usage limits.</p>
            </section>
          ) : messages.length === 0 ? (
            <section className="emptyState">
              <div className="emptyMark">
                <Bot size={30} />
              </div>
              <h2>Start with a technical problem, product idea, or architecture question.</h2>
              <p>
                Uni AI is tuned for software reasoning, production planning, and careful
                implementation guidance.
              </p>
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
                  {message.role === "assistant" ? <Bot size={18} /> : <UserRound size={18} />}
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
                <Bot size={18} />
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
              placeholder="Ask Uni AI for architecture, debugging, code review, or implementation planning..."
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
              <Send size={18} />
            </button>
          </form>
          <p className="finePrint">
            Guest chats are saved to this guest workspace.
          </p>
        </footer>
      </section>
    </main>
  );
}

function createChat(): Chat {
  return {
    id: crypto.randomUUID(),
    title: "New chat",
    messages: [],
    updatedAt: Date.now(),
  };
}

function createMessage(role: Role, content: string): Message {
  return {
    id: crypto.randomUUID(),
    role,
    content,
  };
}

function createTitle(prompt: string) {
  return prompt.length > 42 ? `${prompt.slice(0, 39)}...` : prompt;
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
  const blocks = content.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  return (
    <div className="markdownMessage">
      {blocks.map((block, index) => {
        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
        const firstLine = lines[0] ?? "";

        if (firstLine.startsWith("## ")) {
          return <h3 key={index}>{renderInlineMarkdown(firstLine.slice(3))}</h3>;
        }

        if (firstLine.startsWith("# ")) {
          return <h2 key={index}>{renderInlineMarkdown(firstLine.slice(2))}</h2>;
        }

        if (lines.every((line) => line.startsWith("- "))) {
          return (
            <ul key={index}>
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{renderInlineMarkdown(line.slice(2))}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index}>
            {lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {renderInlineMarkdown(line)}
                {lineIndex < lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    return <span key={index}>{part}</span>;
  });
}
