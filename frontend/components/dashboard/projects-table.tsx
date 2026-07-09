"use client";

import { useMemo, useState, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Database,
  Heart,
} from "lucide-react";

interface RecipeItem {
  title: string;
  url: string;
  ingredients: string;
  steps: string;
  loves: number;
  similarity_score: number;
  final_score: number;
  sourcefile: string;
  image_url?: string;
}

interface ProjectsTableProps {
  onOpenRecipe?: (recipe: RecipeItem) => void;
}

const categoryConfig: Record<
  string,
  { label: string; colorClass: string }
> = {
  ayam: {
    label: "Ayam",
    colorClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  },
  sapi: {
    label: "Sapi",
    colorClass: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  },
  kambing: {
    label: "Kambing",
    colorClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  },
  ikan: {
    label: "Ikan",
    colorClass: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800",
  },
  udang: {
    label: "Udang",
    colorClass: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800",
  },
  telur: {
    label: "Telur",
    colorClass: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
  },
  tahu: {
    label: "Tahu",
    colorClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
  },
  tempe: {
    label: "Tempe",
    colorClass: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800",
  },
  lainnya: {
    label: "Lainnya",
    colorClass: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800",
  },
};

const getCleanCatKey = (sourcefile: string) => {
  const source = sourcefile || "dataset-lainnya.csv";
  return source.replace("dataset-", "").replace(".csv", "");
};

// Daftar Kategori Statis untuk Filter Seluruh Database
const uniqueCategories = ["ayam", "sapi", "kambing", "ikan", "udang", "telur", "tahu", "tempe"];

