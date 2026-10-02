import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectToDatabase from "@/lib/mongodb";
import Profile from "@/models/Profile";

export async function GET() {
  const session = await getServerSession();
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const profile = await Profile.findOne({ userEmail: session.user.email });

  return NextResponse.json({ profile });
}

export async function POST(req: Request) {
  const session = await getServerSession();
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, allergies, strictness } = body;

    await connectToDatabase();

    const profile = await Profile.findOneAndUpdate(
      { userEmail: session.user.email },
      { name, allergies, strictness },
      { new: true, upsert: true } // Create if doesn't exist
    );

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error saving profile:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
