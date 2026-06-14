type TypeCloudProps = {
  items: Array<{ key: string; count: number }>;
  variant?: "default" | "muted";
  maxItems?: number;
  label: string;
};

function compactLabel(value: string): string {
  return value.replaceAll("_", " ");
}

export function TypeCloud({
  items,
  variant = "default",
  maxItems = 12,
  label,
}: TypeCloudProps) {
  const visible = items.slice(0, maxItems);
  return (
    <div
      className={`type-cloud ${variant === "muted" ? "muted-cloud" : ""}`}
      aria-label={label}
    >
      {visible.map((item) => (
        <span key={item.key} title={`${compactLabel(item.key)}: ${item.count}`}>
          {compactLabel(item.key)}
          <b>{item.count}</b>
        </span>
      ))}
      {items.length > maxItems && (
        <span className="type-cloud-more">+{items.length - maxItems} more</span>
      )}
    </div>
  );
}
