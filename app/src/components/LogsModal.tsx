"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: string[];
  campaignName?: string;
  isComplete?: boolean;
  completionMessage?: string;
}

export default function LogsModal({
  isOpen,
  onClose,
  logs,
  campaignName,
  isComplete = false,
  completionMessage,
}: LogsModalProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Webhook Logs</h2>
            {campaignName && (
              <p className="text-sm text-gray-600 mt-1">{campaignName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {logs.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No logs available yet. Logs will appear here as they are received
              from the webhook.
            </div>
          ) : (
            <div className="space-y-1 font-mono text-sm">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className="text-gray-900 whitespace-pre-wrap break-words bg-gray-50 p-2 rounded border border-gray-200"
                >
                  {log}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
        <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 rounded-b-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {logs.length} log{logs.length !== 1 ? "s" : ""} received
              </span>
              {isComplete && (
                <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                  {completionMessage || "Processing Complete"}
                </span>
              )}
              {!isComplete && (
                <span className="text-sm font-medium text-blue-600 flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                  Streaming...
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
