"use client";

import { Trash2, Archive } from "lucide-react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  variant?: "delete" | "archive";
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete Campaign",
  message = "Are you sure you want to delete this campaign? This action cannot be undone.",
  confirmText = "Delete",
  variant = "delete",
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  const isArchive = variant === "archive";
  const Icon = isArchive ? Archive : Trash2;
  const iconColorClass = isArchive ? "text-orange-600" : "text-red-600";
  const bgColorClass = isArchive
    ? "from-orange-100 to-orange-200"
    : "from-red-100 to-red-200";
  const buttonColorClass = isArchive
    ? "from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800"
    : "from-red-600 to-red-700 hover:from-red-700 hover:to-red-800";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-opacity-50 backdrop-blur-md"
        onClick={onClose}
      ></div>
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="p-8">
          <div
            className={`flex items-center justify-center w-16 h-16 mx-auto bg-gradient-to-br ${bgColorClass} rounded-2xl mb-5 shadow-lg`}
          >
            <Icon className={`w-8 h-8 ${iconColorClass}`} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 text-center mb-3">
            {title}
          </h3>
          <p className="text-sm text-gray-600 text-center mb-8 leading-relaxed">
            {message}
          </p>
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`px-6 py-3 bg-gradient-to-r ${buttonColorClass} text-white font-bold rounded-xl transition-all shadow-lg`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
