import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrencyBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDateBR(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function parseDateOnly(value: string) {
  // interpreta "YYYY-MM-DD" como meia-noite UTC, evitando problemas de fuso
  return new Date(`${value}T00:00:00.000Z`);
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    if (current === 0) return 0;
    return null; // não há base de comparação
  }
  return ((current - previous) / previous) * 100;
}
