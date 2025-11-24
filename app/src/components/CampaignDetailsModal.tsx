"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Eye, Mail, MessageSquare, RefreshCw, Clock } from "lucide-react";
import { Campaign, CampaignReply } from "../types";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { getScheduleDisplay } from "../utils/schedule";

type CampaignDetailsTab = "overview" | "leads" | "replies";

interface CampaignDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign;
  onPreview: (
    lead: any,
    template?: string,
    subject?: string,
    bodyImage?: string
  ) => void;
  initialTab?: CampaignDetailsTab;
  replies?: CampaignReply[];
  repliesLoading?: boolean;
  repliesError?: string;
  repliesMeta?: { total: number; unreadCount: number };
  onRefreshReplies?: () => void;
}

export default function CampaignDetailsModal({
  isOpen,
  onClose,
  campaign,
  onPreview,
  initialTab = "overview",
  replies = [],
  repliesLoading = false,
  repliesError,
  repliesMeta,
  onRefreshReplies,
}: CampaignDetailsModalProps) {
  // Get image URL - prefer S3 URL, fallback to bodyImage (for backward compatibility)
  const bodyImageUrl = campaign?.bodyImageS3Url || campaign?.bodyImage;
  const [imageError, setImageError] = useState<boolean>(false);
  const [presignedImageUrl, setPresignedImageUrl] = useState<string>("");
  const [activeTab, setActiveTab] = useState<CampaignDetailsTab>(initialTab);

  const formattedTemplate = useMemo(() => {
    if (!campaign?.template?.trim()) return "";
    const html = marked.parse(campaign.template);
    return DOMPurify.sanitize(html as unknown as string);
  }, [campaign?.template]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  const leadsCount = campaign?.csvData?.length || 0;
  const repliesCount = repliesMeta?.total ?? replies.length;
  const unreadReplies = repliesMeta?.unreadCount ?? 0;
  const tabConfig: Array<{
    id: CampaignDetailsTab;
    label: string;
    disabled?: boolean;
    badge?: number;
  }> = [
    { id: "overview", label: "Overview" },
    {
      id: "leads",
      label: `Leads (${leadsCount})`,
    },
    {
      id: "replies",
      label: `Replies (${repliesCount})`,
      badge: unreadReplies > 0 ? unreadReplies : undefined,
    },
  ];

  const formatDateTime = (value?: string) => {
    if (!value) return "N/A";
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  const formatReplyBody = (body: string) => {
    if (!body) return "";

    // Split by common quoted email patterns
    const quotedEmailPattern = /(\r\n|\n)On .+wrote:(\r\n|\n)/;
    const parts = body.split(quotedEmailPattern);

    if (parts.length > 1) {
      // Has quoted content
      const mainContent = parts[0].trim();
      const quotedContent = body.substring(mainContent.length).trim();

      return (
        <>
          <div className="mb-3">{mainContent}</div>
          {quotedContent && (
            <details className="mt-3 pt-3 border-t border-gray-300">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 font-semibold">
                Show quoted text
              </summary>
              <div className="mt-2 text-xs text-gray-500 italic pl-3 border-l-2 border-gray-300">
                {quotedContent}
              </div>
            </details>
          )}
        </>
      );
    }

    return body;
  };

  const scheduleInfo = getScheduleDisplay(campaign);

  const handleTabChange = (tab: CampaignDetailsTab) => {
    setActiveTab(tab);
    if (
      tab === "replies" &&
      replies.length === 0 &&
      onRefreshReplies &&
      !repliesLoading
    ) {
      onRefreshReplies();
    }
  };

  // Fetch presigned URL for S3 images
  useEffect(() => {
    if (!isOpen || !campaign) {
      setPresignedImageUrl("");
      setImageError(false);
      return;
    }

    const fetchPresignedUrl = async () => {
      if (!bodyImageUrl) {
        setPresignedImageUrl("");
        return;
      }

      // If it's a base64 image, use it directly
      if (bodyImageUrl.startsWith("data:")) {
        setPresignedImageUrl(bodyImageUrl);
        return;
      }

      // If it's an S3 URL, get presigned URL
      if (bodyImageUrl.includes("amazonaws.com")) {
        try {
          const response = await fetch("/api/s3-presigned-url", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ s3Url: bodyImageUrl }),
          });

          if (response.ok) {
            const data = await response.json();
            setPresignedImageUrl(data.url);
          } else {
            console.error("Failed to get presigned URL");
            setPresignedImageUrl(bodyImageUrl); // Fallback to original URL
          }
        } catch (error) {
          console.error("Error fetching presigned URL:", error);
          setPresignedImageUrl(bodyImageUrl); // Fallback to original URL
        }
      } else {
        // Regular URL (not S3), use directly
        setPresignedImageUrl(bodyImageUrl);
      }
    };

    fetchPresignedUrl();
    setImageError(false);
  }, [isOpen, campaign?.id, bodyImageUrl]);

  if (!isOpen || !campaign) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-opacity-50 backdrop-blur-md"
        onClick={onClose}
      ></div>
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-[#05112b] px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">{campaign.name}</h2>
            <p className="text-gray-300 text-sm mt-1">
              Campaign Details & Leads
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="bg-white px-6 pt-4 border-b border-gray-100">
          <div className="flex items-center gap-3 overflow-x-auto">
            {tabConfig.map((tab) => (
              <button
                key={tab.id}
                disabled={tab.disabled}
                onClick={() => handleTabChange(tab.id)}
                className={`relative px-4 py-2 text-sm font-semibold rounded-full transition-all ${
                  activeTab === tab.id
                    ? "bg-[#05112b] text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                } ${tab.disabled ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {tab.label}
                {tab.badge && (
                  <span
                    className={`absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full border ${
                      activeTab === tab.id
                        ? "bg-white/30 text-white border-white"
                        : "bg-[#05112b] text-white border-[#05112b]"
                    }`}
                  >
                    {tab.badge > 9 ? "9+" : tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-gray-50">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="bg-gray-100 rounded-xl border border-gray-300 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <div className="w-8 h-8 bg-[#05112b] rounded-lg flex items-center justify-center mr-2">
                      <Mail className="w-4 h-4 text-white" />
                    </div>
                    Email Template
                  </h3>
                  <div className="bg-white rounded-lg p-4 text-sm text-gray-900 shadow-sm border border-gray-200 min-h-[140px]">
                    {formattedTemplate ? (
                      <div
                        className="space-y-2"
                        dangerouslySetInnerHTML={{ __html: formattedTemplate }}
                      />
                    ) : (
                      <p className="text-gray-400 italic">No template set</p>
                    )}
                  </div>
                  {bodyImageUrl && (
                    <div className="mt-4">
                      {imageError ? (
                        <div className="text-center py-8 text-gray-500 border border-gray-300 rounded-lg">
                          <p className="text-sm">Failed to load image</p>
                          <p className="text-xs mt-1 break-all">
                            {bodyImageUrl.startsWith("http")
                              ? bodyImageUrl
                              : "Base64 image"}
                          </p>
                        </div>
                      ) : presignedImageUrl ? (
                        <img
                          src={presignedImageUrl}
                          alt="Email body image"
                          className="max-w-full rounded-lg"
                          onError={() => setImageError(true)}
                          onLoad={() => setImageError(false)}
                        />
                      ) : (
                        <div className="text-center py-8 text-gray-400">
                          <p className="text-sm">Loading image...</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-100 rounded-xl border border-gray-300 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <div className="w-8 h-8 bg-[#05112b] rounded-lg flex items-center justify-center mr-2">
                    <Eye className="w-4 h-4 text-white" />
                  </div>
                  Campaign Information
                </h3>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <dt className="text-xs font-bold text-gray-500 uppercase">
                      Subject
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 font-semibold">
                      {campaign.subject || "N/A"}
                    </dd>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <dt className="text-xs font-bold text-gray-500 uppercase">
                      Status
                    </dt>
                    <dd className="mt-1">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200 capitalize">
                        {campaign.status}
                      </span>
                    </dd>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <dt className="text-xs font-bold text-gray-500 uppercase">
                      Created
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 font-semibold">
                      {new Date(campaign.createdAt).toLocaleDateString()}
                    </dd>
                  </div>

                  {(scheduleInfo.dateLabel || scheduleInfo.timeLabel) && (
                    <div className="bg-white rounded-lg p-3 shadow-sm sm:col-span-2">
                      <dt className="text-xs font-bold text-gray-500 uppercase">
                        Start Date & Time
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 font-semibold">
                        {scheduleInfo.dateLabel || "Not scheduled"}
                        {scheduleInfo.timeLabel &&
                          ` at ${scheduleInfo.timeLabel}`}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          )}

          {activeTab === "leads" && (
            <>
              {campaign.csvData && campaign.csvData.length > 0 ? (
                <div className="bg-gray-100 rounded-xl border border-gray-300 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <div className="w-8 h-8 bg-[#05112b] rounded-lg flex items-center justify-center mr-2">
                      <Eye className="w-4 h-4 text-white" />
                    </div>
                    Leads ({campaign.csvData.length} total)
                  </h3>
                  <div className="overflow-x-auto rounded-xl shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200 bg-white rounded-xl overflow-hidden">
                      <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                        <tr>
                          {Object.keys(campaign.csvData[0] || {}).map((key) => (
                            <th
                              key={key}
                              className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"
                            >
                              {key}
                            </th>
                          ))}
                          <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {campaign.csvData.map((lead, index) => (
                          <tr
                            key={index}
                            className="hover:bg-gray-50 transition-all duration-200"
                          >
                            {Object.values(lead).map(
                              (value: any, valueIndex) => (
                                <td
                                  key={valueIndex}
                                  className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium"
                                >
                                  {value || "-"}
                                </td>
                              )
                            )}
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <button
                                onClick={() =>
                                  onPreview(
                                    lead,
                                    campaign.template,
                                    campaign.subject,
                                    bodyImageUrl
                                  )
                                }
                                className="inline-flex items-center px-3 py-1.5 text-[#05112b] hover:bg-gray-100 rounded-lg transition-all border border-transparent hover:border-gray-300"
                                title="Preview email for this lead"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                <span className="text-xs font-semibold">
                                  Preview
                                </span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center bg-white rounded-2xl border border-dashed border-gray-300 py-12">
                  <p className="text-gray-500 font-medium">
                    No leads available for this campaign yet.
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Upload a CSV to see lead level information here.
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === "replies" && (
            <div className="space-y-4">
              <div className="bg-gray-100 rounded-xl border border-gray-300 p-5 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center shadow-sm">
                      <MessageSquare className="w-4 h-4 text-[#05112b]" />
                    </div>
                    Replies
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {repliesCount > 0
                      ? `${repliesCount} total replies • ${unreadReplies} unread`
                      : "Webhook replies will appear here as soon as they arrive"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {repliesLoading && (
                    <div className="flex items-center text-sm text-[#05112b] font-semibold">
                      <span className="animate-spin mr-2 h-4 w-4 border-2 border-[#05112b] border-t-transparent rounded-full"></span>
                      Syncing replies...
                    </div>
                  )}
                  {onRefreshReplies && (
                    <button
                      onClick={onRefreshReplies}
                      disabled={repliesLoading}
                      className="inline-flex items-center px-4 py-2 bg-white text-[#05112b] rounded-lg border border-gray-300 font-semibold text-sm hover:bg-gray-100 transition-all disabled:opacity-60"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </button>
                  )}
                </div>
              </div>

              {repliesError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4">
                  {repliesError}
                </div>
              )}

              {replies.length === 0 && !repliesLoading ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-300 text-center py-12 px-6">
                  <p className="text-gray-500 font-medium">
                    No replies detected for this campaign yet.
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Once your webhook stores replies, they will appear here
                    automatically.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            {reply.leadName || reply.leadEmail}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {reply.leadEmail}
                          </p>
                        </div>
                        <div className="flex items-center text-xs text-gray-500 gap-1">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {formatDateTime(reply.receivedAt)}
                        </div>
                      </div>
                      {reply.subject && (
                        <p className="text-sm font-semibold text-gray-800">
                          {reply.subject}
                        </p>
                      )}
                      <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 text-sm text-gray-700 whitespace-pre-wrap break-words overflow-auto max-h-96">
                        {formatReplyBody(reply.body)}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-bold ${
                            reply.status === "read"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : reply.status === "flagged"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-gray-100 text-[#05112b] border-gray-300"
                          }`}
                        >
                          {reply.status ? reply.status.toUpperCase() : "UNREAD"}
                        </span>
                        {reply.leadData && (
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(reply.leadData)
                              .slice(0, 3)
                              .map(([key, value]) => (
                                <div
                                  key={key}
                                  className="bg-gray-100 rounded-lg px-2 py-1 text-[11px] font-semibold text-gray-600"
                                >
                                  {key}: {String(value)}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
