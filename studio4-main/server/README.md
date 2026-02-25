# Password Reset Helper API

This lightweight Express server sends password reset codes and verifies them for the Allora Service Hub UI.

## Setup

1. `cd server`
2. Copy `.env.example` to `.env` and fill in your SMTP credentials. Example for Gmail (with 2FA enabled):
   ```bash
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_SECURE=false
   MAIL_USER=youraddress@gmail.com
   MAIL_PASS=your-app-password
   CLIENT_ORIGIN=http://localhost:3000
   PORT=4000
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the service:
   ```bash
   npm run dev
   ```
   or `npm start` for production mode.

## Available endpoints

- `POST /auth/reset/request` `{ email }`  
  Generates a six-digit code, emails it, and stores it temporarily.

- `POST /auth/reset/verify` `{ email, code }`  
  Confirms the code before moving to the new-password step.

- `POST /auth/reset/complete` `{ email, code, password }`  
  Clears the stored code and (placeholder) logs the password update. Replace the logging block with your real persistence logic.

Codes are kept in memory for the configured expiry window—swap for a database/redis store before going to production.

## Front-end integration

Update the React forgot-password flow to call these endpoints instead of generating codes locally:

1. When the user submits their email, call `/auth/reset/request`.
2. Once the user enters the code, call `/auth/reset/verify`.
3. When they submit the new password, call `/auth/reset/complete`.

Handle error responses to show the user any issues (invalid email, incorrect code, expired code, etc.).
