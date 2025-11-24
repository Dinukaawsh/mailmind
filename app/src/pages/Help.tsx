"use client";

import {
  BookOpen,
  Mail,
  Users,
  Settings,
  FileText,
  PlayCircle,
  MessageSquare,
  HelpCircle,
} from "lucide-react";

export default function Help() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mr-4 border border-gray-300">
            <HelpCircle className="w-6 h-6 text-[#05112b]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#05112b]">Help Center</h1>
            <p className="text-gray-600 mt-1">
              Learn how to use the Email Campaign Management System
            </p>
          </div>
        </div>
      </div>

      {/* Introduction */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-bold text-[#05112b] mb-3">
          Welcome to the Email Campaign System
        </h2>
        <p className="text-gray-700 leading-relaxed">
          This system allows you to manage email campaigns, track performance,
          and organize your contacts efficiently. Below you'll find guides on
          how to use each feature.
        </p>
      </div>

      {/* Help Sections */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Dashboard */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
              <BookOpen className="w-5 h-5 text-[#05112b]" />
            </div>
            <h3 className="text-lg font-bold text-[#05112b]">Dashboard</h3>
          </div>
          <p className="text-gray-700 text-sm leading-relaxed">
            View your campaign overview, metrics, and recent activity. Track
            email opens, replies, and overall campaign performance at a glance.
          </p>
          <div className="mt-4 space-y-2">
            <div className="flex items-start">
              <span className="w-1.5 h-1.5 bg-[#05112b] rounded-full mt-2 mr-2"></span>
              <p className="text-sm text-gray-600">View active campaigns</p>
            </div>
            <div className="flex items-start">
              <span className="w-1.5 h-1.5 bg-[#05112b] rounded-full mt-2 mr-2"></span>
              <p className="text-sm text-gray-600">Monitor key metrics</p>
            </div>
            <div className="flex items-start">
              <span className="w-1.5 h-1.5 bg-[#05112b] rounded-full mt-2 mr-2"></span>
              <p className="text-sm text-gray-600">Track recent activity</p>
            </div>
          </div>
        </div>

        {/* Campaigns */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
              <Mail className="w-5 h-5 text-[#05112b]" />
            </div>
            <h3 className="text-lg font-bold text-[#05112b]">Campaigns</h3>
          </div>
          <p className="text-gray-700 text-sm leading-relaxed">
            Create, manage, and monitor email campaigns. Upload leads, customize
            templates, and schedule sends.
          </p>
          <div className="mt-4 space-y-2">
            <div className="flex items-start">
              <span className="w-1.5 h-1.5 bg-[#05112b] rounded-full mt-2 mr-2"></span>
              <p className="text-sm text-gray-600">Create new campaigns</p>
            </div>
            <div className="flex items-start">
              <span className="w-1.5 h-1.5 bg-[#05112b] rounded-full mt-2 mr-2"></span>
              <p className="text-sm text-gray-600">Upload CSV leads</p>
            </div>
            <div className="flex items-start">
              <span className="w-1.5 h-1.5 bg-[#05112b] rounded-full mt-2 mr-2"></span>
              <p className="text-sm text-gray-600">Schedule and launch</p>
            </div>
          </div>
        </div>

        {/* Domains */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
              <Settings className="w-5 h-5 text-[#05112b]" />
            </div>
            <h3 className="text-lg font-bold text-[#05112b]">Domains</h3>
          </div>
          <p className="text-gray-700 text-sm leading-relaxed">
            Connect and manage your email domains. Add Gmail accounts or custom
            SMTP servers to send campaigns.
          </p>
          <div className="mt-4 space-y-2">
            <div className="flex items-start">
              <span className="w-1.5 h-1.5 bg-[#05112b] rounded-full mt-2 mr-2"></span>
              <p className="text-sm text-gray-600">Connect Gmail accounts</p>
            </div>
            <div className="flex items-start">
              <span className="w-1.5 h-1.5 bg-[#05112b] rounded-full mt-2 mr-2"></span>
              <p className="text-sm text-gray-600">Monitor domain status</p>
            </div>
            <div className="flex items-start">
              <span className="w-1.5 h-1.5 bg-[#05112b] rounded-full mt-2 mr-2"></span>
              <p className="text-sm text-gray-600">Track email quota</p>
            </div>
          </div>
        </div>

        {/* Unsubscribers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
              <Users className="w-5 h-5 text-[#05112b]" />
            </div>
            <h3 className="text-lg font-bold text-[#05112b]">Unsubscribers</h3>
          </div>
          <p className="text-gray-700 text-sm leading-relaxed">
            Manage users who have opted out of your campaigns. Export data and
            ensure compliance with email regulations.
          </p>
          <div className="mt-4 space-y-2">
            <div className="flex items-start">
              <span className="w-1.5 h-1.5 bg-[#05112b] rounded-full mt-2 mr-2"></span>
              <p className="text-sm text-gray-600">View unsubscribe list</p>
            </div>
            <div className="flex items-start">
              <span className="w-1.5 h-1.5 bg-[#05112b] rounded-full mt-2 mr-2"></span>
              <p className="text-sm text-gray-600">Export to CSV</p>
            </div>
            <div className="flex items-start">
              <span className="w-1.5 h-1.5 bg-[#05112b] rounded-full mt-2 mr-2"></span>
              <p className="text-sm text-gray-600">Search and filter</p>
            </div>
          </div>
        </div>
      </div>

      {/* Getting Started */}
      <div className="mt-6 bg-gray-100 rounded-xl border border-gray-300 p-6">
        <div className="flex items-center mb-4">
          <PlayCircle className="w-6 h-6 text-[#05112b] mr-2" />
          <h2 className="text-xl font-bold text-[#05112b]">Getting Started</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-start">
            <div className="w-8 h-8 bg-[#05112b] text-white rounded-full flex items-center justify-center mr-3 flex-shrink-0 font-bold text-sm">
              1
            </div>
            <div>
              <p className="font-semibold text-gray-900">Connect a Domain</p>
              <p className="text-sm text-gray-600">
                Go to Domains page and connect your Gmail account or SMTP server
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="w-8 h-8 bg-[#05112b] text-white rounded-full flex items-center justify-center mr-3 flex-shrink-0 font-bold text-sm">
              2
            </div>
            <div>
              <p className="font-semibold text-gray-900">Create a Campaign</p>
              <p className="text-sm text-gray-600">
                Navigate to Campaigns and click "Create Campaign" to set up your
                email campaign
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="w-8 h-8 bg-[#05112b] text-white rounded-full flex items-center justify-center mr-3 flex-shrink-0 font-bold text-sm">
              3
            </div>
            <div>
              <p className="font-semibold text-gray-900">Upload Leads</p>
              <p className="text-sm text-gray-600">
                Upload a CSV file with your contacts and customize your email
                template
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="w-8 h-8 bg-[#05112b] text-white rounded-full flex items-center justify-center mr-3 flex-shrink-0 font-bold text-sm">
              4
            </div>
            <div>
              <p className="font-semibold text-gray-900">Launch Campaign</p>
              <p className="text-sm text-gray-600">
                Schedule your campaign or launch it immediately and monitor
                performance
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Need More Help */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
        <MessageSquare className="w-12 h-12 text-[#05112b] mx-auto mb-3" />
        <h3 className="text-lg font-bold text-[#05112b] mb-2">
          Need More Help?
        </h3>
        <p className="text-gray-600 text-sm mb-4">
          If you have questions or need additional support, feel free to reach
          out to our team.
        </p>
        <button className="px-6 py-2.5 bg-[#05112b] text-white rounded-lg hover:bg-[#05112b]/90 transition-colors font-medium">
          Contact Support
        </button>
      </div>
    </div>
  );
}
