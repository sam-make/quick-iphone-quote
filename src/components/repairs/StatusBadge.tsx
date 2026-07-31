import { STATUS_LABELS, STATUS_TONES, type RepairStatus } from "@/lib/repairs";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: RepairStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        STATUS_TONES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
