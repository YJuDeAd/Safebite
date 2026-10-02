import { AllergenDatabase } from '../data/allergenDB';

export function runGuardrail(pantry: string, userAllergies: string[]): string {
  if (!userAllergies || userAllergies.length === 0) return "";

  const ingredients = pantry.toLowerCase().split(',').map(i => i.trim());
  const normalizedUserAllergies = userAllergies.map(a => a.toLowerCase().trim());
  const warnings: string[] = [];

  for (const ingredient of ingredients) {
    // Check if ingredient exists in DB (using substring for robustness, e.g. "frozen almond milk" -> matches "almond milk")
    for (const [dbItem, containedAllergies] of Object.entries(AllergenDatabase)) {
      if (ingredient.includes(dbItem)) {
        
        // See if any of the contained allergies match what the user is allergic to
        const conflicts = containedAllergies.filter(ca => 
          normalizedUserAllergies.some(ua => ua.includes(ca) || ca.includes(ua))
        );
        
        if (conflicts.length > 0) {
          warnings.push(`[GUARDRAIL ALERT]: The user listed "${ingredient}". This contains ${conflicts.join(', ')} which is strictly prohibited by their profile!`);
        }
      }
    }
  }

  if (warnings.length > 0) {
    // We append this explicitly to override the LLM's internal bias.
    return `\n\nCRITICAL SYSTEM OVERRIDE - INGREDIENT DANGER DETECTED:\n${warnings.join('\n')}\nYOU MUST EXPLICITLY REFUSE TO USE THESE INGREDIENTS OR SUBSTITUTE THEM. DO NOT CLAIM THEY ARE SAFE.`;
  }
  
  return "";
}
