import {
  firebaseErrorResponse,
  getDocument,
  listDocuments,
} from "@/lib/firestore-rest";

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code")?.trim().toUpperCase();

  if (!code) {
    return Response.json({ error: "Enter a gallery access code." }, { status: 400 });
  }

  try {
    const access = await getDocument(`galleryCodes/${code}`);

    if (!access || access.published === false) {
      return Response.json({ error: "This gallery code is not valid." }, { status: 404 });
    }

    const expiresAt = asText(access.expiresAt);
    if (!expiresAt || new Date(expiresAt).getTime() <= Date.now()) {
      return Response.json(
        { error: "This gallery code has expired. Ask Madan for a new 24-hour code." },
        { status: 410 },
      );
    }

    const galleryId = asText(access.galleryId);
    const gallery = galleryId ? await getDocument(`galleries/${galleryId}`) : null;

    if (!gallery || gallery.published !== true) {
      return Response.json({ error: "This gallery is not available." }, { status: 404 });
    }

    const photos = await listDocuments(`galleries/${galleryId}/photos`);

    return Response.json({ gallery, photos, expiresAt });
  } catch (error) {
    return firebaseErrorResponse(error);
  }
}
