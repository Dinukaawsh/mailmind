"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Domain } from "../types";
import toast from "react-hot-toast";

interface EditDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  domain: Domain | null;
  onUpdate: (id: string, data: Partial<Domain>) => Promise<void>;
}

export default function EditDomainModal({
  isOpen,
  onClose,
  domain,
  onUpdate,
}: EditDomainModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    status: "connected" as "connected" | "not_connected" | "error",
    emailsSentPerDay: 0,
    provider: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (domain) {
      setFormData({
        name: domain.name || "",
        status: domain.status || "connected",
        emailsSentPerDay: domain.emailsSentPerDay || 0,
        provider: domain.provider || "",
      });
    }
  }, [domain]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain) return;

    try {
      setLoading(true);
      await onUpdate(domain.id, formData);
      //toast.success("Domain updated successfully!");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to update domain");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !domain) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Edit Domain</h2>
            <p className="mt-1 text-sm text-blue-100">Update domain settings</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Domain Name */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Domain Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 transition-all disabled:bg-gray-100"
              required
              disabled={domain.type === "gmail"}
            />
            {domain.type === "gmail" && (
              <p className="mt-1 text-xs text-gray-500">
                Gmail domain names cannot be edited
              </p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as
                    | "connected"
                    | "not_connected"
                    | "error",
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              required
            >
              <option value="connected">Connected</option>
              <option value="not_connected">Not Connected</option>
              <option value="error">Error</option>
            </select>
          </div>

          {/* Emails Sent Per Day */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Emails Sent Per Day
            </label>
            <input
              type="number"
              min="0"
              value={formData.emailsSentPerDay}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  emailsSentPerDay: parseInt(e.target.value) || 0,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>

          {/* Provider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Provider
            </label>
            <input
              type="text"
              value={formData.provider}
              onChange={(e) =>
                setFormData({ ...formData, provider: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="e.g., Gmail, SendGrid, etc."
            />
          </div>

          {/* Domain Type (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type
            </label>
            <input
              type="text"
              value={domain.type}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">
              Domain type cannot be changed
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t-2 border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 shadow-lg"
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Domain"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
