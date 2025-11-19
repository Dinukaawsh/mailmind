"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Eye, Mail } from "lucide-react";
import { Campaign } from "../types";
import DOMPurify from "dompurify";
import { marked } from "marked";

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
}

export default function CampaignDetailsModal({
  isOpen,
  onClose,
  campaign,
  onPreview,
}: CampaignDetailsModalProps) {
  // Get image URL - prefer S3 URL, fallback to bodyImage (for backward compatibility)
  const bodyImageUrl = campaign?.bodyImageS3Url || campaign?.bodyImage;
  const [imageError, setImageError] = useState<boolean>(false);
  const [presignedImageUrl, setPresignedImageUrl] = useState<string>("");

  const formattedTemplate = useMemo(() => {
    if (!campaign?.template?.trim()) return "";
    const html = marked.parse(campaign.template);
    return DOMPurify.sanitize(html as unknown as string);
  }, [campaign?.template]);

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
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">{campaign.name}</h2>
            <p className="text-purple-100 text-sm mt-1">
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
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Campaign Details */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-2">
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
            {/* <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Follow-up Template
              </h3>
              <div className="bg-white rounded-lg p-4 font-mono text-sm whitespace-pre-wrap text-gray-900">
                {campaign.followUpTemplate || "No follow-up template set"}
              </div>
              {campaign.followUpDelay && (
                <p className="mt-2 text-sm text-gray-600">
                  Follow-up delay: {campaign.followUpDelay} days
                </p>
              )}
            </div> */}
          </div>

          {/* Campaign Info */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center mr-2">
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

              {campaign.startDate && (
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <dt className="text-xs font-bold text-gray-500 uppercase">
                    Start Date
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 font-semibold">
                    {campaign.startDate}
                  </dd>
                </div>
              )}
              {campaign.startTime && (
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <dt className="text-xs font-bold text-gray-500 uppercase">
                    Start Time
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 font-semibold">
                    {campaign.startTime}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Leads Section */}
          {campaign.csvData && campaign.csvData.length > 0 && (
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center mr-2">
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
                        className="hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 transition-all duration-200"
                      >
                        {Object.values(lead).map((value: any, valueIndex) => (
                          <td
                            key={valueIndex}
                            className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium"
                          >
                            {value || "-"}
                          </td>
                        ))}
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
                            className="inline-flex items-center px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-200"
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
          )}
        </div>
      </div>
    </div>
  );
}
