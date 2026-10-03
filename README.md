# SafeBite

A strict, zero-hallucination allergen-safe recipe generator. 

## Hacktoberfest 2026

This project was built for the DevRelay Hacktoberfest challenge. We used four sponsor technologies to build the final production MVP:

* **Microsoft Azure:** We provisioned a custom `Standard_D2as_v4` Virtual Machine to host our own independent AI backend.
* **Gemma:** We deployed `gemma2:2b` via Ollama on the Azure server. It handles the strict zero-shot recipe generation without the rate limits of 3rd-party APIs.
* **ElevenLabs:** We wired up the text-to-speech API so users can click a button and listen to the recipes out loud.
* **MongoDB Atlas:** Powers the database to securely store user allergen profiles and their personal Cookbook of saved recipes.
* **Render:** We deployed the Next.js frontend to the live web.

## The Architecture

Off-the-shelf APIs failed us. When dealing with severe food allergies like Celiac disease, hallucinating an ingredient is a critical failure. Early tests with 3rd-party hosted endpoints returned constant 500 errors and unpredictable markdown formatting. 

We pivoted to hosting our own infrastructure. The Next.js frontend sends strict prompts directly to our Azure Virtual Machine. That server runs Ollama with the `gemma2:2b` model. Because the 2B model is small enough to run fast on a CPU instance, we get lightning-fast inference without paying for a GPU. 

We also built a custom fallback parser in the Next.js UI. If the smaller 2B model forgets to format its markdown headers properly, the frontend catches the mistake and renders the recipe card cleanly anyway.

## Local Setup

To run this project locally, you need your own Azure VM running Ollama, and an ElevenLabs API key.

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Create a `.env.local` file in the root directory and add your keys:
```env
# Your Azure Virtual Machine IP address and the open Ollama port
OLLAMA_HOST="http://<YOUR_AZURE_IP>:11434"

# ElevenLabs API Key for text-to-speech
ELEVENLABS_API_KEY="your_api_key_here"

# A random string for local NextAuth testing
NEXTAUTH_SECRET="secret"
```

3. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.
