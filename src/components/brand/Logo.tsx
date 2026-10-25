import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="grid size-9 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-xs)]">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.9}>
          <rect x="6" y="2.5" width="12" height="19" rx="3" />
          <path d="M9.5 9.5a3.4 3.4 0 0 1 5.4-.8M14.5 14.5a3.4 3.4 0 0 1-5.4.8" strokeLinecap="round" />
          <path d="M15.2 7.2v2.2h-2.2M8.8 16.8v-2.2h2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {!compact && (
        <span className="font-[family-name:var(--font-display)] text-[1.05rem] font-semibold tracking-tight text-ink">
          Trade-In <span className="text-primary">Pro</span>
        </span>
      )}
    </span>
  );
}