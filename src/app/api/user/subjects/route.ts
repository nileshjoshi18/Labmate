// app/api/user/subjects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const revalidate = 0; // avoid caching

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { choices: true },
    });

    const subjects = user?.choices?.map((c) => c.subject) ?? [];
    const choices =
      user?.choices?.map((c: any) => ({
        subject: c.subject,
        kind: c.kind ?? "LECTURE",
      })) ?? [];

    return NextResponse.json({
      subjects,
      choices,
      hasCompletedProfile: Boolean(user?.information),
    });
  } catch (err) {
    console.error("GET /api/user/subjects error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const inputChoices = Array.isArray(body?.choices) ? body.choices : [];
    const markCompleted = Boolean(body?.markCompleted);

    if (inputChoices.length === 0) {
      return NextResponse.json(
        { error: "Provide at least one subject." },
        { status: 400 }
      );
    }

    // sanitize + dedupe by subject (case-insensitive)
    const map = new Map<string, { subject: string; kind: "LAB" | "LECTURE" }>();
    for (const c of inputChoices) {
      const subject = String(c?.subject || "").trim();
      if (!subject) continue;
      const kind = c?.kind === "LAB" ? "LAB" : "LECTURE";
      map.set(subject.toLowerCase(), { subject, kind });
    }
    const clean = Array.from(map.values());
    if (clean.length === 0) {
      return NextResponse.json(
        { error: "No valid subjects provided." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.choices.deleteMany({ where: { userId: user.id } }),
      prisma.choices.createMany({
        data: clean.map((c) => ({
          subject: c.subject,
          // If your schema doesn't have `kind`, remove the next line
          kind: c.kind, // enum SubjectKind in Prisma
          userId: user.id,
        })),
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { information: markCompleted },
      }),
    ]);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/user/subjects error:", err);
    return NextResponse.json(
      { error: "Server error", detail: err?.message },
      { status: 500 }
    );
  }
}