"use client";

import { useState, useEffect } from "react";
import { Utensils, Heart, Layers, Bookmark } from "lucide-react";

export function StatsCards() {
  const [stats, setStats] = useState<{ total_recipes: number; avg_loves: number } | null>(null);
  const [favoriteCount, setFavoriteCount] = useState(0);

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await fetch("http://localhost:5000/api/stats");
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Error loading stats for cards:", err);
      }
    }
    loadStats();

    // Load favorites from local storage
    const saved = localStorage.getItem("favoriteRecipes");
    if (saved) {
      try {
        const favs = JSON.parse(saved);
        if (Array.isArray(favs)) {
          setTimeout(() => {
            setFavoriteCount(favs.length);
          }, 0);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const cardData = [
    {
      title: "Total Resep Bersih",
      value: stats ? stats.total_recipes.toLocaleString("id-ID") : "14.689",
      description: "Jumlah resep dalam database",
      icon: Utensils,
    },
    {
      title: "Rata-rata Suka",
      value: stats ? stats.avg_loves.toFixed(2) : "9.95",
      description: "Tingkat interaksi rata-rata",
      icon: Heart,
    },
    {
      title: "Bahan Utama",
      value: "8 Jenis",
      description: "Ayam, sapi, telur, ikan, dll",
      icon: Layers,
    },
    {
      title: "Favorit Saya",
      value: String(favoriteCount),
      description: "Resep yang Anda bookmark",
      icon: Bookmark,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cardData.map((stat, index) => (
        <div
          key={index}
          className="rounded-xl border border-border bg-card p-4 shadow-xs"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{stat.title}</p>
              <p className="text-2xl font-semibold text-foreground tracking-tight">{stat.value}</p>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted shrink-0">
              <stat.icon className="size-5 text-muted-foreground" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
