import { firebaseErrorResponse, getDocument } from "@/lib/firestore-rest";

export async function GET() {
  try {
    const config = await getDocument("siteConfig/home");
    const images = Array.isArray(config?.heroImages) ? config.heroImages.slice(0, 5) : [];
    const previewImages = Array.isArray(config?.previewImages) ? config.previewImages.slice(0, 4) : [];

    return Response.json({ images, previewImages });
  } catch (error) {
    return firebaseErrorResponse(error);
  }
}
