# Firebase environment variables

Expo reads environment values from `.env` when they are written as `KEY=value`.
Use `.env.example` as the template:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

For internship convenience, `app.config.js` can also read the Firebase web config
snippet format that Firebase Console provides, such as `apiKey: "..."`.

This internship practice flow stores passwords in Firestore because that was the
exercise requirement. Production apps should use Firebase Authentication instead.
