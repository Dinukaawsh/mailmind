"use client";

import { X } from "lucide-react";

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: any;
  previewContent: string;
  previewSubject: string;
  previewBodyImage?: string;
  replacePlaceholders: (template: string, lead: any) => string;
}

export default function PreviewModal({
  isOpen,
  onClose,
  lead,
  previewContent,
  previewSubject,
  previewBodyImage,
  replacePlaceholders,
}: PreviewModalProps) {
  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-0 bg-opacity-20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Email Preview</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          {/* Lead Information */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Lead Information:
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(lead).map(([key, value]) => (
                <div key={key}>
                  <span className="text-xs font-medium text-gray-500">
                    {key}:
                  </span>{" "}
                  <span className="text-xs text-gray-900">
                    {String(value || "-")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Email Subject Preview */}
          {previewSubject && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Subject:
              </h3>
              <div className="bg-white border border-gray-300 rounded-lg p-3 text-gray-900">
                {replacePlaceholders(previewSubject, lead)}
              </div>
            </div>
          )}

          {/* Email Body Preview */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Email Body:
            </h3>
            <div className="bg-white border border-gray-300 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap text-gray-900">
              {previewContent}
            </div>
            {previewBodyImage && (
              <div className="mt-4">
                <img
                  src={previewBodyImage}
                  alt="Email body image"
                  className="max-w-full rounded-lg"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
