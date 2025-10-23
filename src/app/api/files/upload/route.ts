import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { createClient } from "@supabase/supabase-js";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions)) as Session | null;
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const subject = String(formData.get("subject") ?? "");
    const experiment = String(formData.get("experiment") ?? "");
    if (!(file instanceof Blob) || !subject || !experiment) {
      return NextResponse.json(
        { error: "Missing file, subject, or experiment" },
        { status: 400 }
      );
    }

    // size check (50MB)
    if ((file as File).size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const safeSubject = subject.replace(/[^\w\s-]/g, "").trim() || "subject";
    const safeExperiment =
      experiment.replace(/[^\w\s-]/g, "").trim() || "experiment";
    const fileName = `${user.id}/${safeSubject}/${safeExperiment}/${Date.now()}_${(file as File).name}`;

    const arrayBuffer = await (file as File).arrayBuffer();
    const { error } = await supabase.storage
      .from("student-files")
      .upload(fileName, arrayBuffer, {
        contentType: (file as File).type || "application/octet-stream",
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const record = await prisma.file.create({
      data: {
        name: (file as File).name,
        size: (file as File).size,
        type: (file as File).type,
        subject,
        experiment,
        storagePath: fileName,
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true, file: record }, { status: 201 });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}