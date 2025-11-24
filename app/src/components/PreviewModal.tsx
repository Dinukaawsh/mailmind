"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import DOMPurify from "dompurify";
import { marked } from "marked";

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

  const formattedBody = useMemo(() => {
    if (!previewContent?.trim()) return "";
    const html = marked.parse(previewContent);
    return DOMPurify.sanitize(html as unknown as string);
  }, [previewContent]);

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-opacity-50 backdrop-blur-md"
        onClick={onClose}
      ></div>
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-[#05112b] px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Email Preview</h2>
            <p className="text-sm text-gray-300 mt-1">
              Personalized email for this lead
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Lead Information */}
          <div className="bg-gray-100 rounded-xl border border-gray-300 p-5">
            <h3 className="text-sm font-bold text-[#05112b] mb-3 uppercase tracking-wide">
              Lead Information:
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(lead).map(([key, value]) => (
                <div key={key} className="bg-white rounded-lg p-2.5 shadow-sm">
                  <span className="text-xs font-bold text-gray-500 uppercase block">
                    {key}:
                  </span>{" "}
                  <span className="text-sm text-gray-900 font-semibold">
                    {String(value || "-")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Email Subject Preview */}
          {previewSubject && (
            <div>
              <h3 className="text-sm font-bold text-[#05112b] mb-3 uppercase tracking-wide">
                Subject:
              </h3>
              <div className="bg-gray-100 border-2 border-gray-300 rounded-xl p-4 text-gray-900 font-semibold shadow-sm">
                {replacePlaceholders(previewSubject, lead)}
              </div>
            </div>
          )}

          {/* Email Body Preview */}
          <div>
            <h3 className="text-sm font-bold text-[#05112b] mb-3 uppercase tracking-wide">
              Email Body:
            </h3>
            <div className="bg-white border-2 border-gray-300 rounded-xl p-5 text-sm text-gray-900 shadow-sm min-h-[160px]">
              {formattedBody ? (
                <div
                  className="space-y-2"
                  dangerouslySetInnerHTML={{ __html: formattedBody }}
                />
              ) : (
                <p className="text-gray-400 italic">
                  No body content provided for this lead.
                </p>
              )}
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
