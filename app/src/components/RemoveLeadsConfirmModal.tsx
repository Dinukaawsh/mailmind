"use client";

import { X } from "lucide-react";

interface RemoveLeadsConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  leadCount: number;
}

export default function RemoveLeadsConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  leadCount,
}: RemoveLeadsConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white bg-opacity-30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
            <X className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
            Remove All Leads
          </h3>
          <p className="text-sm text-gray-600 text-center mb-6">
            Are you sure you want to remove all {leadCount} leads? You can
            re-upload the CSV file or add new leads manually.
          </p>
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Remove All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