export function ProjectsTable({ onOpenRecipe }: ProjectsTableProps) {
  const [recipes, setRecipes] = useState<RecipeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // State Paginasi Server-Side
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 5;
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);

  // Reset ke halaman 1 ketika pencarian atau filter kategori berubah
  useEffect(() => {
    setPageIndex(0);
  }, [searchQuery, categoryFilter]);

  // Memuat data secara dinamis dari server
  useEffect(() => {
    let active = true;
    async function loadCatalog() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: String(pageIndex + 1), // Backend menggunakan index 1
          per_page: String(pageSize),
          search: searchQuery,
          category: categoryFilter === "all" ? "" : categoryFilter,
        });

        const response = await fetch(`http://localhost:5000/api/catalog?${queryParams}`);
        if (response.ok && active) {
          const data = await response.json();
          setRecipes(data.results || []);
          setTotalPages(data.total_pages || 1);
          setTotalRows(data.total_results || 0);
        }
      } catch (err) {
        console.error("Error loading catalog recipes:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    const timer = setTimeout(() => {
      loadCatalog();
    }, 300); // Debounce pencarian selama 300ms

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [pageIndex, pageSize, searchQuery, categoryFilter]);

  // Hitung deretan halaman numerik untuk pagination
  const pages = useMemo(() => {
    const currentPageNum = pageIndex + 1;
    let start = Math.max(1, currentPageNum - 2);
    let end = Math.min(totalPages, currentPageNum + 2);

    if (end - start < 4) {
      if (start === 1) {
        end = Math.min(totalPages, start + 4);
      } else if (end === totalPages) {
        start = Math.max(1, end - 4);
      }
    }

    const list = [];
    for (let i = start; i <= end; i++) {
      list.push(i);
    }
    return list;
  }, [pageIndex, totalPages]);

  const columns = useMemo<ColumnDef<RecipeItem>[]>(
    () => [
      {
        id: "index",
        header: () => <div className="text-center w-full text-xs font-semibold text-muted-foreground uppercase">#</div>,
        cell: ({ row }) => (
          <div className="text-center w-full text-xs text-muted-foreground font-mono font-medium">
            {pageIndex * pageSize + row.index + 1}
          </div>
        ),
      },
      {
        accessorKey: "title",
        header: () => <span className="text-xs font-semibold text-muted-foreground uppercase">Nama Resep</span>,
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="font-medium text-foreground max-w-[220px] sm:max-w-[360px]">
              <span className="truncate block text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">
                {r.title}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "sourcefile",
        header: () => <div className="text-center w-full text-xs font-semibold text-muted-foreground uppercase">Kategori</div>,
        cell: ({ row }) => {
          const key = getCleanCatKey(row.original.sourcefile);
          const config = categoryConfig[key] || categoryConfig.lainnya;
          return (
            <div className="text-center w-full">
              <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold rounded border uppercase tracking-wider ${config.colorClass}`}>
                {config.label}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "similarity_score",
        header: () => <div className="text-center w-full text-xs font-semibold text-muted-foreground uppercase">Kecocokan</div>,
        cell: ({ row }) => {
          const score = row.original.similarity_score ?? 1.0;
          const percent = Math.round(score * 100);
          
          let barColor = "bg-slate-400 dark:bg-slate-500";
          let badgeClass = "bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-900/30 dark:text-slate-300 dark:border-slate-800";
          
          if (percent === 100) {
            barColor = "bg-orange-500 dark:bg-orange-600";
            badgeClass = "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50";
          } else if (percent >= 50) {
            barColor = "bg-amber-500 dark:bg-amber-600";
            badgeClass = "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50";
          } else if (percent > 0) {
            barColor = "bg-yellow-500 dark:bg-yellow-600";
            badgeClass = "bg-yellow-50/50 text-yellow-700 border-yellow-100/50 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-900/30";
          } else {
            barColor = "bg-slate-300 dark:bg-slate-600";
            badgeClass = "bg-slate-50/30 text-slate-400 border-slate-100/30 dark:bg-slate-900/10 dark:text-slate-500 dark:border-slate-900/30";
          }
          
          return (
            <div className="flex items-center justify-center gap-3.5 w-full max-w-[150px] mx-auto">
              <div className="w-16 bg-slate-100 dark:bg-slate-800/80 rounded-full h-1.5 overflow-hidden shrink-0">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`} 
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className={`inline-flex items-center justify-center w-12 px-1.5 py-0.5 text-xs font-bold tabular-nums border rounded-full shrink-0 ${badgeClass}`}>
                {percent}%
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "loves",
        header: () => <div className="text-center w-full text-xs font-semibold text-muted-foreground uppercase">Suka</div>,
        cell: ({ row }) => (
          <div className="flex justify-center w-full">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-full">
              <Heart className="size-3 fill-rose-500 text-rose-500" />
              <span className="tabular-nums font-bold">{row.original.loves}</span>
            </div>
          </div>
        ),
      },
    ],
    [pageIndex, pageSize]
  );

  const table = useReactTable({
    data: recipes,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
    state: {
      pagination: {
        pageIndex,
        pageSize,
      },
    },
  });

  const hasActiveFilters = categoryFilter !== "all";

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden h-full flex flex-col justify-between">
      <div className="flex flex-col">
        {/* Main Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/10">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Database className="size-4.5" />
            </div>
            Katalog Resep
          </h3>
        </div>

        {/* Sub-Header for Search & Filter to match todays-tasks styling */}
        <div className="px-5 py-2.5 bg-muted/5 border-b border-border flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari di katalog..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-background border-border w-full focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-[11px] font-semibold border-border px-2.5 shrink-0">
                <Filter className="size-3" />
                Kategori
                {hasActiveFilters && (
                  <span className="size-1.5 rounded-full bg-primary" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 border-border">
              <DropdownMenuCheckboxItem
                checked={categoryFilter === "all"}
                onCheckedChange={() => setCategoryFilter("all")}
                className="text-xs"
              >
                Semua Kategori
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator className="bg-border" />
              {uniqueCategories.map((cat) => (
                <DropdownMenuCheckboxItem
                  key={cat}
                  checked={categoryFilter === cat}
                  onCheckedChange={() => setCategoryFilter(cat)}
                  className="text-xs capitalize"
                >
                  {cat}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        <Table>
          <TableHeader className="bg-muted/5">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-b border-border">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-10 px-5 py-2 font-semibold">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-muted-foreground py-12 text-sm"
                >
                  Memuat data resep...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-muted-foreground py-12 text-sm"
                >
                  Tidak ada resep ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="group hover:bg-muted/30 border-b border-border cursor-pointer transition-colors"
                  onClick={() => {
                    if (onOpenRecipe) {
                      onOpenRecipe(row.original);
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-5 py-3 align-middle">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-center py-4 border-t border-border bg-muted/5">
        {/* Numerical Pagination Controls to match search recommendations pagination */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="size-8 rounded-lg border-border"
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            disabled={pageIndex === 0}
          >
            <ChevronLeft className="size-4" />
          </Button>
          
          {pages.map((p) => (
            <Button
              key={p}
              variant={p === pageIndex + 1 ? "default" : "outline"}
              className={`size-8 rounded-lg border-border font-semibold text-xs transition-all ${
                p === pageIndex + 1
                  ? "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                  : ""
              }`}
              onClick={() => setPageIndex(p - 1)}
            >
              {p}
            </Button>
          ))}
          
          <Button
            variant="outline"
            size="icon"
            className="size-8 rounded-lg border-border"
            onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
            disabled={pageIndex >= totalPages - 1}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
