# Firebase Setup

## Enabled Firebase Products

- Authentication: enable Email/Password sign-in for the admin account.
- Firestore Database: stores gallery records and photo metadata.
- Storage: stores uploaded photo files.
- Analytics: optional, uses `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`.

## Required Console Setup

The web app configuration does not create a Firestore database automatically.
In Firebase Console, open **Build -> Firestore Database**, click **Create
database**, choose the production mode and a nearby region, then publish the
rules from `firebase/firestore.rules`. The app reports this missing-database
state immediately instead of waiting for a client timeout.

Next, open **Build -> Storage**, complete **Get started**, and publish the rules
from `firebase/storage.rules`. Authentication must have Email/Password enabled
with `help@wildsaura.com` created as the admin user.

## Environment Variables

Add these values in Vercel Project Settings -> Environment Variables and in any
other host used for production builds.

```txt
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

## Firestore Data Shape

```txt
galleries/{galleryId}
  title
  country
  eventDate
  year
  month
  published: true
  capturedBy: "Captured by madan.wildsaura.com"

galleryCodes/{ACCESS-CODE}
  accessCode
  galleryId
  title
  published: true
  createdAt
  expiresAt (24 hours after activation)

galleries/{galleryId}/photos/{photoId}
  url
  downloadUrl
  storagePath
  filename
  originalFilename
  title
  year
  month
  event
  country
  capturedBy
  copyright
  format: "webp"
  width
  height
  size

siteConfig/home
  heroImages: [{ url, storagePath, alt }]
  updatedAt
```

Admin bulk uploads convert two selected images at a time before they reach
Firebase Storage. Every gallery file is WebP, compressed below 10MB, and
includes a white copyright strip. Gallery codes are created separately and
expire 24 hours after activation. Up to five high-resolution WebP hero images
can be stored in the landing-page rotation.

## Firestore Rules

Replace `help@wildsaura.com` with the real Firebase admin email if needed.
The gallery unlock screen reads only the exact `galleryCodes/{CODE}` document
entered by the visitor. It cannot list all access codes or galleries.

```txt
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null &&
        request.auth.token.email in ["help@wildsaura.com"];
    }

    function galleryIsPublished(galleryId) {
      return get(/databases/$(database)/documents/galleries/$(galleryId)).data.published == true;
    }

    match /galleryCodes/{accessCode} {
      allow get: if true;
      allow list: if false;
      allow create, update, delete: if isAdmin();
    }

    match /galleries/{galleryId} {
      allow get: if resource.data.published == true;
      allow list: if isAdmin();
      allow create, update, delete: if isAdmin();

      match /photos/{photoId} {
        allow get, list: if galleryIsPublished(galleryId);
        allow create, update, delete: if isAdmin();
      }
    }

    match /siteConfig/{documentId} {
      allow get: if documentId == "home";
      allow list: if false;
      allow create, update, delete: if isAdmin();
    }
  }
}
```

## Storage Rules

Replace `help@wildsaura.com` with the same Firebase admin email. Uploads are
limited to stamped WebP images under 10MB.

```txt
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    function isAdmin() {
      return request.auth != null &&
        request.auth.token.email in ["help@wildsaura.com"];
    }

    match /galleries/{galleryId}/{fileName} {
      allow read: if true;
      allow create, update: if isAdmin()
        && request.resource.size <= 10 * 1024 * 1024
        && request.resource.contentType == "image/webp";
      allow delete: if isAdmin();
    }

    match /hero/{fileName} {
      allow read: if true;
      allow create, update: if isAdmin()
        && request.resource.size <= 10 * 1024 * 1024
        && request.resource.contentType == "image/webp";
      allow delete: if isAdmin();
    }
  }
}
```

The app shows private photos only after an event code matches Firestore, but
Firebase Storage download URLs are still shareable once issued. For stricter
download control later, switch to server-generated signed URLs or a callable
function that verifies the event code before returning a download URL.
