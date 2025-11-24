"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Download,
  Search,
  UserX,
  Mail,
  RefreshCw,
  TrendingDown,
  Calendar,
  AlertCircle,
  Filter,
} from "lucide-react";
import { unsubscriberApi } from "../utils/api";
import { Unsubscriber } from "../types";
import toast from "react-hot-toast";
import LoadingSpinner from "../components/Loading/LoadingSpinner";

export default function UnsubscribersPage() {
  const [unsubscribers, setUnsubscribers] = useState<Unsubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

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

  // Pagination
  const totalPages = Math.ceil(filteredUnsubscribers.length / itemsPerPage);
  const paginatedUnsubscribers = filteredUnsubscribers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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
    <div className="space-y-6 p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-100 rounded-xl border border-gray-300">
                <UserX className="w-8 h-8 text-[#05112b]" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-[#05112b]">
                  Unsubscribers
                </h1>
                <p className="mt-1 text-gray-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Manage and track all unsubscribed leads from your campaigns
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => loadUnsubscribers()}
              disabled={refreshing}
              className="flex items-center px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
              title="Refresh data"
            >
              <RefreshCw
                className={`w-5 h-5 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <button
              onClick={handleExport}
              className="flex items-center px-5 py-2.5 bg-[#05112b] text-white rounded-lg hover:bg-[#05112b]/90 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <Download className="w-5 h-5 mr-2" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Stats - Calculated from MongoDB data */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:border-red-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                Total Unsubscribes
              </p>
              <p className="mt-3 text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {unsubscribers.length}
              </p>
              <p className="mt-2 text-sm text-gray-500 flex items-center">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                All time
              </p>
            </div>
            <div className="ml-4 p-3 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl">
              <UserX className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:border-orange-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                This Month
              </p>
              <p className="mt-3 text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
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
              <p className="mt-2 text-sm text-gray-500 flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                {new Date().toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="ml-4 p-3 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl">
              <Calendar className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:border-yellow-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                Today
              </p>
              <p className="mt-3 text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
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
              <p className="mt-2 text-sm text-gray-500 flex items-center">
                <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mr-2"></span>
                Last 24 hours
              </p>
            </div>
            <div className="ml-4 p-3 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl">
              <TrendingDown className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:border-purple-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                Unique Emails
              </p>
              <p className="mt-3 text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {new Set(unsubscribers.map((u) => u.Email)).size}
              </p>
              <p className="mt-2 text-sm text-gray-500 flex items-center">
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></span>
                Distinct addresses
              </p>
            </div>
            <div className="ml-4 p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
              <Mail className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by email address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="px-4 py-3 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="mt-3 text-sm text-gray-600">
            Found{" "}
            <span className="font-semibold text-gray-900">
              {filteredUnsubscribers.length}
            </span>{" "}
            result{filteredUnsubscribers.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Unsubscribers Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <LoadingSpinner />
          </div>
        ) : filteredUnsubscribers.length === 0 ? (
          <div className="p-12 text-center">
            {searchQuery ? (
              <div>
                <Search className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">
                  No unsubscribers found matching your search.
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Try a different search term
                </p>
              </div>
            ) : (
              <div>
                <UserX className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg font-medium">
                  No unsubscribers yet
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Unsubscribed leads will appear here automatically
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Email Address
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Unsubscribed On
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedUnsubscribers.map((unsubscriber, index) => (
                    <tr
                      key={`${unsubscriber.Email}-${unsubscriber.Timestamp}-${index}`}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500 font-medium">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-red-50 to-orange-50 rounded-lg flex items-center justify-center">
                            <Mail className="w-5 h-5 text-red-600" />
                          </div>
                          <div className="ml-4">
                            <span className="text-sm font-medium text-gray-900">
                              {unsubscriber.Email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {formatDate(unsubscriber.Timestamp)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded-full border border-red-200">
                          <span className="w-1.5 h-1.5 bg-red-600 rounded-full mr-2 animate-pulse"></span>
                          {unsubscriber.Action}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{" "}
                      <span className="font-medium">
                        {(currentPage - 1) * itemsPerPage + 1}
                      </span>{" "}
                      -{" "}
                      <span className="font-medium">
                        {Math.min(
                          currentPage * itemsPerPage,
                          filteredUnsubscribers.length
                        )}
                      </span>{" "}
                      of{" "}
                      <span className="font-medium">
                        {filteredUnsubscribers.length}
                      </span>{" "}
                      unsubscribers
                    </p>
                  </div>
                  <div>
                    <nav
                      className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                      aria-label="Pagination"
                    >
                      <button
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Previous</span>
                        <svg
                          className="h-5 w-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>

                      {Array.from(
                        { length: Math.min(totalPages, 7) },
                        (_, i) => {
                          let pageNum;
                          if (totalPages <= 7) {
                            pageNum = i + 1;
                          } else if (currentPage <= 4) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 3) {
                            pageNum = totalPages - 6 + i;
                          } else {
                            pageNum = currentPage - 3 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                currentPage === pageNum
                                  ? "z-10 bg-gray-200 border-gray-400 text-[#05112b]"
                                  : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        }
                      )}

                      <button
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages)
                          )
                        }
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Next</span>
                        <svg
                          className="h-5 w-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="p-2 bg-blue-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="ml-4">
            <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center">
              About Unsubscribers
              <span className="ml-2 px-2 py-0.5 text-xs bg-blue-200 text-blue-800 rounded-full">
                Important
              </span>
            </h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2 mt-1.5"></span>
                <span>
                  Unsubscribed emails are automatically excluded from future
                  campaigns
                </span>
              </li>
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2 mt-1.5"></span>
                <span>
                  The unsubscribe list auto-refreshes every 30 seconds
                </span>
              </li>
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2 mt-1.5"></span>
                <span>
                  Export the list to comply with data protection regulations
                  (GDPR, CAN-SPAM)
                </span>
              </li>
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2 mt-1.5"></span>
                <span>
                  Respecting unsubscribes maintains your sender reputation and
                  deliverability
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
