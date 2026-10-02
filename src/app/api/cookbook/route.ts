import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectToDatabase from "@/lib/mongodb";
import Recipe from "@/models/Recipe";

export async function GET() {
  const session = await getServerSession();
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const recipes = await Recipe.find({ userEmail: session.user.email }).sort({ createdAt: -1 });

    return NextResponse.json({ recipes });
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession();
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, content, pantry } = body;

    await connectToDatabase();

    const newRecipe = await Recipe.create({
      userEmail: session.user.email,
      title,
      content,
      pantry
    });

    return NextResponse.json({ recipe: newRecipe }, { status: 201 });
  } catch (error) {
    console.error("Error saving recipe:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
