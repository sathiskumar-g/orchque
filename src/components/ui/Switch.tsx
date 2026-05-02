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
      <label className={`relative inline-flex items-center cursor-pointer gap-2 ${className}`}>
        {/* Hidden checkbox — the "peer" */}
        <input
          type="checkbox"
          className="peer sr-only"
          ref={ref}
          onChange={handleChange}
          {...props}
        />
        {/* Track — sibling of peer, so peer-checked works */}
        <div className="w-10 h-6 rounded-full bg-muted peer-checked:bg-emerald-500 border border-border/60 transition-colors duration-200 shrink-0" />
        {/* Knob — sibling of peer, positioned over the track */}
        <div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-4 shrink-0" />
        {label && <span className="text-xs select-none ml-1">{label}</span>}
      </label>
    );
  }
);
Switch.displayName = "Switch";
