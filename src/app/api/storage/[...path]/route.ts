import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { downloadFile, isTenantStoragePath } from "@/lib/storage";
import { getCurrentTenant } from "@/lib/tenants/server";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { path } = await params;
  const pathname = path.join("/");
  if (!pathname || pathname.split("/").some((part) => part === "..")) {
    return NextResponse.json({ error: "invalid path" }, { status: 400 });
  }

  const tenant = await getCurrentTenant();
  if (!isTenantStoragePath(pathname, tenant.id)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  try {
    const file = await downloadFile(pathname);
    const body = file.buffer.buffer.slice(
      file.buffer.byteOffset,
      file.buffer.byteOffset + file.buffer.byteLength,
    ) as ArrayBuffer;
    return new NextResponse(body, {
      headers: {
        "Cache-Control": "private, max-age=60",
        "Content-Type": file.contentType,
        "Content-Length": String(file.buffer.length),
      },
    });
  } catch (err) {
    console.warn("[storage] download failed:", err);
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
