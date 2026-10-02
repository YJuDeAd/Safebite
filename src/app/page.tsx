"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Profile {
  name: string;
  allergies: string[];
  strictness: string;
}

export default function Home() {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Form states
  const [draftName, setDraftName] = useState("");
  const [draftAllergies, setDraftAllergies] = useState("");
  const [draftStrictness, setDraftStrictness] = useState("Standard");

  // App states
  const [pantry, setPantry] = useState("");
  const [rawAiResponse, setRawAiResponse] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Multi-recipe save states
  const [savingRecipes, setSavingRecipes] = useState<Set<string>>(new Set());
  const [savedRecipes, setSavedRecipes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/profile")
        .then((res) => res.json())
        .then((data) => {
          if (data.profile) {
            setProfile(data.profile);
            setDraftName(data.profile.name);
            setDraftAllergies(data.profile.allergies.join(", "));
            setDraftStrictness(data.profile.strictness);
          } else {
            setIsEditing(true);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoaded(true));
    } else if (status === "unauthenticated") {
      setIsLoaded(true);
    }
  }, [status]);

  const saveProfile = async () => {
    const newProfile = {
      name: draftName.trim() || "User",
      allergies: draftAllergies.split(",").map(a => a.trim()).filter(Boolean),
      strictness: draftStrictness.trim() || "Standard",
    };
    
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProfile)
      });
      if (res.ok) {
        setProfile(newProfile);
        setIsEditing(false);
        setRawAiResponse(""); 
      }
    } catch (e) {
      console.error("Failed to save profile", e);
    }
  };

  const generateRecipe = async () => {
    if (!pantry.trim() || !profile) return;
    setLoading(true);
    setRawAiResponse("");
    setSavedRecipes(new Set()); // Reset saved states for new generations
    
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pantry, profile }),
      });
      
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: Ensure the local AI server is running.`);
      }

      const data = await res.json();
      if (data.error) {
        setRawAiResponse(`Error: ${data.error}`);
      } else {
        setRawAiResponse(data.recipe);
      }
    } catch (err) {
      if (err instanceof Error) {
        setRawAiResponse(err.message);
      } else {
        setRawAiResponse("Failed to fetch recipe.");
      }
    } finally {
      setLoading(false);
    }
  };

  const saveRecipeToCookbook = async (title: string, content: string) => {
    setSavingRecipes(prev => new Set(prev).add(title));
    try {
      const res = await fetch("/api/cookbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, pantry })
      });
      
      if (res.ok) {
        setSavedRecipes(prev => new Set(prev).add(title));
      }
    } catch (e) {
      console.error("Failed to save recipe", e);
    } finally {
      setSavingRecipes(prev => {
        const next = new Set(prev);
        next.delete(title);
        return next;
      });
    }
  };

  // Helper to split the LLM response into safety check and distinct recipes
  const parseResponse = (text: string) => {
    if (!text) return { safetyCheck: "", recipes: [] };
    
    // Split by Markdown headings (H1, H2, or H3) at the start of a line
    const chunks = text.split(/(?=^#+\s)/m);
    
    if (chunks.length <= 1) {
      // Failed to split properly, return as one big chunk
      return { safetyCheck: chunks[0], recipes: [] };
    }
    
    const safetyCheck = chunks[0];
    const recipes = chunks.slice(1).map(chunk => {
      const titleMatch = chunk.match(/^#+\s*(.*)/);
      const title = titleMatch ? titleMatch[1].trim() : `Recipe - ${new Date().toLocaleDateString()}`;
      return { title, content: chunk.trim() };
    });
    
    return { safetyCheck, recipes };
  };

  if (!isLoaded || status === "loading") {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading SafeBite...</div>;
  }

  const { safetyCheck, recipes } = parseResponse(rawAiResponse);

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans text-gray-900">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header / Nav */}
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-extrabold text-indigo-600 tracking-tight">SafeBite</h1>
            <p className="text-xs text-gray-500">Local AI Allergy Planner</p>
          </div>
          
          {status === "authenticated" && (
            <div className="flex items-center gap-4">
              <a href="/cookbook" className="text-sm font-semibold text-indigo-600 hover:underline">📚 My Cookbook</a>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 hidden sm:inline">{session.user?.email}</span>
                <button onClick={() => signOut()} className="text-xs bg-gray-200 hover:bg-gray-300 py-1 px-3 rounded-lg transition-colors">Sign Out</button>
              </div>
            </div>
          )}
        </div>

        {/* Unauthenticated Landing State */}
        {status === "unauthenticated" && (
           <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100 text-center space-y-6">
             <div className="text-6xl mb-4">🍽️</div>
             <h2 className="text-3xl font-bold text-gray-800">Welcome to SafeBite</h2>
             <p className="text-gray-500 max-w-md mx-auto">
               Generate safe, allergy-friendly recipes using local AI and securely sync your cookbook across devices.
             </p>
             <button
               onClick={() => signIn("google")}
               className="py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md"
             >
               Sign in with Google
             </button>
           </div>
        )}

        {/* Authenticated Flow */}
        {status === "authenticated" && (isEditing || !profile) && (
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Your Dietary Profile</h2>
            <p className="text-gray-500 text-sm">Tell SafeBite about your specific restrictions. This data will be securely synced with your account.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Condition / Name</label>
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="e.g. Celiac & Peanut Allergy"
                  className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Target Allergens (comma separated)</label>
                <input
                  type="text"
                  value={draftAllergies}
                  onChange={(e) => setDraftAllergies(e.target.value)}
                  placeholder="e.g. Gluten, Wheat, Peanuts, Tree Nuts"
                  className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Strictness Rules</label>
                <textarea
                  value={draftStrictness}
                  onChange={(e) => setDraftStrictness(e.target.value)}
                  placeholder="e.g. Strict zero cross-contamination. Trace amounts are dangerous."
                  className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-[80px]"
                />
              </div>
              
              <button
                onClick={saveProfile}
                className="w-full py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md"
              >
                Save Profile
              </button>
            </div>
          </div>
        )}

        {status === "authenticated" && !isEditing && profile && (
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                  <span>🍽️</span> {profile.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  <strong>Allergens:</strong> {profile.allergies.join(", ") || "None"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  <strong>Strictness:</strong> {profile.strictness}
                </p>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 font-semibold py-2 px-4 rounded-lg transition-colors text-sm whitespace-nowrap"
              >
                Edit Profile
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">What's in the pantry?</label>
                <textarea
                  value={pantry}
                  onChange={(e) => setPantry(e.target.value)}
                  placeholder="e.g. Chicken breast, rice, soy sauce, broccoli..."
                  className="w-full p-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-[120px]"
                ></textarea>
              </div>

              <button
                onClick={generateRecipe}
                disabled={loading || !pantry.trim()}
                className="w-full py-4 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center"
              >
                {loading ? "Synthesizing Safe Recipes..." : "Generate Recipes"}
              </button>
            </div>
          </div>
        )}

        {/* Results Block */}
        {rawAiResponse && !isEditing && (
          <div className="space-y-6">
            
            {/* Render Safety Check Block distinctively */}
            {safetyCheck && (
              <div className="bg-amber-50 p-6 md:p-8 rounded-2xl shadow-sm border border-amber-100 prose prose-amber max-w-none">
                <h3 className="text-amber-800 mt-0">Allergen Safety Check</h3>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {safetyCheck.replace(/Allergen Safety Check:?/i, '')}
                </ReactMarkdown>
              </div>
            )}

            {/* Render individual recipe cards */}
            {recipes.length > 0 ? (
              recipes.map((rec, idx) => (
                <div key={idx} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                  <div className="prose prose-indigo max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {rec.content}
                    </ReactMarkdown>
                  </div>
                  
                  <div className="flex justify-end pt-4 border-t border-gray-50">
                    <button
                      onClick={() => saveRecipeToCookbook(rec.title, rec.content)}
                      disabled={savingRecipes.has(rec.title) || savedRecipes.has(rec.title)}
                      className={`py-2 px-4 rounded-xl font-bold transition-all shadow-md flex items-center justify-center text-sm ${
                        savedRecipes.has(rec.title) ? 'bg-green-500 text-white cursor-default' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {savedRecipes.has(rec.title) ? "✅ Saved" : savingRecipes.has(rec.title) ? "Saving..." : "💾 Save This Recipe"}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              /* Fallback if the LLM output didn't format headings correctly */
              <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div className="prose prose-indigo max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {rawAiResponse}
                  </ReactMarkdown>
                </div>
                <div className="flex justify-end pt-4 border-t border-gray-50">
                  <button
                    onClick={() => saveRecipeToCookbook("My Safe Recipe", rawAiResponse)}
                    disabled={savingRecipes.has("My Safe Recipe") || savedRecipes.has("My Safe Recipe")}
                    className={`py-2 px-4 rounded-xl font-bold transition-all shadow-md flex items-center justify-center text-sm ${
                      savedRecipes.has("My Safe Recipe") ? 'bg-green-500 text-white cursor-default' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {savedRecipes.has("My Safe Recipe") ? "✅ Saved" : savingRecipes.has("My Safe Recipe") ? "Saving..." : "💾 Save Recipe"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
