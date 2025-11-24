"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Mail,
  TrendingUp,
  TrendingDown,
  Users,
  MailOpen,
  MessageSquare,
  UserX,
  PlayCircle,
  PauseCircle,
  CheckCircle,
  Calendar,
  Target,
  Activity,
  Eye,
  Clock,
  ArrowUpRight,
  Info,
} from "lucide-react";
import { dashboardApi, campaignApi } from "../utils/api";
import {
  DashboardMetrics,
  CampaignPerformance,
  RecentActivity,
  Campaign,
} from "../types";
import MetricCard from "../components/MetricCard";
import toast from "react-hot-toast";
import DashboardCampaignModal from "../components/DashboardCampaignModal";
import LoadingSpinner from "../components/Loading/LoadingSpinner";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [performance, setPerformance] = useState<CampaignPerformance[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [domainData, setDomainData] = useState<
    { name: string; value: number }[]
  >([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [campaignStats, setCampaignStats] = useState<
    Record<string, { sentCount: number; repliesCount: number }>
  >({});

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Fetch metrics and recent activity from MongoDB database
      const dashboardData = await dashboardApi.getMetrics();
      setMetrics(dashboardData.metrics);
      setRecentActivity(dashboardData.recentActivity);

      // Fetch campaigns
      const campaignsData = await campaignApi.getAll();
      // Filter to show only active campaigns (not archived)
      const activeCampaigns = campaignsData.filter((c) => c.isActive !== false);
      setCampaigns(activeCampaigns);

      // Fetch stats (sent and replies) for each campaign
      const stats: Record<string, { sentCount: number; repliesCount: number }> =
        {};
      await Promise.all(
        activeCampaigns.map(async (campaign) => {
          try {
            // Fetch logs to count sent emails
            const logsResponse = await fetch(
              `/api/campaigns/${campaign.id}/logs/history`
            );
            let sentCount = 0;
            if (logsResponse.ok) {
              const logsData = await logsResponse.json();
              const logs = logsData.logs || [];
              sentCount = logs.filter((log: string) => {
                if (log.includes("✅") || log.includes("📧")) return false;
                try {
                  const parsed = JSON.parse(log);
                  return parsed.Email && parsed.Status;
                } catch {
                  return false;
                }
              }).length;
            }

            // Fetch replies
            const repliesResponse = await fetch(
              `/api/campaigns/${campaign.id}/replies`
            );
            let repliesCount = 0;
            if (repliesResponse.ok) {
              const repliesData = await repliesResponse.json();
              repliesCount = (repliesData.replies || []).length;
            }

            stats[campaign.id] = {
              sentCount: sentCount > 0 ? sentCount : campaign.sentCount || 0,
              repliesCount,
            };
          } catch (error) {
            console.error(
              `Error fetching stats for campaign ${campaign.id}:`,
              error
            );
            stats[campaign.id] = {
              sentCount: campaign.sentCount || 0,
              repliesCount: 0,
            };
          }
        })
      );
      setCampaignStats(stats);

      // Generate performance data from actual campaigns
      // Group campaigns by date and aggregate metrics
      const performanceMap = new Map<
        string,
        {
          sent: number;
          replies: number;
        }
      >();

      // Initialize last 30 days
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        const dateKey = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        performanceMap.set(dateKey, {
          sent: 0,
          replies: 0,
        });
      }

      // Aggregate campaign data based on actual stats from logs and replies
      activeCampaigns.forEach((campaign) => {
        const campaignDate = new Date(campaign.createdAt);
        const dateKey = campaignDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });

        const existing = performanceMap.get(dateKey);
        if (existing) {
          // Use actual sent count from stats (logs)
          existing.sent += stats[campaign.id]?.sentCount || 0;
          // Use actual replies count from stats (replies collection)
          existing.replies += stats[campaign.id]?.repliesCount || 0;
        }
      });

      const performanceData: CampaignPerformance[] = Array.from(
        performanceMap.entries()
      ).map(([date, metrics]) => ({
        date,
        ...metrics,
      }));

      setPerformance(performanceData);
    } catch (error) {
      toast.error("Failed to load dashboard data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate domain usage from campaigns
  useEffect(() => {
    const calculateDomainUsage = async () => {
      try {
        // Fetch campaigns to calculate domain usage
        const { campaignApi } = await import("../utils/api");
        const allCampaigns = await campaignApi.getAll();
        // Filter to show only active campaigns (not archived)
        const campaigns = allCampaigns.filter((c) => c.isActive !== false);

        // Fetch domains to get domain names
        const { domainApi } = await import("../utils/api");
        const domains = await domainApi.getAll();

        // Count leads per domain
        const domainUsageMap = new Map<string, number>();

        campaigns.forEach((campaign) => {
          const domain = domains.find((d) => d.id === campaign.domainId);
          if (domain) {
            const currentCount = domainUsageMap.get(domain.name) || 0;
            const csvDataLength = campaign.csvData?.length || 0;
            domainUsageMap.set(domain.name, currentCount + csvDataLength);
          }
        });

        // Convert to array format for chart
        const domainDataArray = Array.from(domainUsageMap.entries()).map(
          ([name, value]) => ({ name, value })
        );

        // If no data, show placeholder
        if (domainDataArray.length === 0) {
          setDomainData([{ name: "No domains used yet", value: 100 }]);
        } else {
          setDomainData(domainDataArray);
        }
      } catch (error) {
        console.error("Failed to calculate domain usage:", error);
        setDomainData([{ name: "Error loading data", value: 100 }]);
      }
    };

    if (metrics) {
      calculateDomainUsage();
    }
  }, [metrics]);

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <PlayCircle className="w-5 h-5 text-green-500" />;
      case "paused":
        return <PauseCircle className="w-5 h-5 text-yellow-500" />;
      case "completed":
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      default:
        return <Mail className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
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
              <div className="p-3 bg-gray-100 rounded-xl border border-gray-300">
                <Mail className="w-8 h-8 text-[#05112b]" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-[#05112b]">Dashboard</h1>
                <p className="mt-1 text-gray-600 flex items-center">
                  <Activity className="w-4 h-4 mr-2" />
                  Real-time overview of your email outreach campaigns
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="transform transition-all hover:scale-105">
          <MetricCard
            title="Total Campaigns"
            value={metrics?.totalCampaigns || 0}
            subtitle={`${metrics?.activeCampaigns || 0} active`}
            icon={<Mail className="w-8 h-8" />}
          />
        </div>
        <div className="transform transition-all hover:scale-105">
          <MetricCard
            title="Leads Contacted"
            value={metrics?.totalLeadsContacted.toLocaleString() || 0}
            trend={{ value: 12, isPositive: true }}
            icon={<Users className="w-8 h-8" />}
          />
        </div>
        <div className="transform transition-all hover:scale-105">
          <MetricCard
            title="Unsubscribes"
            value={metrics?.totalUnsubscribes || 0}
            icon={<UserX className="w-8 h-8" />}
          />
        </div>
        <div className="transform transition-all hover:scale-105">
          <MetricCard
            title="Success Rate"
            value={`${(
              ((metrics?.totalLeadsContacted || 0) /
                ((metrics?.totalLeadsContacted || 0) +
                  (metrics?.totalUnsubscribes || 1))) *
              100
            ).toFixed(1)}%`}
            trend={{ value: 5.2, isPositive: true }}
            icon={<Target className="w-8 h-8" />}
          />
        </div>
      </div>

      {/* Active Campaigns Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[#05112b] flex items-center">
            <Mail className="w-6 h-6 mr-2 text-[#05112b]" />
            Active Campaigns
          </h2>
          <span className="px-3 py-1 text-sm font-medium text-[#05112b] bg-gray-200 rounded-full">
            {campaigns.filter((c) => c.status === "active").length} Active
          </span>
        </div>

        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No campaigns yet</p>
            <p className="text-gray-400 text-sm mt-2">
              Create your first campaign to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.slice(0, 6).map((campaign) => (
              <div
                key={campaign.id}
                onClick={() => setSelectedCampaign(campaign)}
                className="group relative bg-gradient-to-br from-white to-gray-50 rounded-lg border-2 border-gray-200 p-5 cursor-pointer transition-all duration-300 hover:border-gray-400 hover:shadow-lg hover:-translate-y-1"
              >
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  {getStatusIcon(campaign.status)}
                </div>

                {/* Campaign Info */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 pr-8 truncate group-hover:text-[#05112b] transition-colors">
                    {campaign.name}
                  </h3>
                  <span
                    className={`inline-block px-2 py-1 text-xs font-medium rounded ${getStatusBadgeClass(
                      campaign.status
                    )}`}
                  >
                    {campaign.status.toUpperCase()}
                  </span>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white rounded-lg p-3 border border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Sent</span>
                      <Mail className="w-3 h-3 text-blue-500" />
                    </div>
                    <p className="text-lg font-bold text-gray-900 mt-1">
                      {campaignStats[campaign.id]?.sentCount || 0}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Replies</span>
                      <MessageSquare className="w-3 h-3 text-orange-500" />
                    </div>
                    <p className="text-lg font-bold text-gray-900 mt-1">
                      {campaignStats[campaign.id]?.repliesCount || 0}
                    </p>
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-center text-xs text-gray-500 mb-2">
                  <Calendar className="w-3 h-3 mr-1" />
                  {new Date(campaign.createdAt).toLocaleDateString()}
                </div>

                {/* View Details Button */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <span className="text-xs text-gray-400">
                    Click for details
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-[#05112b] transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}

        {campaigns.length > 6 && (
          <div className="mt-6 text-center">
            <button className="px-6 py-2 text-sm font-medium text-[#05112b] hover:text-[#05112b]/80 hover:bg-gray-100 rounded-lg transition-colors">
              View All Campaigns →
            </button>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Domain Usage Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 transform transition-all hover:shadow-lg">
          <h2 className="text-xl font-bold text-[#05112b] mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-[#05112b]" />
            Domain Usage Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={domainData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => {
                  const percent = entry.percent || 0;
                  return `${entry.name}: ${(percent * 100).toFixed(0)}%`;
                }}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {domainData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Campaign Performance Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 transform transition-all hover:shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#05112b] flex items-center">
              <Activity className="w-5 h-5 mr-2 text-[#05112b]" />
              Performance Trend (30 Days)
            </h2>
            <div className="group relative">
              <Info className="w-5 h-5 text-gray-400 cursor-help" />
              <div className="absolute right-0 top-8 w-80 bg-gray-900 text-white text-xs rounded-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 shadow-xl">
                <p className="font-semibold mb-2">📊 Real Campaign Data</p>
                <p className="mb-2">
                  This chart shows aggregated metrics from your actual
                  campaigns.
                </p>
                <p className="text-gray-300">
                  • <strong>Sent</strong>: Actual emails sent from webhook logs
                  <br />• <strong>Replies</strong>: Actual replies from database
                  {performance.every((p) => p.replies === 0) && (
                    <>
                      <br />
                      <br />
                      <span className="text-yellow-300">
                        ⚠️ No replies detected yet. Replies will appear here
                        once your webhook stores them in the database.
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="sent"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Sent"
                dot={{ fill: "#3b82f6", r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="replies"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Replies"
                dot={{ fill: "#f59e0b", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-[#05112b] mb-6 flex items-center">
          <Clock className="w-5 h-5 mr-2 text-[#05112b]" />
          Recent Activity
        </h2>
        {recentActivity.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No recent activity to display</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((activity, index) => {
              const badgeColors = {
                blue: "text-blue-700 bg-blue-50 border-blue-200",
                green: "text-green-700 bg-green-50 border-green-200",
                red: "text-red-700 bg-red-50 border-red-200",
              };

              return (
                <div
                  key={index}
                  className="flex items-center justify-between py-4 px-4 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        activity.badge.color === "blue"
                          ? "bg-blue-500"
                          : activity.badge.color === "green"
                          ? "bg-green-500"
                          : "bg-red-500"
                      }`}
                    ></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {activity.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {activity.subtitle}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-full border ${
                      badgeColors[activity.badge.color]
                    }`}
                  >
                    {activity.badge.text}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Campaign Details Modal */}
      {selectedCampaign && (
        <DashboardCampaignModal
          campaign={selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
        />
      )}
    </div>
  );
}
