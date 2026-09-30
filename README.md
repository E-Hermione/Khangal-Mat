<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/8168fe20-5628-4f16-a317-dcf60b3684dc

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy [.env.example](.env.example) to `.env.local` and fill in the Firebase web app config
   (Firebase console → Authentication → Sign-in method → enable **Google**; add your site's domain under
   Authentication → Settings → Authorized domains)
3. Run the app:
   `npm run dev`

## Email verification codes (Cloud Functions)

Registration emails a 6-digit code from `functions/` (`sendEmailCode`, `verifyEmailCode`).
One-time setup (requires the Blaze plan):

1. Firebase console → Firestore Database → create a database.
2. Create a Gmail app password for the sending account (Google Account → Security →
   2-Step Verification → App passwords).
3. `npx firebase-tools functions:secrets:set GMAIL_APP_PASSWORD` and paste the app password.
4. `npx firebase-tools deploy` (asks for `GMAIL_USER`, the sending Gmail address, on first deploy).
