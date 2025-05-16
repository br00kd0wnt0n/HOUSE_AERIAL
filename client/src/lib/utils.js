import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines and merges multiple class names using clsx and tailwind-merge
 * @param {...string} inputs - Class names to be combined
 * @returns {string} - Merged class names
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
} 