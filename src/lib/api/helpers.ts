import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";

export function apiResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function getSessionUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireAuth(): Promise<{ id: string; name?: string | null; email?: string | null; image?: string | null } | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  return { ...session.user, id: session.user.id };
}

export function parseBody<T>(schema: z.ZodType<T>, data: unknown): { data: T } | { error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues.map((iss) => `${iss.path.join(".")}: ${iss.message}`).join(", ");
    return { error: message };
  }
  return { data: result.data };
}

export function parseQuery<T>(schema: z.ZodType<T>, params: URLSearchParams): { data: T } | { error: string } {
  const obj: Record<string, string> = {};
  params.forEach((value, key) => {
    obj[key] = value;
  });
  const result = schema.safeParse(obj);
  if (!result.success) {
    const message = result.error.issues.map((iss) => `${iss.path.join(".")}: ${iss.message}`).join(", ");
    return { error: message };
  }
  return { data: result.data };
}
