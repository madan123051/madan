import {
  firebaseErrorResponse,
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

export async function GET(request: Request) {
  try {
    const galleries = await listDocuments("galleries", requireToken(request));
    return Response.json({ galleries });
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
          format: "webp",
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

      await writeDocument(
        "siteConfig/home",
        { heroImages, updatedAt: now },
        token,
      );

      return Response.json({ ok: true, heroImages });
    }

    return Response.json({ error: "Unknown admin action." }, { status: 400 });
  } catch (error) {
    return firebaseErrorResponse(error);
  }
}
