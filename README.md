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
