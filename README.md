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

## Firebase setup (one time, free Spark plan)

Accounts use Firebase Authentication; lessons, settings and users live in Firestore, protected by
`firestore.rules`. New users confirm their email with Firebase's verification link.

1. Firebase console → Authentication → Sign-in method → enable **Email/Password**.
2. Firebase console → Firestore Database → create a database (production mode).
3. `npx firebase-tools login`, then `npm run build && npx firebase-tools deploy`
   (deploys the site and the Firestore rules).

The admin is the account registered with `ehangal625@gmail.com` (see `ADMIN_EMAIL`). On the admin's
first sign-in, lessons saved in that browser by the old version are copied to Firestore.
