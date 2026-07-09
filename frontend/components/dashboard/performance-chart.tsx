"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, BarChart2, TrendingUp } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";

type ChartType = "bar" | "line";

const chartConfig = {
  value: {
    label: "Jumlah Resep",
  },
};

export function PerformanceChart() {
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [showGrid, setShowGrid] = useState(true);
  const [smoothCurve, setSmoothCurve] = useState(true);
  const [chartData, setChartData] = useState<Array<{ name: string; value: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(14689);

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await fetch("http://localhost:5000/api/stats");
        if (response.ok) {
          const data = await response.json();
          setTotalCount(data.total_recipes);
          if (data.category_counts) {
            const formatted = Object.entries(data.category_counts).map(([key, count]) => {
              const cleanName = key
                .replace("dataset-", "")
                .replace(".csv", "");
              return {
                name: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
                value: count as number,
              };
            });
            setChartData(formatted);
          }
        }
      } catch (err) {
        console.error("Error loading stats for chart:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const resetToDefault = () => {
    setChartType("bar");
    setShowGrid(true);
    setSmoothCurve(true);
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-b">
        <h3 className="font-semibold text-base flex items-center gap-2">
          {chartType === "bar" ? (
            <BarChart2 className="size-4 text-muted-foreground" />
          ) : (
            <TrendingUp className="size-4 text-muted-foreground" />
          )}
          Distribusi Kategori Bahan
        </h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Tipe Grafik</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => setChartType("bar")}>
                  Bar Chart {chartType === "bar" && "✓"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setChartType("line")}>
                  Line Chart {chartType === "line" && "✓"}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={showGrid}
              onCheckedChange={(value) => setShowGrid(!!value)}
            >
              Tampilkan Grid
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={smoothCurve}
              onCheckedChange={(value) => setSmoothCurve(!!value)}
              disabled={chartType === "bar"}
            >
              Kurva Halus
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={resetToDefault}>
              Reset Default
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="p-4">
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-bold tracking-tight">
            {totalCount.toLocaleString("id-ID")}
          </span>
          <span className="text-sm text-muted-foreground">
            Total Resep Terkatalogisasi
          </span>
        </div>

        {loading ? (
          <div className="h-[175px] w-full flex items-center justify-center text-sm text-muted-foreground">
            Loading chart data...
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[175px] w-full">
            {chartType === "bar" ? (
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: -15, bottom: 0 }}
              >
                {showGrid && (
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                )}
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} strokeWidth={0}>
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill="var(--primary)" className="opacity-90 hover:opacity-100 transition-opacity" />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 8, left: -15, bottom: 0 }}
              >
                {showGrid && (
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                )}
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type={smoothCurve ? "monotone" : "linear"}
                  dataKey="value"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{
                    r: 6,
                    fill: "var(--primary)",
                    stroke: "var(--card)",
                    strokeWidth: 2,
                  }}
                />
              </LineChart>
            )}
          </ChartContainer>
        )}
      </div>
    </div>
  );
}
