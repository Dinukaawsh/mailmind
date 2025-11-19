"use client";

import { useState, useEffect } from "react";
import {
  Upload,
  X,
  Image as ImageIcon,
  Eye,
  Trash2,
  Search,
} from "lucide-react";
import { campaignApi, domainApi } from "../utils/api";
import { Domain } from "../types";
import toast from "react-hot-toast";
import Papa from "papaparse";
import PreviewModal from "./PreviewModal";
import {
  Checkbox,
  Dropdown,
  DropdownOption,
  Input,
  DatePicker,
  TimePicker,
} from "./ui";
import TemplateEditor from "./ui/TemplateEditor";

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateCampaignModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateCampaignModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    domainId: "",
    subject: "",
    template: "",
    followUpTemplate: "",
    followUpDelay: "",
    startDate: "",
    startTime: "",
  });
  const [errors, setErrors] = useState({
    name: "",
    domainId: "",
    subject: "",
    template: "",
    csvData: "",
  });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [hasValidEmailColumn, setHasValidEmailColumn] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [domains, setDomains] = useState<Domain[]>([]);
  const [bodyImage, setBodyImage] = useState<string>("");
  const [bodyImageFile, setBodyImageFile] = useState<File | null>(null);
  const [bodyImageS3Url, setBodyImageS3Url] = useState<string>("");
  const [csvFileS3Url, setCsvFileS3Url] = useState<string>("");
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewLead, setPreviewLead] = useState<any | null>(null);
  const [previewContent, setPreviewContent] = useState<string>("");
  const [previewSubject, setPreviewSubject] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      loadDomains();
    }
  }, [isOpen]);

  const loadDomains = async () => {
    try {
      const data = await domainApi.getAll();
      setDomains(data);
    } catch (error) {
      console.error("Failed to load domains", error);
      toast.error("Failed to load domains");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      domainId: "",
      subject: "",
      template: "",
      followUpTemplate: "",
      followUpDelay: "",
      startDate: "",
      startTime: "",
    });
    setErrors({
      name: "",
      domainId: "",
      subject: "",
      template: "",
      csvData: "",
    });
    setCsvFile(null);
    setCsvData([]);
    setCsvColumns([]);
    setHasValidEmailColumn(false);
    setSelectedLeads(new Set());
    setSearchQuery("");
    setBodyImage("");
    setBodyImageFile(null);
    setBodyImageS3Url("");
    setCsvFileS3Url("");
  };

  const validateForm = (): boolean => {
    const newErrors = {
      name: "",
      domainId: "",
      subject: "",
      template: "",
      csvData: "",
    };

    let isValid = true;

    // Validate campaign name
    if (!formData.name.trim()) {
      newErrors.name = "Campaign name is required";
      isValid = false;
    }

    // Validate domain selection
    if (!formData.domainId) {
      newErrors.domainId = "Please select a sending domain";
      isValid = false;
    }

    // Validate email subject
    if (!formData.subject.trim()) {
      newErrors.subject = "Email subject is required";
      isValid = false;
    }

    // Validate email template
    if (!formData.template.trim()) {
      newErrors.template = "Email template is required";
      isValid = false;
    }

    // Validate CSV data
    if (csvData.length === 0) {
      newErrors.csvData = "Please upload a CSV file with leads";
      isValid = false;
    } else if (!hasValidEmailColumn) {
      newErrors.csvData = "CSV file must contain a valid email column";
      isValid = false;
    } else if (selectedLeads.size === 0) {
      newErrors.csvData = "Please select at least one lead";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
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
            setHasValidEmailColumn(true);
            toast.success(
              `Loaded ${
                normalizedData.length
              } leads from CSV with columns: ${columns.join(", ")}`
            );
            // Auto-select all leads when uploaded
            const allIndices = new Set(normalizedData.map((_, idx) => idx));
            setSelectedLeads(allIndices);
            // Clear CSV error if exists
            if (errors.csvData) setErrors({ ...errors, csvData: "" });
          } else {
            setCsvData([]);
            setCsvColumns([]);
            setHasValidEmailColumn(false);
            toast.success("CSV file loaded but no data found");
          }
        } catch (error: any) {
          toast.error(error.message || "Failed to process CSV file");
          setCsvFile(null);
          setCsvData([]);
          setCsvColumns([]);
          setHasValidEmailColumn(false);
          console.error(error);
        }
      },
      error: (error: Error) => {
        toast.error("Failed to parse CSV file");
        setHasValidEmailColumn(false);
        console.error(error);
      },
    });
  };

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
      const base64String = reader.result as string;
      setBodyImage(base64String);
      setBodyImageFile(file);
      toast.success("Image uploaded successfully");
    };
    reader.onerror = () => {
      toast.error("Failed to read image file");
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setBodyImage("");
    setBodyImageFile(null);
  };

  const replacePlaceholders = (template: string, lead: any): string => {
    let result = template;
    Object.keys(lead).forEach((key) => {
      const placeholder = new RegExp(`\\{\\{${key.toLowerCase()}\\}\\}`, "gi");
      result = result.replace(placeholder, String(lead[key] || ""));
    });
    return result;
  };

  const handlePreview = (lead: any) => {
    if (!formData.template) {
      toast.error("Please enter an email template first");
      return;
    }
    setPreviewLead(lead);
    const preview = replacePlaceholders(formData.template, lead);
    setPreviewContent(preview);
    setPreviewSubject(formData.subject);
    setShowPreviewModal(true);
  };

  // Lead selection functions
  const toggleLeadSelection = (index: number) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedLeads(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedLeads.size === filteredCsvData.length) {
      setSelectedLeads(new Set());
    } else {
      const allIndices = new Set(
        filteredCsvData.map((_, idx) => csvData.findIndex((lead) => lead === _))
      );
      setSelectedLeads(allIndices);
    }
  };

  const removeSelectedLeads = () => {
    const remainingLeads = csvData.filter((_, idx) => !selectedLeads.has(idx));
    setCsvData(remainingLeads);
    setSelectedLeads(new Set());
    toast.success(
      `Removed ${selectedLeads.size} lead(s). ${remainingLeads.length} remaining.`
    );
  };

  // Filter CSV data based on search query
  const filteredCsvData = csvData.filter((lead) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return Object.values(lead).some((value) =>
      String(value).toLowerCase().includes(query)
    );
  });

  // Convert domains to dropdown options
  const domainOptions: DropdownOption[] = domains
    .filter((d) => d.status === "connected")
    .map((domain) => ({
      value: domain.id,
      label: `${domain.name} (${domain.type})`,
    }));

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

    // Validate form
    if (!validateForm()) {
      toast.error("Please fill in all required fields correctly");
      return;
    }

    try {
      setLoading(true);

      let bodyImageUrl = "";
      if (bodyImageFile) {
        toast.loading("Uploading image to S3...", { id: "upload-image" });
        bodyImageUrl = await uploadFileToS3(bodyImageFile, "image");
        toast.success("Image uploaded successfully", { id: "upload-image" });
      }

      let csvFileUrl = "";
      if (csvFile) {
        toast.loading("Uploading CSV file to S3...", { id: "upload-csv" });
        csvFileUrl = await uploadFileToS3(csvFile, "csv");
        toast.success("CSV file uploaded successfully", { id: "upload-csv" });
      }

      // Only include selected leads
      const selectedCsvData = csvData.filter((_, idx) =>
        selectedLeads.has(idx)
      );

      // Ensure email column is normalized to "Email" before sending to webhook
      const normalizedCsvData = findAndNormalizeEmailColumn(selectedCsvData);

      const campaignData = {
        name: formData.name,
        domainId: formData.domainId,
        subject: formData.subject,
        template: formData.template,
        bodyImage: bodyImageUrl,
        bodyImageS3Url: bodyImageUrl,
        csvFileS3Url: csvFileUrl,
        followUpTemplate: formData.followUpTemplate,
        followUpDelay: parseInt(formData.followUpDelay) || 7,
        startDate: formData.startDate,
        startTime: formData.startTime,
        csvData: normalizedCsvData,
      };

      await campaignApi.create(campaignData as any);
      toast.success(
        `Campaign created successfully with ${selectedLeads.size} lead(s)!`
      );
      resetForm();
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create campaign");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-opacity-50 backdrop-blur-md"
          onClick={onClose}
        ></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Create New Campaign
              </h2>
              <p className="mt-1 text-sm text-purple-100">
                Set up a new email outreach campaign
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
            <div className="space-y-6">
              {/* Campaign Name */}
              <Input
                label="Campaign Name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: "" });
                }}
                placeholder="e.g., Q4 Product Launch"
                required
                inputSize="lg"
                error={errors.name}
              />

              {/* CSV Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Leads CSV *
                </label>
                <div
                  className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors ${
                    errors.csvData
                      ? "border-red-500"
                      : "border-gray-300 hover:border-blue-400"
                  }`}
                >
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
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
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">CSV up to 10MB</p>
                  </div>
                </div>
                {errors.csvData && (
                  <p className="mt-1.5 text-sm text-red-600">
                    {errors.csvData}
                  </p>
                )}
                {csvFile && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <span className="text-sm text-gray-700">
                        {csvFile.name} ({csvData.length} total,{" "}
                        {selectedLeads.size} selected)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setCsvFile(null);
                          setCsvData([]);
                          setCsvColumns([]);
                          setHasValidEmailColumn(false);
                          setSelectedLeads(new Set());
                          setSearchQuery("");
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
                        <p className="text-xs text-blue-700 mt-2">
                          Use placeholders like {"{{"}
                          {csvColumns[0]?.toLowerCase()}
                          {"}}"} in your template
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {/* Leads Preview Table */}
                {csvData.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Leads Preview ({selectedLeads.size} of {csvData.length}{" "}
                        selected)
                      </label>
                      {selectedLeads.size > 0 && (
                        <button
                          type="button"
                          onClick={removeSelectedLeads}
                          className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove Selected ({selectedLeads.size})
                        </button>
                      )}
                    </div>

                    {/* Search Bar */}
                    <div className="mb-3">
                      <Input
                        type="text"
                        placeholder="Search leads..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        leftIcon={<Search className="w-4 h-4" />}
                        helperText={
                          searchQuery
                            ? `Showing ${filteredCsvData.length} of ${csvData.length} leads`
                            : undefined
                        }
                        inputSize="sm"
                      />
                    </div>

                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                      <div className="overflow-x-auto max-h-96 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg">
                          <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                            <tr>
                              <th className="px-4 py-3 text-left bg-gray-100">
                                <Checkbox
                                  checked={
                                    selectedLeads.size ===
                                      filteredCsvData.length &&
                                    filteredCsvData.length > 0
                                  }
                                  onChange={toggleSelectAll}
                                  indeterminate={
                                    selectedLeads.size > 0 &&
                                    selectedLeads.size < filteredCsvData.length
                                  }
                                  size="md"
                                />
                              </th>
                              {Object.keys(csvData[0] || {}).map((key) => (
                                <th
                                  key={key}
                                  className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-100"
                                >
                                  {key}
                                </th>
                              ))}
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-100">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredCsvData.length > 0 ? (
                              filteredCsvData.map((lead, displayIndex) => {
                                const actualIndex = csvData.findIndex(
                                  (item) => item === lead
                                );
                                const isSelected =
                                  selectedLeads.has(actualIndex);

                                return (
                                  <tr
                                    key={actualIndex}
                                    className={`hover:bg-gray-50 transition-colors ${
                                      isSelected ? "bg-purple-50" : ""
                                    }`}
                                  >
                                    <td className="px-4 py-3">
                                      <Checkbox
                                        checked={isSelected}
                                        onChange={() =>
                                          toggleLeadSelection(actualIndex)
                                        }
                                        size="md"
                                      />
                                    </td>
                                    {Object.entries(lead).map(
                                      ([key, value], valueIndex) => (
                                        <td
                                          key={valueIndex}
                                          className="px-4 py-3 whitespace-nowrap text-sm text-gray-900"
                                        >
                                          {String(value || "-")}
                                        </td>
                                      )
                                    )}
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <button
                                        type="button"
                                        onClick={() => handlePreview(lead)}
                                        className="text-blue-600 hover:text-blue-800"
                                        title="Preview email for this lead"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td
                                  colSpan={
                                    Object.keys(csvData[0] || {}).length + 2
                                  }
                                  className="px-4 py-8 text-center text-sm text-gray-500"
                                >
                                  No leads found matching "{searchQuery}"
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Domain Selection */}
              <div>
                <Dropdown
                  label="Sending Domain"
                  options={domainOptions}
                  value={formData.domainId}
                  onChange={(value) => {
                    setFormData({ ...formData, domainId: value });
                    if (errors.domainId) setErrors({ ...errors, domainId: "" });
                  }}
                  placeholder="Select a domain"
                  required
                  error={errors.domainId}
                />
              </div>

              {/* Email Subject */}
              <Input
                label="Email Subject"
                value={formData.subject}
                onChange={(e) => {
                  setFormData({ ...formData, subject: e.target.value });
                  if (errors.subject) setErrors({ ...errors, subject: "" });
                }}
                placeholder="e.g., Exciting Opportunity for Your Business"
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
                    if (errors.template) setErrors({ ...errors, template: "" });
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
                      <img
                        src={bodyImage}
                        alt="Body preview"
                        className="max-h-48 mx-auto rounded"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
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
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t-2 border-gray-200">
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
                disabled={loading || !hasValidEmailColumn}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {loading ? "Creating..." : "Create Campaign"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && previewLead && (
        <PreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          lead={previewLead}
          previewContent={previewContent}
          previewSubject={previewSubject}
          previewBodyImage={bodyImage}
          replacePlaceholders={replacePlaceholders}
        />
      )}
    </>
  );
}
