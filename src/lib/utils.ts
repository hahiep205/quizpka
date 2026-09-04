import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Canonical mobile toggle-modal layout: 128px header + 341px body + 124px footer. */
export const modalFrameClass = "lp-modal-frame"
export const modalHeaderClass = "lp-modal-header"
export const modalBodyClass = "lp-modal-body"
export const modalFooterClass = "lp-modal-footer"
export const mobileModalHeightClass = modalFrameClass
