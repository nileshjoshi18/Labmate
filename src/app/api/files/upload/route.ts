import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Initialize Supabase client (Service Role key = server-side only)
const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const prisma = new PrismaClient();

export async function POST(req: Request) {
try {
// 🔒 Verify user session
const session = await getServerSession(authOptions);
if (!session?.user?.email) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// 📦 Parse uploaded data
const formData = await req.formData();
const file = formData.get("file") as File;
const subject = formData.get("subject") as string;
const experiment = formData.get("experiment") as string;

if (!file || !subject || !experiment) {
  return NextResponse.json(
    { error: "Missing file, subject, or experiment" },
    { status: 400 }
  );
}

// ⚠️ Validate file size (limit: 50MB)
const maxSize = 50 * 1024 * 1024;
if (file.size > maxSize) {
  return NextResponse.json(
    { error: "File too large. Maximum size is 50MB" },
    { status: 400 }
  );
}

// 👤 Get user from Prisma DB
const user = await prisma.user.findUnique({
  where: { email: session.user.email },
});

if (!user) {
  return NextResponse.json({ error: "User not found" }, { status: 404 });
}

// 🗂️ Create unique file path
const fileName = `${user.id}/${subject}/${experiment}/${Date.now()}_${file.name}`;

// Convert File → Buffer
const arrayBuffer = await file.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);

// ☁️ Upload to Supabase Storage bucket
const { data, error } = await supabase.storage
  .from("student-files") // ✅ your bucket name
  .upload(fileName, buffer, {
    contentType: file.type,
    upsert: false,
  });

if (error) {
  console.error("Supabase upload error:", error);
  return NextResponse.json({ error: error.message }, { status: 500 });
}

// 🧾 Save metadata in PostgreSQL via Prisma
const fileRecord = await prisma.file.create({
  data: {
    name: file.name,
    size: file.size,
    type: file.type,
    subject: subject,
    experiment: experiment,
    storagePath: fileName,
    userId: user.id,
  },
});

return NextResponse.json({ success: true, file: fileRecord }, { status: 201 });


} catch (error) {
console.error("Upload error:", error);
return NextResponse.json({ error: "Upload failed" }, { status: 500 });
}
}