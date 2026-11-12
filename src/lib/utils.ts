import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The custom font sizes of tailwind.config.ts (`text-13`, `text-2xs`) must be known as font sizes: otherwise they are
// taken for a text colour and a colour class before them (`text-primary-foreground text-13`) is silently dropped.
const twMerge = extendTailwindMerge({ extend: { classGroups: { "font-size": [{ text: ["13", "2xs"] }] } } });

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
