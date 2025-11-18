"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Domain } from "../types";
import toast from "react-hot-toast";
import { Dropdown, DropdownOption, Input } from "./ui";

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

  // Status options for dropdown
  const statusOptions: DropdownOption[] = [
    { value: "connected", label: "Connected" },
    { value: "not_connected", label: "Not Connected" },
    { value: "error", label: "Error" },
  ];

  if (!isOpen || !domain) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-opacity-50 backdrop-blur-md"
        onClick={onClose}
      ></div>
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
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
          <Input
            label="Domain Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Domain name"
            required
            disabled={domain.type === "gmail"}
            helperText={
              domain.type === "gmail"
                ? "Gmail domain names cannot be edited"
                : undefined
            }
            inputSize="lg"
          />

          {/* Status */}
          <div>
            <Dropdown
              label="Status"
              options={statusOptions}
              value={formData.status}
              onChange={(value) =>
                setFormData({
                  ...formData,
                  status: value as "connected" | "not_connected" | "error",
                })
              }
              placeholder="Select status"
              required
            />
          </div>

          {/* Emails Sent Per Day */}
          <Input
            type="number"
            label="Emails Sent Per Day"
            value={formData.emailsSentPerDay.toString()}
            onChange={(e) =>
              setFormData({
                ...formData,
                emailsSentPerDay: parseInt(e.target.value) || 0,
              })
            }
            min="0"
            helperText="Number of emails sent daily from this domain"
          />

          {/* Provider */}
          <Input
            type="text"
            label="Provider"
            value={formData.provider}
            onChange={(e) =>
              setFormData({ ...formData, provider: e.target.value })
            }
            placeholder="e.g., Gmail, SendGrid, etc."
          />

          {/* Domain Type (read-only) */}
          <Input
            type="text"
            label="Type"
            value={domain.type}
            disabled
            helperText="Domain type cannot be changed"
          />

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
