import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json({ error: "Missing path" }, { status: 400 });
    }

    // Create a signed URL that expires in 1 hour
    const { data, error } = await supabase.storage
      .from("student-files")
      .createSignedUrl(path, 3600);

    if (error) {
      console.error("Download error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}