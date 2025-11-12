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
} from "lucide-react";
import { dashboardApi } from "../utils/api";
import {
  DashboardMetrics,
  CampaignPerformance,
  RecentActivity,
} from "../types";
import MetricCard from "../components/MetricCard";
import toast from "react-hot-toast";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [performance, setPerformance] = useState<CampaignPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [domainData, setDomainData] = useState<
    { name: string; value: number }[]
  >([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

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

      // For performance data, we'll use mock data for now
      // TODO: Implement performance tracking API when available
      const mockPerformance: CampaignPerformance[] = Array.from(
        { length: 30 },
        (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (29 - i));
          return {
            date: date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            sent: Math.floor(Math.random() * 200) + 50,
            opens: Math.floor(Math.random() * 100) + 20,
            replies: Math.floor(Math.random() * 20) + 2,
            bounces: Math.floor(Math.random() * 5),
          };
        }
      );
      setPerformance(mockPerformance);
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
        const campaigns = await campaignApi.getAll();

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
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Overview of your email outreach campaigns
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Campaigns"
          value={metrics?.totalCampaigns || 0}
          subtitle={`${metrics?.activeCampaigns || 0} active`}
          icon={<Mail className="w-8 h-8" />}
        />
        <MetricCard
          title="Leads Contacted"
          value={metrics?.totalLeadsContacted.toLocaleString() || 0}
          trend={{ value: 12, isPositive: true }}
          icon={<Users className="w-8 h-8" />}
        />
        {/* <MetricCard
          title="Open Rate"
          value={`${metrics?.averageOpenRate.toFixed(1) || 0}%`}
          trend={{ value: 5.2, isPositive: true }}
          icon={<MailOpen className="w-8 h-8" />}
        />
        <MetricCard
          title="Reply Rate"
          value={`${metrics?.averageReplyRate.toFixed(1) || 0}%`}
          trend={{ value: 2.1, isPositive: true }}
          icon={<MessageSquare className="w-8 h-8" />}
        />
        <MetricCard
          title="Bounce Rate"
          value={`${metrics?.averageBounceRate.toFixed(1) || 0}%`}
          trend={{ value: 0.5, isPositive: true }}
          icon={<TrendingDown className="w-8 h-8" />}
        /> */}
        <MetricCard
          title="Unsubscribes"
          value={metrics?.totalUnsubscribes || 0}
          icon={<UserX className="w-8 h-8" />}
        />
        {/* <MetricCard
          title="Recent Replies"
          value={metrics?.recentReplies || 0}
          subtitle="Last 7 days"
          icon={<TrendingUp className="w-8 h-8" />}
        /> */}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Campaign Performance Chart */}
        {/* <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Campaign Performance (30 Days)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="sent"
                stroke="#3b82f6"
                name="Sent"
              />
              <Line
                type="monotone"
                dataKey="opens"
                stroke="#10b981"
                name="Opens"
              />
              <Line
                type="monotone"
                dataKey="replies"
                stroke="#f59e0b"
                name="Replies"
              />
            </LineChart>
          </ResponsiveContainer>
        </div> */}

        {/* Domain Usage Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
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
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Activity
        </h2>
        {recentActivity.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No recent activity to display
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((activity, index) => {
              const badgeColors = {
                blue: "text-blue-700 bg-blue-50",
                green: "text-green-700 bg-green-50",
                red: "text-red-700 bg-red-50",
              };

              return (
                <div
                  key={index}
                  className={`flex items-center justify-between py-2 ${
                    index < recentActivity.length - 1
                      ? "border-b border-gray-100"
                      : ""
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {activity.title}
                    </p>
                    <p className="text-xs text-gray-500">{activity.subtitle}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
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
    </div>
  );
}
