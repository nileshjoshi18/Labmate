import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const subject = searchParams.get("subject");

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        files: {
          where: subject ? { subject } : undefined,
          orderBy: { uploadedAt: "desc" },
        },
      },
    });

    return NextResponse.json({ files: user?.files || [] });
  } catch (error) {
    console.error("Fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch files" },
      { status: 500 }
    );
  }
}