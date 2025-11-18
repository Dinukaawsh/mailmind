"use client";

import { X } from "lucide-react";

interface RemoveLeadConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function RemoveLeadConfirmModal({
  isOpen,
  onClose,
  onConfirm,
}: RemoveLeadConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="p-8">
          <div className="flex items-center justify-center w-16 h-16 mx-auto bg-gradient-to-br from-orange-100 to-red-200 rounded-2xl mb-5 shadow-lg">
            <X className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 text-center mb-3">
            Remove Lead
          </h3>
          <p className="text-sm text-gray-600 text-center mb-8 leading-relaxed">
            Are you sure you want to remove this lead? This action cannot be
            undone.
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
              className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold rounded-xl hover:from-orange-700 hover:to-red-700 transition-all shadow-lg"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
