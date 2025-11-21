// API utility functions for backend communication
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

// Check if using webhook (for external API) or local Next.js API
// Only use webhook if explicitly set AND contains "webhook"
const isWebhook =
  API_BASE_URL.includes("webhook") &&
  process.env.NEXT_PUBLIC_USE_WEBHOOK === "true";

export async function fetchWithError<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  // If using a webhook URL (n8n), send all requests to the same URL
  // Otherwise, use Next.js API routes (relative paths)

  const method = options?.method || "GET";
  const isGetRequest = method === "GET" || method === "HEAD";

  let requestBody: any = {};
  if (isWebhook && !isGetRequest) {
    // For webhook with POST/PUT/DELETE, include endpoint and method in the body
    requestBody = {
      endpoint,
      method,
    };

    // Merge existing body data if present
    if (options?.body) {
      try {
        const existingBody = JSON.parse(options.body as string);
        requestBody = { ...requestBody, ...existingBody };
      } catch (e) {
        // If body is not JSON, include it as raw data
        requestBody.data = options.body;
      }
    }
  } else if (isWebhook && isGetRequest) {
    // For GET requests with webhook, add endpoint as query parameter or header only
    // Don't add body to GET requests
  }

  // For Next.js API routes (starting with /api/), always use relative paths
  // For webhook, use the full URL only if not a local API route
  const url = endpoint.startsWith("/api/")
    ? endpoint
    : isWebhook
    ? API_BASE_URL
    : `${API_BASE_URL}${endpoint}`;

  // Prepare fetch options
  const fetchOptions: RequestInit = {
    ...options,
    method,
    headers: {
      "Content-Type": "application/json",
      ...(isWebhook ? { "X-Endpoint": endpoint } : {}),
      ...options?.headers,
    },
  };

  // Only add body for non-GET requests
  if (!isGetRequest) {
    if (isWebhook) {
      fetchOptions.body = JSON.stringify(requestBody);
    } else if (options?.body) {
      fetchOptions.body = options.body;
    }
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}

// Dashboard API
// Fetches from MongoDB database (mailmind, campaigns and unsubscribeLogs collections)
export const dashboardApi = {
  getMetrics: () =>
    fetchWithError<{
      metrics: import("../types").DashboardMetrics;
      recentActivity: import("../types").RecentActivity[];
    }>("/api/dashboard"),
  getPerformance: (days: number = 30) =>
    fetchWithError<import("../types").CampaignPerformance[]>(
      `/api/dashboard/performance?days=${days}`
    ),
};

// Campaign API
// Fetches from MongoDB database (mailmind, campaigns collection)
export const campaignApi = {
  getAll: () => fetchWithError<import("../types").Campaign[]>("/api/campaigns"),
  getById: (id: string) =>
    fetchWithError<import("../types").Campaign>(`/api/campaigns/${id}`),
  create: (data: Partial<import("../types").Campaign>) =>
    fetchWithError<import("../types").Campaign>("/api/campaigns", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<import("../types").Campaign>) =>
    fetchWithError<import("../types").Campaign>(`/api/campaigns/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchWithError<void>(`/api/campaigns/${id}`, { method: "DELETE" }),
  start: (id: string) =>
    fetchWithError<{
      success: boolean;
      message: string;
      webhookResponse?: {
        status: number;
        statusText: string;
        headers: Record<string, string>;
        data: any;
      };
    }>(`/api/campaigns/${id}/start`, {
      method: "POST",
    }),
  testSend: (id: string, testEmail: string) =>
    fetchWithError<void>(`/api/campaigns/${id}/test-send`, {
      method: "POST",
      body: JSON.stringify({ email: testEmail }),
    }),
  getLogs: (id: string) =>
    fetchWithError<{
      logs: string[];
      lastUpdated: string | null;
      count: number;
      isComplete: boolean;
      completionMessage?: string | null;
    }>(`/api/campaigns/${id}/logs`),
  clearLogs: (id: string) =>
    fetchWithError<{ success: boolean; message: string }>(
      `/api/campaigns/${id}/logs`,
      { method: "DELETE" }
    ),
  getHistoricalLogs: (id: string) =>
    fetchWithError<{
      logs: string[];
      lastUpdated: string | null;
      count: number;
      isComplete: boolean;
      completionMessage?: string | null;
    }>(`/api/campaigns/${id}/logs/history`),
  getReplies: (
    id: string,
    params?: { page?: number; pageSize?: number; status?: string }
  ) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.pageSize) query.set("pageSize", params.pageSize.toString());
    if (params?.status) query.set("status", params.status);

    const queryString = query.toString();
    const endpoint = `/api/campaigns/${id}/replies${
      queryString ? `?${queryString}` : ""
    }`;

    return fetchWithError<{
      replies: import("../types").CampaignReply[];
      total: number;
      unreadCount: number;
      page: number;
      pageSize: number;
    }>(endpoint);
  },
  markReplyRead: (campaignId: string, replyId: string) =>
    fetchWithError<{ success: boolean }>(
      `/api/campaigns/${campaignId}/replies/${replyId}/read`,
      { method: "POST" }
    ),
};

// Domain API
// Fetches from MongoDB database (mailmind, domains collection)
// NOTE: Domain creation is now handled by the n8n webhook, not through the API
export const domainApi = {
  getAll: () => fetchWithError<import("../types").Domain[]>("/api/domains"),
  // @deprecated - Domain creation is now handled by n8n webhook
  connectGmail: async () => {
    // This function is deprecated - use the CreateDomainModal which calls the webhook directly
    return {
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    };
  },
  // @deprecated - Domain creation is now handled by n8n webhook
  addCustom: async (domain: string) => {
    // This function is deprecated - domains are now created via webhook
    return fetchWithError<import("../types").Domain>("/api/domains", {
      method: "POST",
      body: JSON.stringify({ name: domain, type: "custom" }),
    });
  },
  disconnect: async (id: string) => {
    return fetchWithError<void>(`/api/domains/${id}`, { method: "DELETE" });
  },
  update: async (id: string, data: Partial<import("../types").Domain>) => {
    return fetchWithError<import("../types").Domain>(`/api/domains/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
};

// Unsubscriber API
// Always fetches from MongoDB database (never uses webhook)
// Database: mailmind, Collection: unsubscribeLogs
// External API writes Email, Timestamp, Action directly to MongoDB
export const unsubscriberApi = {
  getAll: () =>
    fetchWithError<import("../types").Unsubscriber[]>("/api/unsubscribers"),
};
