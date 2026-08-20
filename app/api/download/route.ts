import {
  firebaseErrorResponse,
  getDocument,
} from "@/lib/firestore-rest";

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function safeFilename(value: string) {
  return (value || "madan-photo.webp")
    .replace(/[\r\n"]/g, "-")
    .replace(/[^a-zA-Z0-9._ -]/g, "-")
    .slice(0, 180) || "madan-photo.webp";
}

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams;
  const code = search.get("code")?.trim().toUpperCase() ?? "";
  const photoId = search.get("photoId")?.trim() ?? "";

  if (!code || !/^[a-zA-Z0-9_-]+$/.test(photoId)) {
    return Response.json({ error: "A valid gallery code and photo are required." }, { status: 400 });
  }

  try {
    const access = await getDocument(`galleryCodes/${code}`);
    const expiresAt = asText(access?.expiresAt);
    if (
      !access ||
      access.published === false ||
      !expiresAt ||
      new Date(expiresAt).getTime() <= Date.now()
    ) {
      return Response.json({ error: "This gallery access has expired." }, { status: 410 });
    }

    const galleryId = asText(access.galleryId);
    if (!galleryId || !/^[a-zA-Z0-9_-]+$/.test(galleryId)) {
      return Response.json({ error: "Gallery is unavailable." }, { status: 404 });
    }

    const photo = await getDocument(`galleries/${galleryId}/photos/${photoId}`);
    const photoUrl = asText(photo?.downloadUrl) || asText(photo?.url);
    if (!photo || !photoUrl) {
      return Response.json({ error: "Photo is unavailable." }, { status: 404 });
    }

    const source = await fetch(photoUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });
    if (!source.ok || !source.body) {
      return Response.json({ error: "Photo download could not be started." }, { status: 502 });
    }

    const filename = safeFilename(asText(photo.filename));
    const headers = new Headers({
      "cache-control": "private, no-store",
      "content-disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "content-type": source.headers.get("content-type") || "image/webp",
      "x-content-type-options": "nosniff",
    });
    const contentLength = source.headers.get("content-length");
    if (contentLength) headers.set("content-length", contentLength);

    return new Response(source.body, { status: 200, headers });
  } catch (error) {
    return firebaseErrorResponse(error);
  }
}
