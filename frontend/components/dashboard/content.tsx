"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Search,
  Utensils,
  BookOpen,
  Heart,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  ChevronDown,
  AlertCircle,
  Loader2,
  X,
  ShoppingBag,
  ListTodo,
  Tag,
  Sparkles,
  Database,
  Server,
  Laptop,
  FileText,
  Filter,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { TodaysTasks } from "@/components/dashboard/todays-tasks";
import { ProjectsTable } from "@/components/dashboard/projects-table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Recipe {
  title: string;
  url: string;
  ingredients: string;
  steps: string;
  loves: number;
  similarity_score: number;
  final_score: number;
  image_url?: string;
  sourcefile?: string;
}

interface StatsData {
  category_counts: Record<string, number>;
  top_popular: Array<{ title: string; loves: number; url: string }>;
  total_recipes: number;
  avg_loves: number;
}

interface DashboardContentProps {
  activeTab: string;
}

export function DashboardContent({ activeTab }: DashboardContentProps) {
  // Global favorites state (localStorage synced)
  const [favorites, setFavorites] = useState<Recipe[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("favoriteRecipes");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Error parsing saved favorites:", e);
        }
      }
    }
    return [];
  });
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const toggleFavorite = (recipe: Recipe, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = [...favorites];
    const index = updated.findIndex((r) => r.title === recipe.title);
    if (index >= 0) {
      updated.splice(index, 1);
    } else {
      updated.push(recipe);
    }
    setFavorites(updated);
    localStorage.setItem("favoriteRecipes", JSON.stringify(updated));
  };

  const isFavorite = (recipe: Recipe) => {
    return favorites.some((r) => r.title === recipe.title);
  };

  return (
    <div className="w-full h-full overflow-hidden flex flex-col">
      {activeTab === "home" ? (
        <HomeTab onOpenRecipe={setSelectedRecipe} toggleFavorite={toggleFavorite} isFavorite={isFavorite} />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {activeTab === "popular" && (
            <PopularTab onOpenRecipe={setSelectedRecipe} toggleFavorite={toggleFavorite} isFavorite={isFavorite} />
          )}
          {activeTab === "categories" && (
            <CategoriesTab onOpenRecipe={setSelectedRecipe} toggleFavorite={toggleFavorite} isFavorite={isFavorite} />
          )}
          {activeTab === "favorites" && (
            <FavoritesTab
              favorites={favorites}
              onOpenRecipe={setSelectedRecipe}
              toggleFavorite={toggleFavorite}
              isFavorite={isFavorite}
            />
          )}
          {activeTab === "stats" && <StatsTab />}
          {activeTab === "algorithm" && <AlgorithmTab />}
          {activeTab === "info" && <InfoTab />}
        </div>
      )}

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <RecipeDetailModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          isFav={isFavorite(selectedRecipe)}
          onToggleFav={() => toggleFavorite(selectedRecipe)}
          onSelectRecipe={setSelectedRecipe}
        />
      )}
    </div>
  );
}

