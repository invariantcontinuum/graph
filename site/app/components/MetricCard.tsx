type MetricCardProps = {
  label: string;
  value: string | number;
  title?: string;
};

export function MetricCard({ label, value, title }: MetricCardProps) {
  return (
    <span className="metric-card" title={title}>
      <b>{value}</b>
      {label}
    </span>
  );
}
