"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Folder } from "lucide-react";

interface DashboardHeaderProps {
  activeTab: string;
}

export function DashboardHeader({ activeTab }: DashboardHeaderProps) {
  const getTabLabel = (tab: string) => {
    switch (tab) {
      case "home":
        return "Eksplorasi Resep";
      case "similar":
        return "Resep Serupa";
      case "popular":
        return "Inspirasi Populer";
      case "categories":
        return "Kategori Masakan";
      case "favorites":
        return "Koleksi Favorit";
      case "stats":
        return "Statistik Dataset (EDA)";
      case "algorithm":
        return "Metode & Algoritma";
      case "info":
        return "Informasi Tugas";
      default:
        return tab;
    }
  };

  return (
    <header className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b bg-card sticky top-0 z-10 w-full shrink-0">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-2" />
        <div className="flex items-center gap-2 text-muted-foreground">
          <Folder className="size-4" />
          <span className="text-sm font-medium text-foreground">
            {getTabLabel(activeTab)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <span className="text-xs text-muted-foreground hidden sm:inline">
          Sistem Rekomendasi Resep Makanan
        </span>
      </div>
    </header>
  );
}
