"use client";

import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface DatePickerProps {
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

export default function DatePicker({
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
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-5 py-3 text-base",
  };

  const variantClasses = {
    default: {
      base: "bg-white border-2 border-gray-300 hover:border-purple-400",
      focus: "focus:ring-2 focus:ring-purple-500 focus:border-purple-500",
      error: "border-red-500 focus:ring-red-500 focus:border-red-500",
    },
    outlined: {
      base: "bg-transparent border-2 border-purple-300 hover:border-purple-500",
      focus: "focus:ring-2 focus:ring-purple-500 focus:border-purple-500",
      error: "border-red-500 focus:ring-red-500 focus:border-red-500",
    },
    filled: {
      base: "bg-gray-100 border-2 border-transparent hover:bg-gray-200",
      focus:
        "focus:ring-2 focus:ring-purple-500 focus:bg-white focus:border-purple-500",
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
    if (value) {
      setCurrentMonth(new Date(value));
    }
  }, [value]);

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const handleDateSelect = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateString = `${year}-${month}-${day}`;

    // Check min/max constraints
    if (min && dateString < min) return;
    if (max && dateString > max) return;

    onChange(dateString);
    setIsOpen(false);
  };

  const previousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    );
  };

  const isDateSelected = (date: Date) => {
    if (!value) return false;
    const selectedDate = new Date(value);
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isDateDisabled = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateString = `${year}-${month}-${day}`;

    if (min && dateString < min) return true;
    if (max && dateString > max) return true;
    return false;
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

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
          <Calendar className="w-5 h-5" />
        </div>

        <input
          type="text"
          value={value ? formatDisplayDate(value) : ""}
          readOnly
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          placeholder="Select date"
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
          className="absolute z-50 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl p-4 w-80"
          style={{ animation: "slideDown 0.2s ease-out" }}
        >
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={previousMonth}
              className="p-2 hover:bg-purple-50 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="font-semibold text-gray-900">
              {currentMonth.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </div>
            <button
              type="button"
              onClick={nextMonth}
              className="p-2 hover:bg-purple-50 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Week Days */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-gray-500 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, index) => (
              <div key={index}>
                {date ? (
                  <button
                    type="button"
                    onClick={() => handleDateSelect(date)}
                    disabled={isDateDisabled(date)}
                    className={`
                      w-full aspect-square flex items-center justify-center rounded-lg text-sm font-medium
                      transition-all duration-150
                      ${
                        isDateSelected(date)
                          ? "bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-md"
                          : isDateDisabled(date)
                          ? "text-gray-300 cursor-not-allowed"
                          : "hover:bg-purple-50 text-gray-700"
                      }
                    `}
                  >
                    {date.getDate()}
                  </button>
                ) : (
                  <div></div>
                )}
              </div>
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
