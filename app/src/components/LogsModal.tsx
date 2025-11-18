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
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col overflow-hidden">
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Webhook Logs</h2>
            {campaignName && (
              <p className="text-sm text-indigo-100 mt-1">{campaignName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-all"
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
        <div className="border-t-2 border-gray-200 px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-gray-700">
                {logs.length} log{logs.length !== 1 ? "s" : ""} received
              </span>
              {isComplete && (
                <span className="text-sm font-bold text-green-600 flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                  <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                  {completionMessage || "Processing Complete"}
                </span>
              )}
              {!isComplete && (
                <span className="text-sm font-bold text-blue-600 flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                  <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                  Streaming...
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
