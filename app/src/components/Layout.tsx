"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Mail,
  Globe,
  UserX,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  Bell,
  Settings,
  User,
  LogOut,
} from "lucide-react";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Campaigns", href: "/campaigns", icon: Mail },
  { name: "Domains", href: "/domains", icon: Globe },
  { name: "Unsubscribers", href: "/unsubscribers", icon: UserX },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-pink-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-gray-300 shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-6 border-b border-gray-400">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#05112b] rounded-xl flex items-center justify-center shadow-lg border border-gray-400">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#05112b]">Mail-Mind</h1>
                <p className="text-xs text-gray-600">Email Automation</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-[#05112b] hover:text-[#05112b]/80 hover:bg-gray-400 rounded-lg p-1.5 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center justify-between px-4 py-3.5 text-sm font-semibold rounded-xl transition-all ${
                    isActive
                      ? "bg-[#05112b] text-white shadow-lg"
                      : "text-[#05112b] hover:text-[#05112b]/80 hover:bg-gray-400"
                  }`}
                  onClick={() => {
                    setSidebarOpen(false);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg border border-gray-400 transition-all ${
                        isActive
                          ? "bg-white/20 border-white"
                          : "bg-gray-200 group-hover:bg-gray-100"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span>{item.name}</span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4" />}
                </Link>
              );
            })}
          </nav>

          {/* User Profile Section */}
          {/* <div className="p-4 border-t border-white/10">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    Admin User
                  </p>
                  <p className="text-xs text-purple-300 truncate">
                    admin@mail-mind.com
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-all">
                  <Settings className="w-3.5 h-3.5" />
                  Settings
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-semibold rounded-lg transition-all">
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            </div>
          </div> */}
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-[#05112b] hover:text-[#05112b]/80 hover:bg-gray-100 rounded-lg p-2 transition-all"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="hidden lg:block">
                <h2 className="text-xl font-bold text-[#05112b]">
                  {navigation.find(
                    (item) =>
                      pathname === item.href ||
                      (item.href !== "/" && pathname?.startsWith(item.href))
                  )?.name || "Dashboard"}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Manage your email campaigns efficiently
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Notifications */}
              {/* <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button> */}

              {/* Profile */}
              {/* <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-gray-200">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    Admin User
                  </p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                  <User className="w-5 h-5 text-white" />
                </div>
              </div> */}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
