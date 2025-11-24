"use client";

import {
  X,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { useEffect, useRef } from "react";

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: string[];
  campaignName?: string;
  isComplete?: boolean;
  completionMessage?: string;
}

interface ParsedLog {
  type: "email" | "completion";
  email?: string;
  subject?: string;
  body?: string;
  delay?: number;
  status?: string;
  timestamp?: string;
  message?: string;
  raw?: string;
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

  const parseLog = (log: string): ParsedLog => {
    // Check if it's a completion message (contains emojis)
    if (log.includes("✅") || log.includes("📧")) {
      return {
        type: "completion",
        message: log,
      };
    }

    // Try to parse as JSON
    try {
      const parsed = JSON.parse(log);
      return {
        type: "email",
        email: parsed.Email,
        subject: parsed.Subject,
        body: parsed.Body,
        delay: parsed.Random_Delay_Used,
        status: parsed.Status,
        timestamp: parsed.Sent_Timestamp,
      };
    } catch {
      // If parsing fails, return as raw log
      return {
        type: "email",
        raw: log,
      };
    }
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return "";
    try {
      const date = new Date(timestamp);
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return timestamp;
    }
  };

  const stripHtmlTags = (html?: string) => {
    if (!html) return "";
    return html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  if (!isOpen) return null;

  const parsedLogs = logs.map(parseLog);

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-opacity-50 backdrop-blur-md"
        onClick={onClose}
      ></div>
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col overflow-hidden">
        <div className="sticky top-0 bg-[#05112b] px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Webhook Logs</h2>
            {campaignName && (
              <p className="text-sm text-gray-300 mt-1">{campaignName}</p>
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
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {logs.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-semibold">No logs available yet</p>
              <p className="text-sm mt-2">
                Logs will appear here as they are received from the webhook.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {parsedLogs.map((log, index) => {
                if (log.type === "completion") {
                  return (
                    <div
                      key={index}
                      className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-5 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-green-900 mb-2">
                            Campaign Completed
                          </h4>
                          <pre className="text-sm text-green-800 whitespace-pre-wrap font-sans leading-relaxed">
                            {log.message}
                          </pre>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (log.raw) {
                  // Fallback for unparseable logs
                  return (
                    <div
                      key={index}
                      className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm"
                    >
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                        {log.raw}
                      </pre>
                    </div>
                  );
                }

                // Email log card
                return (
                  <div
                    key={index}
                    className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#05112b] rounded-lg flex items-center justify-center">
                          <Mail className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {log.email}
                          </p>
                          <p className="text-xs text-gray-500">
                            Email #{index + 1}
                          </p>
                        </div>
                      </div>
                      {log.status && (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            log.status === "Success"
                              ? "bg-green-100 text-green-800 border border-green-200"
                              : "bg-red-100 text-red-800 border border-red-200"
                          }`}
                        >
                          {log.status}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {log.subject && (
                        <div className="bg-gray-100 border border-gray-300 rounded-lg p-3">
                          <p className="text-xs font-bold text-[#05112b] uppercase mb-1">
                            Subject
                          </p>
                          <p className="text-sm text-gray-900 font-semibold">
                            {log.subject}
                          </p>
                        </div>
                      )}

                      {log.body && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <p className="text-xs font-bold text-gray-600 uppercase mb-1">
                            Body Preview
                          </p>
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {stripHtmlTags(log.body)}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-4 pt-2">
                        {log.timestamp && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{formatTimestamp(log.timestamp)}</span>
                          </div>
                        )}
                        {log.delay !== undefined && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{log.delay}s delay</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
                <span className="text-sm font-bold text-[#05112b] flex items-center gap-2 bg-gray-200 px-3 py-1 rounded-full border border-gray-300">
                  <span className="w-2 h-2 bg-[#05112b] rounded-full animate-pulse"></span>
                  Streaming...
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-[#05112b] text-white font-bold rounded-xl hover:bg-[#05112b]/90 transition-all shadow-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
