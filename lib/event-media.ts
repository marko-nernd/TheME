import sharp from "sharp";

export const eventMediaMaxBytes = 5 * 1024 * 1024;
const acceptedMedia = new Set(["image/jpeg", "image/png", "video/mp4"]);

async function normalizedPoster(input: Buffer) {
  return sharp(input)
    .rotate()
    .resize(1920, 1080, { fit: "cover", position: "centre" })
    .jpeg({ quality: 88, progressive: true })
    .toBuffer();
}

export async function eventMediaValues(form: FormData) {
  const media = form.get("media");
  const poster = form.get("poster");
  if (!(media instanceof File) || media.size === 0 || !acceptedMedia.has(media.type) || media.size > eventMediaMaxBytes) {
    throw new Error("INVALID_EVENT_MEDIA");
  }
  const mediaBuffer = Buffer.from(await media.arrayBuffer());
  if (media.type === "video/mp4") {
    if (!(poster instanceof File) || !["image/jpeg", "image/png"].includes(poster.type) || poster.size === 0) {
      throw new Error("INVALID_EVENT_POSTER");
    }
    const posterData = await normalizedPoster(Buffer.from(await poster.arrayBuffer()));
    return {
      mediaType: "video",
      mediaData: mediaBuffer,
      mediaMime: "video/mp4",
      posterData,
      posterMime: "image/jpeg",
      updatedAt: new Date(),
    };
  }
  const image = sharp(mediaBuffer).rotate().resize(1920, 1080, {
    fit: "cover",
    position: "centre",
  });
  const normalized =
    media.type === "image/png"
      ? await image.png({ compressionLevel: 8 }).toBuffer()
      : await image.jpeg({ quality: 90, progressive: true }).toBuffer();
  return {
    mediaType: "image",
    mediaData: normalized,
    mediaMime: media.type,
    posterData: null,
    posterMime: null,
    updatedAt: new Date(),
  };
}
