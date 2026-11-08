import {
  Activity, ArrowDownToLine, Box, Cog, Droplet, Droplets, Flame, Gauge, MoveUpRight, RotateCw,
  StretchVertical, Thermometer, TrendingDown, Waves, Wind, type LucideIcon,
} from "lucide-react";
import type { CategoryId } from "@/lib/types";

const MAP: Record<string, LucideIcon> = {
  Activity, ArrowDownToLine, Box, Cog, Droplet, Droplets, Flame, Gauge, MoveUpRight, RotateCw,
  StretchVertical, Thermometer, TrendingDown, Waves, Wind,
};

export function Icon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  const C = MAP[name] ?? Box;
  return <C size={size} className={className} strokeWidth={2} aria-hidden="true" />;
}

export function catColor(c: CategoryId) {
  return { color: `var(--cat-${c})`, background: `var(--cat-${c}-bg)` };
}
