export interface Campaign {
  id: string;
  name: string;
  sentCount: number;
  openRate: number;
  replyRate: number;
  bounceRate: number;
  unsubscribeCount: number;
  status: "active" | "completed" | "paused";
  createdAt: string;
  startDate?: string;
  startTime?: string;
  domainId: string;
  template?: string;
  subject?: string;
  bodyImage?: string; // Base64 or URL
  followUpTemplate?: string;
  followUpDelay?: number;
  csvData?: any[]; // Lead data from CSV
}

export interface Domain {
  id: string;
  name: string;
  status: "connected" | "not_connected" | "error";
  lastSyncTime?: string;
  emailsSentPerDay: number;
  type: "gmail" | "custom";
  provider?: string;
}

export interface Unsubscriber {
  Email: string;
  Timestamp: string;
  Action: string;
}

export interface DashboardMetrics {
  totalCampaigns: number;
  totalLeadsContacted: number;
  averageOpenRate: number;
  averageReplyRate: number;
  averageBounceRate: number;
  totalUnsubscribes: number;
  activeCampaigns: number;
  recentReplies: number;
}

export interface CampaignPerformance {
  date: string;
  sent: number;
  opens: number;
  replies: number;
  bounces: number;
}

export interface Lead {
  name: string;
  email: string;
  company?: string;
  [key: string]: any;
}

export interface RecentActivity {
  type: "campaign_created" | "campaign_sent" | "unsubscribe";
  title: string;
  subtitle: string;
  timestamp: string;
  campaignName?: string;
  email?: string;
  badge: {
    text: string;
    color: "blue" | "green" | "red";
  };
}
