"use client";

import { useState } from "react";
import { X, CheckCircle, RefreshCw, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

interface CreateDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateDomainModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateDomainModalProps) {
  const [connectingGmail, setConnectingGmail] = useState(false);
  const [gmailEmail, setGmailEmail] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [showPassword, setShowPassword] = useState(false);
  const [imapHost, setImapHost] = useState("imap.gmail.com");

  if (!isOpen) return null;

  const handleSubmitGmail = async () => {
    if (!gmailEmail.trim()) {
      toast.error("Please enter your Gmail address");
      return;
    }

    if (!smtpPassword.trim()) {
      toast.error("Please enter the SMTP password or app password");
      return;
    }

    const sanitizedEmail = gmailEmail.trim();
    const sanitizedPassword = smtpPassword.trim();
    const sanitizedHost = smtpHost.trim() || "smtp.gmail.com";
    const sanitizedImapHost = imapHost.trim() || "imap.gmail.com";

    try {
      setConnectingGmail(true);

      // Call n8n webhook for Gmail setup
      const webhookUrl =
        process.env.NEXT_PUBLIC_GMAIL_SETUP_WEBHOOK ||
        "https://mailmind.cloud/webhook/2e5ec21d-0a5e-4a14-af15-8881a0ac88e5";
      const payload = {
        web: {
          email: sanitizedEmail,
          pass: sanitizedPassword,
          smtp_host: sanitizedHost,
          imap_host: sanitizedImapHost,
        },
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to setup Gmail account");
      }

      const result = await response.json();

      // If n8n returns an auth URL, open it
      if (result.authUrl) {
        window.open(result.authUrl, "_blank", "width=600,height=700");
        toast.success("Opening Gmail authentication...");
      } else {
        toast.success("Gmail account setup initiated");
      }

      // Reset and close
      resetForm();
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error("Failed to setup Gmail account");
      console.error(error);
    } finally {
      setConnectingGmail(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmitGmail();
  };

  const resetForm = () => {
    setGmailEmail("");
    setSmtpPassword("");
    setSmtpHost("smtp.gmail.com");
    setShowPassword(false);
    setImapHost("imap.gmail.com");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-opacity-50 backdrop-blur-md"
        onClick={onClose}
      ></div>
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-[#05112b] px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Add Gmail Domain</h2>
            <p className="mt-1 text-sm text-gray-300">
              Connect your Gmail account
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
          {/* Gmail Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gmail Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={gmailEmail}
              onChange={(e) => setGmailEmail(e.target.value)}
              placeholder="your.email@gmail.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#beb7c9] focus:border-transparent text-gray-900 placeholder-gray-400 transition-all outline-none"
              required
            />
          </div>

          {/* SMTP Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              SMTP/App Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                placeholder="App password or Gmail password"
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#beb7c9] focus:border-transparent text-gray-900 placeholder-gray-400 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Use a Google App Password for the connected Gmail account for best
              security.
            </p>
          </div>

          {/* SMTP Host */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SMTP Host
            </label>
            <input
              type="text"
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              placeholder="smtp.gmail.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#beb7c9] focus:border-transparent text-gray-900 placeholder-gray-400 transition-all"
            />
            <p className="mt-2 text-xs text-gray-500">
              Defaults to{" "}
              <code className="bg-gray-200 px-1 py-0.5 rounded">
                smtp.gmail.com
              </code>{" "}
              if left untouched.
            </p>
          </div>

          {/* IMAP Host */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              IMAP Host
            </label>
            <input
              type="text"
              value={imapHost}
              onChange={(e) => setImapHost(e.target.value)}
              placeholder="imap.gmail.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#beb7c9] focus:border-transparent text-gray-900 placeholder-gray-400 transition-all"
            />
            <p className="mt-2 text-xs text-gray-500">
              Defaults to{" "}
              <code className="bg-gray-200 px-1 py-0.5 rounded">
                imap.gmail.com
              </code>{" "}
              if left untouched.
            </p>
          </div>
          <div className="p-3 bg-gray-100 border border-gray-300 rounded-lg">
            <p className="text-xs text-gray-700">
              <strong>What happens:</strong> We send the email, password, and
              host to the automation webhook. The webhook will setup your Gmail
              account and automatically save the domain to the database.
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
              disabled={connectingGmail}
              className="w-full px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={connectingGmail}
              className="w-full px-6 py-2.5 bg-[#05112b] text-white rounded-lg hover:bg-[#05112b]/90 transition-all shadow-md hover:shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {connectingGmail ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Setup Gmail
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
