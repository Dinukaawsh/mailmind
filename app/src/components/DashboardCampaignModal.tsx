"use client";

import { useState, useEffect } from "react";
import {
  X,
  Mail,
  Users,
  MailOpen,
  MessageSquare,
  UserX,
  Calendar,
  PlayCircle,
  PauseCircle,
  CheckCircle,
  TrendingUp,
  Target,
  Eye,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Campaign } from "../types";

interface DashboardCampaignModalProps {
  campaign: Campaign | null;
  onClose: () => void;
}

export default function DashboardCampaignModal({
  campaign,
  onClose,
}: DashboardCampaignModalProps) {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageError, setImageError] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const leadsPerPage = 10;

  useEffect(() => {
    if (!campaign) return;

    // Reset pagination when campaign changes
    setCurrentPage(1);

    const fetchPresignedUrl = async () => {
      const bodyImageUrl = campaign?.bodyImageS3Url || campaign?.bodyImage;

      if (!bodyImageUrl) {
        setImageUrl("");
        return;
      }

      // If it's a base64 image, use it directly
      if (bodyImageUrl.startsWith("data:")) {
        setImageUrl(bodyImageUrl);
        return;
      }

      // If it's an S3 URL, get presigned URL
      if (bodyImageUrl.startsWith("http")) {
        try {
          const response = await fetch(`/api/s3-presigned-url`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ s3Url: bodyImageUrl }),
          });

          if (!response.ok) {
            setImageError(true);
            return;
          }

          const { presignedUrl } = await response.json();
          setImageUrl(presignedUrl);
        } catch (error) {
          console.error("Error fetching presigned URL:", error);
          setImageError(true);
        }
      }
    };

    fetchPresignedUrl();
  }, [campaign]);

  if (!campaign) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <PlayCircle className="w-6 h-6 text-green-500" />;
      case "paused":
        return <PauseCircle className="w-6 h-6 text-yellow-500" />;
      case "completed":
        return <CheckCircle className="w-6 h-6 text-blue-500" />;
      default:
        return <Mail className="w-6 h-6 text-gray-500" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "paused":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "completed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const leadCount = campaign.csvData?.length || 0;
  const contactedCount = campaign.sentCount || 0;
  const remainingLeads = Math.max(0, leadCount - contactedCount);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div
        className="absolute inset-0 bg-opacity-50 backdrop-blur-md"
        onClick={onClose}
      ></div>
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col animate-slideUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getStatusIcon(campaign.status)}
              <div>
                <h2 className="text-2xl font-bold">{campaign.name}</h2>
                <p className="text-blue-100 text-sm">Campaign Details</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors hover:text-gray-900"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Status and Date */}
          <div className="flex items-center justify-between mb-6">
            <span
              className={`px-4 py-2 text-sm font-medium rounded-lg border ${getStatusBadgeClass(
                campaign.status
              )}`}
            >
              {campaign.status.toUpperCase()}
            </span>
            <div className="flex items-center text-gray-600 text-sm">
              <Calendar className="w-4 h-4 mr-2" />
              Created:{" "}
              {new Date(campaign.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">
                Campaign Metrics
              </h3>
              <div className="group relative">
                <Info className="w-4 h-4 text-gray-400 cursor-help" />
                <div className="absolute right-0 top-6 w-72 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 shadow-xl">
                  <p className="font-semibold mb-1">📧 Metrics Explanation</p>
                  <p className="text-gray-300">
                    • <strong>Sent</strong>: From database
                    <br />• <strong>Open/Reply rates</strong>: Require email
                    tracking integration
                    {(campaign.openRate === 0 ||
                      campaign.openRate === undefined) && (
                      <>
                        <br />
                        <br />
                        <span className="text-yellow-300">
                          ⚠️ Connect an email service provider to track opens
                          and replies.
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <Mail className="w-5 h-5 text-blue-600" />
                <span className="text-xs text-blue-600 font-medium">SENT</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">
                {contactedCount}
              </p>
              <p className="text-xs text-blue-600 mt-1">Emails delivered</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <MailOpen className="w-5 h-5 text-green-600" />
                <span className="text-xs text-green-600 font-medium">
                  OPENS
                </span>
              </div>
              <p className="text-2xl font-bold text-green-900">
                {campaign.openRate?.toFixed(1) || 0}%
              </p>
              <p className="text-xs text-green-600 mt-1">Open rate</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <MessageSquare className="w-5 h-5 text-orange-600" />
                <span className="text-xs text-orange-600 font-medium">
                  REPLIES
                </span>
              </div>
              <p className="text-2xl font-bold text-orange-900">
                {campaign.replyRate?.toFixed(1) || 0}%
              </p>
              <p className="text-xs text-orange-600 mt-1">Reply rate</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-5 h-5 text-purple-600" />
                <span className="text-xs text-purple-600 font-medium">
                  LEADS
                </span>
              </div>
              <p className="text-2xl font-bold text-purple-900">{leadCount}</p>
              <p className="text-xs text-purple-600 mt-1">Total contacts</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Campaign Progress
              </span>
              <span className="text-sm text-gray-600">
                {contactedCount} / {leadCount} (
                {leadCount > 0
                  ? ((contactedCount / leadCount) * 100).toFixed(1)
                  : 0}
                %)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${
                    leadCount > 0 ? (contactedCount / leadCount) * 100 : 0
                  }%`,
                }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {remainingLeads} leads remaining
            </p>
          </div>

          {/* Campaign Details */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Email Content */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Mail className="w-5 h-5 mr-2 text-blue-600" />
                Email Content
              </h3>

              {campaign.subject && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <label className="text-xs font-medium text-gray-500 uppercase">
                    Subject Line
                  </label>
                  <p className="text-sm text-gray-900 mt-1">
                    {campaign.subject}
                  </p>
                </div>
              )}

              {campaign.template && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <label className="text-xs font-medium text-gray-500 uppercase">
                    Email Template
                  </label>
                  <div className="text-sm text-gray-900 mt-2 whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {campaign.template}
                  </div>
                </div>
              )}

              {imageUrl && !imageError && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">
                    Body Image
                  </label>
                  <img
                    src={imageUrl}
                    alt="Email body"
                    className="w-full rounded-lg border border-gray-300"
                    onError={() => setImageError(true)}
                  />
                </div>
              )}
            </div>

            {/* Follow-up & Schedule */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Target className="w-5 h-5 mr-2 text-purple-600" />
                Campaign Settings
              </h3>

              {campaign.startDate && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <label className="text-xs font-medium text-gray-500 uppercase">
                    Start Date & Time
                  </label>
                  <p className="text-sm text-gray-900 mt-1">
                    {new Date(campaign.startDate).toLocaleDateString()}
                    {campaign.startTime && ` at ${campaign.startTime}`}
                  </p>
                </div>
              )}

              {campaign.followUpTemplate && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <label className="text-xs font-medium text-gray-500 uppercase">
                    Follow-up Template
                  </label>
                  <div className="text-sm text-gray-900 mt-2 whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {campaign.followUpTemplate}
                  </div>
                  {campaign.followUpDelay && (
                    <p className="text-xs text-gray-600 mt-2">
                      Delay: {campaign.followUpDelay} days
                    </p>
                  )}
                </div>
              )}

              {/* Performance Stats */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                <label className="text-xs font-medium text-gray-500 uppercase mb-3 block">
                  Performance Metrics
                </label>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Bounce Rate</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {campaign.bounceRate?.toFixed(1) || 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Unsubscribes</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {campaign.unsubscribeCount || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                    <span className="text-sm font-medium text-gray-700">
                      Success Rate
                    </span>
                    <span className="text-sm font-bold text-green-600">
                      {leadCount > 0
                        ? (
                            ((contactedCount -
                              (campaign.unsubscribeCount || 0)) /
                              contactedCount) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sample Leads Preview */}
          {campaign.csvData && campaign.csvData.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <Users className="w-5 h-5 mr-2 text-green-600" />
                All Leads ({campaign.csvData.length} total)
              </h3>
              <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          #
                        </th>
                        {Object.keys(campaign.csvData[0])
                          .slice(0, 4)
                          .map((key) => (
                            <th
                              key={key}
                              className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider"
                            >
                              {key}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {campaign.csvData
                        .slice(
                          (currentPage - 1) * leadsPerPage,
                          currentPage * leadsPerPage
                        )
                        .map((lead, index) => (
                          <tr
                            key={index}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-3 text-sm text-gray-500 font-medium">
                              {(currentPage - 1) * leadsPerPage + index + 1}
                            </td>
                            {Object.values(lead)
                              .slice(0, 4)
                              .map((value: any, idx) => (
                                <td
                                  key={idx}
                                  className="px-4 py-3 text-sm text-gray-900 truncate max-w-xs"
                                  title={value}
                                >
                                  {value}
                                </td>
                              ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {campaign.csvData.length > leadsPerPage && (
                  <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between">
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
                          setCurrentPage((prev) =>
                            Math.min(
                              prev + 1,
                              Math.ceil(campaign.csvData!.length / leadsPerPage)
                            )
                          )
                        }
                        disabled={
                          currentPage ===
                          Math.ceil(campaign.csvData.length / leadsPerPage)
                        }
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
                            {(currentPage - 1) * leadsPerPage + 1}
                          </span>{" "}
                          -{" "}
                          <span className="font-medium">
                            {Math.min(
                              currentPage * leadsPerPage,
                              campaign.csvData.length
                            )}
                          </span>{" "}
                          of{" "}
                          <span className="font-medium">
                            {campaign.csvData.length}
                          </span>{" "}
                          leads
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
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <span className="sr-only">Previous</span>
                            <ChevronLeft className="h-5 w-5" />
                          </button>

                          {/* Page Numbers */}
                          {Array.from(
                            {
                              length: Math.ceil(
                                campaign.csvData.length / leadsPerPage
                              ),
                            },
                            (_, i) => i + 1
                          )
                            .filter((page) => {
                              const totalPages = Math.ceil(
                                campaign.csvData!.length / leadsPerPage
                              );
                              // Show first page, last page, current page, and pages around current
                              return (
                                page === 1 ||
                                page === totalPages ||
                                (page >= currentPage - 1 &&
                                  page <= currentPage + 1)
                              );
                            })
                            .map((page, index, array) => {
                              // Add ellipsis if there's a gap
                              const prevPage = array[index - 1];
                              const showEllipsis =
                                prevPage && page - prevPage > 1;

                              return (
                                <div key={page} className="inline-flex">
                                  {showEllipsis && (
                                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                      ...
                                    </span>
                                  )}
                                  <button
                                    onClick={() => setCurrentPage(page)}
                                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ${
                                      currentPage === page
                                        ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                                        : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                                    }`}
                                  >
                                    {page}
                                  </button>
                                </div>
                              );
                            })}

                          <button
                            onClick={() =>
                              setCurrentPage((prev) =>
                                Math.min(
                                  prev + 1,
                                  Math.ceil(
                                    campaign.csvData!.length / leadsPerPage
                                  )
                                )
                              )
                            }
                            disabled={
                              currentPage ===
                              Math.ceil(campaign.csvData.length / leadsPerPage)
                            }
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <span className="sr-only">Next</span>
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
