interface StatusBadgeProps {
  status: string;
}

const statusMap: Record<string, { label: string; className: string }> = {
  P: { label: "Pendente", className: "bg-warning/15 text-warning border border-warning/30" },
  A: { label: "Aprovado", className: "bg-success/15 text-success border border-success/30" },
  R: { label: "Rejeitado", className: "bg-destructive/15 text-destructive border border-destructive/30" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const info = statusMap[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${info.className}`}>
      {info.label}
    </span>
  );
}
