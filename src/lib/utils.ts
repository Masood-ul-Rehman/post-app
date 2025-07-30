import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const socialEnv = {
  facebook: {
    clientId: import.meta.env.VITE_FACEBOOK_CLIENT_ID,
    redirectUri: import.meta.env.VITE_FACEBOOK_REDIRECT_URI,
  },
  instagram: {
    clientId: import.meta.env.VITE_INSTAGRAM_CLIENT_ID,
    redirectUri: import.meta.env.VITE_INSTAGRAM_REDIRECT_URI,
  },
  linkedin: {
    clientId: import.meta.env.VITE_LINKEDIN_CLIENT_ID,
    redirectUri: import.meta.env.VITE_LINKEDIN_REDIRECT_URI,
  },
  pinterest: {
    clientId: import.meta.env.VITE_PINTEREST_CLIENT_ID,
    redirectUri: import.meta.env.VITE_PINTEREST_REDIRECT_URI,
  },
  threads: {
    clientId: import.meta.env.VITE_THREADS_CLIENT_ID,
    redirectUri: import.meta.env.VITE_THREADS_REDIRECT_URI,
  },
  tiktok: {
    clientKey: import.meta.env.VITE_TIKTOK_CLIENT_KEY,
    redirectUri: import.meta.env.VITE_TIKTOK_REDIRECT_URI,
  },
};
