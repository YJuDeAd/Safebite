"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Utensils, BookOpen, ShieldCheck, User, Sparkles, Loader2, Check, Save, LogOut, Volume2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

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
  
  const [draftName, setDraftName] = useState("");
  const [draftAllergies, setDraftAllergies] = useState("");
  const [draftStrictness, setDraftStrictness] = useState("Standard");

  const [pantry, setPantry] = useState("");
  const [rawAiResponse, setRawAiResponse] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [savingRecipes, setSavingRecipes] = useState<Set<string>>(new Set());
  const [savedRecipes, setSavedRecipes] = useState<Set<string>>(new Set());
  
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/profile")
        .then(async (res) => {
          if (!res.ok) {
            console.error("Profile API returned an error:", res.status, await res.text().catch(() => ""));
            return null;
          }
          return res.json();
        })
        .then((data) => {
          if (data && data.profile) {
            setProfile(data.profile);
            setDraftName(data.profile.name);
            setDraftAllergies(data.profile.allergies.join(", "));
            setDraftStrictness(data.profile.strictness);
          } else {
            setIsEditing(true);
          }
        })
        .catch(err => {
          console.error("Failed to load profile:", err);
          setIsEditing(true);
        })
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
    setSavedRecipes(new Set()); 
    
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pantry, profile }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      if (data.error) setRawAiResponse(`Error: ${data.error}`);
      else setRawAiResponse(data.recipe);
    } catch (err) {
      if (err instanceof Error) setRawAiResponse(err.message);
      else setRawAiResponse("Failed to fetch recipe.");
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
      if (res.ok) setSavedRecipes(prev => new Set(prev).add(title));
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

  const parseResponse = (text: string) => {
    if (!text) return { safetyCheck: "", recipes: [] };
    
    // Clean up indentations that cause markdown code blocks
    const cleanText = text.split('\n').map(line => line.trimStart()).join('\n');
    
    // Try splitting by standard ## or # headers
    let chunks = cleanText.split(/(?=^##?\s+)/m);
    
    if (chunks.length <= 1) {
      // Fallback: look for bold "Recipe" or just "Ingredients:"
      const parts = cleanText.split(/(?=\n\*\*Recipe|\nIngredients:)/im);
      if (parts.length > 1) {
        chunks = [parts[0], parts.slice(1).join('\n')];
      }
    }

    if (chunks.length <= 1) {
      return { safetyCheck: chunks[0], recipes: [] };
    }
    
    const safetyCheck = chunks[0];
    const recipes = chunks.slice(1).map((chunk, i) => {
      const titleMatch = chunk.match(/^##?\s+(.*)/) || chunk.match(/^\*\*(.*?)\*\*/);
      let title = titleMatch ? (titleMatch[1] || titleMatch[2]).trim() : `Generated Recipe ${i+1}`;
      if (title.toLowerCase().includes("ingredient")) title = `Recipe ${i+1}`;
      return { title, content: chunk.trim() };
    });
    
    return { safetyCheck, recipes };
  };

  const playRecipeAudio = async (title: string, content: string) => {
    try {
      setAudioLoading(title);
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content.substring(0, 4999) }) // ElevenLabs limits text length
      });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      setPlayingAudio(title);
      audio.onended = () => setPlayingAudio(null);
      await audio.play();
    } catch (error) {
      console.error(error);
      alert("Failed to play audio. Check API key and quota.");
      setPlayingAudio(null);
    } finally {
      setAudioLoading(null);
    }
  };

  if (!isLoaded || status === "loading") {
    return (
      <div className="min-h-screen flex flex-col gap-4 items-center justify-center font-[family-name:var(--font-space-grotesk)]">
        <Loader2 className="w-10 h-10 animate-spin text-[#ff4d29]" />
        <span className="text-xl font-bold tracking-tight">Waking up the kitchen...</span>
      </div>
    );
  }

  const { safetyCheck, recipes } = parseResponse(rawAiResponse);

  return (
    <main className="min-h-screen p-4 md:p-8 lg:p-12 transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Editorial Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pb-6 border-b-2 border-[#e5e1da] dark:border-[#2a2a2a]">
          <div>
            <h1 className="text-4xl md:text-6xl font-black font-[family-name:var(--font-space-grotesk)] tracking-tighter text-[#3b2444] dark:text-[#f4f4f4]">SafeBite.</h1>
            <p className="text-lg font-medium text-[#ff4d29] mt-2">Zero-Compromise Allergy Planning</p>
          </div>
          
          <div className="flex items-center gap-4 w-full sm:w-auto">
            {status === "authenticated" && (
              <div className="flex items-center gap-4">
                <a href="/cookbook" className="flex items-center gap-2 text-sm font-bold bg-[#f2ede6] hover:bg-[#e8e1d7] dark:bg-[#2a2a2a] dark:hover:bg-[#333] text-[#3b2444] dark:text-[#f4f4f4] py-3 px-5 rounded-full transition-colors">
                  <BookOpen className="w-4 h-4" /> My Cookbook
                </a>
                <button onClick={() => signOut()} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#ff4d29] transition-colors">
                  <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            )}
            <ThemeToggle />
          </div>
        </header>

        {/* Unauthenticated Landing */}
        {status === "unauthenticated" && (
           <div className="grid md:grid-cols-2 gap-8 items-center mt-12">
             <div className="space-y-8 pr-0 md:pr-12">
               <h2 className="text-5xl md:text-7xl font-black font-[family-name:var(--font-space-grotesk)] leading-[0.95] tracking-tighter">
                 Eat well. <br/>
                 <span className="text-[#ff4d29]">Stay safe.</span>
               </h2>
               <p className="text-xl text-[#5a5a5a] dark:text-[#a1a1a1] leading-relaxed">
                 An uncompromising local AI that cross-references every ingredient in your pantry against your specific medical profile to generate zero-risk, high-flavor recipes.
               </p>
               <button
                 onClick={() => signIn("google")}
                 className="py-5 px-10 rounded-full bg-[#3b2444] dark:bg-[#f4f4f4] text-white dark:text-[#111] font-bold text-xl transition-transform hover:-translate-y-1 flex items-center gap-3"
               >
                 <User className="w-6 h-6" /> Authenticate
               </button>
             </div>
             <div className="bg-[#f2ede6] dark:bg-[#2a2a2a] p-12 rounded-[3rem] aspect-square flex items-center justify-center">
               <Utensils className="w-32 h-32 text-[#ff4d29] opacity-80" />
             </div>
           </div>
        )}

        {/* Profile Editor */}
        {status === "authenticated" && (isEditing || !profile) && (
          <div className="bg-[#f2ede6] dark:bg-[#222] p-8 md:p-12 rounded-[2rem] space-y-10">
            <div>
              <h2 className="text-4xl font-black font-[family-name:var(--font-space-grotesk)] tracking-tight">The Medical Brief</h2>
              <p className="text-lg mt-2 opacity-70">Strict parameters for the AI generation engine.</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="block text-sm font-bold uppercase tracking-widest text-[#ff4d29]">Condition Profile</label>
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="e.g. Celiac & Peanut Allergy"
                  className="w-full p-5 rounded-2xl bg-white dark:bg-[#111] font-medium text-lg outline-none focus:ring-4 ring-[#ff4d29]/20 transition-all border-none"
                />
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-bold uppercase tracking-widest text-[#ff4d29]">Target Allergens</label>
                <input
                  type="text"
                  value={draftAllergies}
                  onChange={(e) => setDraftAllergies(e.target.value)}
                  placeholder="e.g. Gluten, Wheat, Peanuts"
                  className="w-full p-5 rounded-2xl bg-white dark:bg-[#111] font-medium text-lg outline-none focus:ring-4 ring-[#ff4d29]/20 transition-all border-none"
                />
              </div>
              <div className="md:col-span-2 space-y-3">
                <label className="block text-sm font-bold uppercase tracking-widest text-[#ff4d29]">Absolute Constraints</label>
                <textarea
                  value={draftStrictness}
                  onChange={(e) => setDraftStrictness(e.target.value)}
                  placeholder="e.g. Strict zero cross-contamination."
                  className="w-full p-5 rounded-2xl bg-white dark:bg-[#111] font-medium text-lg outline-none focus:ring-4 ring-[#ff4d29]/20 transition-all border-none min-h-[120px]"
                />
              </div>
            </div>
            <button
              onClick={saveProfile}
              className="py-5 px-10 rounded-full bg-[#ff4d29] text-white font-bold text-xl transition-transform hover:-translate-y-1"
            >
              Lock Parameters
            </button>
          </div>
        )}

        {/* Dashboard Flow */}
        {status === "authenticated" && !isEditing && profile && (
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Profile Card */}
            <div className="lg:col-span-4 bg-[#3b2444] dark:bg-[#222] text-[#f4f4f4] p-8 rounded-[2rem] space-y-8 sticky top-8">
              <div className="flex justify-between items-start">
                <h3 className="font-black font-[family-name:var(--font-space-grotesk)] text-3xl">{profile.name}</h3>
                <button onClick={() => setIsEditing(true)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                  <User className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#ff4d29] mb-2">Exclusions</h4>
                  <p className="font-medium text-lg">{profile.allergies.join(", ") || "None listed"}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#ff4d29] mb-2">Tolerance</h4>
                  <p className="opacity-80 leading-relaxed">{profile.strictness}</p>
                </div>
              </div>
            </div>

            {/* Right Column: Generation Engine */}
            <div className="lg:col-span-8 space-y-8">
              <div className="bg-[#f2ede6] dark:bg-[#1e1e1e] p-8 md:p-10 rounded-[2rem] space-y-6">
                <div>
                  <label className="block text-3xl font-black font-[family-name:var(--font-space-grotesk)] mb-2">Inventory Input</label>
                  <p className="opacity-70 font-medium">List available ingredients. We'll handle the safety math.</p>
                </div>
                <textarea
                  value={pantry}
                  onChange={(e) => setPantry(e.target.value)}
                  placeholder="e.g. Chicken breast, rice, soy sauce, broccoli..."
                  className="w-full p-6 rounded-2xl bg-white dark:bg-[#111] font-medium text-lg outline-none focus:ring-4 ring-[#ff4d29]/20 transition-all border-none min-h-[160px] resize-y"
                ></textarea>

                <button
                  onClick={generateRecipe}
                  disabled={loading || !pantry.trim()}
                  className="w-full py-6 rounded-full bg-[#ff4d29] text-white font-black font-[family-name:var(--font-space-grotesk)] text-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-transform hover:-translate-y-1 flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <><Loader2 className="w-8 h-8 animate-spin" /> Synthesizing...</>
                  ) : (
                    <><Sparkles className="w-8 h-8" /> Generate Menu</>
                  )}
                </button>
              </div>

              {/* Results */}
              {rawAiResponse && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                  
                  {safetyCheck && (
                    <div className="bg-amber-100 dark:bg-[#3d2a1d] p-8 md:p-10 rounded-[2rem] prose prose-lg prose-amber dark:prose-invert max-w-none">
                      <h3 className="text-amber-900 dark:text-amber-500 mt-0 font-black font-[family-name:var(--font-space-grotesk)] text-2xl flex items-center gap-3">
                        <ShieldCheck className="w-8 h-8" /> Safety Audit
                      </h3>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {safetyCheck.replace(/Allergen Safety Check:?/i, '')}
                      </ReactMarkdown>
                    </div>
                  )}

                  {recipes.length > 0 ? (
                    <div className="space-y-8">
                      {recipes.map((rec, idx) => (
                        <div key={idx} className="bg-white dark:bg-[#222] p-8 md:p-10 rounded-[2rem] space-y-8">
                          <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-[family-name:var(--font-space-grotesk)] prose-headings:font-black prose-a:text-[#ff4d29]">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {rec.content}
                            </ReactMarkdown>
                          </div>
                          
                          <div className="pt-6 flex justify-end gap-4">
                            <button
                              onClick={() => playRecipeAudio(rec.title, rec.content)}
                              disabled={audioLoading === rec.title || playingAudio === rec.title}
                              className="py-4 px-8 rounded-full font-bold transition-transform flex items-center gap-3 text-lg bg-[#e8e1d7] hover:bg-[#d8d1c7] dark:bg-[#444] dark:hover:bg-[#555] text-[#3b2444] dark:text-white hover:-translate-y-1 disabled:opacity-50"
                            >
                              {audioLoading === rec.title ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Loading Audio</>
                              ) : playingAudio === rec.title ? (
                                <><Volume2 className="w-5 h-5 animate-pulse text-[#ff4d29]" /> Playing...</>
                              ) : (
                                <><Volume2 className="w-5 h-5" /> Listen</>
                              )}
                            </button>
                            <button
                              onClick={() => saveRecipeToCookbook(rec.title, rec.content)}
                              disabled={savingRecipes.has(rec.title) || savedRecipes.has(rec.title)}
                              className={`py-4 px-8 rounded-full font-bold transition-transform flex items-center gap-3 text-lg ${
                                savedRecipes.has(rec.title) 
                                  ? 'bg-[#1d3c34] text-white cursor-default' 
                                  : 'bg-[#f2ede6] hover:bg-[#e8e1d7] dark:bg-[#333] dark:hover:bg-[#444] text-[#3b2444] dark:text-white hover:-translate-y-1'
                              }`}
                            >
                              {savedRecipes.has(rec.title) ? (
                                <><Check className="w-5 h-5" /> Saved</>
                              ) : savingRecipes.has(rec.title) ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Saving</>
                              ) : (
                                <><Save className="w-5 h-5" /> Add to Cookbook</>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-[#222] p-8 md:p-10 rounded-[2rem]">
                      <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-[family-name:var(--font-space-grotesk)] prose-headings:font-black">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {rawAiResponse}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
