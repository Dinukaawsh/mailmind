"use client";

import { forwardRef, InputHTMLAttributes } from "react";
import { AlertCircle } from "lucide-react";

interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: "default" | "outlined" | "filled";
  inputSize?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      variant = "default",
      inputSize = "md",
      fullWidth = true,
      className = "",
      disabled,
      required,
      type = "text",
      ...props
    },
    ref
  ) => {
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
        focus:
          "focus:ring-2 focus:ring-[#beb7c9] focus:bg-white focus:border-[#beb7c9]",
        error: "bg-red-50 border-red-500 focus:ring-red-500",
      },
    };

    const currentVariant = variantClasses[variant];

    return (
      <div className={`${fullWidth ? "w-full" : ""} ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            type={type}
            disabled={disabled}
            required={required}
            className={`
              ${fullWidth ? "w-full" : ""}
              ${sizeClasses[inputSize]}
              ${error ? currentVariant.error : currentVariant.base}
              ${!disabled && currentVariant.focus}
              ${leftIcon ? "pl-10" : ""}
              ${rightIcon || error ? "pr-10" : ""}
              ${disabled ? "opacity-50 cursor-not-allowed bg-gray-100" : ""}
              rounded-xl font-medium text-gray-900 placeholder-gray-400
              transition-all duration-200 outline-none
            `}
            {...props}
          />

          {(rightIcon || error) && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {error ? (
                <AlertCircle className="w-5 h-5 text-red-500" />
              ) : (
                <span className="text-gray-400">{rightIcon}</span>
              )}
            </div>
          )}
        </div>

        {(error || helperText) && (
          <p
            className={`mt-1.5 text-sm ${
              error ? "text-red-600" : "text-gray-500"
            }`}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
