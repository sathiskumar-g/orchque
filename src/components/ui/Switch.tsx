// Simple Switch component using a checkbox for shadcn/ui compatibility
import * as React from "react";

export interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, className = "", onCheckedChange, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      onCheckedChange?.(e.target.checked);
    };
    return (
      <label className={`inline-flex items-center cursor-pointer gap-2 ${className}`}>
        <input
          type="checkbox"
          className="peer sr-only"
          ref={ref}
          onChange={handleChange}
          {...props}
        />
        <span
          className="w-10 h-6 bg-muted rounded-full relative transition-colors duration-200 peer-checked:bg-primary border border-border/60"
        >
          <span
            className="absolute left-1 top-1 w-4 h-4 bg-background rounded-full shadow transition-transform duration-200 peer-checked:translate-x-4"
          />
        </span>
        {label && <span className="text-xs select-none">{label}</span>}
      </label>
    );
  }
);
Switch.displayName = "Switch";
