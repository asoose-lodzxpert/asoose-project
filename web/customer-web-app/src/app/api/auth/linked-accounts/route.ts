import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/../../utils/authOptions";

const API_URL =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3000/api/v1";

/**
 * GET /api/auth/linked-accounts
 * Returns { google: boolean, apple: boolean } for the current user.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await fetch(`${API_URL}/auth/user/linked-accounts`, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

/**
 * POST /api/auth/linked-accounts
 * Body: { provider: "google", googleId, email, firstName, lastName, profilePicture? }
 * Links the OAuth provider to the current user.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { provider, ...payload } = body;

  if (!provider || !["google", "apple"].includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const res = await fetch(`${API_URL}/auth/user/link/${provider}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

/**
 * DELETE /api/auth/linked-accounts?provider=google
 * Unlinks the specified OAuth provider from the current user.
 */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider");

  if (!provider || !["google", "apple"].includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const res = await fetch(`${API_URL}/auth/user/link/${provider}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
