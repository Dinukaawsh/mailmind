"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Send, Image as ImageIcon, Eye } from "lucide-react";
import { campaignApi, domainApi } from "../utils/api";
import { Domain } from "../types";
import toast from "react-hot-toast";
import Papa from "papaparse";

export default function CreateCampaign() {
  const router = useRouter();
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
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [testEmail, setTestEmail] = useState("");
  const [bodyImage, setBodyImage] = useState<string>("");
  const [bodyImageFile, setBodyImageFile] = useState<File | null>(null);
  const [bodyImageS3Url, setBodyImageS3Url] = useState<string>("");
  const [csvFileS3Url, setCsvFileS3Url] = useState<string>("");
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewLead, setPreviewLead] = useState<any | null>(null);
  const [previewContent, setPreviewContent] = useState<string>("");

  useEffect(() => {
    loadDomains();
  }, []);

  const loadDomains = async () => {
    try {
      // Fetch domains from MongoDB database
      const data = await domainApi.getAll();
      setDomains(data);
    } catch (error) {
      console.error("Failed to load domains", error);
      toast.error("Failed to load domains");
    }
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

        // Extract column names from CSV
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's an image
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Check file size (max 5MB)
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

  // Function to replace placeholders in template with actual values
  const replacePlaceholders = (template: string, lead: any): string => {
    let result = template;
    // Replace placeholders like {{name}}, {{email}}, etc.
    // Match case-insensitive column names
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
    setShowPreviewModal(true);
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

    if (
      !formData.name ||
      !formData.domainId ||
      !formData.subject ||
      !formData.template ||
      csvData.length === 0
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);

      // Upload image to S3 if present
      let bodyImageUrl = "";
      if (bodyImageFile) {
        toast.loading("Uploading image to S3...", { id: "upload-image" });
        bodyImageUrl = await uploadFileToS3(bodyImageFile, "image");
        toast.success("Image uploaded successfully", { id: "upload-image" });
      }

      // Upload CSV file to S3 if present
      let csvFileUrl = "";
      if (csvFile) {
        toast.loading("Uploading CSV file to S3...", { id: "upload-csv" });
        csvFileUrl = await uploadFileToS3(csvFile, "csv");
        toast.success("CSV file uploaded successfully", { id: "upload-csv" });
      }

      // Create campaign with all data including S3 URLs
      const campaignData = {
        name: formData.name,
        domainId: formData.domainId,
        subject: formData.subject,
        template: formData.template,
        bodyImage: bodyImageUrl, // Store S3 URL instead of base64
        bodyImageS3Url: bodyImageUrl, // Also store separately for clarity
        csvFileS3Url: csvFileUrl, // Store CSV S3 URL
        followUpTemplate: formData.followUpTemplate,
        followUpDelay: parseInt(formData.followUpDelay) || 7,
        startDate: formData.startDate,
        startTime: formData.startTime,
        csvData: csvData, // Keep parsed CSV data for immediate use
      };

      await campaignApi.create(campaignData as any);
      toast.success("Campaign created successfully!");
      router.push("/campaigns");
    } catch (error: any) {
      toast.error(error.message || "Failed to create campaign");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestSend = async () => {
    if (!testEmail || !formData.template) {
      toast.error("Please enter a test email and template");
      return;
    }

    try {
      toast.success(`Test email sent to ${testEmail}`);
    } catch (error) {
      toast.error("Failed to send test email");
      console.error(error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Create New Campaign
        </h1>
        <p className="mt-2 text-gray-600">
          Set up a new email outreach campaign
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
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
              placeholder="e.g., Q4 Product Launch"
              required
            />
          </div>

          {/* CSV Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Leads CSV *
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-400 transition-colors">
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
            {csvFile && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <span className="text-sm text-gray-700">
                    {csvFile.name} ({csvData.length} leads)
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
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
              placeholder="e.g., Exciting Opportunity for Your Business"
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
              placeholder="Hi {{name}},\n\nI noticed you work at {{company}}...\n\nBest regards,\n[Your Name]"
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

          {/* Follow-up Template */}
          {/* <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Follow-up Email Template (Optional)
            </label>
            <textarea
              value={formData.followUpTemplate}
              onChange={(e) =>
                setFormData({ ...formData, followUpTemplate: e.target.value })
              }
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm text-gray-900"
              placeholder="Hi {{name}},\n\nJust following up on my previous email..."
            />
            <div className="mt-2 flex items-center space-x-4">
              <label className="block text-sm font-medium text-gray-700">
                Send follow-up after:
              </label>
              <input
                type="number"
                value={formData.followUpDelay || ""}
                placeholder="Enter number of days"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    followUpDelay: e.target.value,
                  })
                }
                className="w-20 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
              <span className="text-sm text-gray-600">days</span>
            </div>
          </div> */}

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
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Campaign"}
          </button>
        </div>
      </form>

      {/* Preview Modal */}
      {showPreviewModal && previewLead && (
        <div className="fixed inset-0 bg-white bg-opacity-30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Email Preview
              </h2>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Lead Information */}
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Lead Information:
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(previewLead).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-xs font-medium text-gray-500">
                        {key}:
                      </span>{" "}
                      <span className="text-xs text-gray-900">
                        {String(value || "-")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Email Subject Preview */}
              {formData.subject && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Subject:
                  </h3>
                  <div className="bg-white border border-gray-300 rounded-lg p-3 text-gray-900">
                    {replacePlaceholders(formData.subject, previewLead)}
                  </div>
                </div>
              )}

              {/* Email Body Preview */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Email Body:
                </h3>
                <div className="bg-white border border-gray-300 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap text-gray-900">
                  {previewContent}
                </div>
                {bodyImage && (
                  <div className="mt-4">
                    <img
                      src={bodyImage}
                      alt="Email body image"
                      className="max-w-full rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
