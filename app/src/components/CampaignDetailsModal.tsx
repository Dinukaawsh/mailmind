"use client";

import { useState, useEffect } from "react";
import { X, Eye } from "lucide-react";
import { Campaign } from "../types";

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
    <div className="fixed inset-0 bg-opacity-30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">{campaign.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          {/* Campaign Details */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Email Template
              </h3>
              <div className="bg-white rounded-lg p-4 font-mono text-sm whitespace-pre-wrap text-gray-900">
                {campaign.template || "No template set"}
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
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Campaign Information
            </h3>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Subject</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {campaign.subject || "N/A"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">
                  {campaign.status}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(campaign.createdAt).toLocaleDateString()}
                </dd>
              </div>

              {campaign.startDate && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Start Date
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {campaign.startDate}
                  </dd>
                </div>
              )}
              {campaign.startTime && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Start Time
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {campaign.startTime}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Leads Section */}
          {campaign.csvData && campaign.csvData.length > 0 && (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Leads ({campaign.csvData.length} total)
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg">
                  <thead className="bg-gray-100">
                    <tr>
                      {Object.keys(campaign.csvData[0] || {}).map((key) => (
                        <th
                          key={key}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                        >
                          {key}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {campaign.csvData.map((lead, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        {Object.values(lead).map((value: any, valueIndex) => (
                          <td
                            key={valueIndex}
                            className="px-4 py-3 whitespace-nowrap text-sm text-gray-900"
                          >
                            {value || "-"}
                          </td>
                        ))}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() =>
                              onPreview(
                                lead,
                                campaign.template,
                                campaign.subject,
                                bodyImageUrl
                              )
                            }
                            className="text-blue-600 hover:text-blue-800"
                            title="Preview email for this lead"
                          >
                            <Eye className="w-4 h-4" />
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
