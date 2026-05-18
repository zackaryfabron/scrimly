import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(randomBytes(6))
    .map((b) => chars[b % chars.length])
    .join("");
}

export async function POST(req: NextRequest) {
  try {
    const { username, password, teamName } = (await req.json()) as {
      username: string;
      password: string;
      teamName: string;
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
    if (!teamName || teamName.trim().length < 2) {
      return NextResponse.json(
        { error: "Team name must be at least 2 characters." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const supabase = await createClient();

    const email = `${username.toLowerCase()}@scrimly.local`;

    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        user_metadata: { username: username.toLowerCase() },
        email_confirm: true,
      });

    if (createError) {
      const msg = createError.message.toLowerCase().includes("already")
        ? "Username already taken."
        : createError.message;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const userId = created.user.id;

    // Sign in to set session cookies in the response
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      return NextResponse.json(
        { error: "Account created but sign-in failed. Please log in." },
        { status: 500 }
      );
    }

    // Create team with unique invite code (retry on collision)
    let teamId: string | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const inviteCode = generateInviteCode();
      const { data: team, error: teamError } = await admin
        .from("teams")
        .insert({
          name: teamName.trim(),
          invite_code: inviteCode,
          owner_id: userId,
        })
        .select("id")
        .single();

      if (!teamError && team) {
        teamId = team.id as string;
        break;
      }
      if (teamError && !teamError.message.includes("unique")) {
        return NextResponse.json({ error: teamError.message }, { status: 500 });
      }
    }

    if (!teamId) {
      return NextResponse.json(
        { error: "Failed to generate a unique invite code. Please try again." },
        { status: 500 }
      );
    }

    const { error: memberError } = await admin.from("team_members").insert({
      team_id: teamId,
      user_id: userId,
      role: "owner",
    });

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error during signup.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
