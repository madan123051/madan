import {
  deleteDocument,
  firebaseErrorResponse,
  getDocument,
  listDocuments,
  writeDocument,
} from "@/lib/firestore-rest";

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

function cleanText(value: unknown, maxLength = 200) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function requireToken(request: Request) {
  const token = bearerToken(request);
  if (!token) {
    throw new Error("Admin session expired. Sign in again.");
  }
  return token;
}

function cleanId(value: unknown) {
  const id = cleanText(value, 160);
  return /^[a-zA-Z0-9_-]+$/.test(id) ? id : "";
}

async function deleteStorageObject(storagePath: string, token: string) {
  if (!storagePath) return;

  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim();
  if (!storageBucket) throw new Error("Firebase Storage bucket is missing from this deployment.");

  const url = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(storageBucket)}/o/${encodeURIComponent(storagePath)}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      authorization: `Firebase ${token}`,
      ...(appId ? { "x-firebase-gmpid": appId } : {}),
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (response.ok || response.status === 404) return;

  const payload = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
  };
  throw new Error(payload.error?.message || `Storage delete returned HTTP ${response.status}.`);
}

export async function GET(request: Request) {
  try {
    const token = requireToken(request);
    const galleries = await listDocuments("galleries", token);
    const galleriesWithPhotos = await Promise.all(
      galleries.map(async (gallery) => ({
        ...gallery,
        photos: await listDocuments(`galleries/${gallery.id}/photos`, token),
      })),
    );
    return Response.json({ galleries: galleriesWithPhotos });
  } catch (error) {
    return firebaseErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const token = requireToken(request);
    const body = (await request.json()) as Record<string, unknown>;
    const action = cleanText(body.action, 40);
    const now = new Date().toISOString();

    if (action === "saveGallery") {
      const galleryId = cleanText(body.galleryId, 120);
      const title = cleanText(body.title);

      if (!galleryId || !title) {
        return Response.json({ error: "Gallery title is required." }, { status: 400 });
      }

      await writeDocument(
        `galleries/${galleryId}`,
        {
          title,
          country: cleanText(body.country, 100),
          eventDate: cleanText(body.eventDate, 20),
          year: cleanText(body.year, 8),
          month: cleanText(body.month, 20),
          published: true,
          capturedBy: "Captured by madan.wildsaura.com",
          updatedAt: now,
        },
        token,
      );

      return Response.json({ ok: true, galleryId });
    }

    if (action === "savePhoto") {
      const galleryId = cleanText(body.galleryId, 120);
      const photoId = crypto.randomUUID();

      if (!galleryId || !cleanText(body.url, 3000)) {
        return Response.json({ error: "Photo metadata is incomplete." }, { status: 400 });
      }

      await writeDocument(
        `galleries/${galleryId}/photos/${photoId}`,
        {
          url: cleanText(body.url, 3000),
          downloadUrl: cleanText(body.downloadUrl, 3000),
          storagePath: cleanText(body.storagePath, 500),
          filename: cleanText(body.filename, 260),
          originalFilename: cleanText(body.originalFilename, 260),
          title: cleanText(body.title, 260),
          year: cleanText(body.year, 8),
          month: cleanText(body.month, 20),
          event: cleanText(body.event),
          country: cleanText(body.country, 100),
          capturedBy: "Captured by madan.wildsaura.com",
          copyright: "Captured by madan.wildsaura.com",
          format: cleanText(body.mediaType, 20) === "video" ? "video" : "webp",
          mediaType: cleanText(body.mediaType, 20) === "video" ? "video" : "image",
          contentType: cleanText(body.contentType, 100),
          height: Number(body.height) || 0,
          size: Number(body.size) || 0,
          width: Number(body.width) || 0,
          createdAt: now,
        },
        token,
      );

      return Response.json({ ok: true, photoId });
    }

    if (action === "createCode") {
      const galleryId = cleanText(body.galleryId, 120);
      const accessCode = cleanText(body.accessCode, 120).toUpperCase();
      const title = cleanText(body.title);

      if (!galleryId || !accessCode) {
        return Response.json({ error: "Choose a gallery and generate a code." }, { status: 400 });
      }

      const expiresAtDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const expiresAt = expiresAtDate.toISOString();
      await writeDocument(
        `galleryCodes/${accessCode}`,
        {
          accessCode,
          galleryId,
          title,
          published: true,
          createdAt: now,
          expiresAt: expiresAtDate,
        },
        token,
      );

      return Response.json({ ok: true, accessCode, expiresAt });
    }

    if (action === "saveHero") {
      const heroImages = Array.isArray(body.heroImages)
        ? body.heroImages
            .filter((item) => item && typeof item === "object")
            .slice(0, 5)
            .map((item) => {
              const image = item as Record<string, unknown>;
              return {
                url: cleanText(image.url, 3000),
                storagePath: cleanText(image.storagePath, 500),
                alt: cleanText(image.alt, 260),
              };
            })
            .filter((item) => item.url)
        : [];
      const currentConfig = await getDocument("siteConfig/home", token);
      const previewImages = Array.isArray(currentConfig?.previewImages)
        ? currentConfig.previewImages.slice(0, 4)
        : [];

      await writeDocument(
        "siteConfig/home",
        { heroImages, previewImages, updatedAt: now },
        token,
      );

      return Response.json({ ok: true, heroImages });
    }

    if (action === "savePreviews") {
      const previewImages = Array.isArray(body.previewImages)
        ? body.previewImages
            .filter((item) => item && typeof item === "object")
            .slice(0, 4)
            .map((item) => {
              const image = item as Record<string, unknown>;
              return {
                slot: cleanText(image.slot, 40),
                title: cleanText(image.title, 100),
                url: cleanText(image.url, 3000),
                storagePath: cleanText(image.storagePath, 500),
                alt: cleanText(image.alt, 260),
              };
            })
            .filter((item) => item.slot && item.url)
        : [];
      const currentConfig = await getDocument("siteConfig/home", token);
      const heroImages = Array.isArray(currentConfig?.heroImages)
        ? currentConfig.heroImages.slice(0, 5)
        : [];

      await writeDocument(
        "siteConfig/home",
        { heroImages, previewImages, updatedAt: now },
        token,
      );

      const removedStoragePath = cleanText(body.removedStoragePath, 500);
      if (removedStoragePath && !previewImages.some((image) => image.storagePath === removedStoragePath)) {
        try {
          await deleteStorageObject(removedStoragePath, token);
        } catch (error) {
          console.warn("[admin] replaced preview cleanup failed", error);
        }
      }

      return Response.json({ ok: true, previewImages });
    }

    if (action === "deletePhoto") {
      const galleryId = cleanId(body.galleryId);
      const photoId = cleanId(body.photoId);
      if (!galleryId || !photoId) {
        return Response.json({ error: "Photo reference is invalid." }, { status: 400 });
      }

      const photo = await getDocument(`galleries/${galleryId}/photos/${photoId}`, token);
      if (!photo) return Response.json({ ok: true });

      await deleteStorageObject(cleanText(photo.storagePath, 500), token);
      await deleteDocument(`galleries/${galleryId}/photos/${photoId}`, token);
      return Response.json({ ok: true });
    }

    if (action === "deleteGallery") {
      const galleryId = cleanId(body.galleryId);
      if (!galleryId) {
        return Response.json({ error: "Gallery reference is invalid." }, { status: 400 });
      }

      const photos = await listDocuments(`galleries/${galleryId}/photos`, token);
      for (const photo of photos) {
        await deleteStorageObject(cleanText(photo.storagePath, 500), token);
        await deleteDocument(`galleries/${galleryId}/photos/${photo.id}`, token);
      }
      await deleteDocument(`galleries/${galleryId}`, token);
      return Response.json({ ok: true, deletedPhotos: photos.length });
    }

    if (action === "deleteHero") {
      const storagePath = cleanText(body.storagePath, 500);
      const heroImages = Array.isArray(body.heroImages)
        ? body.heroImages
            .filter((item) => item && typeof item === "object")
            .slice(0, 5)
            .map((item) => {
              const image = item as Record<string, unknown>;
              return {
                url: cleanText(image.url, 3000),
                storagePath: cleanText(image.storagePath, 500),
                alt: cleanText(image.alt, 260),
              };
            })
            .filter((item) => item.url)
        : [];
      const currentConfig = await getDocument("siteConfig/home", token);
      const previewImages = Array.isArray(currentConfig?.previewImages)
        ? currentConfig.previewImages.slice(0, 4)
        : [];

      await deleteStorageObject(storagePath, token);
      await writeDocument("siteConfig/home", { heroImages, previewImages, updatedAt: now }, token);
      return Response.json({ ok: true, heroImages });
    }

    return Response.json({ error: "Unknown admin action." }, { status: 400 });
  } catch (error) {
    return firebaseErrorResponse(error);
  }
}
