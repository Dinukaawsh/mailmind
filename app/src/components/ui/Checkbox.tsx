"use client";

import { Check } from "lucide-react";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "success" | "danger";
  indeterminate?: boolean;
}

export default function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
  className = "",
  size = "md",
  variant = "primary",
  indeterminate = false,
}: CheckboxProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const variantClasses = {
    primary: {
      bg: "bg-[#05112b]",
      border: "border-gray-300 hover:border-[#beb7c9]",
      checkedBorder: "border-[#beb7c9]",
      focus: "focus:ring-[#beb7c9]",
    },
    secondary: {
      bg: "bg-gray-600",
      border: "border-gray-300 hover:border-gray-500",
      checkedBorder: "border-gray-500",
      focus: "focus:ring-gray-500",
    },
    success: {
      bg: "bg-green-600",
      border: "border-gray-300 hover:border-green-500",
      checkedBorder: "border-green-500",
      focus: "focus:ring-green-500",
    },
    danger: {
      bg: "bg-red-600",
      border: "border-gray-300 hover:border-red-500",
      checkedBorder: "border-red-500",
      focus: "focus:ring-red-500",
    },
  };

  const currentVariant = variantClasses[variant];

  return (
    <label
      className={`inline-flex items-center cursor-pointer group ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
    >
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div
          className={`
            ${sizeClasses[size]}
            border-2 rounded-md transition-all duration-200 ease-in-out
            ${
              checked || indeterminate
                ? `${currentVariant.bg} ${currentVariant.checkedBorder} shadow-md scale-75`
                : `bg-white ${currentVariant.border} scale-100`
            }
            ${
              !disabled &&
              `${currentVariant.focus} focus-within:ring-2 focus-within:ring-opacity-50`
            }
            ${!disabled && "group-hover:shadow-sm"}
            transform
          `}
        >
          {(checked || indeterminate) && (
            <div className="flex items-center justify-center h-full w-full">
              {indeterminate ? (
                <div className="w-2/3 h-0.5 bg-white rounded"></div>
              ) : (
                <Check className={`${iconSizes[size]} text-white stroke-[3]`} />
              )}
            </div>
          )}
        </div>
      </div>
      {label && (
        <span
          className={`ml-2 text-gray-700 select-none ${
            size === "sm" ? "text-sm" : size === "lg" ? "text-base" : "text-sm"
          }`}
        >
          {label}
        </span>
      )}
    </label>
  );
}
