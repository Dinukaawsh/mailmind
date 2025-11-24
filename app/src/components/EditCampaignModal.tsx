"use client";

import { useState, useEffect } from "react";
import { X, Upload, Image as ImageIcon, Eye } from "lucide-react";
import { Campaign, Domain } from "../types";
import Papa from "papaparse";
import toast from "react-hot-toast";
import RemoveLeadsConfirmModal from "./RemoveLeadsConfirmModal";
import RemoveLeadConfirmModal from "./RemoveLeadConfirmModal";
import { Dropdown, DropdownOption, Input, DatePicker, TimePicker } from "./ui";
import TemplateEditor from "./ui/TemplateEditor";

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
  const [errors, setErrors] = useState({
    name: "",
    domainId: "",
    subject: "",
    template: "",
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

  // Reset form state when campaign changes or modal opens
  useEffect(() => {
    if (isOpen && campaign) {
      setFormData({
        name: campaign.name || "",
        domainId: campaign.domainId || "",
        subject: campaign.subject || "",
        template: campaign.template || "",
        followUpTemplate: campaign.followUpTemplate || "",
        followUpDelay: campaign.followUpDelay || 7,
        startDate: campaign.startDate || "",
        startTime: campaign.startTime || "",
      });
      setErrors({
        name: "",
        domainId: "",
        subject: "",
        template: "",
      });
      // Reset image state from campaign (will be empty if deleted)
      setBodyImage(campaign.bodyImageS3Url || campaign.bodyImage || "");
      setBodyImageFile(null);
      setImageError(false);
      setCsvData(campaign.csvData || []);
      setCsvFile(null);
    }
  }, [isOpen, campaign?.id]);

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

  const findAndNormalizeEmailColumn = (data: any[]): any[] => {
    if (data.length === 0) return data;

    const firstRow = data[0];
    const columns = Object.keys(firstRow).filter((key) => key.trim() !== "");

    // Find email column (case-insensitive, can contain "email" anywhere)
    // Prioritize exact matches first, then partial matches
    let emailColumnKey = columns.find(
      (col) => col.toLowerCase().trim() === "email"
    );

    // If no exact match, find any column containing "email"
    if (!emailColumnKey) {
      emailColumnKey = columns.find((col) =>
        col.toLowerCase().includes("email")
      );
    }

    if (!emailColumnKey) {
      throw new Error(
        "CSV file must contain an email column (e.g., 'email', 'Email', 'EMAIL', 'user email', etc.)"
      );
    }

    // Always normalize to "Email" (capital E, rest lowercase) to ensure consistency
    // This ensures the webhook always receives "Email" as the field name
    if (emailColumnKey === "Email") {
      // Already normalized, but ensure all rows have it
      return data.map((row) => {
        const newRow = { ...row };
        // Ensure Email field exists and is properly formatted
        if (!newRow["Email"] && newRow[emailColumnKey]) {
          newRow["Email"] = newRow[emailColumnKey];
        }
        return newRow;
      });
    }

    // Normalize the email column to "Email" in all rows
    const normalizedData = data.map((row) => {
      const newRow = { ...row };
      // Copy email value to "Email" field
      newRow["Email"] = newRow[emailColumnKey];
      // Remove the old email column if it's different from "Email"
      if (emailColumnKey !== "Email") {
        delete newRow[emailColumnKey];
      }
      return newRow;
    });

    return normalizedData;
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
        try {
          const data = results.data as any[];

          if (data.length > 0) {
            // Validate and normalize email column
            const normalizedData = findAndNormalizeEmailColumn(data);
            setCsvData(normalizedData);

            const columns = Object.keys(normalizedData[0]).filter(
              (key) => key.trim() !== ""
            );
            setCsvColumns(columns);
            toast.success(
              `Loaded ${
                normalizedData.length
              } leads from CSV with columns: ${columns.join(", ")}`
            );
          } else {
            setCsvData([]);
            setCsvColumns([]);
            toast.success("CSV file loaded but no data found");
          }
        } catch (error: any) {
          toast.error(error.message || "Failed to process CSV file");
          setCsvFile(null);
          setCsvData([]);
          setCsvColumns([]);
          console.error(error);
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

  const validateForm = (): boolean => {
    const newErrors = {
      name: "",
      domainId: "",
      subject: "",
      template: "",
    };

    if (!formData.name.trim()) {
      newErrors.name = "Campaign name is required";
    }

    if (!formData.domainId || !formData.domainId.trim()) {
      newErrors.domainId = "Please select a domain";
    } else {
      // Check if the selected domain exists and has a webhook URL
      const selectedDomain = domains.find((d) => d.id === formData.domainId);
      if (!selectedDomain) {
        newErrors.domainId = "Selected domain not found";
      } else if (!selectedDomain.webhookUrl) {
        newErrors.domainId = "Selected domain has no webhook URL configured";
      }
    }

    if (!formData.subject.trim()) {
      newErrors.subject = "Subject is required";
    }

    if (!formData.template.trim()) {
      newErrors.template = "Email template is required";
    }

    setErrors(newErrors);

    // Return true if no errors
    return !Object.values(newErrors).some((error) => error !== "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if there are any connected domains available
    if (domainOptions.length === 0) {
      toast.error("No connected domains available. Please add a domain first.");
      return;
    }

    // Validate form before proceeding
    if (!validateForm()) {
      toast.error("Please fill in all required fields correctly");
      return;
    }

    try {
      setLoading(true);

      // Handle image: if bodyImage is empty (user deleted it), set to empty string
      // Otherwise, if new image uploaded, upload it; if not, keep existing
      let bodyImageUrl = "";
      if (bodyImageFile) {
        // New image uploaded
        toast.loading("Uploading image to S3...", { id: "upload-image" });
        bodyImageUrl = await uploadFileToS3(bodyImageFile, "image");
        toast.success("Image uploaded successfully", { id: "upload-image" });
      } else if (bodyImage) {
        // Image still exists (not deleted), use existing
        bodyImageUrl = bodyImage;
      } else {
        // Image was deleted (bodyImage is empty), explicitly set to empty string
        bodyImageUrl = "";
      }

      // Upload CSV file to S3 if a new CSV was uploaded
      let csvFileUrl = campaign.csvFileS3Url || "";
      if (csvFile) {
        toast.loading("Uploading CSV file to S3...", { id: "upload-csv" });
        csvFileUrl = await uploadFileToS3(csvFile, "csv");
        toast.success("CSV file uploaded successfully", { id: "upload-csv" });
      }

      // Ensure email column is normalized to "Email" before sending to webhook
      const normalizedCsvData = findAndNormalizeEmailColumn(csvData);

      await onUpdate(campaign.id, {
        ...formData,
        bodyImage: bodyImageUrl,
        bodyImageS3Url: bodyImageUrl,
        csvFileS3Url: csvFileUrl,
        csvData: normalizedCsvData,
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

  // Convert domains to dropdown options
  const domainOptions: DropdownOption[] = domains
    .filter((d) => d.status === "connected")
    .map((domain) => ({
      value: domain.id,
      label: `${domain.name} (${domain.type})`,
    }));

  // Get webhook URL for selected domain
  const selectedDomain = domains.find((d) => d.id === formData.domainId);
  const webhookUrl = selectedDomain?.webhookUrl || "N/A";

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-opacity-50 backdrop-blur-md"
          onClick={onClose}
        ></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="sticky top-0 bg-[#05112b] px-6 py-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Edit Campaign</h2>
              <p className="mt-1 text-sm text-gray-300">
                Update campaign details and settings
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <form
            onSubmit={handleSubmit}
            className="p-6 space-y-6 overflow-y-auto flex-1"
          >
            {/* Campaign Name */}
            <Input
              label="Campaign Name"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                setErrors({ ...errors, name: "" });
              }}
              placeholder="Campaign name"
              required
              inputSize="lg"
              error={errors.name}
            />

            {/* Domain Selection */}
            <div>
              <Dropdown
                label="Sending Domain"
                options={domainOptions}
                value={formData.domainId}
                onChange={(value) => {
                  setFormData({ ...formData, domainId: value });
                  setErrors({ ...errors, domainId: "" });
                }}
                placeholder={
                  domainOptions.length === 0
                    ? "No connected domains available"
                    : "Select a domain"
                }
                required
                error={errors.domainId}
              />
              {domainOptions.length === 0 && (
                <p className="mt-2 text-sm text-amber-600">
                  Please add and connect a domain first from the Domains page
                </p>
              )}
            </div>

            {/* Webhook URL Display - only show when domain is selected */}
            {formData.domainId && (
              <Input
                label="Webhook URL"
                value={webhookUrl}
                disabled
                helperText="Webhook URL for the selected domain (auto-updates when domain changes)"
                inputSize="lg"
              />
            )}

            {/* Email Subject */}
            <Input
              label="Email Subject"
              value={formData.subject}
              onChange={(e) => {
                setFormData({ ...formData, subject: e.target.value });
                setErrors({ ...errors, subject: "" });
              }}
              placeholder="Email subject"
              required
              error={errors.subject}
            />

            {/* Email Template */}
            <div>
              <TemplateEditor
                label="Email Template *"
                value={formData.template}
                onChange={(value) => {
                  setFormData({ ...formData, template: value });
                  setErrors({ ...errors, template: "" });
                }}
                error={errors.template}
                csvColumns={csvColumns}
                helperText="Supports Markdown (bold, underline, lists, links) and CSV placeholders."
                required
              />
              {/* Body Image Upload */}
              <div className="mt-4">
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
                  <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-[#beb7c9] transition-colors">
                    <div className="space-y-1 text-center">
                      <ImageIcon className="mx-auto h-8 w-8 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-[#05112b] hover:text-[#05112b]/80">
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
                    <div className="bg-gray-100 border border-gray-300 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-900 mb-2">
                        Available CSV Columns:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {csvColumns.map((col) => (
                          <span
                            key={col}
                            className="px-2 py-1 bg-gray-200 text-[#05112b] rounded text-xs font-mono"
                          >
                            {col}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-[#beb7c9] transition-colors">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-8 w-8 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-[#05112b] hover:text-[#05112b]/80">
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
              <DatePicker
                label="Start Date"
                value={formData.startDate}
                onChange={(value) =>
                  setFormData({ ...formData, startDate: value })
                }
                helperText="When to start the campaign"
              />
              <TimePicker
                label="Start Time"
                value={formData.startTime}
                onChange={(value) =>
                  setFormData({ ...formData, startTime: value })
                }
                helperText="Time to send emails"
              />
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
                      <thead className="bg-gray-100 sticky top-0 z-10">
                        <tr>
                          {Object.keys(csvData[0] || {}).map((key) => (
                            <th
                              key={key}
                              className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-100 min-w-[200px]"
                            >
                              {key}
                            </th>
                          ))}
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-100 sticky right-0">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {csvData.map((lead, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            {Object.entries(lead).map(
                              ([key, value], valueIndex) => (
                                <td key={valueIndex} className="px-3 py-3">
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
                                    className="w-full min-w-[180px] px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#beb7c9] focus:border-[#beb7c9] text-gray-900 placeholder-gray-400 outline-none transition-all"
                                    placeholder={`Enter ${key.toLowerCase()}`}
                                  />
                                </td>
                              )
                            )}
                            <td className="px-4 py-3 whitespace-nowrap sticky right-0 bg-white">
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
                                  className="p-2 text-[#05112b] hover:text-[#05112b]/80 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Preview email for this lead"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onRemoveLead(index)}
                                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
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
                        className="text-sm text-[#05112b] hover:text-[#05112b]/80 font-medium"
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
            <div className="grid grid-cols-2 gap-4 pt-6 border-t-2 border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-[#05112b] text-white font-bold rounded-xl hover:bg-[#05112b]/90 transition-all disabled:opacity-50 shadow-lg"
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
