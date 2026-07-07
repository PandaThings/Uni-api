import { NextRequest, NextResponse } from "next/server";
import { b, resetBamlEnvVars } from "@uniai/baml";
import { prisma } from "@uniai/database";

export const runtime = "nodejs";

const GUEST_LIMIT = 300;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const GUEST_COOKIE = "uni_ai_guest_id";

export async function POST(request: NextRequest) {
  resetBamlEnvVars(process.env as Record<string, string>);
  const body = await request.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const requestedChatId = typeof body?.chatId === "string" ? body.chatId : undefined;

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const { guest, visitorId, shouldSetCookie } = await getOrCreateGuest(request, prisma);

  if (guest.messageCount >= guest.dailyLimit) {
    const response = NextResponse.json(
      {
        error: "Guest limit reached",
        message: "You have reached today's guest chat limit.",
        remaining: 0,
      },
      { status: 429 }
    );
    setGuestCookie(response, visitorId, shouldSetCookie);
    return response;
  }

  const chat = await getOrCreateChat(prisma, guest.id, prompt, requestedChatId);
  const previousMessages = await prisma.webChatMessage.findMany({
    where: { chatId: chat.id },
    orderBy: { createdAt: "asc" },
    take: 16,
  });

  await prisma.webChatMessage.create({
    data: {
      chatId: chat.id,
      role: "user",
      content: prompt,
    },
  });

  const context = previousMessages.slice(-12).map((message) => ({
    summary: message.role === "assistant" ? "Assistant reply" : "User message",
    category: "coding",
    embeddingText: `${message.role}: ${message.content}`,
  }));

  const answer = await b.Reason(prompt, context);

  await prisma.$transaction([
    prisma.webChatMessage.create({
      data: {
        chatId: chat.id,
        role: "assistant",
        content: answer,
      },
    }),
    prisma.webGuestSession.update({
      where: { id: guest.id },
      data: {
        messageCount: { increment: 1 },
      },
    }),
    prisma.webChatSession.update({
      where: { id: chat.id },
      data: { updatedAt: new Date() },
    }),
  ]);

  const remaining = Math.max(guest.dailyLimit - guest.messageCount - 1, 0);
  const response = NextResponse.json({
    answer,
    chatId: chat.id,
    title: chat.title,
    remaining,
  });

  setGuestCookie(response, visitorId, shouldSetCookie);
  return response;
}

async function getOrCreateGuest(
  request: NextRequest,
  database: typeof prisma
) {
  const now = new Date();
  const visitorId = request.cookies.get(GUEST_COOKIE)?.value ?? crypto.randomUUID();
  const shouldSetCookie = !request.cookies.get(GUEST_COOKIE)?.value;
  const existing = await database.webGuestSession.findUnique({
    where: { visitorId },
  });

  if (!existing) {
    const guest = await database.webGuestSession.create({
      data: {
        visitorId,
        dailyLimit: GUEST_LIMIT,
        quotaResetAt: new Date(now.getTime() + ONE_DAY_MS),
      },
    });

    return { guest, visitorId, shouldSetCookie };
  }

  if (existing.quotaResetAt <= now) {
    const guest = await database.webGuestSession.update({
      where: { id: existing.id },
      data: {
        messageCount: 0,
        quotaResetAt: new Date(now.getTime() + ONE_DAY_MS),
      },
    });

    return { guest, visitorId, shouldSetCookie };
  }

  return { guest: existing, visitorId, shouldSetCookie };
}

async function getOrCreateChat(
  database: typeof prisma,
  guestSessionId: string,
  prompt: string,
  chatId?: string
) {
  if (chatId) {
    const existing = await database.webChatSession.findFirst({
      where: {
        id: chatId,
        guestSessionId,
      },
    });

    if (existing) {
      return existing;
    }
  }

  return database.webChatSession.create({
    data: {
      id: chatId,
      guestSessionId,
      title: createTitle(prompt),
    },
  });
}

function createTitle(prompt: string) {
  return prompt.length > 42 ? `${prompt.slice(0, 39)}...` : prompt;
}

function setGuestCookie(response: NextResponse, visitorId: string, shouldSetCookie: boolean) {
  if (!shouldSetCookie) {
    return;
  }

  response.cookies.set(GUEST_COOKIE, visitorId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: ONE_DAY_MS / 1000,
    path: "/",
  });
}
