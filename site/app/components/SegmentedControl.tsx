"use client";

type SegmentedControlProps<T extends string> = {
  value: T;
  options: readonly T[];
  label: string;
  onChange: (value: T) => void;
  format?: (value: T) => string;
};

export function SegmentedControl<T extends string>({
  value,
  options,
  label,
  onChange,
  format = (v) => v,
}: SegmentedControlProps<T>) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((item) => (
        <button
          key={item}
          type="button"
          data-active={value === item}
          aria-pressed={value === item}
          title={`Set ${label.toLowerCase()} to ${format(item)}`}
          onClick={() => onChange(item)}
        >
          {format(item)}
        </button>
      ))}
    </div>
  );
}
