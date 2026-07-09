"use client";

import { useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardContent } from "@/components/dashboard/content";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <SidebarProvider className="bg-sidebar">
      <DashboardSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="h-svh overflow-hidden lg:p-2 w-full">
        <div className="lg:border lg:rounded-md overflow-hidden flex flex-col h-full w-full bg-background">
          <DashboardHeader activeTab={activeTab} />
          <main className="w-full flex-1 overflow-hidden flex flex-col">
            <DashboardContent activeTab={activeTab} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
