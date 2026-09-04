import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Mobile picker-modal height: 128px header + 341px body + 124px footer. */
export const mobileModalHeightClass =
  "h-[min(593px,calc(100dvh_-_2rem))] max-h-[min(760px,92dvh)] sm:h-auto"
