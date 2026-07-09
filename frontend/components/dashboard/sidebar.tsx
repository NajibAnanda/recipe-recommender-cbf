"use client";

import { useState } from "react";
import {
  Utensils,
  BarChart3,
  ChevronDown,
  ChevronRight,
  User,
  Flame,
  Layers,
  BookOpen,
  Heart,
  Search,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

// 1. Kelompok Utama: Pencarian & Resep
const recipeNavItems = [
  { id: "home", title: "Eksplorasi Resep", icon: Search, iconColor: "text-emerald-500" },
  { id: "popular", title: "Inspirasi Populer", icon: Flame, iconColor: "text-amber-500" },
  { id: "categories", title: "Kategori Masakan", icon: Layers, iconColor: "text-blue-500" },
  { id: "favorites", title: "Koleksi Favorit", icon: Heart, iconColor: "text-rose-500" },
];

// 2. Kelompok Akademik: Tugas & Analisis
const academicNavItems = [
  { id: "stats", title: "Statistik Dataset (EDA)", icon: BarChart3, iconColor: "text-orange-500" },
  { id: "algorithm", title: "Metode & Algoritma", icon: BookOpen, iconColor: "text-indigo-500" },
  { id: "info", title: "Informasi Tugas", icon: User, iconColor: "text-teal-500" },
];

interface DashboardSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function DashboardSidebar({
  activeTab,
  setActiveTab,
  ...props
}: DashboardSidebarProps) {
  const [isAcademicOpen, setIsAcademicOpen] = useState(true);

  return (
    <Sidebar collapsible="offcanvas" className="border-r-0!" {...props}>
      <SidebarHeader className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-md flex items-center justify-center text-primary-foreground shrink-0 font-bold bg-primary">
            <span className="text-sm">K3</span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold truncate text-sm leading-tight text-foreground">
              Kelompok 3
            </span>
            <span className="text-xs text-muted-foreground truncate leading-none mt-0.5">
              Sistem Rekomendasi
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 pt-4 space-y-4 overflow-hidden">
        {/* Kelompok 1: Pencarian & Resep */}
        <SidebarGroup className="p-0">
          <SidebarMenu>
            {recipeNavItems.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  isActive={activeTab === item.id}
                  className="h-9 cursor-pointer"
                  onClick={() => setActiveTab(item.id)}
                >
                  <item.icon className={cn("size-4 shrink-0", item.iconColor)} />
                  <span className="text-sm font-medium">{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator className="my-2" />

        {/* Kelompok 2: Collapsible Akademik */}
        <SidebarGroup className="p-0">
          <button
            onClick={() => setIsAcademicOpen(!isAcademicOpen)}
            className="flex items-center justify-between w-full px-2 py-1.5 text-[10px] tracking-wider font-bold text-muted-foreground hover:text-foreground outline-hidden transition-colors select-none"
          >
            <span>TUGAS & AKADEMIK</span>
            {isAcademicOpen ? (
              <ChevronDown className="size-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-3 text-muted-foreground" />
            )}
          </button>

          {isAcademicOpen && (
            <SidebarGroupContent className="mt-1">
              <SidebarMenu>
                {academicNavItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={activeTab === item.id}
                      className="h-9 cursor-pointer"
                      onClick={() => setActiveTab(item.id)}
                    >
                      <item.icon className={cn("size-4 shrink-0", item.iconColor)} />
                      <span className="text-sm font-medium">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
