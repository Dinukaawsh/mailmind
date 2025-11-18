"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Globe,
  Mail,
  RefreshCw,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Server,
  TrendingUp,
  Clock,
  Activity,
} from "lucide-react";
import { domainApi } from "../utils/api";
import { Domain } from "../types";
import toast from "react-hot-toast";
import EditDomainModal from "../components/EditDomainModal";

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [connectingGmail, setConnectingGmail] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);

  useEffect(() => {
    loadDomains();
    const interval = setInterval(loadDomains, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const loadDomains = async () => {
    try {
      setLoading(true);
      // Fetch domains from MongoDB database
      const data = await domainApi.getAll();
      setDomains(data);
    } catch (error) {
      toast.error("Failed to load domains");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGmail = async () => {
    try {
      setConnectingGmail(true);
      // In real app, this would redirect to OAuth flow
      const response = await domainApi.connectGmail();
      // Open OAuth window
      window.open(response.authUrl, "_blank", "width=600,height=700");
      toast.success("Opening Gmail authentication...");
    } catch (error) {
      toast.error("Failed to connect Gmail account");
      console.error(error);
    } finally {
      setConnectingGmail(false);
    }
  };

  const handleAddCustomDomain = async () => {
    if (!newDomain.trim()) {
      toast.error("Please enter a domain name");
      return;
    }

    try {
      await domainApi.addCustom(newDomain);
      toast.success("Domain added successfully");
      setNewDomain("");
      setShowAddDomain(false);
      loadDomains();
    } catch (error) {
      toast.error("Failed to add domain");
      console.error(error);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm("Are you sure you want to disconnect this domain?")) {
      return;
    }

    try {
      await domainApi.disconnect(id);
      toast.success("Domain disconnected");
      loadDomains();
    } catch (error) {
      toast.error("Failed to disconnect domain");
      console.error(error);
    }
  };

  const handleSync = async (id: string) => {
    try {
      toast.success("Syncing domain...");
      // In real app, trigger sync API call
      setTimeout(() => {
        loadDomains();
        toast.success("Domain synced successfully");
      }, 2000);
    } catch (error) {
      toast.error("Failed to sync domain");
      console.error(error);
    }
  };

  const handleEdit = (domain: Domain) => {
    setSelectedDomain(domain);
    setShowEditModal(true);
  };

  const handleUpdateDomain = async (id: string, data: Partial<Domain>) => {
    try {
      await domainApi.update(id, data);
      toast.success("Domain updated successfully");
      loadDomains();
    } catch (error: any) {
      toast.error(error.message || "Failed to update domain");
      throw error;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <XCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "connected":
        return "Connected";
      case "error":
        return "Error";
      default:
        return "Not Connected";
    }
  };

  const formatLastSync = (dateString?: string) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                <Server className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Domains
                </h1>
                <p className="mt-1 text-gray-600 flex items-center">
                  <Activity className="w-4 h-4 mr-2" />
                  Manage your sending domains and Gmail integrations
                </p>
              </div>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowAddDomain(!showAddDomain)}
              className="flex items-center px-5 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all shadow-sm hover:shadow-md transform hover:scale-105"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Domain
            </button>
            <button
              onClick={handleConnectGmail}
              disabled={connectingGmail}
              className="flex items-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
            >
              <Mail className="w-5 h-5 mr-2" />
              {connectingGmail ? "Connecting..." : "Connect Gmail"}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:border-blue-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                Total Domains
              </p>
              <p className="mt-3 text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {domains.length}
              </p>
              <p className="mt-2 text-sm text-gray-500 flex items-center">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                Connected domains
              </p>
            </div>
            <div className="ml-4 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
              <Server className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:border-green-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                Active Domains
              </p>
              <p className="mt-3 text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {domains.filter((d) => d.status === "connected").length}
              </p>
              <p className="mt-2 text-sm text-gray-500 flex items-center">
                <CheckCircle className="w-3 h-3 mr-1 text-green-600" />
                Ready to send
              </p>
            </div>
            <div className="ml-4 p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:border-purple-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                Gmail Accounts
              </p>
              <p className="mt-3 text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {domains.filter((d) => d.type === "gmail").length}
              </p>
              <p className="mt-2 text-sm text-gray-500 flex items-center">
                <Mail className="w-3 h-3 mr-1 text-purple-600" />
                Google integration
              </p>
            </div>
            <div className="ml-4 p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
              <Mail className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:border-orange-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                Daily Capacity
              </p>
              <p className="mt-3 text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {domains.reduce((sum, d) => sum + d.emailsSentPerDay, 0)}
              </p>
              <p className="mt-2 text-sm text-gray-500 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1 text-orange-600" />
                Emails per day
              </p>
            </div>
            <div className="ml-4 p-3 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl">
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Add Custom Domain Form */}
      {showAddDomain && (
        <div className="bg-white rounded-xl shadow-sm border-2 border-blue-200 p-6 animate-slideDown">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Plus className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Add Custom Domain
            </h2>
          </div>
          <div className="flex space-x-3">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="example.com"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 transition-all"
            />
            <button
              onClick={handleAddCustomDomain}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-medium"
            >
              Add Domain
            </button>
            <button
              onClick={() => {
                setShowAddDomain(false);
                setNewDomain("");
              }}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            💡 Make sure to configure DNS records (SPF, DKIM, DMARC) for your
            custom domain
          </p>
        </div>
      )}

      {/* Domains List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-pulse">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                <div
                  className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
              <p className="text-gray-500">Loading domains...</p>
            </div>
          </div>
        ) : domains.length === 0 ? (
          <div className="p-12 text-center">
            <Globe className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg font-medium">
              No domains connected yet
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Connect a Gmail account or add a custom domain to get started
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={handleConnectGmail}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Mail className="w-4 h-4 mr-2" />
                Connect Gmail
              </button>
              <button
                onClick={() => setShowAddDomain(true)}
                className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Domain
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {domains.map((domain) => (
              <div
                key={domain.id}
                className="p-6 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      <div
                        className={`p-3 rounded-xl ${
                          domain.type === "gmail"
                            ? "bg-gradient-to-br from-red-50 to-pink-50"
                            : "bg-gradient-to-br from-blue-50 to-indigo-50"
                        }`}
                      >
                        {domain.type === "gmail" ? (
                          <Mail className="w-8 h-8 text-red-500" />
                        ) : (
                          <Globe className="w-8 h-8 text-blue-500" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {domain.name}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(domain.status)}
                          <span
                            className={`px-3 py-1 text-xs font-semibold rounded-full ${
                              domain.status === "connected"
                                ? "bg-green-100 text-green-800 border border-green-200"
                                : domain.status === "error"
                                ? "bg-red-100 text-red-800 border border-red-200"
                                : "bg-gray-100 text-gray-800 border border-gray-200"
                            }`}
                          >
                            {getStatusText(domain.status)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium capitalize">
                          {domain.type}
                        </span>
                        <span className="flex items-center">
                          <TrendingUp className="w-4 h-4 mr-1 text-gray-400" />
                          {domain.emailsSentPerDay} emails/day
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1 text-gray-400" />
                          {formatLastSync(domain.lastSyncTime)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleEdit(domain)}
                      className="p-2.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-200"
                      title="Edit domain"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleSync(domain.id)}
                      className="p-2.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all border border-transparent hover:border-green-200"
                      title="Sync domain"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDisconnect(domain.id)}
                      className="p-2.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-200"
                      title="Disconnect domain"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="p-2 bg-blue-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="ml-4">
            <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center">
              Domain Management Tips
              <span className="ml-2 px-2 py-0.5 text-xs bg-blue-200 text-blue-800 rounded-full">
                Important
              </span>
            </h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2 mt-1.5"></span>
                <span>
                  Connect multiple Gmail accounts to balance sending load and
                  avoid rate limits
                </span>
              </li>
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2 mt-1.5"></span>
                <span>
                  Custom domains require DNS configuration (SPF, DKIM, DMARC)
                  for proper email delivery
                </span>
              </li>
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2 mt-1.5"></span>
                <span>
                  Domains are automatically synced every 5 minutes to ensure
                  up-to-date status
                </span>
              </li>
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2 mt-1.5"></span>
                <span>
                  Monitor email limits per domain to avoid rate limiting and
                  maintain deliverability
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Edit Domain Modal */}
      <EditDomainModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedDomain(null);
        }}
        domain={selectedDomain}
        onUpdate={handleUpdateDomain}
      />

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
