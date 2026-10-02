# SafeBite

SafeBite is a meal planner for people with strict food allergies. It runs Google Gemma 2 locally through Ollama to generate recipes based on what you have in your kitchen, while rigidly filtering out dangerous ingredients.

Most AI recipe generators hallucinate safe status for hidden allergens or ignore cross-contamination rules. SafeBite handles this with a hardcoded RAG guardrail. It intercepts your pantry list, checks the items against an offline dictionary, and injects strict override warnings before the LLM ever sees the prompt. Your medical profile is securely synced via MongoDB and Google OAuth.

## Tech Stack
* Frontend: Next.js App Router, Tailwind CSS v4
* Backend: Next.js API Routes, NextAuth (Google Provider), Mongoose
* Database: MongoDB Atlas
* AI: Google Gemma 2 (2B) via Ollama

## Testing the Guardrails

If you want to test the application, copy these profiles and pantries into the input fields.

### Demo 1: The Hidden Gluten Trap
* **Condition:** Celiac Disease
* **Allergens:** Gluten, Wheat, Barley, Rye
* **Strictness:** Strict zero cross-contamination.
* **Pantry:** Chicken breast, white rice, broccoli, traditional soy sauce, olive oil
* **Expected result:** The guardrail catches the traditional soy sauce (which contains wheat) and forces the AI to substitute it with Tamari.

### Demo 2: The Dairy Mix-Up
* **Condition:** Severe Lactose Intolerance
* **Allergens:** Dairy, Milk, Cheese, Butter
* **Strictness:** No dairy products.
* **Pantry:** Pasta, ground beef, tomato sauce, mayonnaise, parmesan cheese
* **Expected result:** The AI omits the parmesan. By injecting explicit negative constraints, we force the model to recognize that mayonnaise is safe (eggs/oil) instead of lazily dropping it as dairy.

### Demo 3: Tree Nut & Peanut Guardrails
* **Condition:** Nut Allergy
* **Allergens:** Peanuts, Tree Nuts, Almonds, Cashews
* **Strictness:** Trace amounts are dangerous.
* **Pantry:** Rolled oats, almond milk, strawberries, honey, chia seeds
* **Expected result:** The AI flags the almond milk and substitutes oat milk or water.

## Local Setup

1. **Configure your environment.** Copy `.env.example` to `.env.local` and add your MongoDB connection string and Google OAuth client credentials.
2. **Start the local LLM.** Install [Ollama](https://ollama.com/), then pull the model:
   ```bash
   ollama pull gemma2:2b
   ollama serve
   ```
3. **Start the Next.js app.**
   ```bash
   npm install
   npm run dev
   ```
   Open `http://localhost:3000` to use the planner.
