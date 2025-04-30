# AI Student Scheduler

An intelligent scheduling application for students that integrates with Google Calendar. This application helps students manage their time effectively by providing AI-powered scheduling suggestions and automatic calendar integration.

## Features

- Google Calendar integration
- AI-powered scheduling suggestions
- Task prioritization
- Study time optimization
- Assignment deadline tracking
- Customizable schedule preferences

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Google Cloud Platform account with Calendar API enabled
- Google OAuth 2.0 credentials

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   cd client
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
   ```

4. Start the development server:
   ```bash
   npm run dev:full
   ```

## Getting Google Calendar API Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the Google Calendar API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs
6. Download the credentials and add them to your `.env` file

## Usage

1. Open the application in your browser (http://localhost:3000)
2. Sign in with your Google account
3. Grant calendar access permissions
4. Start managing your schedule!

## Contributing

Feel free to submit issues and enhancement requests! 