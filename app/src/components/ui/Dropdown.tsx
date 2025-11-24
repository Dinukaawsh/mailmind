"use client";

import { ChevronDown, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  error?: string;
  required?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outlined" | "filled";
}

export default function Dropdown({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  label,
  disabled = false,
  className = "",
  error,
  required = false,
  size = "md",
  variant = "default",
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-5 py-3 text-base",
  };

  const variantClasses = {
    default: {
      base: "bg-white border-2 border-gray-300 hover:border-[#beb7c9]",
      focus: "focus:ring-2 focus:ring-[#beb7c9] focus:border-[#beb7c9]",
      error: "border-red-500 focus:ring-red-500 focus:border-red-500",
    },
    outlined: {
      base: "bg-transparent border-2 border-gray-300 hover:border-[#beb7c9]",
      focus: "focus:ring-2 focus:ring-[#beb7c9] focus:border-[#beb7c9]",
      error: "border-red-500 focus:ring-red-500 focus:border-red-500",
    },
    filled: {
      base: "bg-gray-100 border-2 border-transparent hover:bg-gray-200",
      focus: "focus:ring-2 focus:ring-[#beb7c9] focus:bg-white",
      error: "bg-red-50 border-red-500 focus:ring-red-500",
    },
  };

  const currentVariant = variantClasses[variant];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between rounded-xl
          transition-all duration-200 font-medium text-gray-900
          ${sizeClasses[size]}
          ${error ? currentVariant.error : currentVariant.base}
          ${!disabled && currentVariant.focus}
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          ${isOpen ? "ring-2 ring-[#beb7c9] border-[#beb7c9]" : ""}
        `}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption?.icon && (
            <span className="flex-shrink-0">{selectedOption.icon}</span>
          )}
          <span className={selectedOption ? "text-gray-900" : "text-gray-500"}>
            {selectedOption?.label || placeholder}
          </span>
        </span>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? "transform rotate-180" : ""
          }`}
        />
      </button>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {isOpen && (
        <div
          className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-60 overflow-auto"
          style={{ animation: "slideDown 0.2s ease-out" }}
        >
          {options.length > 0 ? (
            <ul className="py-1">
              {options.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() =>
                      !option.disabled && handleSelect(option.value)
                    }
                    disabled={option.disabled}
                    className={`
                      w-full px-4 py-2.5 text-left flex items-center justify-between gap-2
                      transition-colors duration-150
                      ${
                        option.disabled
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-gray-100 cursor-pointer"
                      }
                      ${
                        option.value === value
                          ? "bg-gray-200 text-[#05112b] font-medium"
                          : "text-gray-700"
                      }
                    `}
                  >
                    <span className="flex items-center gap-2 truncate">
                      {option.icon && (
                        <span className="flex-shrink-0">{option.icon}</span>
                      )}
                      <span>{option.label}</span>
                    </span>
                    {option.value === value && (
                      <Check className="w-5 h-5 text-[#05112b] flex-shrink-0" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              No options available
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
