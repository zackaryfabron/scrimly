import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { username, password, inviteCode } = (await req.json()) as {
    username: string;
    password: string;
    inviteCode: string;
  };

  if (!username || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return NextResponse.json(
      { error: "Username must be 3–20 characters: letters, numbers, underscores." },
      { status: 400 }
    );
  }
  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }
  if (!inviteCode || inviteCode.trim().length !== 6) {
    return NextResponse.json(
      { error: "Invite code must be exactly 6 characters." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const supabase = await createClient();

  // Validate invite code before creating the user
  const { data: team, error: teamError } = await admin
    .from("teams")
    .select("id")
    .eq("invite_code", inviteCode.trim().toUpperCase())
    .single();

  if (teamError || !team) {
    return NextResponse.json(
      { error: "Invalid invite code. Check with your team owner." },
      { status: 404 }
    );
  }

  const email = `${username.toLowerCase()}@scrimly.local`;

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      user_metadata: { username: username.toLowerCase() },
      email_confirm: true,
    });

  if (createError) {
    const msg = createError.message.includes("already")
      ? "Username already taken."
      : createError.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const userId = created.user.id;

  // Sign in to set session cookies
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) {
    return NextResponse.json({ error: "Account created but sign-in failed. Try logging in." }, { status: 500 });
  }

  const { error: memberError } = await admin.from("team_members").insert({
    team_id: team.id,
    user_id: userId,
    role: "member",
  });

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
