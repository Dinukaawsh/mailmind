"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, Search, UserX, Mail, RefreshCw } from "lucide-react";
import { unsubscriberApi } from "../utils/api";
import { Unsubscriber } from "../types";
import toast from "react-hot-toast";

export default function UnsubscribersPage() {
  const [unsubscribers, setUnsubscribers] = useState<Unsubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadUnsubscribers = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        // Manual refresh - show refreshing indicator
        setRefreshing(true);
      }
      // Auto-refresh runs silently (no loading state change)
      // Fetch unsubscribers from MongoDB via API (always from database, no webhook)
      const data = await unsubscriberApi.getAll();
      setUnsubscribers(data);
    } catch (error) {
      toast.error("Failed to load unsubscribers");
      console.error(error);
      // Fallback to empty array on error
      setUnsubscribers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUnsubscribers();
    // Refresh every 30 seconds to catch new unsubscribers quickly
    const interval = setInterval(() => {
      loadUnsubscribers(false); // Don't show loading spinner on auto-refresh
    }, 30 * 1000);
    return () => clearInterval(interval);
  }, [loadUnsubscribers]);

  const handleExport = async () => {
    try {
      // Fetch CSV from API
      const response = await fetch("/api/unsubscribers/export");

      if (!response.ok) {
        throw new Error("Failed to export unsubscribers");
      }

      // Get CSV content
      const csv = await response.text();

      // Create blob and download
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `unsubscribers-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Unsubscribers exported successfully");
    } catch (error) {
      toast.error("Failed to export unsubscribers");
      console.error(error);
    }
  };

  const filteredUnsubscribers = unsubscribers.filter((unsubscriber) => {
    const query = searchQuery.toLowerCase();
    return unsubscriber.Email.toLowerCase().includes(query);
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">Unsubscribers</h1>
            {refreshing && (
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
            )}
          </div>
          <p className="mt-2 text-gray-600">
            Manage and track all unsubscribed leads from your campaigns
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => loadUnsubscribers()}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh data"
          >
            <RefreshCw
              className={`w-5 h-5 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-5 h-5 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats - Calculated from MongoDB data */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Unsubscribes
              </p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {unsubscribers.length}
              </p>
              <p className="mt-1 text-xs text-gray-500">All time</p>
            </div>
            <UserX className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {
                  unsubscribers.filter((u) => {
                    const date = new Date(u.Timestamp);
                    const now = new Date();
                    return (
                      date.getMonth() === now.getMonth() &&
                      date.getFullYear() === now.getFullYear()
                    );
                  }).length
                }
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {new Date().toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <Mail className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {
                  unsubscribers.filter((u) => {
                    const date = new Date(u.Timestamp);
                    const now = new Date();
                    return (
                      date.getDate() === now.getDate() &&
                      date.getMonth() === now.getMonth() &&
                      date.getFullYear() === now.getFullYear()
                    );
                  }).length
                }
              </p>
              <p className="mt-1 text-xs text-gray-500">Last 24 hours</p>
            </div>
            <Mail className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unique Emails</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {new Set(unsubscribers.map((u) => u.Email)).size}
              </p>
              <p className="mt-1 text-xs text-gray-500">Distinct addresses</p>
            </div>
            <Mail className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Unsubscribers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Loading unsubscribers...
          </div>
        ) : filteredUnsubscribers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchQuery ? (
              "No unsubscribers found matching your search."
            ) : (
              <div>
                <UserX className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p>No unsubscribers yet.</p>
                <p className="text-sm mt-2">
                  Unsubscribed leads will appear here automatically.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUnsubscribers.map((unsubscriber, index) => (
                  <tr
                    key={`${unsubscriber.Email}-${unsubscriber.Timestamp}-${index}`}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {unsubscriber.Email}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500">
                        {formatDate(unsubscriber.Timestamp)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded">
                        {unsubscriber.Action}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          About Unsubscribers
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            • Unsubscribed emails are automatically excluded from future
            campaigns
          </li>
          <li>• The unsubscribe list auto-refreshes every 30 seconds</li>
          <li>• Export the list to comply with data protection regulations</li>
          <li>• Respect unsubscribes to maintain sender reputation</li>
        </ul>
      </div>
    </div>
  );
}
