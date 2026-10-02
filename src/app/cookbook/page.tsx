"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading Cookbook...</div>;
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center space-y-4">
        <h2 className="text-2xl font-bold">You must be logged in to view your Cookbook.</h2>
        <a href="/" className="text-indigo-600 hover:underline">Go back home</a>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans text-gray-900">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-extrabold text-indigo-600 tracking-tight">📚 My Cookbook</h1>
            <p className="text-sm text-gray-500">Your safely generated recipes</p>
          </div>
          <a href="/" className="text-sm font-semibold text-gray-600 hover:text-indigo-600 transition-colors">← Back to Planner</a>
        </div>

        {recipes.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center text-gray-500">
            You haven't saved any recipes yet!
          </div>
        ) : (
          <div className="space-y-8">
            {recipes.map(recipe => (
              <div key={recipe._id} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{recipe.title}</h2>
                    <p className="text-xs text-gray-400 mt-1">Saved on {new Date(recipe.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="bg-indigo-50 px-3 py-1 rounded-full text-xs font-semibold text-indigo-600">
                    Pantry: {recipe.pantry}
                  </div>
                </div>
                <div className="prose prose-indigo max-w-none pt-2">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {recipe.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}
