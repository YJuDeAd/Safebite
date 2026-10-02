# SafeBite 🍽️

**SafeBite** is a privacy-first, fully local AI meal planner built for the Hacktoberfest "Build for a Friend" Weekend Challenge. 

Powered by **Gemma 2 (2B)** via Ollama, SafeBite allows users with strict dietary restrictions (like Celiac disease or severe peanut allergies) to input their pantry ingredients and safely generate recipes. The AI relies on strict deterministic prompting to avoid cross-contamination and hallucinated ingredients, ensuring user safety without ever sending medical data to a cloud API.

## 🚀 Tech Stack
* **Frontend:** Next.js (App Router), React, Tailwind CSS
* **Backend:** Next.js API Routes, `ollama` SDK
* **AI Model:** Google Gemma 2 (2B) running locally
* **Data Storage:** Browser `localStorage` (Privacy-first profiles)

---

## 🧪 Demo Data for Testing
If you want to test the AI's guardrails, try copy-pasting the following profiles and pantries into the application.

### Demo 1: The Hidden Gluten Trap
* **Condition / Name:** Celiac Disease
* **Target Allergens:** Gluten, Wheat, Barley, Rye
* **Strictness Rules:** Strict zero cross-contamination.
* **Pantry Input:** `Chicken breast, white rice, broccoli, traditional soy sauce, olive oil`
* **Expected AI Behavior:** The AI should explicitly flag the traditional soy sauce (which contains wheat) and substitute it with Tamari, while recognizing that chicken, rice, and broccoli are naturally safe.

### Demo 2: The Dairy Mix-Up
* **Condition / Name:** Severe Lactose Intolerance
* **Target Allergens:** Dairy, Milk, Cheese, Butter
* **Strictness Rules:** No dairy products whatsoever.
* **Pantry Input:** `Pasta, ground beef, tomato sauce, mayonnaise, parmesan cheese`
* **Expected AI Behavior:** The AI must omit or substitute the parmesan cheese. Crucially, because of our strict negative constraints, it should *recognize that mayonnaise is safe* (eggs/oil) and not mistakenly classify it as dairy.

### Demo 3: Tree Nut & Peanut Guardrails
* **Condition / Name:** Nut Allergy
* **Target Allergens:** Peanuts, Tree Nuts, Almonds, Cashews
* **Strictness Rules:** Trace amounts are dangerous.
* **Pantry Input:** `Rolled oats, almond milk, strawberries, honey, chia seeds`
* **Expected AI Behavior:** The AI will flag the almond milk as dangerous and substitute it with oat milk, water, or another safe alternative to make a safe oatmeal dish.

---

## 🛠️ How to Run Locally

1. **Start the AI Server:**
   Ensure you have [Ollama](https://ollama.com/) installed and running on your machine.
   ```bash
   ollama pull gemma2:2b
   ollama run gemma2:2b
   ```

2. **Start the Application:**
   Open a new terminal and run:
   ```bash
   npm install
   npm run dev
   ```
   Then navigate to `http://localhost:3000` in your browser.