// ==========================================================================
// 1. HOME TAB COMPONENT
// ==========================================================================
function HomeTab({
  onOpenRecipe,
  toggleFavorite,
  isFavorite,
}: {
  onOpenRecipe: (r: Recipe) => void;
  toggleFavorite: (r: Recipe) => void;
  isFavorite: (r: Recipe) => boolean;
}) {
  const [query, setQuery] = useState("");
  const [correctedQuery, setCorrectedQuery] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Autocomplete states
  const [allTitles, setAllTitles] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load all recipe titles for search bar autocomplete
  useEffect(() => {
    async function loadTitles() {
      try {
        const response = await fetch("http://localhost:5000/api/recipes");
        if (response.ok) {
          const titles = await response.json();
          setAllTitles(titles);
        }
      } catch (err) {
        console.error("Error loading recipe titles for autocomplete:", err);
      }
    }
    loadTitles();
  }, []);

  const handleInputChange = (val: string) => {
    setQuery(val);
    if (!val || val.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const cleanVal = val.toLowerCase();
    const filtered = allTitles
      .filter((title) => title && title.toLowerCase().includes(cleanVal))
      .slice(0, 8);
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  };

  const handleSearchWithQuery = async (searchVal: string, page = 1) => {
    if (!searchVal.trim()) return;
    setShowSuggestions(false);
    setLoading(true);
    setError("");
    setCurrentPage(page);

    try {
      const response = await fetch("http://localhost:5000/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchVal,
          page: page,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRecipes(data.results);
        setTotalPages(data.total_pages);
        setTotalResults(data.total_results);
        setCorrectedQuery(data.corrected_query || "");
      } else {
        const errData = await response.json();
        setError(errData.error || "Gagal mendapatkan rekomendasi.");
        setRecipes([]);
        setCorrectedQuery("");
      }
    } catch (err) {
      console.error(err);
      setError("Tidak dapat terhubung ke server backend Flask.");
      setRecipes([]);
      setCorrectedQuery("");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery("");
    setRecipes([]);
    setTotalPages(0);
    setTotalResults(0);
    setError("");
    setSuggestions([]);
    setShowSuggestions(false);
    setCorrectedQuery("");
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Fixed Search Bar Section (Opsi A) */}
      <div className="pb-4 pt-5 px-6 shrink-0 w-full">
        <div className="max-w-6xl w-full mx-auto">
          <div className="flex gap-2 items-center">
            {recipes.length > 0 && (
              <Button
                variant="outline"
                onClick={handleClear}
                className="rounded-lg h-11 px-4 gap-1.5 font-semibold text-xs border border-input shrink-0 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="size-4" />
                <span>Kembali</span>
              </Button>
            )}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => setShowSuggestions(suggestions.length > 0)}
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSearchWithQuery(query, 1)}
                placeholder="Cari ide resep berdasarkan bahan dapur (misal: ayam, wortel, santan)..."
                className="pl-10 pr-10 bg-card text-foreground border border-input rounded-lg h-11 w-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 shadow-sm"
              />
              {query && (
                <button
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}

              {/* Suggestions list */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-card border border-border rounded-xl shadow-lg z-30 max-h-72 overflow-y-auto divide-y divide-border/60 animate-in fade-in slide-in-from-top-1 duration-200">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onMouseDown={() => {
                        setQuery(suggestion);
                        setSuggestions([]);
                        setShowSuggestions(false);
                        handleSearchWithQuery(suggestion, 1);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-muted text-sm text-foreground flex items-center gap-2.5 transition-colors first:rounded-t-xl last:rounded-b-xl font-medium"
                    >
                      <Search className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{suggestion}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button
              onClick={() => handleSearchWithQuery(query, 1)}
              className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-6 h-11"
            >
              Cari Resep
            </Button>
          </div>
        </div>
      </div>

      {/* Scrollable Content Container */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 pt-3 space-y-6">
        {loading && (
          <div className="space-y-6 max-w-6xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div className="space-y-2">
                <Skeleton className="h-6 w-48 rounded-md" />
                <Skeleton className="h-4 w-72 rounded-md" />
              </div>
            </div>
            <div className="flex flex-col gap-4 w-full">
              {Array.from({ length: 8 }).map((_, i) => (
                <RecipeCardSkeleton key={i} />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-md mx-auto p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive flex items-center gap-3 text-sm">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tampilan Hasil Rekomendasi */}
        {!loading && recipes.length > 0 ? (
          <div className="space-y-6 max-w-6xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground flex flex-wrap items-baseline gap-2">
                  <span>Hasil Rekomendasi untuk &ldquo;{query}&rdquo;</span>
                  {correctedQuery && correctedQuery.toLowerCase() !== query.toLowerCase() && (
                    <span className="text-sm font-normal text-muted-foreground">
                      Maksud Anda:{" "}
                      <button
                        onClick={() => {
                          setQuery(correctedQuery);
                          handleSearchWithQuery(correctedQuery, 1);
                        }}
                        className="text-primary hover:underline italic font-medium"
                      >
                        &ldquo;{correctedQuery}&rdquo;
                      </button>
                    </span>
                  )}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Menampilkan {totalResults} resep paling cocok berdasarkan komposisi bahan masakan.
                </p>
              </div>
            </div>

            {/* Recipe List (Full Width) */}
            <div className="flex flex-col gap-4 w-full">
              {recipes.map((recipe) => (
                <RecipeCard
                  key={recipe.url}
                  recipe={recipe}
                  onClick={() => onOpenRecipe(recipe)}
                  isFav={isFavorite(recipe)}
                  onToggleFav={() => toggleFavorite(recipe)}
                  showSimilarity={true}
                />
              ))}
            </div>

            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => handleSearchWithQuery(query, p)}
            />
          </div>
        ) : (
          // Tampilan Dashboard (jika tidak mencari)
          !loading && (
            <div className="space-y-6 max-w-6xl mx-auto w-full pt-4 animate-in fade-in duration-500">
              <div className="space-y-6 w-full">
                {/* 1. Katalog Database (Lebar Penuh) */}
                <div className="w-full">
                  <ProjectsTable onOpenRecipe={onOpenRecipe} />
                </div>
                
                {/* 2. Resep Terpopuler dengan Gambar di Bawah (Lebar Penuh) */}
                <div className="w-full">
                  <TodaysTasks onOpenRecipe={onOpenRecipe} />
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ==========================================================================
// 2. POPULAR RECIPES TAB COMPONENT
// ==========================================================================
function PopularTab({
  onOpenRecipe,
  toggleFavorite,
  isFavorite,
}: {
  onOpenRecipe: (r: Recipe) => void;
  toggleFavorite: (r: Recipe) => void;
  isFavorite: (r: Recipe) => boolean;
}) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");

  const loadPopular = async (page = 1, cat = selectedCategory, diff = selectedDifficulty) => {
    setLoading(true);
    setError("");
    setCurrentPage(page);
    try {
      const response = await fetch(`http://localhost:5000/api/popular?page=${page}&category=${cat}&difficulty=${diff}`);
      if (response.ok) {
        const data = await response.json();
        setRecipes(data.results);
        setTotalPages(data.total_pages);
      } else {
        setError("Gagal memuat resep populer.");
      }
    } catch (err) {
      console.error(err);
      setError("Gagal terhubung ke server backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPopular(1, selectedCategory, selectedDifficulty);
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    loadPopular(1, cat, selectedDifficulty);
  };

  const handleDifficultyChange = (diff: string) => {
    setSelectedDifficulty(diff);
    loadPopular(1, selectedCategory, diff);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1 max-w-6xl mx-auto w-full border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Inspirasi Populer</h1>
        <p className="text-muted-foreground text-sm">
          Menjelajahi resep-resep masakan dengan jumlah Suka (Likes) terbanyak.
        </p>
      </div>

      {error && (
        <div className="max-w-md mx-auto p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive flex items-center gap-3 text-sm">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Layout Container */}
      {!error && (
        <div className="space-y-4 max-w-6xl mx-auto w-full">
          <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
            {/* Left: Recipe List Column */}
            <div className="flex-1 flex flex-col gap-4 w-full">
              {loading ? (
                <div className="flex flex-col gap-4 w-full">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <RecipeCardSkeleton key={i} />
                  ))}
                </div>
              ) : recipes.length > 0 ? (
                <div className="space-y-6 w-full">
                  <div className="flex flex-col gap-4 w-full">
                    {recipes.map((recipe) => (
                      <RecipeCard
                        key={recipe.url}
                        recipe={recipe}
                        onClick={() => onOpenRecipe(recipe)}
                        isFav={isFavorite(recipe)}
                        onToggleFav={() => toggleFavorite(recipe)}
                      />
                    ))}
                  </div>

                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(p) => loadPopular(p, selectedCategory, selectedDifficulty)}
                  />
                </div>
              ) : (
                <div className="p-8 border border-dashed border-border rounded-xl bg-card text-center space-y-3 w-full">
                  <AlertCircle className="size-10 mx-auto text-muted-foreground stroke-1" />
                  <h3 className="font-semibold text-base text-foreground">Tidak Ada Resep Populer</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                    Kombinasi bahan utama dan tingkat kemudahan ini tidak menghasilkan resep terpopuler. Silakan ubah filter Anda.
                  </p>
                </div>
              )}
            </div>

            {/* Right: Sidebar Filter Column (Sticky & Catalog Table Styled Card) */}
            <div className="hidden lg:flex flex-col gap-5 w-80 shrink-0 sticky top-6">
              <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden flex flex-col w-full">
                {/* Catalog-style Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/10">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                      <Filter className="size-3.5" />
                    </div>
                    Filter Resep
                  </h3>
                </div>

                {/* Card Body - Dropdowns styled exactly like Catalog filter button */}
                <div className="p-5 flex flex-col gap-4">
                  {/* 1. Bahan Utama */}
                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-xs font-semibold text-foreground/80">Bahan Utama</label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 gap-1.5 text-xs font-semibold border-border px-3 w-full justify-between rounded-lg hover:bg-muted text-left"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <Filter className="size-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">
                              {selectedCategory === "all"
                                ? "Semua Kategori"
                                : `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}`}
                            </span>
                          </span>
                          <ChevronDown className="size-3.5 opacity-50 shrink-0" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52 border-border bg-card rounded-xl text-xs font-medium">
                        <DropdownMenuCheckboxItem
                          checked={selectedCategory === "all"}
                          onCheckedChange={() => handleCategoryChange("all")}
                          className="text-xs cursor-pointer"
                        >
                          Semua Kategori
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator className="bg-border" />
                        {[
                          { id: "ayam", name: "Ayam" },
                          { id: "sapi", name: "Sapi" },
                          { id: "kambing", name: "Kambing" },
                          { id: "ikan", name: "Ikan" },
                          { id: "udang", name: "Udang" },
                          { id: "telur", name: "Telur" },
                          { id: "tahu", name: "Tahu" },
                          { id: "tempe", name: "Tempe" },
                        ].map((cat) => (
                          <DropdownMenuCheckboxItem
                            key={cat.id}
                            checked={selectedCategory === cat.id}
                            onCheckedChange={() => handleCategoryChange(cat.id)}
                            className="text-xs cursor-pointer capitalize"
                          >
                            {cat.name}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* 2. Tingkat Kemudahan */}
                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-xs font-semibold text-foreground/80">Tingkat Kemudahan</label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 gap-1.5 text-xs font-semibold border-border px-3 w-full justify-between rounded-lg hover:bg-muted text-left"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <Filter className="size-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">
                              {selectedDifficulty === "all"
                                ? "Semua Langkah"
                                : selectedDifficulty === "easy"
                                ? "Praktis (≤ 5 Langkah)"
                                : selectedDifficulty === "medium"
                                ? "Sedang (6-10 Langkah)"
                                : "Spesial (> 10 Langkah)"}
                            </span>
                          </span>
                          <ChevronDown className="size-3.5 opacity-50 shrink-0" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 border-border bg-card rounded-xl text-xs font-medium">
                        {[
                          { id: "all", name: "Semua Langkah" },
                          { id: "easy", name: "Praktis (≤ 5 Langkah)" },
                          { id: "medium", name: "Sedang (6-10 Langkah)" },
                          { id: "hard", name: "Spesial (> 10 Langkah)" },
                        ].map((diff) => (
                          <DropdownMenuCheckboxItem
                            key={diff.id}
                            checked={selectedDifficulty === diff.id}
                            onCheckedChange={() => handleDifficultyChange(diff.id)}
                            className="text-xs cursor-pointer"
                          >
                            {diff.name}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================================================
// 3. CATEGORIES TAB COMPONENT
// ==========================================================================
function CategoriesTab({
  onOpenRecipe,
  toggleFavorite,
  isFavorite,
}: {
  onOpenRecipe: (r: Recipe) => void;
  toggleFavorite: (r: Recipe) => void;
  isFavorite: (r: Recipe) => boolean;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const categories = [
    { id: "ayam", name: "Ayam", icon: "🍗", desc: "Aneka olahan ayam lezat" },
    { id: "sapi", name: "Sapi", icon: "🥩", desc: "Olahan daging sapi pilihan" },
    { id: "kambing", name: "Kambing", icon: "🐐", desc: "Sajian kambing khas nusantara" },
    { id: "ikan", name: "Ikan", icon: "🐟", desc: "Hidangan ikan segar sehat" },
    { id: "udang", name: "Udang", icon: "🍤", desc: "Olahan udang segar" },
    { id: "telur", name: "Telur", icon: "🍳", desc: "Sajian telur praktis & cepat" },
    { id: "tahu", name: "Tahu", icon: "🧈", desc: "Olahan tahu sehat dan lezat" },
    { id: "tempe", name: "Tempe", icon: "🍘", desc: "Sajian tempe gurih & bergizi" },
  ];

  const loadCategoryRecipes = async (catId: string, page = 1) => {
    setLoading(true);
    setError("");
    setCurrentPage(page);
    try {
      const response = await fetch(`http://localhost:5000/api/category?category=${catId}&page=${page}`);
      if (response.ok) {
        const data = await response.json();
        setRecipes(data.results);
        setTotalPages(data.total_pages);
        setTotalResults(data.total_results);
      } else {
        setError("Gagal memuat resep kategori.");
      }
    } catch (err) {
      console.error(err);
      setError("Gagal terhubung ke server backend.");
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (catId: string) => {
    setSelectedCategory(catId);
    loadCategoryRecipes(catId, 1);
  };


  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1 max-w-6xl mx-auto w-full border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Kategori Masakan</h1>
        <p className="text-muted-foreground text-sm">
          Jelajahi berbagai pilihan resep masakan lezat yang dikelompokkan berdasarkan bahan protein utama.
        </p>
      </div>

      {!selectedCategory ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto w-full">
          {categories.map((cat) => (
            <Card
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              className="bg-card text-foreground rounded-xl border border-border p-6 cursor-pointer hover:bg-muted/40 transition-colors flex flex-col items-center text-center space-y-3"
            >
              <div className="text-4xl bg-primary/5 p-4 rounded-full size-16 flex items-center justify-center border border-border">
                {cat.icon}
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-lg">{cat.name}</h3>
                <p className="text-xs text-muted-foreground">{cat.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300 max-w-6xl mx-auto w-full">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">
                {categories.find((c) => c.id === selectedCategory)?.icon}
              </span>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Kategori {categories.find((c) => c.id === selectedCategory)?.name}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ditemukan {totalResults} resep dalam kategori ini.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
            {/* Left: Recipe List */}
            <div className="flex-1 flex flex-col gap-4 w-full">
              {loading && (
                <div className="flex flex-col gap-4 w-full">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <RecipeCardSkeleton key={i} />
                  ))}
                </div>
              )}

              {error && (
                <div className="max-w-md mx-auto p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive flex items-center gap-3 text-sm">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {!loading && recipes.length > 0 && (
                <div className="space-y-6 w-full">
                  <div className="flex flex-col gap-4 w-full">
                    {recipes.map((recipe) => (
                      <RecipeCard
                        key={recipe.url}
                        recipe={recipe}
                        onClick={() => onOpenRecipe(recipe)}
                        isFav={isFavorite(recipe)}
                        onToggleFav={() => toggleFavorite(recipe)}
                      />
                    ))}
                  </div>

                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(p) => loadCategoryRecipes(selectedCategory, p)}
                  />
                </div>
              )}
            </div>

            {/* Right: Sidebar - Quick Category Switcher (Sticky & Catalog Table Styled Card) */}
            <div className="hidden lg:flex flex-col gap-5 w-80 shrink-0 sticky top-6">
              <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden flex flex-col w-full">
                {/* Catalog-style Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/10">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                      <Filter className="size-3.5" />
                    </div>
                    Filter Kategori
                  </h3>
                </div>

                {/* Card Body - Dropdown styled exactly like Catalog filter button */}
                <div className="p-5 flex flex-col gap-4">
                  {/* 1. Bahan Utama */}
                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-xs font-semibold text-foreground/80">Bahan Utama</label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 gap-1.5 text-xs font-semibold border-border px-3 w-full justify-between rounded-lg hover:bg-muted text-left"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <Filter className="size-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">
                              {selectedCategory
                                ? categories.find((c) => c.id === selectedCategory)?.name
                                : "Pilih Kategori"}
                            </span>
                          </span>
                          <ChevronDown className="size-3.5 opacity-50 shrink-0" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52 border-border bg-card rounded-xl text-xs font-medium">
                        {categories.map((cat) => (
                          <DropdownMenuCheckboxItem
                            key={cat.id}
                            checked={selectedCategory === cat.id}
                            onCheckedChange={() => handleCategorySelect(cat.id)}
                            className="text-xs cursor-pointer capitalize"
                          >
                            <span className="mr-1.5">{cat.icon}</span>
                            {cat.name}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================================================
// 4. STATS DATA TAB COMPONENT (Recharts Dashboard)
// ==========================================================================
function StatsTab() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await fetch("http://localhost:5000/api/stats");
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Error loading stats:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Format Recharts data
  const chartData = stats
    ? Object.entries(stats.category_counts).map(([key, count]) => {
        const name = key.replace("dataset-", "");
        return {
          name: name.charAt(0).toUpperCase() + name.slice(1),
          Jumlah: count,
        };
      })
    : [];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto w-full">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Statistik Eksplorasi Data (EDA)</h1>
        <p className="text-muted-foreground text-sm">
          Analisis ringkasan dataset resep masakan yang terintegrasi di sistem.
        </p>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-card border border-border rounded-xl p-6 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Dataset</span>
              <h3 className="text-3xl font-bold mt-2 text-foreground">{stats.total_recipes.toLocaleString("id-ID")}</h3>
            </Card>

            <Card className="bg-card border border-border rounded-xl p-6 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rata-rata Suka (Likes)</span>
              <h3 className="text-3xl font-bold mt-2 text-foreground">{stats.avg_loves.toFixed(2)}</h3>
            </Card>

            <Card className="bg-card border border-border rounded-xl p-6 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bahan Utama</span>
              <h3 className="text-3xl font-bold mt-2 text-foreground">
                {Object.keys(stats.category_counts).length} Jenis
              </h3>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 rounded-xl border border-border p-6 bg-card space-y-4 shadow-sm">
              <div>
                <span className="text-xs text-muted-foreground">Visualisasi</span>
                <h3 className="text-lg font-semibold text-foreground">Distribusi Bahan Utama</h3>
                <p className="text-xs text-muted-foreground">Keseimbangan jumlah resep per kategori di database bersih.</p>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.15 }} />
                    <Bar dataKey="Jumlah" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="rounded-xl border border-border p-6 bg-card space-y-4 shadow-sm">
              <div>
                <span className="text-xs text-muted-foreground">Popularitas</span>
                <h3 className="text-lg font-semibold text-foreground">5 Resep Terpopuler</h3>
                <p className="text-xs text-muted-foreground">Resep dengan jumlah suka terbanyak di database.</p>
              </div>

              <ul className="divide-y divide-border space-y-3">
                {stats.top_popular.map((recipe, idx) => (
                  <li key={recipe.url || recipe.title || idx} className="flex justify-between items-center pt-3 first:pt-0">
                    <div className="flex flex-col max-w-[70%]">
                      <span className="text-xs font-semibold text-muted-foreground">#{idx + 1}</span>
                      <span className="text-sm font-medium text-foreground truncate">
                        {recipe.title}
                      </span>
                    </div>
                    <span className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full font-medium">
                      {recipe.loves} Suka
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ==========================================================================
// 5. FAVORITES TAB COMPONENT
// ==========================================================================
function FavoritesTab({
  favorites,
  onOpenRecipe,
  toggleFavorite,
  isFavorite,
}: {
  favorites: Recipe[];
  onOpenRecipe: (r: Recipe) => void;
  toggleFavorite: (r: Recipe) => void;
  isFavorite: (r: Recipe) => boolean;
}) {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1 max-w-6xl mx-auto w-full border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Resep Favorit Saya</h1>
        <p className="text-muted-foreground text-sm">
          Daftar menu makanan yang telah Anda simpan.
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className="max-w-md mx-auto text-center py-20 space-y-4 border-2 border-dashed border-border rounded-xl p-6 bg-card">
          <Bookmark className="size-12 mx-auto text-muted-foreground stroke-1" />
          <h3 className="font-semibold text-lg text-foreground">Belum Ada Resep Tersimpan</h3>
          <p className="text-sm text-muted-foreground">
            Buka menu pencarian bahan, jelajahi rekomendasi, dan klik tombol hati atau bookmark untuk menyimpan resep favorit Anda di sini.
          </p>
        </div>
      ) : (
        <div className="space-y-6 max-w-6xl mx-auto w-full">
          <div className="flex flex-col gap-4 w-full">
            {favorites.map((recipe) => (
              <RecipeCard
                key={recipe.url}
                recipe={recipe}
                onClick={() => onOpenRecipe(recipe)}
                isFav={isFavorite(recipe)}
                onToggleFav={() => toggleFavorite(recipe)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================================================
// 4. METODE & ALGORITMA TAB COMPONENT
// ==========================================================================
function AlgorithmTab() {
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto w-full">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Metode & Alur Algoritma Rekomendasi</h1>
        <p className="text-muted-foreground text-sm">
          Sistem Rekomendasi Resep ini menggunakan pendekatan Content-Based Filtering untuk mencocokkan preferensi pengguna dengan resep di database.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 w-full">
        {/* Card 1: Text Preprocessing */}
        <Card className="p-5 sm:p-6 gap-3">
          <div className="flex items-center gap-3 border-b border-border pb-3">
            <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">1</div>
            <h3 className="font-semibold text-lg text-foreground">Text Preprocessing</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Text Preprocessing adalah tahap pembersihan dan penyiapan data teks bahan makanan mentah agar seragam dan siap diolah oleh komputer. Proses pembersihan tersebut mencakup:
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-outside space-y-1.5 pl-5">
            <li>Mengubah huruf menjadi huruf kecil (case folding).</li>
            <li>Menghilangkan satuan ukuran (misal: &ldquo;secukupnya&rdquo;, &ldquo;gram&rdquo;, &ldquo;sendok teh&rdquo;, &ldquo;siung&rdquo;, &ldquo;biji&rdquo;).</li>
            <li>Menghapus karakter non-alfabet dan tanda baca.</li>
          </ul>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground leading-snug bg-muted/20 p-2.5 rounded-lg border border-border/40">
            <div>
              <span className="font-bold text-foreground">Input Asli:</span>
              <p className="mt-0.5 text-red-500 font-medium">&ldquo;2 siung Bawang Merah, diiris tipis&rdquo;</p>
            </div>
            <div>
              <span className="font-bold text-foreground">Hasil Bersih:</span>
              <p className="mt-0.5 text-emerald-600 font-bold">&ldquo;bawang merah&rdquo;</p>
            </div>
          </div>
        </Card>

        {/* Card 2: TF-IDF Weighting */}
        <Card className="p-5 sm:p-6 gap-3">
          <div className="flex items-center gap-3 border-b border-border pb-3">
            <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">2</div>
            <h3 className="font-semibold text-lg text-foreground">TF-IDF Weighting</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            TF-IDF Weighting adalah metode statistik untuk menghitung bobot nilai penting suatu bahan masakan di dalam suatu resep relatif terhadap seluruh dataset:
          </p>
          <div className="p-3 bg-muted/50 rounded-lg border border-border font-mono text-xs text-foreground text-center">
            TF-IDF = TF(t, d) &times; IDF(t, D)
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground leading-snug bg-muted/20 p-2.5 rounded-lg border border-border/40">
            <div>
              <span className="font-bold text-foreground">TF (Term Frequency):</span>
              <p className="mt-0.5">Frekuensi kata bahan di resep tertentu.</p>
            </div>
            <div>
              <span className="font-bold text-foreground">IDF (Inverse Doc Freq):</span>
              <p className="mt-0.5">Tingkat kelangkaan bahan di database.</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Bahan masakan yang sangat umum (seperti &ldquo;air&rdquo; atau &ldquo;garam&rdquo;) akan mendapatkan bobot yang lebih rendah karena muncul di hampir semua resep. Sedangkan bahan yang unik (seperti &ldquo;nangka&rdquo; atau &ldquo;kardamom&rdquo;) akan mendapatkan bobot yang lebih tinggi.
          </p>
        </Card>

        {/* Card 3: Cosine Similarity */}
        <Card className="p-5 sm:p-6 gap-3">
          <div className="flex items-center gap-3 border-b border-border pb-3">
            <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">3</div>
            <h3 className="font-semibold text-lg text-foreground">Cosine Similarity</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Cosine Similarity adalah algoritma untuk mengukur tingkat kemiripan sudut antara vektor bahan masakan input pengguna (query) dengan seluruh resep di database:
          </p>
          <div className="p-3 bg-muted/50 rounded-lg border border-border font-mono text-xs text-foreground text-center">
            Cosine Sim = (A &middot; B) / (||A|| &times; ||B||)
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground leading-snug bg-muted/20 p-2.5 rounded-lg border border-border/40">
            <div>
              <span className="font-bold text-foreground">A &middot; B:</span>
              <p className="mt-0.5">Perkalian titik (dot product) bahan yang cocok.</p>
            </div>
            <div>
              <span className="font-bold text-foreground">||A|| &times; ||B||:</span>
              <p className="mt-0.5">Normalisasi panjang vektor agar independen jumlah bahan.</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Menghasilkan skor kemiripan antara <strong>0.0</strong> (tidak mirip sama sekali) hingga <strong>1.0</strong> (kemiripan sempurna). Hanya resep dengan kemiripan &gt; 0 yang akan ditampilkan kepada pengguna.
          </p>
        </Card>

        {/* Card 4: Popularity Adjustment (Suka) */}
        <Card className="p-5 sm:p-6 gap-3">
          <div className="flex items-center gap-3 border-b border-border pb-3">
            <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">4</div>
            <h3 className="font-semibold text-lg text-foreground">Popularity Adjustment (Suka)</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Popularity Adjustment adalah metode penyesuaian skor akhir rekomendasi dengan menggabungkan tingkat kepopuleran resep (jumlah suka/loves) dari komunitas:
          </p>
          <div className="p-3 bg-muted/50 rounded-lg border border-border font-mono text-xs text-foreground text-center">
            Skor Akhir = (Similarity &times; 0.8) + (Normalisasi Suka &times; 0.2)
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground leading-snug bg-muted/20 p-2.5 rounded-lg border border-border/40">
            <div>
              <span className="font-bold text-foreground">Bobot Similarity (80%):</span>
              <p className="mt-0.5">Memprioritaskan kecocokan bahan utama dari pencarian.</p>
            </div>
            <div>
              <span className="font-bold text-foreground">Bobot Suka (20%):</span>
              <p className="mt-0.5">Mendongkrak resep terpercaya/popular masukan komunitas.</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Hal ini memastikan resep-resep populer yang lezat dan telah dicoba banyak orang akan sedikit terangkat ke urutan teratas tanpa mengorbankan relevansi bahan utama.
          </p>
        </Card>
      </div>
    </div>
  );
}

// ==========================================================================
// 5. MAHASISWA & TUGAS INFO TAB COMPONENT
// ==========================================================================
function InfoTab() {
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto w-full">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Informasi Tugas Akhir</h1>
        <p className="text-muted-foreground text-sm">
          Detail identitas akademik dan informasi pengerjaan proyek sistem rekomendasi resep makanan.
        </p>
      </div>

      <Card className="bg-card border border-border rounded-xl shadow-sm w-full overflow-hidden p-6 sm:p-8">
        <div className="divide-y divide-border/60">
          {/* Row 1: Mata Kuliah */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6 py-4.5 first:pt-0">
            <div className="w-44 sm:w-48 shrink-0 flex items-center gap-2.5 text-muted-foreground text-sm font-medium">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 dark:bg-blue-900/20 shrink-0">
                <BookOpen className="size-4" />
              </div>
              <span>Mata Kuliah</span>
            </div>
            <div className="flex-1 text-sm font-semibold text-foreground leading-relaxed pt-1">
              Sistem Rekomendasi
            </div>
          </div>

          {/* Row 2: Judul Proyek */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6 py-4.5">
            <div className="w-44 sm:w-48 shrink-0 flex items-center gap-2.5 text-muted-foreground text-sm font-medium">
              <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-500 dark:bg-violet-900/20 shrink-0">
                <FileText className="size-4" />
              </div>
              <span>Judul Proyek</span>
            </div>
            <div className="flex-1 text-sm font-semibold text-foreground leading-relaxed pt-1">
              Sistem Rekomendasi Resep Makanan Menggunakan Content-Based Filtering (TF-IDF + Cosine Similarity)
            </div>
          </div>

          {/* Row 3: Dataset Sumber */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6 py-4.5">
            <div className="w-44 sm:w-48 shrink-0 flex items-center gap-2.5 text-muted-foreground text-sm font-medium">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 dark:bg-emerald-900/20 shrink-0">
                <Database className="size-4" />
              </div>
              <span>Dataset Sumber</span>
            </div>
            <div className="flex-1 text-sm font-semibold text-foreground leading-relaxed pt-1">
              Kaggle
            </div>
          </div>

          {/* Row 4: Metode Penilaian */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6 py-4.5">
            <div className="w-44 sm:w-48 shrink-0 flex items-center gap-2.5 text-muted-foreground text-sm font-medium">
              <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500 dark:bg-orange-900/20 shrink-0">
                <Sparkles className="size-4" />
              </div>
              <span>Metode</span>
            </div>
            <div className="flex-1 text-sm font-semibold text-foreground leading-relaxed pt-1">
              Content-Based Similarity + Bobot Suka
            </div>
          </div>

          {/* Row 5: Teknologi Backend */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6 py-4.5">
            <div className="w-44 sm:w-48 shrink-0 flex items-center gap-2.5 text-muted-foreground text-sm font-medium">
              <div className="p-1.5 rounded-lg bg-slate-500/10 text-slate-500 dark:bg-slate-900/20 shrink-0">
                <Server className="size-4" />
              </div>
              <span>Tech Backend</span>
            </div>
            <div className="flex-1 text-sm font-semibold text-foreground leading-relaxed pt-1">
              Python Flask + Pandas + Scikit-Learn
            </div>
          </div>

          {/* Row 6: Teknologi Frontend */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6 py-4.5 last:pb-0">
            <div className="w-44 sm:w-48 shrink-0 flex items-center gap-2.5 text-muted-foreground text-sm font-medium">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 dark:bg-indigo-900/20 shrink-0">
                <Laptop className="size-4" />
              </div>
              <span>Tech Frontend</span>
            </div>
            <div className="flex-1 text-sm font-semibold text-foreground leading-relaxed pt-1">
              Next.js + TailwindCSS + Shadcn/ui
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ==========================================================================
// SHIMMER SKELETON LOADER COMPONENT
// ==========================================================================
function RecipeCardSkeleton() {
  return (
    <Card className="overflow-hidden flex flex-col sm:flex-row p-0 border border-border bg-card rounded-xl shadow-xs">
      <Skeleton className="w-full sm:w-48 md:w-52 aspect-video sm:aspect-square shrink-0 rounded-none" />
      <div className="flex-1 p-4 md:p-5 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <Skeleton className="h-6 w-2/3 rounded" />
            <Skeleton className="size-8 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-4/5 rounded" />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-5 w-20 rounded-full ml-auto sm:ml-0" />
          </div>
        </div>
        <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Skeleton className="h-4 w-1/3 rounded" />
          <div className="flex items-center gap-2 ml-auto">
            <Skeleton className="h-4 w-12 rounded" />
            <Skeleton className="h-4 w-12 rounded" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>
      </div>
    </Card>
  );
}

export const getFriendlyCategoryName = (sourcefile?: string) => {
  if (!sourcefile) return "Lainnya";
  const cat = sourcefile.replace("dataset-", "").replace(".csv", "").toLowerCase().trim();
  switch (cat) {
    case "ayam":
      return "Ayam";
    case "sapi":
      return "Daging Sapi";
    case "kambing":
      return "Daging Kambing";
    case "ikan":
      return "Ikan";
    case "seafood":
      return "Seafood";
    case "telur":
      return "Telur";
    case "sayur":
    case "sayuran":
      return "Sayuran";
    case "tahu-tempe":
    case "tahu":
    case "tempe":
      return "Tahu & Tempe";
    default:
      return cat.charAt(0).toUpperCase() + cat.slice(1);
  }
};

function getRecipeRealStats(recipe: Recipe) {
  const ingredientsList = recipe.ingredients
    ? recipe.ingredients.split("--").map((i) => i.trim()).filter((i) => i.length > 0)
    : [];
  
  const stepsList = recipe.steps
    ? recipe.steps.split("--").map((s) => s.trim()).filter((s) => s.length > 0)
    : [];

  return {
    ingredientsCount: `${ingredientsList.length} Bahan`,
    stepsCount: `${stepsList.length} Langkah`,
    category: `${getFriendlyCategoryName(recipe.sourcefile)}`,
  };
}

function RecipeCard({
  recipe,
  onClick,
  isFav,
  onToggleFav,
  showSimilarity = false,
}: {
  recipe: Recipe;
  onClick: () => void;
  isFav: boolean;
  onToggleFav: () => void;
  showSimilarity?: boolean;
}) {
  const displayIngredients = recipe.ingredients
    ? recipe.ingredients
        .split("--")
        .map((i) => i.trim())
        .filter((i) => i.length > 0)
        .map((i) => i.charAt(0).toUpperCase() + i.slice(1))
        .join(" · ")
    : "Tidak ada bahan.";

  const ingredientPreview = displayIngredients.substring(0, 120) + (displayIngredients.length > 120 ? "..." : "");
  const matchPercent = Math.round(recipe.similarity_score * 100);
  const stats = getRecipeRealStats(recipe);

  return (
    <Card
      onClick={onClick}
      className="relative bg-card text-foreground rounded-xl border border-border overflow-hidden cursor-pointer transition-colors flex flex-col sm:flex-row p-0 hover:bg-muted/40"
    >
      {/* Absolute Save Button in top-right corner of the whole card */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFav();
        }}
        className="absolute top-3 right-3 size-8 rounded-full flex items-center justify-center bg-card hover:bg-muted text-muted-foreground hover:text-foreground hover:scale-110 shadow-sm border border-border/80 transition-all z-10"
      >
        <Bookmark className={`size-4.5 ${isFav ? "fill-primary stroke-primary text-primary" : "text-slate-400 dark:text-slate-500 stroke-2"}`} />
      </button>

      {/* Card Image Container (More compact height and width) */}
      <div className="relative w-full sm:w-36 md:w-40 aspect-video sm:aspect-square shrink-0 bg-muted overflow-hidden border-b sm:border-b-0 sm:border-r border-border/50">
        {recipe.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
            <Utensils className="size-8 mb-2" />
            <span className="text-xs uppercase font-medium">No Image</span>
          </div>
        )}
      </div>

      {/* Card Body Container */}
      <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
        <div className="space-y-2">
          {/* Title Row - Padding right (pr-10) to make room for absolute bookmark button */}
          <div className="flex justify-between items-start gap-4">
            <h4 className="font-bold text-sm sm:text-base leading-snug line-clamp-1 sm:line-clamp-2 text-foreground group-hover:text-primary transition-colors pr-10">
              {recipe.title}
            </h4>
          </div>

          {/* Ingredients Preview */}
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            <span className="font-semibold text-foreground/80">Bahan:</span> {ingredientPreview}
          </p>

          {/* Real Recipe Stats Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="flex items-center gap-1 bg-orange-50/70 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-md border border-orange-100/50 dark:border-orange-900/10 text-[11px] font-semibold">
              <ShoppingBag className="size-3" />
              {stats.ingredientsCount}
            </span>
            <span className="flex items-center gap-1 bg-amber-50/70 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-md border border-amber-100/50 dark:border-amber-900/10 text-[11px] font-semibold">
              <ListTodo className="size-3" />
              {stats.stepsCount}
            </span>
            <span className="flex items-center gap-1 bg-slate-100/70 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md border border-slate-200/30 dark:border-slate-700/30 text-[11px] font-semibold">
              <Tag className="size-3" />
              {stats.category}
            </span>
            
            {/* Integrated Kesesuaian Bahan (Match %) Pill */}
            {showSimilarity && recipe.similarity_score !== undefined && recipe.similarity_score > 0 && (
              <span className={`flex items-center px-2 py-0.5 rounded-md border text-[11px] font-bold ${
                matchPercent === 100
                  ? "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50"
                  : matchPercent >= 50
                  ? "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50"
                  : "bg-yellow-50/50 text-yellow-700 border-yellow-100/50 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-900/30"
              }`}>
                <span>{matchPercent}% Cocok</span>
              </span>
            )}
          </div>
        </div>

        {/* Bottom Interaction metrics */}
        <div className="pt-2 mt-2 border-t border-border/40 flex items-center justify-between gap-3 text-xs w-full">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Heart className="size-3.5 text-rose-500 fill-rose-500" />
              <span className="font-bold text-foreground tabular-nums">{recipe.loves}</span>
              <span className="text-[10px]">suka</span>
            </div>
            <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-medium border border-border/40 shrink-0 select-none">
              Skor: {recipe.final_score.toFixed(2)}
            </span>
          </div>
          <Button
            size="sm"
            className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold h-8 px-3 shrink-0 shadow-xs group"
          >
            Lihat Resep <BookOpen className="size-3.5 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ==========================================================================
// HELPER PAGINATION CONTROL COMPONENT
// ==========================================================================
function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, currentPage + 2);

  if (end - start < 4) {
    if (start === 1) {
      end = Math.min(totalPages, start + 4);
    } else if (end === totalPages) {
      start = Math.max(1, end - 4);
    }
  }

  const pages = Array.from({ length: end - start + 1 }, (_, idx) => start + idx);

  const handlePageClick = (p: number) => {
    onPageChange(p);
    const scrollEl = document.querySelector("main .overflow-y-auto") || document.querySelector("main");
    if (scrollEl) {
      scrollEl.scrollTo({ top: 0, behavior: "smooth" });
    } else if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="flex justify-center items-center gap-2 mt-8">
      <Button
        variant="outline"
        size="icon"
        className="rounded-lg size-9"
        disabled={currentPage === 1}
        onClick={() => handlePageClick(currentPage - 1)}
      >
        <ChevronLeft className="size-4" />
      </Button>

      {pages.map((p) => (
        <Button
          key={p}
          variant={p === currentPage ? "default" : "outline"}
          className={`size-9 rounded-lg ${p === currentPage ? "bg-primary text-primary-foreground" : ""}`}
          onClick={() => handlePageClick(p)}
        >
          {p}
        </Button>
      ))}

      <Button
        variant="outline"
        size="icon"
        className="rounded-lg size-9"
        disabled={currentPage === totalPages}
        onClick={() => handlePageClick(currentPage + 1)}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

// ==========================================================================
// HELPER MODAL POPUP COMPONENT (Paper White, border Obsidian, blur background)
// ==========================================================================
function RecipeDetailModal({
  recipe,
  onClose,
  isFav,
  onToggleFav,
  onSelectRecipe,
}: {
  recipe: Recipe;
  onClose: () => void;
  isFav: boolean;
  onToggleFav: () => void;
  onSelectRecipe: (r: Recipe) => void;
}) {
  const [similarRecipes, setSimilarRecipes] = useState<Recipe[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const modalBodyRef = useRef<HTMLDivElement>(null);

  const ingredientsList = recipe.ingredients
    ? recipe.ingredients.split("--").map((i) => i.trim()).filter((i) => i !== "")
    : [];

  const stepsList = recipe.steps
    ? recipe.steps.split("--").map((s) => s.trim()).filter((s) => s !== "")
    : [];

  const matchPercent = Math.round(recipe.similarity_score * 100);

  // Handle escape key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Scroll modal body to top when active recipe changes
  useEffect(() => {
    if (modalBodyRef.current) {
      modalBodyRef.current.scrollTop = 0;
    }
  }, [recipe.title]);

  // Fetch similar recipes when active recipe changes
  useEffect(() => {
    let active = true;
    async function fetchSimilar() {
      setLoadingSimilar(true);
      try {
        const response = await fetch("http://localhost:5000/api/similar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: recipe.title,
            page: 1,
          }),
        });
        if (response.ok && active) {
          const data = await response.json();
          // Filter out the active recipe itself, and pick top 3
          const filtered = (data.results || [])
            .filter((r: Recipe) => r.title !== recipe.title)
            .slice(0, 3);
          setSimilarRecipes(filtered);
        }
      } catch (err) {
        console.error("Error loading similar recipes:", err);
      } finally {
        if (active) setLoadingSimilar(false);
      }
    }

    fetchSimilar();
    return () => {
      active = false;
    };
  }, [recipe.title]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card text-card-foreground border border-border w-full max-w-md max-h-[80vh] rounded-2xl overflow-hidden flex flex-col relative shadow-2xl animate-in zoom-in-95 duration-300"
      >
        {/* Sticky Header */}
        <div className="sticky top-0 bg-card/90 backdrop-blur-md border-b border-border/80 p-4 flex items-center justify-between z-30 shrink-0">
          <h2 className="text-base font-extrabold tracking-tight text-foreground line-clamp-1 leading-tight min-w-0 pr-4">
            {recipe.title}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="size-8 rounded-full bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Scrollable Content Body */}
        <div ref={modalBodyRef} className="flex-1 overflow-y-auto">
          {/* Cover Image */}
          <div className="w-full h-48 bg-muted shrink-0 overflow-hidden relative border-b border-border shadow-3xs">
            {recipe.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/40">
                <Utensils className="size-8 mb-1.5" />
                <span className="text-[10px] uppercase font-bold tracking-wider">No Image Available</span>
              </div>
            )}
          </div>

          <div className="pt-3 px-4 pb-4 md:pt-4 md:px-5 md:pb-5 space-y-4 text-left">
            {/* Unified Metadata & Actions Row */}
            <div className="flex justify-between items-center gap-4 border-b border-border/40 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Category Pill */}
                <span className="flex items-center gap-1 bg-slate-100/70 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md border border-slate-200/30 dark:border-slate-700/30 text-[10px] font-bold">
                  <Tag className="size-3" />
                  <span>{getFriendlyCategoryName(recipe.sourcefile)}</span>
                </span>
                
                {/* Loves Pill */}
                <div className="flex items-center gap-1 bg-rose-50/70 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-md border border-rose-100/50 dark:border-rose-900/10 text-[10px] font-bold">
                  <Heart className="size-3 text-rose-500 fill-rose-500" />
                  <span>{recipe.loves} suka</span>
                </div>

                {/* Similarity Match Pill */}
                {recipe.similarity_score !== undefined && recipe.similarity_score > 0 && (
                  <span className={`flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold ${
                    matchPercent === 100
                      ? "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50"
                      : matchPercent >= 50
                      ? "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50"
                      : "bg-yellow-50/50 text-yellow-700 border-yellow-100/50 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-900/30"
                  }`}>
                    <span>{matchPercent}% Cocok</span>
                  </span>
                )}

                {/* Final Score Pill */}
                <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-medium border border-border/40 shrink-0 select-none">
                  Skor: {recipe.final_score.toFixed(2)}
                </span>
              </div>

              {/* Bookmark Toggle Button (using Bookmark icon aligned with search results card style) */}
              <button
                onClick={onToggleFav}
                className="size-8 rounded-full border border-border flex items-center justify-center bg-card hover:bg-muted text-muted-foreground hover:text-foreground hover:scale-105 active:scale-95 transition-all shadow-3xs shrink-0 cursor-pointer"
              >
                <Bookmark className={`size-4 ${isFav ? "fill-primary stroke-primary text-primary" : "text-slate-400 dark:text-slate-500"}`} />
              </button>
            </div>

            {/* Ingredients */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-foreground" />
                Bahan-Bahan
              </h4>
              {ingredientsList.length > 0 ? (
                <div className="bg-muted/15 p-3.5 rounded-xl border border-border/40 space-y-1.5 shadow-3xs">
                  {ingredientsList.map((ing, idx) => (
                    <div key={idx} className="text-xs md:text-sm text-muted-foreground flex items-start gap-2.5 font-semibold">
                      <span className="size-1.5 rounded-full bg-muted-foreground/60 shrink-0 mt-1.5" />
                      <span className="leading-snug">{ing}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Tidak ada informasi bahan.</p>
              )}
            </div>

            {/* Steps */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-foreground" />
                Langkah Pembuatan
              </h4>
              {stepsList.length > 0 ? (
                <div className="relative pl-1">
                  {stepsList.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3 relative pb-4 last:pb-0">
                      {idx !== stepsList.length - 1 && (
                        <div className="absolute left-2.5 top-6 bottom-[-8px] w-px bg-border" />
                      )}
                      <div className="size-5 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 shadow-3xs z-10">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed font-semibold">
                          {step}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Tidak ada informasi langkah pembuatan.</p>
              )}
            </div>

            {/* Similar Recipes */}
            <div className="pt-4 border-t border-border/60 space-y-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-orange-500 fill-orange-500" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  Rekomendasi Serupa
                </h4>
              </div>

              {loadingSimilar ? (
                <div className="space-y-2">
                  {[1, 2].map((n) => (
                    <div key={n} className="border border-border/50 rounded-xl p-2 bg-muted/20 animate-pulse flex gap-2.5">
                      <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-1.5 py-0.5">
                        <Skeleton className="h-3 w-3/4 rounded" />
                        <Skeleton className="h-2.5 w-1/2 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : similarRecipes.length > 0 ? (
                <div className="space-y-2">
                  {similarRecipes.map((simRecipe) => {
                    const matchPct = Math.round((simRecipe.similarity_score || 0) * 100);
                    return (
                      <div
                        key={simRecipe.title}
                        onClick={() => onSelectRecipe(simRecipe)}
                        className="group cursor-pointer border border-border/50 rounded-xl overflow-hidden bg-card hover:bg-muted/30 transition-all flex p-2.5 items-center gap-3 text-left shadow-3xs hover:shadow-2xs"
                      >
                        <div className="size-16 bg-muted rounded-lg overflow-hidden shrink-0 border border-border/20">
                          {simRecipe.image_url ? (
                            <img
                              src={simRecipe.image_url}
                              alt={simRecipe.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/30">
                              <Utensils className="size-6 text-muted-foreground/45" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <h5 className="font-bold text-xs md:text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors leading-tight">
                            {simRecipe.title}
                          </h5>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* Loves badge */}
                            <span className="flex items-center gap-0.5 bg-rose-50/70 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded-md border border-rose-100/30 text-[9px] font-bold">
                              <Heart className="size-2.5 text-rose-500 fill-rose-500" />
                              <span>{simRecipe.loves}</span>
                            </span>
                            
                            {/* Score badge */}
                            <span className="text-[8px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono border border-border/40 font-medium">
                              Skor: {simRecipe.final_score.toFixed(1)}
                            </span>
                            
                            {/* Similarity badge */}
                            {matchPct > 0 && (
                              <span className="bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md border border-emerald-100/30 text-[9px] font-bold">
                                {matchPct}% Mirip
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Tidak ditemukan resep serupa lainnya.</p>
              )}
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 bg-card/90 backdrop-blur-md border-t border-border/80 p-3.5 flex justify-end gap-2 shrink-0 z-30">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-lg h-9 px-4 text-xs font-bold border border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer shadow-3xs"
          >
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}
