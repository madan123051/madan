# Firebase Setup

## Enable products

- Authentication: enable Email/Password sign-in and create the admin user.
- Firestore Database: stores galleries and photo metadata.
- Storage: stores uploaded photo files.
- Analytics: optional through `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`.

## Data shape

```txt
galleries/{galleryId}
  title
  country
  eventDate
  year
  month
  accessCodes: ["MADAN-EVENT-2026"]
  published: true
  capturedBy: "Captured by madan.wildsaura.com"

galleries/{galleryId}/photos/{photoId}
  url
  downloadUrl
  storagePath
  filename
  title
  year
  month
  event
  country
  capturedBy
  copyright
```

## Firestore rules

Replace `help@wildsaura.com` with the real Firebase admin email.

```txt
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null &&
        request.auth.token.email == "help@wildsaura.com";
    }

    match /galleries/{galleryId} {
      allow read: if resource.data.published == true;
      allow create, update, delete: if isAdmin();

      match /photos/{photoId} {
        allow read: if get(/databases/$(database)/documents/galleries/$(galleryId)).data.published == true;
        allow create, update, delete: if isAdmin();
      }
    }
  }
}
```

## Storage rules

```txt
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    function isAdmin() {
      return request.auth != null &&
        request.auth.token.email == "help@wildsaura.com";
    }

    match /galleries/{galleryId}/{fileName} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
```

The app shows private photos only after a matching event code. Firebase Storage download URLs remain shareable once issued. For stricter control later, use server-generated signed URLs or a Firebase Function that validates the event code before returning a URL.
