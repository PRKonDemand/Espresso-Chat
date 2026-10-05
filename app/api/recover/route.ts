import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * Complete a recovery-code password reset.
 * The code is verified with the anon client (RLS-closed table, SECURITY
 * DEFINER function); the password is then set with the service-role client,
 * which never leaves the server.
 */
export async function POST(request: Request) {
  let body: { userId?: string; code?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const userId = body.userId?.trim();
  const code = body.code?.trim();
  const newPassword = body.newPassword ?? "";

  if (!userId || !code || newPassword.length < 8) {
    return NextResponse.json(
      { error: "Provide your User ID, recovery code, and a password of at least 8 characters." },
      { status: 400 }
    );
  }

  const supabase = createClient();
  const { data: uid, error: verifyError } = await supabase.rpc("verify_recovery_code", {
    p_user_id: userId,
    p_code: code
  });

  if (verifyError) {
    return NextResponse.json({ error: "Could not verify the recovery code." }, { status: 500 });
  }
  if (!uid) {
    return NextResponse.json(
      { error: "That User ID and recovery code don't match." },
      { status: 401 }
    );
  }

  const admin = createServiceClient();
  const { error: updateError } = await admin.auth.admin.updateUserById(uid as string, {
    password: newPassword
  });

  if (updateError) {
    return NextResponse.json({ error: "Could not update the password." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
