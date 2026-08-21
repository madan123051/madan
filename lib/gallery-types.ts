export type GalleryPhoto = {
  id: string;
  url: string;
  downloadUrl?: string;
  filename: string;
  title: string;
  year: string;
  month: string;
  event: string;
  country: string;
  capturedBy: string;
  storagePath?: string;
  mediaType?: "image" | "video";
  contentType?: string;
};

export type GalleryRecord = {
  id: string;
  title: string;
  country: string;
  eventDate: string;
  year: string;
  month: string;
};
