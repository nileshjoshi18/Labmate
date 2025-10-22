import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const prisma = new PrismaClient();

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("id");

    if (!fileId) {
      return NextResponse.json({ error: "Missing file ID" }, { status: 400 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get file and verify ownership
    const file = await prisma.file.findFirst({
      where: {
        id: parseInt(fileId),
        userId: user.id,
      },
    });

    if (!file) {
      return NextResponse.json(
        { error: "File not found or unauthorized" },
        { status: 404 }
      );
    }

    // Delete from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from("student-files")
      .remove([file.storagePath]);

    if (storageError) {
      console.error("Storage delete error:", storageError);
      // Continue anyway - might already be deleted
    }

    // Delete from database
    await prisma.file.delete({
      where: { id: file.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Delete failed" },
      { status: 500 }
    );
  }
}