import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** `https://siwes-finder-eight.vercel.app` -> `siwes-finder-eight.vercel.app` */
export function prettyUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}
