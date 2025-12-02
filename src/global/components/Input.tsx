import { forwardRef, useEffect, useState } from "react";
import type { InputHTMLAttributes, ReactNode, ChangeEvent } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  hideIconOnType?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      leftIcon,
      rightIcon,
      hideIconOnType = false,
      className = "",
      id,
      onChange,
      value,
      defaultValue,
      ...rest
    },
    ref
  ) => {
    const inputId =
      id ?? (rest.name as string) ?? Math.random().toString(36).slice(2);

    const [hasText, setHasText] = useState(
      typeof value === "string"
        ? value.length > 0
        : typeof defaultValue === "string"
        ? defaultValue.length > 0
        : false
    );

    useEffect(() => {
      if (typeof value === "string") setHasText(value.length > 0);
    }, [value]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      setHasText(e.target.value.length > 0);
      onChange?.(e);
    };

    const base =
      "w-full rounded-full border border-input bg-white text-sm text-foreground placeholder:text-foreground/60 focus-visible:outline-none focus-visible:ring-2 ring-ring";
    const paddingLeft = leftIcon ? "pl-10" : "pl-3";
    const paddingRight = rightIcon ? "pr-10" : "pr-3";

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1 block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <span
              className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/60 transition-opacity ${
                hideIconOnType && hasText ? "opacity-0" : "opacity-100"
              }`}
            >
              {leftIcon}
            </span>
          )}

          <input
            id={inputId}
            ref={ref}
            className={`${base} ${paddingLeft} ${paddingRight} ${className}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            onChange={handleChange}
            value={value as any}
            defaultValue={defaultValue as any}
            {...rest}
          />

          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/60">
              {rightIcon}
            </span>
          )}
        </div>

        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-xs text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
