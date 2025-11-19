"use client";

import { useState } from "react";
import { X, Mail, Globe, Edit, CheckCircle, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

interface CreateDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface OAuthCredentials {
  client_id: string;
  project_id: string;
  client_secret: string;
  auth_uri?: string;
  token_uri?: string;
  auth_provider_x509_cert_url?: string;
  redirect_uris?: string[];
}

export default function CreateDomainModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateDomainModalProps) {
  const [domainType, setDomainType] = useState<"gmail" | "custom">("gmail");
  const [connectingGmail, setConnectingGmail] = useState(false);
  const [gmailEmail, setGmailEmail] = useState("");
  const [uploadMethod, setUploadMethod] = useState<"file" | "manual">("file");
  const [credentialsFile, setCredentialsFile] = useState<File | null>(null);
  const [uploadedCredentials, setUploadedCredentials] =
    useState<OAuthCredentials | null>(null);
  const [manualCredentials, setManualCredentials] = useState({
    client_id: "",
    project_id: "",
    client_secret: "",
    redirect_uris: [
      "https://n8n.isra-land.com/rest/oauth2-credential/callback",
    ],
  });
  const [customDomain, setCustomDomain] = useState("");

  if (!isOpen) return null;

  const saveGmailDomain = async (email: string) => {
    const response = await fetch("/api/domains", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: email,
        type: "gmail",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const isDuplicate =
        response.status === 400 && errorData?.error === "Domain already exists";

      if (!isDuplicate) {
        throw new Error(errorData?.error || "Failed to save Gmail domain");
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const credentials = JSON.parse(text);

      // Validate the credentials file structure
      if (
        !credentials.web ||
        !credentials.web.client_id ||
        !credentials.web.client_secret
      ) {
        toast.error("Invalid credentials file format");
        return;
      }

      setCredentialsFile(file);
      setUploadedCredentials(credentials.web);
      toast.success("Credentials file loaded successfully");
    } catch (error) {
      toast.error("Failed to parse credentials file");
      console.error(error);
    }
  };

  const handleSubmitGmail = async () => {
    if (!gmailEmail.trim()) {
      toast.error("Please enter your Gmail address");
      return;
    }

    let credentialsData;

    try {
      if (uploadMethod === "file") {
        if (!credentialsFile) {
          toast.error("Please upload a credentials file");
          return;
        }

        const text = await credentialsFile.text();
        const parsedCredentials = JSON.parse(text);
        credentialsData = parsedCredentials.web;
      } else {
        // Manual entry
        if (
          !manualCredentials.client_id ||
          !manualCredentials.client_secret ||
          !manualCredentials.project_id
        ) {
          toast.error("Please fill in all required fields");
          return;
        }
        credentialsData = manualCredentials;
      }

      setConnectingGmail(true);

      // Call n8n webhook for Gmail setup
      const webhookUrl =
        process.env.NEXT_PUBLIC_GMAIL_SETUP_WEBHOOK ||
        "https://n8n.isra-land.com/webhook/2e5ec21d-0a5e-4a14-af15-8881a0ac88e5";
      const payload = {
        web: {
          client_id: credentialsData.client_id,
          project_id: credentialsData.project_id,
          auth_uri:
            credentialsData.auth_uri ||
            "https://accounts.google.com/o/oauth2/auth",
          token_uri:
            credentialsData.token_uri || "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url:
            credentialsData.auth_provider_x509_cert_url ||
            "https://www.googleapis.com/oauth2/v1/certs",
          client_secret: credentialsData.client_secret,
          redirect_uris: credentialsData.redirect_uris || [
            "https://n8n.isra-land.com/rest/oauth2-credential/callback",
          ],
        },
        email: gmailEmail,
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

      try {
        await saveGmailDomain(gmailEmail.trim());
      } catch (persistError) {
        console.error(persistError);
        toast.error(
          "Gmail connected, but failed to save domain in dashboard. Please refresh."
        );
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

  const handleSubmitCustomDomain = async () => {
    if (!customDomain.trim()) {
      toast.error("Please enter a domain name");
      return;
    }

    try {
      const response = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: customDomain, type: "custom" }),
      });

      if (!response.ok) throw new Error("Failed to add domain");

      toast.success("Domain added successfully");
      resetForm();
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error("Failed to add domain");
      console.error(error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (domainType === "gmail") {
      handleSubmitGmail();
    } else {
      handleSubmitCustomDomain();
    }
  };

  const resetForm = () => {
    setGmailEmail("");
    setCredentialsFile(null);
    setUploadedCredentials(null);
    setManualCredentials({
      client_id: "",
      project_id: "",
      client_secret: "",
      redirect_uris: [
        "https://n8n.isra-land.com/rest/oauth2-credential/callback",
      ],
    });
    setCustomDomain("");
    setDomainType("gmail");
    setUploadMethod("file");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-opacity-50 backdrop-blur-md"
        onClick={onClose}
      ></div>
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Add Domain</h2>
            <p className="mt-1 text-sm text-blue-100">
              Connect a Gmail account or add a custom domain
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
          {/* Domain Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Domain Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDomainType("gmail")}
                className={`p-4 border-2 rounded-lg transition-all ${
                  domainType === "gmail"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 text-gray-700 hover:border-blue-300"
                }`}
              >
                <div className="flex flex-col items-center">
                  <Mail className="w-8 h-8 mb-2" />
                  <span className="font-medium">Gmail Account</span>
                  <span className="text-xs mt-1 text-gray-500">
                    Connect via OAuth
                  </span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setDomainType("custom")}
                className={`p-4 border-2 rounded-lg transition-all ${
                  domainType === "custom"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 text-gray-700 hover:border-blue-300"
                }`}
              >
                <div className="flex flex-col items-center">
                  <Globe className="w-8 h-8 mb-2" />
                  <span className="font-medium">Custom Domain</span>
                  <span className="text-xs mt-1 text-gray-500">
                    Add SMTP domain
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Gmail Setup */}
          {domainType === "gmail" && (
            <>
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-400 transition-all outline-none focus:outline-"
                  required
                />
              </div>

              {/* Upload Method Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  OAuth Credentials Setup Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setUploadMethod("file")}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      uploadMethod === "file"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-300 text-gray-700 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <Globe className="w-6 h-6 mb-2" />
                      <span className="font-medium">Upload File</span>
                      <span className="text-xs mt-1 text-gray-500">
                        Upload credentials JSON
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMethod("manual")}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      uploadMethod === "manual"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-300 text-gray-700 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <Edit className="w-6 h-6 mb-2" />
                      <span className="font-medium">Manual Entry</span>
                      <span className="text-xs mt-1 text-gray-500">
                        Enter details manually
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* File Upload */}
              {uploadMethod === "file" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Google OAuth Credentials File{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-400 transition-all">
                    <div className="space-y-1 text-center">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="flex text-sm text-gray-600">
                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                          <span>Upload a file</span>
                          <input
                            type="file"
                            accept=".json"
                            onChange={handleFileUpload}
                            className="sr-only"
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {credentialsFile
                          ? credentialsFile.name
                          : "JSON file from Google Cloud Console"}
                      </p>
                    </div>
                  </div>
                  {uploadedCredentials && (
                    <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-2 text-sm text-gray-800">
                      <div className="font-medium text-gray-900">
                        Preview of parsed credentials
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <PreviewField
                          label="Client ID"
                          value={uploadedCredentials.client_id}
                        />
                        <PreviewField
                          label="Project ID"
                          value={uploadedCredentials.project_id}
                        />
                        <PreviewField
                          label="Auth URI"
                          value={
                            uploadedCredentials.auth_uri ||
                            "https://accounts.google.com/o/oauth2/auth"
                          }
                        />
                        <PreviewField
                          label="Token URI"
                          value={
                            uploadedCredentials.token_uri ||
                            "https://oauth2.googleapis.com/token"
                          }
                        />
                        <PreviewField
                          label="Cert URL"
                          value={
                            uploadedCredentials.auth_provider_x509_cert_url ||
                            "https://www.googleapis.com/oauth2/v1/certs"
                          }
                        />
                        <PreviewField
                          label="Redirect URIs"
                          value={
                            uploadedCredentials.redirect_uris?.join(", ") ||
                            "https://n8n.isra-land.com/rest/oauth2-credential/callback"
                          }
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        These values will be sent exactly as shown when you run
                        the Gmail setup.
                      </p>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    💡 Download this file from Google Cloud Console → APIs &
                    Services → Credentials
                  </p>
                </div>
              )}

              {/* Manual Entry */}
              {uploadMethod === "manual" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={manualCredentials.client_id}
                      onChange={(e) =>
                        setManualCredentials({
                          ...manualCredentials,
                          client_id: e.target.value,
                        })
                      }
                      placeholder="1060720227168-xxxxx.apps.googleusercontent.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client Secret <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={manualCredentials.client_secret}
                      onChange={(e) =>
                        setManualCredentials({
                          ...manualCredentials,
                          client_secret: e.target.value,
                        })
                      }
                      placeholder="GOCSPX-xxxxx"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={manualCredentials.project_id}
                      onChange={(e) =>
                        setManualCredentials({
                          ...manualCredentials,
                          project_id: e.target.value,
                        })
                      }
                      placeholder="my-project-123456"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 transition-all"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> You'll need OAuth 2.0 credentials from
                  Google Cloud Console. Create them at: APIs & Services →
                  Credentials → Create OAuth 2.0 Client ID.
                  <br />
                  <strong>Redirect URI:</strong> Use{" "}
                  <code className="bg-blue-100 px-1 py-0.5 rounded">
                    https://n8n.isra-land.com/rest/oauth2-credential/callback
                  </code>{" "}
                  in your Google Cloud Console.
                </p>
              </div>
            </>
          )}

          {/* Custom Domain */}
          {domainType === "custom" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Domain Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="example.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 transition-all"
                  required
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  💡 Make sure to configure DNS records (SPF, DKIM, DMARC) for
                  your custom domain to ensure proper email delivery.
                </p>
              </div>
            </>
          )}
        </form>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
          <button
            type="button"
            onClick={() => {
              resetForm();
              onClose();
            }}
            disabled={connectingGmail}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={connectingGmail}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {connectingGmail ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                {domainType === "gmail" ? "Setup Gmail" : "Add Domain"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-0.5 break-words rounded bg-white px-3 py-2 border border-gray-200 text-gray-900 text-sm">
        {value}
      </div>
    </div>
  );
}
