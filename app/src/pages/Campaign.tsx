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
  PlayCircle,
  PauseCircle,
  CheckCircle,
  Clock,
  Activity,
  TrendingUp,
  Calendar,
  Server,
  Filter,
  FileText,
  Users,
  RotateCcw,
  Archive,
} from "lucide-react";
import { campaignApi, domainApi } from "../utils/api";
import { getScheduleDisplay } from "../utils/schedule";
import { Campaign, CampaignReply, Domain } from "../types";
import toast from "react-hot-toast";
import PreviewModal from "../components/PreviewModal";
import CampaignDetailsModal from "../components/CampaignDetailsModal";
import EditCampaignModal from "../components/EditCampaignModal";
import DeleteConfirmModal from "../components/DeleteConfirmModal";
import CreateCampaignModal from "../components/CreateCampaignModal";
import LogsModal from "../components/LogsModal";

type DetailsTab = "overview" | "leads" | "replies";
type CampaignTab = "active" | "inactive";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<CampaignTab>("active");
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
  const [campaignLogs, setCampaignLogs] = useState<Record<string, string[]>>(
    {}
  );
  const [campaignLogsStatus, setCampaignLogsStatus] = useState<
    Record<string, { isComplete: boolean; completionMessage?: string }>
  >({});
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedCampaignForLogs, setSelectedCampaignForLogs] = useState<
    string | null
  >(null);
  const [pollingIntervals, setPollingIntervals] = useState<
    Record<string, NodeJS.Timeout>
  >({});
  const [campaignsWithHistoricalLogs, setCampaignsWithHistoricalLogs] =
    useState<Set<string>>(new Set());
  const [campaignReplies, setCampaignReplies] = useState<
    Record<string, CampaignReply[]>
  >({});
  const [campaignRepliesMeta, setCampaignRepliesMeta] = useState<
    Record<
      string,
      { total: number; unreadCount: number; loading: boolean; error?: string }
    >
  >({});
  const [detailsModalTab, setDetailsModalTab] =
    useState<DetailsTab>("overview");

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
    return () => {
      clearInterval(interval);
    };
  }, []);

  // Cleanup polling intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(pollingIntervals).forEach((intervalId) =>
        clearInterval(intervalId)
      );
    };
  }, [pollingIntervals]);

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

      // Check for historical logs for each campaign
      const campaignsWithLogs = new Set<string>();
      await Promise.all(
        data.map(async (campaign) => {
          try {
            const historicalLogs = await campaignApi.getHistoricalLogs(
              campaign.id
            );
            if (historicalLogs.logs && historicalLogs.logs.length > 0) {
              campaignsWithLogs.add(campaign.id);
            }
          } catch (error) {
            // Silently fail - campaign might not have logs yet
          }
        })
      );
      setCampaignsWithHistoricalLogs(campaignsWithLogs);
    } catch (error) {
      toast.error("Failed to load campaigns");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadCampaignReplies = async (campaignId: string) => {
    setCampaignRepliesMeta((prev) => ({
      ...prev,
      [campaignId]: {
        total: prev[campaignId]?.total || 0,
        unreadCount: prev[campaignId]?.unreadCount || 0,
        loading: true,
        error: undefined,
      },
    }));

    try {
      const response = await campaignApi.getReplies(campaignId);
      setCampaignReplies((prev) => ({
        ...prev,
        [campaignId]: response.replies,
      }));
      setCampaignRepliesMeta((prev) => ({
        ...prev,
        [campaignId]: {
          total: response.total,
          unreadCount: response.unreadCount,
          loading: false,
        },
      }));
    } catch (error: any) {
      setCampaignRepliesMeta((prev) => ({
        ...prev,
        [campaignId]: {
          total: prev[campaignId]?.total || 0,
          unreadCount: prev[campaignId]?.unreadCount || 0,
          loading: false,
          error:
            error?.message ||
            "Failed to load replies. Please try again in a moment.",
        },
      }));
    }
  };

  // Function to fetch logs for a campaign
  const fetchCampaignLogs = async (campaignId: string) => {
    try {
      const response = await campaignApi.getLogs(campaignId);

      // 🔍 DEBUG: Log the exact API response
      console.log("📥 API Response for logs:", {
        campaignId,
        fullResponse: response,
        logsArray: response.logs,
        logsCount: response.logs?.length || 0,
        isComplete: response.isComplete,
        completionMessage: response.completionMessage,
        timestamp: new Date().toLocaleTimeString(),
      });

      // IMPORTANT: Trust the API's isComplete flag first
      let isComplete = response.isComplete === true;
      let completionMessage = response.completionMessage;

      // Log if API says it's complete
      if (isComplete) {
        console.log("✅ API reported isComplete=true, stopping stream");
      }

      if (response.logs && response.logs.length > 0) {
        // 🔍 DEBUG: Log each individual log entry
        console.log("📋 Individual log entries:");
        response.logs.forEach((log, index) => {
          console.log(`  [${index}]:`, log);
        });

        setCampaignLogs((prev) => ({
          ...prev,
          [campaignId]: response.logs,
        }));

        // Check if logs contain completion message
        // Look through all logs (especially the last few) for completion indicators
        const logsToCheck = response.logs.slice(-5); // Check last 5 logs
        const hasCompletionMessage = logsToCheck.some((log) => {
          // Check if it's a plain text completion message
          const plainTextComplete =
            log.includes("✅ Campaign completed successfully!") ||
            log.includes("Campaign completed successfully") ||
            log.includes("Duration:");

          // Check if it's a JSON object with completion status
          // (in case your API sends completion as JSON)
          let jsonComplete = false;
          try {
            const parsed = JSON.parse(log);
            jsonComplete =
              parsed.status === "completed" ||
              parsed.Status === "Completed" ||
              parsed.isComplete === true ||
              (parsed.message &&
                (parsed.message.includes("completed successfully") ||
                  parsed.message.includes("Campaign completed")));
          } catch (e) {
            // Not JSON, skip
          }

          return plainTextComplete || jsonComplete;
        });

        if (hasCompletionMessage) {
          isComplete = true;
          completionMessage =
            completionMessage || "Campaign processing completed";
        }
      }

      // Update completion status
      setCampaignLogsStatus((prev) => ({
        ...prev,
        [campaignId]: {
          isComplete: isComplete,
          completionMessage: completionMessage || undefined,
        },
      }));

      // Stop polling if complete
      if (isComplete) {
        stopLogPolling(campaignId);
        console.log(
          `✅ Streaming stopped for campaign ${campaignId} - Campaign completed`
        );
      }
    } catch (error) {
      // Silently fail - logs might not be available yet
      console.debug("Failed to fetch logs:", error);
    }
  };

  // Function to start polling logs for a campaign
  const startLogPolling = (campaignId: string) => {
    // Clear any existing polling for this campaign
    setPollingIntervals((prev) => {
      if (prev[campaignId]) {
        clearInterval(prev[campaignId]);
      }
      return prev;
    });

    // Initial fetch
    fetchCampaignLogs(campaignId);

    // Start polling every 2 seconds
    const intervalId = setInterval(() => {
      fetchCampaignLogs(campaignId);
    }, 2000);

    // Store interval ID
    setPollingIntervals((prev) => ({
      ...prev,
      [campaignId]: intervalId,
    }));

    // Stop polling after 5 minutes (300 seconds)
    setTimeout(() => {
      setPollingIntervals((prev) => {
        if (prev[campaignId]) {
          clearInterval(prev[campaignId]);
          const newIntervals = { ...prev };
          delete newIntervals[campaignId];
          return newIntervals;
        }
        return prev;
      });
    }, 5 * 60 * 1000);
  };

  // Function to stop polling logs for a campaign
  const stopLogPolling = (campaignId: string) => {
    if (pollingIntervals[campaignId]) {
      clearInterval(pollingIntervals[campaignId]);
      setPollingIntervals((prev) => {
        const newIntervals = { ...prev };
        delete newIntervals[campaignId];
        return newIntervals;
      });
    }
  };

  // Function to load historical logs from database
  const loadHistoricalLogs = async (campaignId: string) => {
    try {
      const response = await campaignApi.getHistoricalLogs(campaignId);
      if (response.logs && response.logs.length > 0) {
        // Load historical logs into state
        setCampaignLogs((prev) => ({
          ...prev,
          [campaignId]: response.logs,
        }));

        // Set completion status
        setCampaignLogsStatus((prev) => ({
          ...prev,
          [campaignId]: {
            isComplete: response.isComplete || false,
            completionMessage: response.completionMessage || undefined,
          },
        }));

        // Open modal
        setSelectedCampaignForLogs(campaignId);
        setShowLogsModal(true);
      } else {
        toast.error("No historical logs found for this campaign");
      }
    } catch (error: any) {
      toast.error("Failed to load historical logs");
      console.error("Historical logs error:", error);
    }
  };

  const handleStartCampaign = async (campaignId: string) => {
    try {
      // Clear existing logs before starting new campaign
      setCampaignLogs((prev) => {
        const newLogs = { ...prev };
        delete newLogs[campaignId];
        return newLogs;
      });

      // Clear existing status
      setCampaignLogsStatus((prev) => {
        const newStatus = { ...prev };
        delete newStatus[campaignId];
        return newStatus;
      });

      // Stop any existing polling
      stopLogPolling(campaignId);

      const response = await campaignApi.start(campaignId);

      // 🔍 DEBUG: Log the exact webhook response
      console.log("🚀 Campaign Start Response:", {
        campaignId,
        fullResponse: response,
        webhookResponse: response.webhookResponse,
        timestamp: new Date().toLocaleTimeString(),
      });

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

          // Start polling for logs from n8n webhook
          startLogPolling(campaignId);

          // Extract and store logs from webhook response if available (fallback)
          if (data) {
            let logs: string[] = [];

            // Handle different log formats from webhook
            if (Array.isArray(data.logs)) {
              logs = data.logs;
            } else if (typeof data.logs === "string") {
              logs = data.logs
                .split("\n")
                .filter((line: string) => line.trim());
            } else if (data.message) {
              logs = [data.message];
            } else if (typeof data === "string") {
              logs = [data];
            } else if (data.output || data.result) {
              // Handle n8n-style responses
              const output = data.output || data.result;
              if (Array.isArray(output)) {
                logs = output.map((item: any) =>
                  typeof item === "string"
                    ? item
                    : JSON.stringify(item, null, 2)
                );
              } else if (typeof output === "string") {
                logs = output.split("\n").filter((line: string) => line.trim());
              } else {
                logs = [JSON.stringify(output, null, 2)];
              }
            } else {
              // Fallback: stringify the entire data object
              logs = [JSON.stringify(data, null, 2)];
            }

            // Store logs for this campaign (if any initial logs)
            if (logs.length > 0) {
              setCampaignLogs((prev) => ({
                ...prev,
                [campaignId]: logs,
              }));
            }
          }
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
          // Start polling for logs even if no immediate response
          startLogPolling(campaignId);
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
      // Soft delete: set isActive to false instead of deleting from database
      await campaignApi.update(campaignToDelete, { isActive: false });
      toast.success("Campaign archived successfully");
      setShowDeleteConfirm(false);
      setCampaignToDelete(null);
      loadCampaigns();
    } catch (error) {
      toast.error("Failed to archive campaign");
      console.error(error);
    }
  };

  const handleRestoreCampaign = async (campaignId: string) => {
    try {
      // Restore: set isActive to true
      await campaignApi.update(campaignId, { isActive: true });
      toast.success("Campaign restored successfully");
      loadCampaigns();
    } catch (error) {
      toast.error("Failed to restore campaign");
      console.error(error);
    }
  };

  const handleEditClick = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowEditModal(true);
  };

  const handleDetailsClick = async (
    campaignId: string,
    tab: DetailsTab = "overview"
  ) => {
    setDetailsModalTab(tab);
    try {
      const campaign = await campaignApi.getById(campaignId);
      setSelectedCampaign(campaign);
      setShowDetailsModal(true);

      if (tab === "replies" || !campaignReplies[campaignId]) {
        loadCampaignReplies(campaignId);
      }
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

  const filteredCampaigns = campaigns.filter((campaign) => {
    // Filter by active/inactive status
    const isActive = campaign.isActive !== false; // Default to true if not set
    const matchesTab = activeTab === "active" ? isActive : !isActive;

    // Filter by search query
    const matchesSearch = campaign.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

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
    <div className="space-y-6 p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
                <Mail className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Campaigns
                </h1>
                <p className="mt-1 text-gray-600 flex items-center">
                  <Activity className="w-4 h-4 mr-2" />
                  Manage and monitor your email campaigns
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Time Restriction Toggle */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 px-5 py-3 shadow-sm">
              <Clock className="w-5 h-5 text-blue-600" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
                  Paris Time
                </span>
                <span className="text-lg font-bold text-blue-600">
                  {currentParisTime || "Loading..."}
                </span>
              </div>
              <div className="h-10 w-px bg-blue-200"></div>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Time Limit
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      timeRestrictionEnabled
                        ? "text-green-600"
                        : "text-orange-600"
                    }`}
                  >
                    {timeRestrictionEnabled ? "8 AM - 6 PM" : "24/7"}
                  </span>
                </div>
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
                    className={`w-14 h-7 rounded-full transition-all duration-300 ${
                      timeRestrictionEnabled
                        ? "bg-gradient-to-r from-green-500 to-emerald-500"
                        : "bg-gradient-to-r from-orange-400 to-orange-500"
                    } shadow-md`}
                  >
                    <div
                      className={`w-6 h-6 bg-white rounded-full shadow-lg transform transition-transform duration-300 ${
                        timeRestrictionEnabled
                          ? "translate-x-7"
                          : "translate-x-1"
                      } mt-0.5 flex items-center justify-center`}
                    >
                      {timeRestrictionEnabled ? (
                        <CheckCircle className="w-3 h-3 text-green-600" />
                      ) : (
                        <X className="w-3 h-3 text-orange-600" />
                      )}
                    </div>
                  </div>
                </div>
              </label>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Campaign
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:border-purple-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                Total Campaigns
              </p>
              <p className="mt-3 text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {campaigns.length}
              </p>
              <p className="mt-2 text-sm text-gray-500 flex items-center">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>
                {campaigns.filter((c) => c.isActive !== false).length} Active
                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full ml-3 mr-2"></span>
                {campaigns.filter((c) => c.isActive === false).length} Archived
              </p>
            </div>
            <div className="ml-4 p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
              <Mail className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:border-green-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                Active Campaigns
              </p>
              <p className="mt-3 text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {campaigns.filter((c) => c.isActive !== false).length}
              </p>
              <p className="mt-2 text-sm text-gray-500 flex items-center">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>
                Currently enabled
              </p>
            </div>
            <div className="ml-4 p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
              <PlayCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:border-orange-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                Archived Campaigns
              </p>
              <p className="mt-3 text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {campaigns.filter((c) => c.isActive === false).length}
              </p>
              <p className="mt-2 text-sm text-gray-500 flex items-center">
                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-2"></span>
                Currently archived
              </p>
            </div>
            <div className="ml-4 p-3 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl">
              <Archive className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:border-blue-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                Running Now
              </p>
              <p className="mt-3 text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {
                  campaigns.filter(
                    (c) => c.status === "active" && c.isActive !== false
                  ).length
                }
              </p>
              <p className="mt-2 text-sm text-gray-500 flex items-center">
                <PlayCircle className="w-3 h-3 mr-1 text-blue-600" />
                Active campaigns
              </p>
            </div>
            <div className="ml-4 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:border-indigo-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                Total Leads
              </p>
              <p className="mt-3 text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {campaigns
                  .filter((c) => c.isActive !== false)
                  .reduce((sum, c) => sum + (c.csvData?.length || 0), 0)}
              </p>
              <p className="mt-2 text-sm text-gray-500 flex items-center">
                <Users className="w-3 h-3 mr-1 text-indigo-600" />
                Contacts loaded
              </p>
            </div>
            <div className="ml-4 p-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
              <Users className="w-8 h-8 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 px-6 py-4 text-sm font-semibold transition-all ${
              activeTab === "active"
                ? "bg-gradient-to-r from-green-50 to-emerald-50 text-green-600 border-b-2 border-green-600"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <PlayCircle className="w-5 h-5" />
              <span>Active Campaigns</span>
              <span
                className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === "active"
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {campaigns.filter((c) => c.isActive !== false).length}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("inactive")}
            className={`flex-1 px-6 py-4 text-sm font-semibold transition-all ${
              activeTab === "inactive"
                ? "bg-gradient-to-r from-orange-50 to-amber-50 text-orange-600 border-b-2 border-orange-600"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Archive className="w-5 h-5" />
              <span>Archived Campaigns</span>
              <span
                className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === "inactive"
                    ? "bg-orange-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {campaigns.filter((c) => c.isActive === false).length}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search campaigns by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400 outline-none"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="px-4 py-3 text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium"
            >
              Clear
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="mt-3 text-sm text-gray-600">
            Found{" "}
            <span className="font-semibold text-gray-900">
              {filteredCampaigns.length}
            </span>{" "}
            campaign{filteredCampaigns.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Campaigns Grid/List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-pulse">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"></div>
                <div
                  className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
              <p className="text-gray-500">Loading campaigns...</p>
            </div>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="p-12 text-center">
            {searchQuery ? (
              <div>
                <Search className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg font-medium">
                  No campaigns found matching your search
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Try a different search term
                </p>
              </div>
            ) : activeTab === "active" ? (
              <div>
                <Mail className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg font-medium">
                  No active campaigns yet
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Create your first campaign to get started
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-6 inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-md"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Campaign
                </button>
              </div>
            ) : (
              <div>
                <Archive className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg font-medium">
                  No archived campaigns
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Archived campaigns will appear here
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Campaign Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Domain
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Schedule
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Leads
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCampaigns.map((campaign) => {
                  const scheduleInfo = getScheduleDisplay(campaign);
                  const getStatusIcon = (status: string) => {
                    switch (status) {
                      case "active":
                        return (
                          <PlayCircle className="w-4 h-4 text-green-500" />
                        );
                      case "paused":
                        return (
                          <PauseCircle className="w-4 h-4 text-yellow-500" />
                        );
                      case "completed":
                        return (
                          <CheckCircle className="w-4 h-4 text-blue-500" />
                        );
                      default:
                        return <Clock className="w-4 h-4 text-gray-500" />;
                    }
                  };

                  const repliesMeta = campaignRepliesMeta[campaign.id];
                  const unreadReplies = repliesMeta?.unreadCount || 0;

                  return (
                    <tr
                      key={campaign.id}
                      className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-200"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className="flex items-center cursor-pointer group"
                          onClick={() => handleDetailsClick(campaign.id)}
                        >
                          <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg flex items-center justify-center group-hover:from-purple-100 group-hover:to-pink-100 transition-all">
                            <Mail className="w-5 h-5 text-purple-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                              {campaign.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              Created{" "}
                              {new Date(
                                campaign.createdAt
                              ).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Server className="w-4 h-4 text-blue-500 mr-2" />
                          <span className="text-sm text-gray-900 font-medium">
                            {domains.find((d) => d.id === campaign.domainId)
                              ?.name || "N/A"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="flex items-center text-sm text-gray-900">
                            <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                            {scheduleInfo.dateLabel || "Not scheduled"}
                          </div>
                          {scheduleInfo.timeLabel && (
                            <div className="flex items-center text-xs text-gray-500 mt-1">
                              <Clock className="w-3 h-3 text-gray-400 mr-1" />
                              {scheduleInfo.timeLabel}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 text-orange-500 mr-2" />
                          <span className="text-sm font-semibold text-gray-900">
                            {campaign.csvData?.length || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full border ${getStatusColor(
                            campaign.status
                          )}`}
                        >
                          {getStatusIcon(campaign.status)}
                          <span className="ml-1.5">
                            {campaign.status.charAt(0).toUpperCase() +
                              campaign.status.slice(1)}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleDetailsClick(campaign.id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-200"
                            title="View Details"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() =>
                              handleDetailsClick(campaign.id, "replies")
                            }
                            className="relative p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all border border-transparent hover:border-indigo-200"
                            title="View Replies"
                          >
                            <MessageSquare className="w-5 h-5" />
                            {unreadReplies > 0 && (
                              <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold text-white bg-indigo-600 rounded-full shadow-sm">
                                {unreadReplies > 9 ? "9+" : unreadReplies}
                              </span>
                            )}
                          </button>
                          {activeTab === "active" && (
                            <>
                              <button
                                onClick={() => handleEditClick(campaign)}
                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all border border-transparent hover:border-purple-200"
                                title="Edit Campaign"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                              <button
                                className={`p-2 rounded-lg transition-all border border-transparent ${
                                  isWithinAllowedHours()
                                    ? "text-green-600 hover:bg-green-50 hover:border-green-200"
                                    : "text-gray-400 cursor-not-allowed opacity-50"
                                }`}
                                title={
                                  isWithinAllowedHours()
                                    ? "Launch Campaign"
                                    : `Available 8 AM - 6 PM Paris time. Current: ${
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
                              {/* Live/Streaming Logs Button */}
                              {campaignLogs[campaign.id] &&
                                campaignLogs[campaign.id].length > 0 && (
                                  <button
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all border border-transparent hover:border-indigo-200 relative"
                                    title="View Live Logs"
                                    onClick={() => {
                                      setSelectedCampaignForLogs(campaign.id);
                                      setShowLogsModal(true);
                                      const status =
                                        campaignLogsStatus[campaign.id];
                                      if (
                                        !status?.isComplete &&
                                        !pollingIntervals[campaign.id]
                                      ) {
                                        startLogPolling(campaign.id);
                                      }
                                    }}
                                  >
                                    <FileText className="w-5 h-5" />
                                    {!campaignLogsStatus[campaign.id]
                                      ?.isComplete && (
                                      <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></span>
                                    )}
                                  </button>
                                )}
                              {/* Historical Logs Button */}
                              {campaignsWithHistoricalLogs.has(campaign.id) && (
                                <button
                                  className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-all border border-transparent hover:border-amber-200"
                                  title="View Historical Logs"
                                  onClick={() =>
                                    loadHistoricalLogs(campaign.id)
                                  }
                                >
                                  <FileText className="w-5 h-5" />
                                </button>
                              )}
                              <button
                                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-all border border-transparent hover:border-orange-200"
                                title="Archive Campaign"
                                onClick={() => handleDeleteClick(campaign.id)}
                              >
                                <Archive className="w-5 h-5" />
                              </button>
                            </>
                          )}
                          {activeTab === "inactive" && (
                            <button
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all border border-transparent hover:border-green-200"
                              title="Restore Campaign"
                              onClick={() => handleRestoreCampaign(campaign.id)}
                            >
                              <RotateCcw className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

      {selectedCampaign && (
        <CampaignDetailsModal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setDetailsModalTab("overview");
          }}
          campaign={selectedCampaign}
          onPreview={handlePreview}
          initialTab={detailsModalTab}
          replies={campaignReplies[selectedCampaign.id]}
          repliesLoading={
            campaignRepliesMeta[selectedCampaign.id]?.loading || false
          }
          repliesError={campaignRepliesMeta[selectedCampaign.id]?.error}
          repliesMeta={
            campaignRepliesMeta[selectedCampaign.id]
              ? {
                  total: campaignRepliesMeta[selectedCampaign.id]?.total || 0,
                  unreadCount:
                    campaignRepliesMeta[selectedCampaign.id]?.unreadCount || 0,
                }
              : undefined
          }
          onRefreshReplies={() => loadCampaignReplies(selectedCampaign.id)}
        />
      )}

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setCampaignToDelete(null);
        }}
        onConfirm={handleDeleteCampaign}
        title="Archive Campaign"
        message="Are you sure you want to archive this campaign? You can restore it later from the Archived Campaigns tab."
        confirmText="Archive"
        variant="archive"
      />

      <CreateCampaignModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          loadCampaigns();
        }}
      />

      <LogsModal
        isOpen={showLogsModal}
        onClose={() => {
          const campaignId = selectedCampaignForLogs;
          setShowLogsModal(false);

          if (campaignId) {
            // Stop polling when modal is closed
            stopLogPolling(campaignId);

            // Clear logs if processing is complete
            const status = campaignLogsStatus[campaignId];
            if (status?.isComplete) {
              // Clear logs from state
              setCampaignLogs((prev) => {
                const newLogs = { ...prev };
                delete newLogs[campaignId];
                return newLogs;
              });

              // Clear status
              setCampaignLogsStatus((prev) => {
                const newStatus = { ...prev };
                delete newStatus[campaignId];
                return newStatus;
              });

              // Clear logs from server (but keep in database for historical logs)
              campaignApi.clearLogs(campaignId).catch((error) => {
                console.debug("Failed to clear logs:", error);
              });

              // Mark that this campaign has historical logs
              setCampaignsWithHistoricalLogs((prev) => {
                const newSet = new Set(prev);
                newSet.add(campaignId);
                return newSet;
              });
            }
          }

          setSelectedCampaignForLogs(null);
        }}
        logs={
          selectedCampaignForLogs
            ? campaignLogs[selectedCampaignForLogs] || []
            : []
        }
        campaignName={
          selectedCampaignForLogs
            ? campaigns.find((c) => c.id === selectedCampaignForLogs)?.name
            : undefined
        }
        isComplete={
          selectedCampaignForLogs
            ? campaignLogsStatus[selectedCampaignForLogs]?.isComplete || false
            : false
        }
        completionMessage={
          selectedCampaignForLogs
            ? campaignLogsStatus[selectedCampaignForLogs]?.completionMessage
            : undefined
        }
      />
    </div>
  );
}
