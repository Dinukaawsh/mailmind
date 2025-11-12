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
} from "lucide-react";
import { domainApi } from "../utils/api";
import { Domain } from "../types";
import toast from "react-hot-toast";

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [connectingGmail, setConnectingGmail] = useState(false);

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Domains</h1>
          <p className="mt-2 text-gray-600">
            Manage your sending domains and Gmail integrations
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowAddDomain(!showAddDomain)}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Domain
          </button>
          <button
            onClick={handleConnectGmail}
            disabled={connectingGmail}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Mail className="w-5 h-5 mr-2" />
            {connectingGmail ? "Connecting..." : "Connect Gmail"}
          </button>
        </div>
      </div>

      {/* Add Custom Domain Form */}
      {showAddDomain && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Add Custom Domain
          </h2>
          <div className="flex space-x-3">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="example.com"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
            <button
              onClick={handleAddCustomDomain}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowAddDomain(false);
                setNewDomain("");
              }}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Domains List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Loading domains...
          </div>
        ) : domains.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Globe className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p>No domains connected yet.</p>
            <p className="text-sm mt-2">
              Connect a Gmail account or add a custom domain to get started.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {domains.map((domain) => (
              <div
                key={domain.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {domain.type === "gmail" ? (
                        <Mail className="w-8 h-8 text-red-500" />
                      ) : (
                        <Globe className="w-8 h-8 text-blue-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {domain.name}
                        </h3>
                        {getStatusIcon(domain.status)}
                      </div>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                        <span className="capitalize">{domain.type}</span>
                        <span>•</span>
                        <span>{getStatusText(domain.status)}</span>
                        <span>•</span>
                        <span>{domain.emailsSentPerDay} emails/day</span>
                        <span>•</span>
                        <span>
                          Last sync: {formatLastSync(domain.lastSyncTime)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleSync(domain.id)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Sync"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDisconnect(domain.id)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Disconnect"
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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          Domain Management Tips
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Connect multiple Gmail accounts to balance sending load</li>
          <li>
            • Custom domains require DNS configuration for proper email delivery
          </li>
          <li>• Domains are automatically synced every 5 minutes</li>
          <li>• Monitor email limits per domain to avoid rate limiting</li>
        </ul>
      </div>
    </div>
  );
}
