"use client";

import { useState, useEffect } from "react";
import { X, Upload, Image as ImageIcon, Eye } from "lucide-react";
import { Campaign, Domain } from "../types";
import Papa from "papaparse";
import toast from "react-hot-toast";
import RemoveLeadsConfirmModal from "./RemoveLeadsConfirmModal";
import RemoveLeadConfirmModal from "./RemoveLeadConfirmModal";

interface EditCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign;
  domains: Domain[];
  onUpdate: (id: string, data: any) => Promise<void>;
  onPreview: (
    lead: any,
    template?: string,
    subject?: string,
    bodyImage?: string
  ) => void;
  onRemoveAllLeads: () => void;
  onRemoveLead: (index: number) => void;
  showRemoveLeadsConfirm: boolean;
  showRemoveLeadConfirm: boolean;
  leadToRemove: number | null;
  onCloseRemoveLeadsConfirm: () => void;
  onCloseRemoveLeadConfirm: () => void;
  onConfirmRemoveAllLeads: () => void;
  onConfirmRemoveLead: () => void;
}

export default function EditCampaignModal({
  isOpen,
  onClose,
  campaign,
  domains,
  onUpdate,
  onPreview,
  onRemoveAllLeads,
  onRemoveLead,
  showRemoveLeadsConfirm,
  showRemoveLeadConfirm,
  leadToRemove,
  onCloseRemoveLeadsConfirm,
  onCloseRemoveLeadConfirm,
  onConfirmRemoveAllLeads,
  onConfirmRemoveLead,
}: EditCampaignModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: campaign.name || "",
    domainId: campaign.domainId || "",
    subject: campaign.subject || "",
    template: campaign.template || "",
    followUpTemplate: campaign.followUpTemplate || "",
    followUpDelay: campaign.followUpDelay || 7,
    startDate: campaign.startDate || "",
    startTime: campaign.startTime || "",
  });
  // Initialize with S3 URL if available, otherwise fallback to bodyImage (for backward compatibility)
  const [bodyImage, setBodyImage] = useState<string>(
    campaign.bodyImageS3Url || campaign.bodyImage || ""
  );
  const [bodyImageFile, setBodyImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<boolean>(false);
  const [presignedImageUrl, setPresignedImageUrl] = useState<string>("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>(campaign.csvData || []);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);

  // Initialize columns from existing CSV data
  useEffect(() => {
    if (csvData.length > 0) {
      const columns = Object.keys(csvData[0]).filter(
        (key) => key.trim() !== ""
      );
      setCsvColumns(columns);
    }
  }, [csvData]);

  // Fetch presigned URL for S3 images
  useEffect(() => {
    const fetchPresignedUrl = async () => {
      if (!bodyImage) {
        setPresignedImageUrl("");
        return;
      }

      // If it's a base64 image, use it directly
      if (bodyImage.startsWith("data:")) {
        setPresignedImageUrl(bodyImage);
        return;
      }

      // If it's an S3 URL, get presigned URL
      if (bodyImage.includes("amazonaws.com")) {
        try {
          const response = await fetch("/api/s3-presigned-url", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ s3Url: bodyImage }),
          });

          if (response.ok) {
            const data = await response.json();
            setPresignedImageUrl(data.url);
          } else {
            console.error("Failed to get presigned URL");
            setPresignedImageUrl(bodyImage); // Fallback to original URL
          }
        } catch (error) {
          console.error("Error fetching presigned URL:", error);
          setPresignedImageUrl(bodyImage); // Fallback to original URL
        }
      } else {
        // Regular URL (not S3), use directly
        setPresignedImageUrl(bodyImage);
      }
    };

    fetchPresignedUrl();
    setImageError(false);
  }, [bodyImage]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setBodyImage(reader.result as string);
      setBodyImageFile(file);
      toast.success("Image uploaded successfully");
    };
    reader.onerror = () => {
      toast.error("Failed to read image file");
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    setCsvFile(file);
    Papa.parse(file, {
      header: true,
      complete: (results: Papa.ParseResult<any>) => {
        const data = results.data as any[];
        setCsvData(data);

        if (data.length > 0) {
          const columns = Object.keys(data[0]).filter(
            (key) => key.trim() !== ""
          );
          setCsvColumns(columns);
          toast.success(
            `Loaded ${data.length} leads from CSV with columns: ${columns.join(
              ", "
            )}`
          );
        } else {
          setCsvColumns([]);
          toast.success("CSV file loaded but no data found");
        }
      },
      error: (error: Error) => {
        toast.error("Failed to parse CSV file");
        console.error(error);
      },
    });
  };

  const uploadFileToS3 = async (
    file: File,
    fileType: "image" | "csv"
  ): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileType", fileType);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to upload file to S3");
    }

    const data = await response.json();
    return data.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      // Upload image to S3 if a new image was uploaded
      let bodyImageUrl = campaign.bodyImageS3Url || campaign.bodyImage || "";
      if (bodyImageFile) {
        toast.loading("Uploading image to S3...", { id: "upload-image" });
        bodyImageUrl = await uploadFileToS3(bodyImageFile, "image");
        toast.success("Image uploaded successfully", { id: "upload-image" });
      }

      // Upload CSV file to S3 if a new CSV was uploaded
      let csvFileUrl = campaign.csvFileS3Url || "";
      if (csvFile) {
        toast.loading("Uploading CSV file to S3...", { id: "upload-csv" });
        csvFileUrl = await uploadFileToS3(csvFile, "csv");
        toast.success("CSV file uploaded successfully", { id: "upload-csv" });
      }

      await onUpdate(campaign.id, {
        ...formData,
        bodyImage: bodyImageUrl,
        bodyImageS3Url: bodyImageUrl,
        csvFileS3Url: csvFileUrl,
        csvData,
      });
      toast.success("Campaign updated successfully!");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to update campaign");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-white bg-opacity-30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Edit Campaign</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Campaign Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                required
              />
            </div>

            {/* Domain Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sending Domain *
              </label>
              <select
                value={formData.domainId}
                onChange={(e) =>
                  setFormData({ ...formData, domainId: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                required
              >
                <option value="">Select a domain</option>
                {domains
                  .filter((d) => d.status === "connected")
                  .map((domain) => (
                    <option key={domain.id} value={domain.id}>
                      {domain.name} ({domain.type})
                    </option>
                  ))}
              </select>
            </div>

            {/* Email Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Subject *
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                required
              />
            </div>

            {/* Email Template */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Template *
              </label>
              <textarea
                value={formData.template}
                onChange={(e) =>
                  setFormData({ ...formData, template: e.target.value })
                }
                rows={8}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm text-gray-900"
                required
              />
              <div className="mt-2 space-y-2">
                {csvColumns.length > 0 ? (
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-2">
                      Available Placeholders (from CSV):
                    </p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {csvColumns.map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => {
                            const placeholder = `{{${col.toLowerCase()}}}`;
                            setFormData({
                              ...formData,
                              template: formData.template + placeholder,
                            });
                          }}
                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-mono cursor-pointer"
                          title={`Click to insert ${col} placeholder`}
                        >
                          {"{{"}
                          {col.toLowerCase()}
                          {"}}"}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      Click placeholders above to insert them into the template
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    Upload a CSV file to see available placeholders. Use format:{" "}
                    {"{{columnname}}"}
                  </p>
                )}
              </div>
              {/* Body Image Upload */}
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Body Image (Optional)
                </label>
                {bodyImage ? (
                  <div className="relative border border-gray-300 rounded-lg p-4 bg-gray-50">
                    {imageError ? (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">Failed to load image</p>
                        <p className="text-xs mt-1">
                          URL: {bodyImage.substring(0, 50)}...
                        </p>
                      </div>
                    ) : presignedImageUrl ? (
                      <img
                        src={presignedImageUrl}
                        alt="Body preview"
                        className="max-h-48 mx-auto rounded"
                        onError={() => setImageError(true)}
                        onLoad={() => setImageError(false)}
                      />
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <p className="text-sm">Loading image...</p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setBodyImage("");
                        setBodyImageFile(null);
                        setImageError(false);
                        setPresignedImageUrl("");
                      }}
                      className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-400 transition-colors">
                    <div className="space-y-1 text-center">
                      <ImageIcon className="mx-auto h-8 w-8 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                          <span>Upload image</span>
                          <input
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={handleImageUpload}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">Max 5MB</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Follow-up Template */}
            {/* <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Follow-up Email Template (Optional)
              </label>
              <textarea
                value={formData.followUpTemplate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    followUpTemplate: e.target.value,
                  })
                }
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm text-gray-900"
              />
              <div className="mt-2 flex items-center space-x-4">
                <label className="block text-sm font-medium text-gray-700">
                  Send follow-up after:
                </label>
                <input
                  type="number"
                  value={formData.followUpDelay}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      followUpDelay: parseInt(e.target.value) || 7,
                    })
                  }
                  min="1"
                  className="w-20 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <span className="text-sm text-gray-600">days</span>
              </div>
            </div> */}

            {/* CSV Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Leads CSV (Optional)
              </label>
              {csvFile || csvData.length > 0 ? (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <span className="text-sm text-gray-700">
                      {csvFile
                        ? `${csvFile.name} (${csvData.length} leads)`
                        : `${csvData.length} leads loaded`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCsvFile(null);
                        setCsvData([]);
                        setCsvColumns([]);
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  {csvColumns.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs font-medium text-blue-900 mb-2">
                        Available CSV Columns:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {csvColumns.map((col) => (
                          <span
                            key={col}
                            className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono"
                          >
                            {col}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-400 transition-colors">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-8 w-8 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                        <span>Upload a file</span>
                        <input
                          type="file"
                          className="sr-only"
                          accept=".csv"
                          onChange={handleFileUpload}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">CSV up to 10MB</p>
                  </div>
                </div>
              )}
            </div>

            {/* Schedule */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>
            </div>

            {/* Leads Section */}
            {csvData.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Leads ({csvData.length} total)
                </label>
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          {Object.keys(csvData[0] || {}).map((key) => (
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
                        {csvData.map((lead, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            {Object.entries(lead).map(
                              ([key, value], valueIndex) => (
                                <td
                                  key={valueIndex}
                                  className="px-4 py-2 whitespace-nowrap"
                                >
                                  <input
                                    type="text"
                                    value={String(value || "")}
                                    onChange={(e) => {
                                      const updatedData = [...csvData];
                                      updatedData[index] = {
                                        ...updatedData[index],
                                        [key]: e.target.value,
                                      };
                                      setCsvData(updatedData);
                                    }}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                  />
                                </td>
                              )
                            )}
                            <td className="px-4 py-2 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    onPreview(
                                      lead,
                                      formData.template,
                                      formData.subject,
                                      bodyImage
                                    )
                                  }
                                  className="text-blue-600 hover:text-blue-800"
                                  title="Preview email for this lead"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onRemoveLead(index)}
                                  className="text-red-600 hover:text-red-800"
                                  title="Remove this lead"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (csvData.length > 0) {
                            const newRow: any = {};
                            Object.keys(csvData[0] || {}).forEach((key) => {
                              newRow[key] = "";
                            });
                            setCsvData([...csvData, newRow]);
                            toast.success("New lead row added");
                          } else if (csvColumns.length > 0) {
                            const newRow: any = {};
                            csvColumns.forEach((col) => {
                              newRow[col] = "";
                            });
                            setCsvData([newRow]);
                            toast.success("New lead row added");
                          } else {
                            toast.error("Please upload CSV first");
                          }
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        + Add New Lead
                      </button>
                      <button
                        type="button"
                        onClick={onRemoveAllLeads}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Remove All Leads
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Click on any cell to edit. Changes will be saved when you
                      update the campaign.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex items-center justify-end space-x-4 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Updating..." : "Update Campaign"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Modals */}
      {showRemoveLeadsConfirm && (
        <RemoveLeadsConfirmModal
          isOpen={showRemoveLeadsConfirm}
          onClose={onCloseRemoveLeadsConfirm}
          onConfirm={() => {
            setCsvData([]);
            setCsvFile(null);
            setCsvColumns([]);
            onConfirmRemoveAllLeads();
          }}
          leadCount={csvData.length}
        />
      )}

      {showRemoveLeadConfirm && leadToRemove !== null && (
        <RemoveLeadConfirmModal
          isOpen={showRemoveLeadConfirm}
          onClose={onCloseRemoveLeadConfirm}
          onConfirm={() => {
            const updatedData = csvData.filter((_, i) => i !== leadToRemove);
            setCsvData(updatedData);
            onConfirmRemoveLead();
          }}
        />
      )}
    </>
  );
}
