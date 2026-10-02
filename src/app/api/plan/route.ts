import { NextResponse } from 'next/server';
import ollama from 'ollama';
import { z } from 'zod';

const RequestSchema = z.object({
  pantry: z.string().min(1, "Pantry ingredients are required"),
  profile: z.object({
    name: z.string().default("User"),
    allergies: z.array(z.string()),
    strictness: z.string().default("Standard")
  })
});

import { runGuardrail } from '@/utils/allergenChecker';

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    const parsed = RequestSchema.safeParse(rawBody);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request payload', details: parsed.error.format() }, { status: 400 });
    }

    const { pantry, profile } = parsed.data;

    const persona = profile;

    const systemPrompt = `You are SafeBite, a highly precise culinary AI. 
You are cooking for a person with the following profile:
Name/Condition: ${persona.name}
Target Allergens to Avoid: ${persona.allergies.join(', ')}
Strictness: ${persona.strictness}

CRITICAL RULES FOR ALLERGEN EVALUATION:
1. EXPLICIT MATCHING: You MUST evaluate the core components of every ingredient against the Target Allergens. (e.g., "Almond milk" is made of almonds, which are Tree Nuts. "Traditional soy sauce" contains wheat, which is Gluten).
2. NEVER flag an ingredient as unsafe unless it contains one of the specific Target Allergens. (e.g. Mayonnaise is just eggs and oil; it is dairy-free, gluten-free, and nut-free).
3. Do not invent allergies. If the profile does not mention a dairy allergy, do not mention dairy.

CRITICAL RULES FOR RECIPE GENERATION:
1. STRICT INGREDIENT LIMIT: You MUST ONLY use the ingredients provided by the user in their pantry. 
2. Do NOT invent, hallucinate, or add major ingredients (like meats, vegetables, sauces, or grains) that the user did not list.
3. You may assume they have basic kitchen staples: water, cooking oil, salt, and black pepper. Nothing else.
4. VARIETY: If the ingredients allow for it, generate multiple different recipe options (up to a maximum of 5). If ingredients are limited, generate as many distinct recipes as possible.

EXAMPLE BEHAVIOR 1 (Celiac Profile):
Pantry: "Chicken, mayonnaise, soy sauce, bread"
CORRECT: "Chicken and mayonnaise are naturally safe. Soy sauce contains wheat, so I will substitute it with Tamari. Bread contains gluten, so I will substitute it with gluten-free bread."

EXAMPLE BEHAVIOR 2 (Nut Allergy Profile):
Pantry: "Oats, almond milk, honey"
CORRECT: "Oats and honey are safe. However, almond milk is made of almonds (a tree nut). I will substitute the almond milk with water to ensure it is completely nut-free."
INCORRECT: "Almond milk is naturally nut-free." (This is a dangerous hallucination. Almonds ARE nuts).

You MUST format your response EXACTLY following this Markdown template. Do not deviate. Do not group recipes into a single list. Every recipe MUST start with its own "## " heading.

Allergen Safety Check:
[Write your safety evaluation paragraph here]

## [First Recipe Title]
**Ingredients:**
- [list ingredients]
**Instructions:**
1. [list steps]

## [Second Recipe Title]
[and so on, up to 5 recipes...]
`;

    const guardrailWarnings = runGuardrail(pantry, profile.allergies);
    const userPrompt = `My pantry has: ${pantry}. What can I make? ${guardrailWarnings}`;

    // Connect to local Ollama running gemma2:2b
    const response = await ollama.chat({
      model: 'gemma2:2b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      options: {
        temperature: 0.7 // Increased temperature for recipe variety while relying on our RAG Guardrail for safety
      }
    });

    return NextResponse.json({ recipe: response.message.content });
  } catch (error: any) {
    console.error('Error generating recipe:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate recipe' }, { status: 500 });
  }
}
