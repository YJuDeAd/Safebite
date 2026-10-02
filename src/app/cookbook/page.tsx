"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BookOpen, ArrowLeft, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface Recipe {
  _id: string;
  title: string;
  content: string;
  pantry: string;
  createdAt: string;
}

export default function Cookbook() {
  const { data: session, status } = useSession();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/cookbook")
        .then(res => res.json())
        .then(data => {
          if (data.recipes) setRecipes(data.recipes);
        })
        .finally(() => setLoading(false));
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex flex-col gap-4 items-center justify-center font-[family-name:var(--font-space-grotesk)]">
        <Loader2 className="w-10 h-10 animate-spin text-[#ff4d29]" />
        <span className="text-xl font-bold tracking-tight">Fetching Cookbook...</span>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-8 font-[family-name:var(--font-space-grotesk)]">
        <h2 className="text-4xl md:text-5xl font-black tracking-tighter">Authentication Required</h2>
        <a href="/" className="py-4 px-8 rounded-full bg-[#ff4d29] text-white font-bold text-xl transition-transform hover:-translate-y-1">
          Return to Planner
        </a>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8 lg:p-12 transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Editorial Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pb-6 border-b-2 border-[#e5e1da] dark:border-[#2a2a2a]">
          <div className="flex items-center gap-4">
            <div className="bg-[#3b2444] dark:bg-white text-white dark:text-[#111] p-4 rounded-3xl">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black font-[family-name:var(--font-space-grotesk)] tracking-tighter text-[#3b2444] dark:text-[#f4f4f4] leading-none">The Cookbook</h1>
              <p className="text-lg font-medium text-[#ff4d29] mt-2">Your curated, zero-risk recipes</p>
            </div>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <a href="/" className="flex items-center gap-2 text-sm font-bold bg-[#f2ede6] hover:bg-[#e8e1d7] dark:bg-[#2a2a2a] dark:hover:bg-[#333] text-[#3b2444] dark:text-[#f4f4f4] py-3 px-5 rounded-full transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Planner
            </a>
            <ThemeToggle />
          </div>
        </header>

        {recipes.length === 0 ? (
          <div className="bg-[#f2ede6] dark:bg-[#222] p-16 rounded-[3rem] text-center space-y-6">
            <h2 className="text-3xl font-black font-[family-name:var(--font-space-grotesk)] tracking-tight text-[#3b2444] dark:text-[#f4f4f4]">No recipes saved yet.</h2>
            <p className="text-lg opacity-70">Generate some safe meals and add them to your collection.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 items-start">
            {recipes.map((recipe, i) => (
              <article key={recipe._id} className="bg-white dark:bg-[#222] p-8 md:p-10 rounded-[2rem] space-y-6">
                <div className="space-y-4">
                  <h2 className="text-2xl font-black font-[family-name:var(--font-space-grotesk)] leading-tight">{recipe.title}</h2>
                  <div className="flex flex-wrap gap-4 items-center">
                    <span className="text-sm font-bold uppercase tracking-widest text-[#ff4d29]">
                      {new Date(recipe.createdAt).toLocaleDateString()}
                    </span>
                    <span className="bg-[#f2ede6] dark:bg-[#333] px-3 py-1 rounded-full text-xs font-bold text-[#3b2444] dark:text-[#ccc]">
                      Inventory: {recipe.pantry.substring(0, 30)}{recipe.pantry.length > 30 ? "..." : ""}
                    </span>
                  </div>
                </div>
                
                <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-[family-name:var(--font-space-grotesk)] prose-headings:font-black prose-a:text-[#ff4d29]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {recipe.content.replace(/^#+\s.*?\n/m, '') /* Strip the title from markdown since we render it above */}
                  </ReactMarkdown>
                </div>
              </article>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}
