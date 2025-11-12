# MailMimic - Email Outreach Automation Platform

A comprehensive email campaign management platform built with Next.js that enables businesses to create, manage, and automate email outreach campaigns with a human-like approach. The platform includes lead management, domain configuration, campaign analytics, and time-based restrictions for optimal email delivery.

## 🚀 Features

### Campaign Management

- **Create & Edit Campaigns**: Build personalized email campaigns with custom templates
- **CSV Lead Import**: Upload CSV files with lead data for bulk email campaigns
- **Image Support**: Add images to email bodies (stored in AWS S3)
- **Template Variables**: Use dynamic placeholders (e.g., `{{name}}`, `{{email}}`) for personalized emails
- **Campaign Preview**: Preview emails with actual lead data before sending
- **Time Restrictions**: Optional time-based restrictions (8 AM - 6 PM Paris time) for campaign sending
- **Campaign Status Tracking**: Monitor campaign status (active, paused, completed)

### Domain Management

- **Domain Configuration**: Add and manage sending domains (Gmail or custom)
- **Domain Status**: Track domain connection status
- **Email Limits**: Configure daily email sending limits per domain

### Dashboard & Analytics

- **Real-time Metrics**: View total campaigns, leads contacted, open rates, reply rates
- **Campaign Performance**: Track bounce rates and unsubscribe counts
- **Recent Activity**: Monitor recent campaign activities and unsubscribes
- **Visual Charts**: Interactive charts for campaign performance visualization

### Unsubscriber Management

- **Unsubscribe Tracking**: Manage and track unsubscribed users
- **Export Functionality**: Export unsubscriber lists to CSV
- **Database Integration**: Store and retrieve unsubscriber data

### File Storage

- **AWS S3 Integration**: Secure storage for campaign images and CSV files
- **Presigned URLs**: Secure access to private S3 objects
- **Organized Storage**: Files organized in `private/images/` and `private/csv/` folders

## 🛠️ Tech Stack

- **Framework**: Next.js 16.0.1 (App Router)
- **Language**: TypeScript
- **UI Library**: React 19.2.0
- **Styling**: Tailwind CSS 4
- **Database**: MongoDB 7.0
- **Cloud Storage**: AWS S3
- **Icons**: Lucide React
- **Charts**: Recharts
- **Notifications**: React Hot Toast
- **CSV Parsing**: PapaParse

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- Node.js 18+ and npm/yarn/pnpm
- MongoDB database (local or cloud instance like MongoDB Atlas)
- AWS account with S3 bucket configured
- AWS Access Key ID and Secret Access Key

## 🔧 Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd mail-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:

   ```env
   # MongoDB Configuration
   MONGODB_URI=your-mongodb-connection-string
   MONGODB_DATABASE=your-database-name

   # AWS S3 Configuration
   S3_BUCKET_NAME=your-s3-bucket-name
   AWS_ACCESS_KEY_ID=your-aws-access-key-id
   AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
   AWS_REGION=eu-north-1

   # Optional: Webhook Configuration
   NEXT_PUBLIC_API_URL=http://localhost:3001/api
   NEXT_PUBLIC_USE_WEBHOOK=false
   ```

4. **Run the development server**

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
mail-app/
├── app/
│   ├── api/                    # API routes
│   │   ├── campaigns/          # Campaign CRUD operations
│   │   ├── dashboard/         # Dashboard metrics
│   │   ├── domains/           # Domain management
│   │   ├── upload/            # S3 file upload
│   │   ├── s3-presigned-url/  # S3 presigned URL generation
│   │   └── unsubscribers/     # Unsubscriber management
│   ├── campaigns/             # Campaign pages
│   ├── domains/               # Domain pages
│   ├── unsubscribers/         # Unsubscriber pages
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── types/             # TypeScript types
│   │   └── utils/             # Utility functions
│   └── layout.tsx             # Root layout
├── public/                    # Static assets
├── package.json
└── README.md
```

## 🎯 Key Features Explained

### Campaign Creation

1. Upload a CSV file with lead data (name, email, company, etc.)
2. Create email templates with dynamic placeholders
3. Upload images for email bodies (automatically stored in S3)
4. Configure campaign settings (domain, subject, start date/time)
5. Preview emails with actual lead data
6. Save and manage campaigns

### Time Restrictions

- **Default Behavior**: Play button is only active between 8 AM - 6 PM Paris time
- **Toggle Option**: Users can disable time restrictions to allow 24/7 sending
- **Real-time Updates**: Paris time displayed and updated every second
- **Persistent Settings**: Toggle preference saved in browser localStorage

### File Storage

- Images and CSV files are uploaded to AWS S3
- Files are organized in `private/images/` and `private/csv/` folders
- Presigned URLs are generated for secure access to private S3 objects
- Files remain private and secure

### Webhook Integration

- Campaigns can be sent to external webhooks (e.g., n8n workflows)
- Webhook responses are displayed with detailed error messages
- Supports custom webhook endpoints for email delivery automation

## 🔐 Environment Variables

| Variable                  | Description                      | Required |
| ------------------------- | -------------------------------- | -------- |
| `MONGODB_URI`             | MongoDB connection string        | Yes      |
| `MONGODB_DATABASE`        | MongoDB database name            | Yes      |
| `S3_BUCKET_NAME`          | AWS S3 bucket name               | Yes      |
| `AWS_ACCESS_KEY_ID`       | AWS access key                   | Yes      |
| `AWS_SECRET_ACCESS_KEY`   | AWS secret key                   | Yes      |
| `AWS_REGION`              | AWS region (default: eu-north-1) | Yes      |
| `NEXT_PUBLIC_API_URL`     | API base URL                     | No       |
| `NEXT_PUBLIC_USE_WEBHOOK` | Enable webhook mode              | No       |

## 🚀 Deployment

### Build for Production

```bash
npm run build
npm start
```

### Deploy to Vercel

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### AWS S3 Bucket Setup

1. Create an S3 bucket in your AWS account
2. Configure bucket permissions (private access recommended)
3. Set up IAM user with S3 read/write permissions
4. Add credentials to environment variables

### MongoDB Setup

- Use MongoDB Atlas for cloud hosting, or
- Set up a local MongoDB instance
- Ensure network access is configured correctly

## 📝 Usage Examples

### Creating a Campaign

1. Navigate to **Campaigns** → **Create Campaign**
2. Upload a CSV file with columns: `name`, `email`, `company`
3. Write email template: `Hi {{name}}, I noticed you work at {{company}}...`
4. Upload an image (optional)
5. Select domain and configure settings
6. Preview and save

### Managing Domains

1. Go to **Domains** page
2. Add new domain (Gmail or custom)
3. Configure email limits and connection settings
4. Monitor domain status

### Viewing Analytics

1. Check **Dashboard** for overview metrics
2. View campaign performance in **Campaigns** page
3. Monitor unsubscribes in **Unsubscribers** page

## 🐛 Troubleshooting

### S3 Upload Issues

- Verify AWS credentials are correct
- Check S3 bucket permissions
- Ensure bucket exists in the specified region

### MongoDB Connection Issues

- Verify connection string format
- Check network access and firewall settings
- Ensure database name is correct

### Time Restriction Not Working

- Clear browser localStorage
- Check browser timezone settings
- Verify Paris timezone is correctly displayed

## 📄 License

This project is private and proprietary.

## 🤝 Contributing

This is a private project. For issues or questions, please contact the development team.

## 📞 Support

For support and questions, please reach out to the development team.

---

Built with ❤️ using Next.js and TypeScript
