"use client";

import { Clock } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface TimePickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  min?: string;
  max?: string;
  className?: string;
  variant?: "default" | "outlined" | "filled";
  inputSize?: "sm" | "md" | "lg";
}

export default function TimePicker({
  label,
  value,
  onChange,
  error,
  helperText,
  disabled = false,
  required = false,
  min,
  max,
  className = "",
  variant = "default",
  inputSize = "md",
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    if (isOpen && selectedRef.current) {
      selectedRef.current.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }
  }, [isOpen]);

  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const hourStr = String(hour).padStart(2, "0");
        const minuteStr = String(minute).padStart(2, "0");
        const timeValue = `${hourStr}:${minuteStr}`;
        times.push(timeValue);
      }
    }
    return times;
  };

  const formatDisplayTime = (timeString: string) => {
    if (!timeString) return "";
    const [hour, minute] = timeString.split(":");
    const hourNum = parseInt(hour);
    const period = hourNum >= 12 ? "PM" : "AM";
    const displayHour =
      hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    return `${displayHour}:${minute} ${period}`;
  };

  const handleTimeSelect = (time: string) => {
    // Check min/max constraints
    if (min && time < min) return;
    if (max && time > max) return;

    onChange(time);
    setIsOpen(false);
  };

  const isTimeDisabled = (time: string) => {
    if (min && time < min) return true;
    if (max && time > max) return true;
    return false;
  };

  const timeOptions = generateTimeOptions();

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
          <Clock className="w-5 h-5" />
        </div>

        <input
          type="text"
          value={value ? formatDisplayTime(value) : ""}
          readOnly
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          placeholder="Select time"
          className={`
            w-full pl-10 pr-4 cursor-pointer
            ${sizeClasses[inputSize]}
            ${error ? currentVariant.error : currentVariant.base}
            ${!disabled && currentVariant.focus}
            ${disabled ? "opacity-50 cursor-not-allowed bg-gray-100" : ""}
            rounded-xl font-medium text-gray-900 placeholder-gray-400
            transition-all duration-200 outline-none
          `}
        />
      </div>

      {isOpen && !disabled && (
        <div
          className="absolute z-50 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl w-full max-h-60 overflow-y-auto"
          style={{ animation: "slideDown 0.2s ease-out" }}
        >
          <div className="p-2">
            {timeOptions.map((time) => (
              <button
                key={time}
                ref={time === value ? selectedRef : null}
                type="button"
                onClick={() => handleTimeSelect(time)}
                disabled={isTimeDisabled(time)}
                className={`
                  w-full px-4 py-2 text-left rounded-lg transition-all duration-150
                  ${
                    time === value
                      ? "bg-[#05112b] text-white font-medium shadow-md"
                      : isTimeDisabled(time)
                      ? "text-gray-300 cursor-not-allowed"
                      : "hover:bg-gray-100 text-gray-700"
                  }
                `}
              >
                {formatDisplayTime(time)}
              </button>
            ))}
          </div>
        </div>
      )}

      {(error || helperText) && (
        <p
          className={`mt-1.5 text-sm ${
            error ? "text-red-600" : "text-gray-500"
          }`}
        >
          {error || helperText}
        </p>
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
