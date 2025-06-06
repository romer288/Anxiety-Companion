import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Combines multiple class names into a single string, merging Tailwind classes intelligently
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}