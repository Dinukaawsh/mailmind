# n8n Webhook Logs Setup Guide

## Overview

When you launch a campaign, the frontend automatically sends the campaign data to your n8n webhook. Included in that data is a `logsEndpoint` URL that you can use to send streaming logs back to the frontend.

## Getting the Logs Endpoint URL

When your n8n webhook receives the campaign data, it will include a `logsEndpoint` field:

```json
{
  "campaignId": "1234567890abcdef",
  "id": "1234567890abcdef",
  "name": "My Campaign",
  "logsEndpoint": "https://your-domain.com/api/campaigns/1234567890abcdef/logs"
  // ... other campaign data
}
```

**Extract the URL in n8n:**

```
{{ $json.logsEndpoint }}
```

## Setting Up Logs in n8n

### Step 1: Extract the Logs Endpoint

In your n8n workflow, after receiving the webhook:

1. Use a **Set** node or **Code** node to extract the logs endpoint:
   - Variable: `logsEndpoint`
   - Value: `{{ $json.logsEndpoint }}`

### Step 2: Send Logs During Processing

Use an **HTTP Request** node to send logs:

**Configuration:**

- **Method**: `POST`
- **URL**: `{{ $json.logsEndpoint }}` (or `{{ $vars.logsEndpoint }}` if you stored it)
- **Headers**:
  - `Content-Type: application/json`
- **Body** (JSON):

#### Option 1: Simple Message

```json
{
  "message": "Processing email for john@example.com"
}
```

#### Option 2: Multiple Logs

```json
{
  "logs": [
    "Starting email processing...",
    "Email 1 sent successfully",
    "Email 2 sent successfully"
  ]
}
```

#### Option 3: Single String

```json
"Processing campaign data..."
```

### Step 3: Send Completion Message

When processing is complete, send a completion message:

**HTTP Request Node:**

- **Method**: `POST`
- **URL**: `{{ $json.logsEndpoint }}`
- **Body** (JSON):

```json
{
  "complete": true,
  "completionMessage": "All emails sent successfully! Campaign completed."
}
```

**Alternative completion formats:**

```json
{
  "done": true,
  "message": "Campaign processing finished"
}
```

```json
{
  "status": "complete",
  "completion": "All succeeded!"
}
```

## Complete n8n Workflow Example

```
1. Webhook (Receive Campaign Data)
   ↓
2. Set Node (Store logsEndpoint)
   - logsEndpoint: {{ $json.logsEndpoint }}
   ↓
3. Loop Through Emails
   ↓
4. HTTP Request (Send Log)
   - Method: POST
   - URL: {{ $vars.logsEndpoint }}
   - Body: { "message": "Sending email to {{ $json.email }}" }
   ↓
5. Process Email
   ↓
6. HTTP Request (Send Completion)
   - Method: POST
   - URL: {{ $vars.logsEndpoint }}
   - Body: { "complete": true, "completionMessage": "All emails sent!" }
```

## Logs Endpoint URL Format

The logs endpoint URL follows this pattern:

```
{baseUrl}/api/campaigns/{campaignId}/logs
```

**Base URL Examples:**

- **Local Development**: `http://localhost:3000`
- **Vercel**: `https://your-app.vercel.app`
- **Custom Domain**: `https://your-domain.com`

**Full URL Example:**

```
https://your-domain.com/api/campaigns/1234567890abcdef/logs
```

## Supported Log Formats

The endpoint accepts multiple formats:

### 1. Simple Message

```json
{
  "message": "Your log message here"
}
```

### 2. Log Array

```json
{
  "logs": ["Log 1", "Log 2", "Log 3"]
}
```

### 3. Completion with Message

```json
{
  "complete": true,
  "completionMessage": "All done!"
}
```

### 4. Status-based Completion

```json
{
  "status": "complete",
  "completion": "Success message"
}
```

## Environment Variables

Make sure to set `NEXT_PUBLIC_BASE_URL` in your environment variables:

**For Local Development:**

```env
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**For Production (Vercel):**

```env
NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
```

**For Custom Domain:**

```env
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

If `NEXT_PUBLIC_BASE_URL` is not set, the system will:

- Use `https://${VERCEL_URL}` if deployed on Vercel
- Default to `http://localhost:3000` for local development

## Testing

1. **Launch a campaign** from the frontend
2. **Check n8n webhook** - you should receive campaign data with `logsEndpoint`
3. **Send a test log** from n8n to the logs endpoint
4. **Check frontend** - logs button should appear next to the play button
5. **Click logs button** - you should see your test log
6. **Send completion message** - status should change to "Processing Complete"

## Troubleshooting

### Logs Not Appearing

- Verify the `logsEndpoint` URL is correct
- Check that you're using `POST` method
- Ensure `Content-Type: application/json` header is set
- Check n8n execution logs for errors

### Completion Not Detected

- Make sure you're sending `complete: true` or `done: true`
- Include a `completionMessage` for better UX
- Check that the completion message is sent to the same logs endpoint

### URL Not Accessible

- Verify `NEXT_PUBLIC_BASE_URL` is set correctly
- Check that your n8n instance can reach your frontend URL
- For local development, ensure both are on the same network or use ngrok

## Example n8n Code Node

If you prefer using a Code node to send logs:

```javascript
const logsEndpoint = $input.item.json.logsEndpoint;

// Send log
await fetch(logsEndpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    message: `Processing email ${email}...`,
  }),
});

// Send completion
await fetch(logsEndpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    complete: true,
    completionMessage: "All emails processed successfully!",
  }),
});
```
