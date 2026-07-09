"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Flame, Heart, Utensils, Egg, Fish, Leaf, Soup } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface PopularRecipe {
  title: string;
  loves: number;
  url: string;
  sourcefile: string;
  ingredients: string;
  steps: string;
  similarity_score: number;
  final_score: number;
  image_url?: string;
}

interface TodaysTasksProps {
  onOpenRecipe?: (recipe: PopularRecipe) => void;
}

const categoryConfig: Record<
  string,
  { label: string; icon: LucideIcon; colorClass: string; iconBg: string; iconColor: string }
> = {
  ayam: {
    label: "Ayam",
    icon: Utensils,
    colorClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
    iconBg: "bg-blue-100 dark:bg-blue-900/50",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  sapi: {
    label: "Sapi",
    icon: Flame,
    colorClass: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    iconBg: "bg-red-100 dark:bg-red-900/50",
    iconColor: "text-red-600 dark:text-red-400",
  },
  kambing: {
    label: "Kambing",
    icon: Flame,
    colorClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  ikan: {
    label: "Ikan",
    icon: Fish,
    colorClass: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800",
    iconBg: "bg-cyan-100 dark:bg-cyan-900/50",
    iconColor: "text-cyan-600 dark:text-cyan-400",
  },
  udang: {
    label: "Udang",
    icon: Fish,
    colorClass: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800",
    iconBg: "bg-pink-100 dark:bg-pink-900/50",
    iconColor: "text-pink-600 dark:text-pink-400",
  },
  telur: {
    label: "Telur",
    icon: Egg,
    colorClass: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
    iconBg: "bg-yellow-100 dark:bg-yellow-900/50",
    iconColor: "text-yellow-600 dark:text-yellow-400",
  },
  tahu: {
    label: "Tahu",
    icon: Leaf,
    colorClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  tempe: {
    label: "Tempe",
    icon: Leaf,
    colorClass: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800",
    iconBg: "bg-teal-100 dark:bg-teal-900/50",
    iconColor: "text-teal-600 dark:text-teal-400",
  },
  lainnya: {
    label: "Lainnya",
    icon: Soup,
    colorClass: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800",
    iconBg: "bg-slate-100 dark:bg-slate-900/50",
    iconColor: "text-slate-600 dark:text-slate-400",
  },
};

const getCleanCatKey = (sourcefile: string) => {
  const source = sourcefile || "dataset-lainnya.csv";
  return source.replace("dataset-", "").replace(".csv", "");
};

export function TodaysTasks({ onOpenRecipe }: TodaysTasksProps) {
  const [recipes, setRecipes] = useState<PopularRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await fetch("http://localhost:5000/api/stats");
        if (response.ok) {
          const data = await response.json();
          if (data.top_popular) {
            setRecipes(data.top_popular);
          }
        }
      } catch (err) {
        console.error("Error loading popular recipes:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden w-full flex flex-col justify-between">
      <div>
        {/* Main Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/10">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500">
              <Flame className="size-4.5 fill-orange-500/20" />
            </div>
            Resep Terpopuler (Top 5)
          </h3>
        </div>

        {/* Visual Recipe Cards Grid (Full-Width Row) */}
        <div className="p-5">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Memuat resep terpopuler...
            </div>
          ) : recipes.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Tidak ada resep populer ditemukan.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {recipes.map((recipe, index) => {
                const catKey = getCleanCatKey(recipe.sourcefile);
                const config = categoryConfig[catKey] || categoryConfig.lainnya;
                const Icon = config.icon;

                // Get ranking styling
                let rankBg = "bg-slate-500 text-white";
                if (index === 0) rankBg = "bg-amber-500 text-white shadow-xs font-black border-amber-400";
                if (index === 1) rankBg = "bg-slate-400 text-white shadow-xs font-black border-slate-300";
                if (index === 2) rankBg = "bg-amber-700 text-white shadow-xs font-black border-amber-600";

                return (
                  <Card
                    key={index}
                    className="overflow-hidden border border-border bg-card hover:bg-muted/40 transition-colors cursor-pointer flex flex-col group p-3 rounded-xl"
                    onClick={() => {
                      if (onOpenRecipe) {
                        onOpenRecipe(recipe);
                      }
                    }}
                  >
                    {/* Visual Scraped Food Image with ranking overlay */}
                    <div className="w-full aspect-4/3 rounded-lg overflow-hidden bg-muted relative border border-border shrink-0">
                      {recipe.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={recipe.image_url}
                          alt={recipe.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/40">
                          <Icon className={`size-7 ${config.iconColor} mb-1`} />
                        </div>
                      )}
                      
                      {/* Rank Overlay Badge */}
                      <div className={`absolute top-2 left-2 flex size-6 items-center justify-center rounded-full text-xs font-bold border ${rankBg}`}>
                        {index + 1}
                      </div>
                    </div>

                    {/* Details Section */}
                    <div className="flex flex-col flex-1 pt-2 justify-between gap-3">
                      <div className="space-y-1">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors line-clamp-2">
                          {recipe.title}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-2 shrink-0">
                        {/* Category Badge */}
                        <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider border ${config.colorClass}`}>
                          {config.label}
                        </span>
                        
                        {/* Loves Stats */}
                        <div className="flex items-center gap-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                          <Heart className="size-3.5 fill-rose-500 text-rose-500" />
                          <span className="tabular-nums font-bold text-xs">{recipe.loves}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="px-5 py-3 bg-muted/5 border-t border-border text-[11px] text-muted-foreground text-center font-medium">
        Berdasarkan jumlah suka terbanyak
      </div>
    </div>
  );
}
