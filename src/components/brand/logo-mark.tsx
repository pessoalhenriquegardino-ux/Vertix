import { cn } from "@/lib/utils";

// Marca do Vertix: monograma "V" em chevron dentro de um tile arredondado,
// com leve gradiente. Usada no favicon (app/icon.svg — mesmo desenho) e em
// todo lugar que hoje mostra a "logo" do produto (sidebar, login).
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-8 w-8", className)}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="vertix-logo-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#vertix-logo-grad)" />
      <path
        d="M9 10 L16 22 L23 10"
        fill="none"
        stroke="white"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
