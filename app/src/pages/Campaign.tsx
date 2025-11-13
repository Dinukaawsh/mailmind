"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  MoreVertical,
  Play,
  Pause,
  Eye,
  Edit,
  Trash2,
  X,
  Mail,
  MailOpen,
  MessageSquare,
  UserX,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { campaignApi, domainApi } from "../utils/api";
import { Campaign, Domain } from "../types";
import toast from "react-hot-toast";
import PreviewModal from "../components/PreviewModal";
import CampaignDetailsModal from "../components/CampaignDetailsModal";
import EditCampaignModal from "../components/EditCampaignModal";
import DeleteConfirmModal from "../components/DeleteConfirmModal";
import CreateCampaignModal from "../components/CreateCampaignModal";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    domainId: "",
    subject: "",
    template: "",
    followUpTemplate: "",
    followUpDelay: 7,
    startDate: "",
    startTime: "",
  });
  const [editBodyImage, setEditBodyImage] = useState<string>("");
  const [editCsvFile, setEditCsvFile] = useState<File | null>(null);
  const [editCsvData, setEditCsvData] = useState<any[]>([]);
  const [editCsvColumns, setEditCsvColumns] = useState<string[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
  const [showRemoveLeadsConfirm, setShowRemoveLeadsConfirm] = useState(false);
  const [showRemoveLeadConfirm, setShowRemoveLeadConfirm] = useState(false);
  const [leadToRemove, setLeadToRemove] = useState<number | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewLead, setPreviewLead] = useState<any | null>(null);
  const [previewContent, setPreviewContent] = useState<string>("");
  const [previewSubject, setPreviewSubject] = useState<string>("");
  const [previewBodyImage, setPreviewBodyImage] = useState<string>("");
  const [timeRestrictionEnabled, setTimeRestrictionEnabled] =
    useState<boolean>(true);
  const [currentParisTime, setCurrentParisTime] = useState<string>("");
  const [isWithinHours, setIsWithinHours] = useState<boolean>(true);

  // Load time restriction preference from localStorage
  useEffect(() => {
    const savedPreference = localStorage.getItem("timeRestrictionEnabled");
    if (savedPreference !== null) {
      setTimeRestrictionEnabled(savedPreference === "true");
    }
  }, []);

  // Update Paris time and check if within allowed hours
  useEffect(() => {
    const updateParisTime = () => {
      const now = new Date();
      const parisTime = new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Paris",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(now);
      setCurrentParisTime(parisTime);

      // Check if within allowed hours
      if (timeRestrictionEnabled) {
        const hour = parseInt(parisTime.split(":")[0], 10);
        setIsWithinHours(hour >= 8 && hour < 18);
      } else {
        setIsWithinHours(true);
      }
    };

    updateParisTime();
    const interval = setInterval(updateParisTime, 1000); // Update every second
    return () => clearInterval(interval);
  }, [timeRestrictionEnabled]);

  useEffect(() => {
    loadCampaigns();
    loadDomains();
    const interval = setInterval(loadCampaigns, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  // Check if current Paris time is between 8 AM and 6 PM
  const isWithinAllowedHours = (): boolean => {
    if (!timeRestrictionEnabled) return true;
    return isWithinHours;
  };

  const handleTimeRestrictionToggle = (enabled: boolean) => {
    setTimeRestrictionEnabled(enabled);
    localStorage.setItem("timeRestrictionEnabled", enabled.toString());
  };

  const loadDomains = async () => {
    try {
      // Fetch domains from MongoDB database
      const data = await domainApi.getAll();
      setDomains(data);
    } catch (error) {
      console.error("Failed to load domains", error);
    }
  };

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      // Fetch campaigns from MongoDB database
      const data = await campaignApi.getAll();
      setCampaigns(data);
    } catch (error) {
      toast.error("Failed to load campaigns");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCampaign = async (campaignId: string) => {
    try {
      const response = await campaignApi.start(campaignId);

      // Display webhook response details if available
      if (response.webhookResponse) {
        const { status, statusText, data } = response.webhookResponse;
        console.log("Webhook Response:", {
          status,
          statusText,
          data,
        });

        // Show webhook response in a more detailed toast
        if (status >= 200 && status < 300) {
          toast.success(
            `Campaign sent successfully! Webhook responded: ${status} ${statusText}`,
            {
              duration: 4000,
            }
          );
        } else {
          // Extract error message from webhook response
          const errorMessage = data?.message || data?.error || statusText;
          const errorHint = data?.hint || "";

          // Show detailed error message with hint if available
          const fullErrorMessage = errorHint
            ? `${errorMessage}\n\n💡 ${errorHint}`
            : errorMessage;

          toast.error(`Webhook Error (${status}): ${fullErrorMessage}`, {
            duration: 10000, // Longer duration for error messages with hints
            style: {
              whiteSpace: "pre-line", // Allow line breaks
              maxWidth: "500px",
            },
          });
        }

        // Log full response for debugging
        console.log("Full webhook response data:", data);
      } else {
        // Fallback if no webhook response but we have a response
        if (response.success) {
          toast.success("Campaign sent to webhook successfully!");
        } else {
          toast.error(response.message || "Webhook returned an error");
        }
      }

      // Reload campaigns after send attempt
      loadCampaigns();
    } catch (error: any) {
      toast.error(error.message || "Failed to send campaign to webhook");
      console.error("Campaign start error:", error);
    }
  };

  const handleDeleteClick = (campaignId: string) => {
    setCampaignToDelete(campaignId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteCampaign = async () => {
    if (!campaignToDelete) return;

    try {
      await campaignApi.delete(campaignToDelete);
      toast.success("Campaign deleted successfully");
      setShowDeleteConfirm(false);
      setCampaignToDelete(null);
      loadCampaigns();
    } catch (error) {
      toast.error("Failed to delete campaign");
      console.error(error);
    }
  };

  const handleEditClick = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowEditModal(true);
  };

  const handleDetailsClick = async (campaignId: string) => {
    try {
      const campaign = await campaignApi.getById(campaignId);
      setSelectedCampaign(campaign);
      setShowDetailsModal(true);
    } catch (error) {
      toast.error("Failed to load campaign details");
      console.error(error);
    }
  };

  const handleUpdateCampaign = async (id: string, data: any) => {
    await campaignApi.update(id, data);
    loadCampaigns();
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

  const handlePreview = (
    lead: any,
    template?: string,
    subject?: string,
    bodyImage?: string
  ) => {
    if (!template) {
      toast.error("No email template available");
      return;
    }
    setPreviewLead(lead);
    const preview = replacePlaceholders(template, lead);
    setPreviewContent(preview);
    setPreviewSubject(subject || "");
    setPreviewBodyImage(bodyImage || "");
    setShowPreviewModal(true);
  };

  const filteredCampaigns = campaigns.filter((campaign) =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
          <p className="mt-2 text-gray-600">
            Manage and monitor your email campaigns
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Time Restriction Toggle */}
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-4 py-2">
            <span className="text-sm text-gray-700">
              Paris Time: {currentParisTime || "Loading..."}
            </span>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-gray-700">
                {timeRestrictionEnabled
                  ? "8 AM - 6 PM Only"
                  : "Always Available"}
              </span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={timeRestrictionEnabled}
                  onChange={(e) =>
                    handleTimeRestrictionToggle(e.target.checked)
                  }
                  className="sr-only"
                />
                <div
                  className={`w-14 h-7 rounded-full transition-colors ${
                    timeRestrictionEnabled ? "bg-blue-600" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                      timeRestrictionEnabled ? "translate-x-7" : "translate-x-1"
                    } mt-0.5`}
                  />
                </div>
              </div>
            </label>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Campaign
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Loading campaigns...
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchQuery
              ? "No campaigns found matching your search."
              : "No campaigns yet. Create your first campaign to get started."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Domain
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Time
                  </th>
                  {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Open Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reply Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bounce Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unsubscribes
                  </th> */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:text-blue-600"
                      onClick={() => handleDetailsClick(campaign.id)}
                    >
                      {campaign.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {domains.find((d) => d.id === campaign.domainId)?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {campaign.startDate
                        ? new Date(campaign.startDate).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {campaign.startTime || "-"}
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {campaign.sentCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {campaign.openRate.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {campaign.replyRate.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {campaign.bounceRate.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {campaign.unsubscribeCount}
                    </td> */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          campaign.status
                        )}`}
                      >
                        {campaign.status.charAt(0).toUpperCase() +
                          campaign.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleDetailsClick(campaign.id)}
                          className="text-blue-600 hover:text-blue-800"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleEditClick(campaign)}
                          className="text-gray-600 hover:text-gray-800"
                          title="Edit Campaign"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          className={`${
                            isWithinAllowedHours()
                              ? "text-green-600 hover:text-green-800"
                              : "text-gray-400 cursor-not-allowed opacity-50"
                          } transition-colors`}
                          title={
                            isWithinAllowedHours()
                              ? "Send Campaign to Webhook"
                              : `Button only available 8 AM - 6 PM Paris time. Current: ${
                                  currentParisTime || "Loading..."
                                }`
                          }
                          onClick={() => {
                            if (isWithinAllowedHours()) {
                              handleStartCampaign(campaign.id);
                            } else {
                              toast.error(
                                `Campaign can only be sent between 8 AM - 6 PM Paris time. Current time: ${currentParisTime}`
                              );
                            }
                          }}
                          disabled={!isWithinAllowedHours()}
                        >
                          <Play className="w-5 h-5" />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-800"
                          title="Delete Campaign"
                          onClick={() => handleDeleteClick(campaign.id)}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showEditModal && selectedCampaign && (
        <EditCampaignModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          campaign={selectedCampaign}
          domains={domains}
          onUpdate={handleUpdateCampaign}
          onPreview={handlePreview}
          onRemoveAllLeads={() => setShowRemoveLeadsConfirm(true)}
          onRemoveLead={(index) => {
            setLeadToRemove(index);
            setShowRemoveLeadConfirm(true);
          }}
          showRemoveLeadsConfirm={showRemoveLeadsConfirm}
          showRemoveLeadConfirm={showRemoveLeadConfirm}
          leadToRemove={leadToRemove}
          onCloseRemoveLeadsConfirm={() => setShowRemoveLeadsConfirm(false)}
          onCloseRemoveLeadConfirm={() => {
            setShowRemoveLeadConfirm(false);
            setLeadToRemove(null);
          }}
          onConfirmRemoveAllLeads={() => {
            setShowRemoveLeadsConfirm(false);
            toast.success("All leads removed");
          }}
          onConfirmRemoveLead={() => {
            setShowRemoveLeadConfirm(false);
            setLeadToRemove(null);
            toast.success("Lead removed");
          }}
        />
      )}

      <PreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        lead={previewLead}
        previewContent={previewContent}
        previewSubject={previewSubject}
        previewBodyImage={previewBodyImage}
        replacePlaceholders={replacePlaceholders}
      />

      <CampaignDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        campaign={selectedCampaign!}
        onPreview={handlePreview}
      />

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setCampaignToDelete(null);
        }}
        onConfirm={handleDeleteCampaign}
      />

      <CreateCampaignModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          loadCampaigns();
        }}
      />
    </div>
  );
}
