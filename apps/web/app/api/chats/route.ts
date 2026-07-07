import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const GUEST_LIMIT = 300;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const GUEST_COOKIE = "uni_ai_guest_id";

export async function GET(request: NextRequest) {
  const { prisma } = getServerModules();
  const { guest, visitorId, shouldSetCookie } = await getOrCreateGuest(request, prisma);
  const chats = await prisma.webChatSession.findMany({
    where: { guestSessionId: guest.id },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const response = NextResponse.json({
    remaining: Math.max(guest.dailyLimit - guest.messageCount, 0),
    chats: chats.map((chat) => ({
      id: chat.id,
      title: chat.title,
      updatedAt: chat.updatedAt.getTime(),
      messages: chat.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
      })),
    })),
  });

  setGuestCookie(response, visitorId, shouldSetCookie);
  return response;
}

function getServerModules() {
  const runtimeRequire = eval("require") as NodeRequire;
  const database = runtimeRequire("@uniai/database") as typeof import("@uniai/database");

  return {
    prisma: database.prisma,
  };
}

async function getOrCreateGuest(
  request: NextRequest,
  prisma: ReturnType<typeof getServerModules>["prisma"]
) {
  const now = new Date();
  const visitorId = request.cookies.get(GUEST_COOKIE)?.value ?? crypto.randomUUID();
  const shouldSetCookie = !request.cookies.get(GUEST_COOKIE)?.value;
  const existing = await prisma.webGuestSession.findUnique({
    where: { visitorId },
  });

  if (!existing) {
    const guest = await prisma.webGuestSession.create({
      data: {
        visitorId,
        dailyLimit: GUEST_LIMIT,
        quotaResetAt: new Date(now.getTime() + ONE_DAY_MS),
      },
    });

    return { guest, visitorId, shouldSetCookie };
  }

  if (existing.quotaResetAt <= now) {
    const guest = await prisma.webGuestSession.update({
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
