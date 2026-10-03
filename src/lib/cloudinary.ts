// src/lib/cloudinary.ts
// ✅ FIXED v3: Signed uploads via /api/cloudinary-sign (works with the
//    college's Cloud Name + API Key + API Secret — NO upload preset needed),
//    auto-compresses images before upload, retries on failure, shows upload
//    progress, gives REAL error messages, and handles the "stuck at 100%"
//    issue by showing a "Processing..." state while waiting for Cloudinary.
//    If a VITE_CLOUDINARY_UPLOAD_PRESET is configured, the unsigned preset
//    flow is used instead (backward compatible).
//    NO Supabase — Cloudinary ONLY.

const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME    as string;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;

/** Signed-upload credential cache (avoid re-signing within a session). */
let cachedSignature: { signature: string; timestamp: number; api_key: string; cloud_name: string; folder: string } | null = null;

// ─── Signed Upload Credentials ─────────────────────────────────────────────

/**
 * Ask our own serverless endpoint (/api/cloudinary-sign) for a short-lived
 * signature for a signed upload. This is how uploads work with just
 * CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET —
 * the API secret never reaches the browser.
 */
async function getUploadSignature(folder: string): Promise<{
  signature: string; timestamp: number; api_key: string; cloud_name: string; folder: string;
}> {
  // A signature is valid for 1 hour and bound to the folder — reuse the
  // cached one while it is still fresh for the SAME folder.
  if (
    cachedSignature &&
    cachedSignature.folder === folder &&
    Date.now() / 1000 - cachedSignature.timestamp < 45 * 60
  ) {
    return cachedSignature;
  }

  const res = await fetch("/api/cloudinary-sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder }),
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch { /* keep HTTP status message */ }
    throw new Error(
      `Could not get an upload signature from the server (${msg}).\n\n` +
      "Make sure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and\n" +
      "CLOUDINARY_API_SECRET are set in the environment and redeployed.",
    );
  }

  const data = await res.json();
  if (!data?.signature || !data?.api_key || !data?.cloud_name) {
    throw new Error("The server returned an incomplete upload signature.");
  }

  cachedSignature = data;
  return data;
}

// ─── Configuration ─────────────────────────────────────────────────────────
const MAX_RETRIES         = 3;
const UPLOAD_TIMEOUT_MS   = 120_000;  // 120 seconds (increased for slow Pakistan mobile networks)
const RETRY_DELAY_MS      = 2_000;    // 2s between retries
const MAX_IMAGE_DIMENSION = 1920;     // Max width/height after compression
const JPEG_QUALITY        = 0.8;      // 80% JPEG quality (good balance)
const TARGET_MAX_BYTES    = 1_500_000; // Target ~1.5MB after compression

// ─── Image Compression ─────────────────────────────────────────────────────

/**
 * Image formats that Cloudinary upload presets commonly reject.
 *
 * Why this list exists:
 *   Modern phones deliver photos from the camera roll as `image/webp`
 *   (Chrome/Edge mobile) or `image/heic` (iOS Safari). Even tiny (<200KB)
 *   WebP files would otherwise bypass the size-based compression gate below,
 *   reach Cloudinary as-is, and get rejected with:
 *      "Image file format webp not allowed"
 *   Force-converting these to JPEG client-side fixes that permanently.
 *
 * JPEG and PNG are NOT in this list — they're almost always allowed by
 * presets, so small ones can skip compression. GIF is excluded above to
 * preserve animation.
 */
const FORMATS_REQUIRING_CONVERSION: ReadonlySet<string> = new Set([
  "image/webp",
  "image/heic",
  "image/heif",
  "image/avif",
  "image/bmp",
  "image/tiff",
  "image/x-ms-bmp",
]);

/**
 * Compress an image file before uploading.
 * - Resizes to max 1920px on the longest side
 * - Converts to JPEG at 80% quality
 * - If still > 1.5MB, reduces quality further
 * - ALWAYS re-encodes WebP/HEIC/AVIF/BMP/TIFF to JPEG (regardless of size)
 *   so the upload is never rejected by a format-restricted preset
 *
 * This is the #1 fix for mobile uploads: a 5MB phone photo becomes ~500KB,
 * making uploads 10x faster and far less likely to timeout on slow networks.
 * It's also the fix for the "Image file format webp not allowed" error.
 */
export async function compressImage(file: File): Promise<File> {
  // Only compress image files
  if (!file.type.startsWith("image/")) return file;

  // For GIFs, don't compress (would lose animation)
  if (file.type === "image/gif") return file;

  // Does this format need to be re-encoded to JPEG no matter what?
  const needsConversion = FORMATS_REQUIRING_CONVERSION.has(file.type);

  // For small files ALREADY in an accepted format (JPEG/PNG), don't bother compressing.
  // WebP/HEIC/AVIF etc. always go through canvas → JPEG, even when small.
  if (file.size < 200_000 && !needsConversion) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions (maintain aspect ratio)
      let { width, height } = img;
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        if (width > height) {
          height = Math.round((height / width) * MAX_IMAGE_DIMENSION);
          width = MAX_IMAGE_DIMENSION;
        } else {
          width = Math.round((width / height) * MAX_IMAGE_DIMENSION);
          height = MAX_IMAGE_DIMENSION;
        }
      }

      // Draw to canvas — for WebP/HEIC/etc. this rasterizes them to pixels,
      // and the subsequent toBlob("image/jpeg") call re-encodes as JPEG.
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;

      // For formats with transparency (WebP, AVIF, BMP), fill white background
      // first so transparent areas don't render as black in the JPEG output.
      if (needsConversion) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Try progressively lower quality until under target size
      const tryQuality = async (q: number): Promise<Blob | null> => {
        return new Promise((r) => {
          canvas.toBlob(
            (blob) => r(blob),
            "image/jpeg",
            q,
          );
        });
      };

      const finalize = async () => {
        let quality = JPEG_QUALITY;
        let blob = await tryQuality(quality);

        // If still too large, reduce quality further
        while (blob && blob.size > TARGET_MAX_BYTES && quality > 0.2) {
          quality -= 0.15;
          blob = await tryQuality(quality);
        }

        if (!blob) {
          // Canvas failed — if this was a must-convert format, we cannot
          // safely upload the original (Cloudinary will reject it). Fall
          // back to the original anyway but the upload will surface a clear
          // error from Cloudinary that the user can act on.
          resolve(file);
          return;
        }

        // Only use compressed version if it's actually smaller — UNLESS the
        // original was a must-convert format, in which case we always prefer
        // the re-encoded JPEG even if it happens to be slightly larger
        // (the alternative is a guaranteed Cloudinary rejection).
        if (!needsConversion && blob.size >= file.size) {
          resolve(file);
          return;
        }

        const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
          type: "image/jpeg",
          lastModified: Date.now(),
        });

        console.log(
          `[Cloudinary] Compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB ` +
          `(${Math.round((1 - compressedFile.size / file.size) * 100)}% smaller)` +
          (needsConversion ? ` [format ${file.type} → image/jpeg]` : ""),
        );

        resolve(compressedFile);
      };

      finalize();
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Can't load image. For must-convert formats we can't recover here —
      // return the original; Cloudinary will reject with a clear message
      // that the user can act on (instead of silently uploading a broken file).
      // For JPEG/PNG that failed to load, also return the original.
      resolve(file);
    };

    img.src = url;
  });
}

// ─── Connectivity Check ────────────────────────────────────────────────────

/**
 * Quick check: can we reach Cloudinary's API?
 * Uses a lightweight HEAD request to the ping endpoint.
 * Skips the check entirely when no cloud name is configured client-side
 * (signed uploads learn the cloud name from the server instead).
 */
async function checkCloudinaryReachable(): Promise<boolean> {
  if (!CLOUD_NAME) return true; // nothing to ping — signed flow will resolve it
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/ping`,
      { method: "GET", signal: controller.signal },
    );
    clearTimeout(timer);
    // Even a 401 means the API is reachable
    return res.status < 500;
  } catch {
    return false;
  }
}

// ─── Upload via XMLHttpRequest ─────────────────────────────────────────────

export interface UploadProgress {
  loaded: number;   // bytes uploaded
  total: number;    // total bytes
  percent: number;  // 0-100
  phase: 'uploading' | 'processing' | 'compressing';  // Current phase
}

/**
 * Upload to Cloudinary using XMLHttpRequest.
 *
 * WHY XHR instead of fetch():
 * - XHR has built-in upload progress events (fetch doesn't)
 * - XHR works better on mobile browsers with aggressive network proxies
 * - XHR is more battle-tested for file uploads across all browsers
 * - Some Pakistan mobile carriers' proxies handle XHR better than fetch+FormData
 *
 * TWO AUTHORISATION MODES:
 * - UPLOAD PRESET (if VITE_CLOUDINARY_UPLOAD_PRESET is set) → unsigned flow
 * - otherwise → SIGNED flow: a signature is fetched from our own
 *   /api/cloudinary-sign endpoint (API key/secret stay server-side)
 *
 * FIX FOR "STUCK AT 100%":
 * - After upload bytes are sent (100%), we switch to "processing" phase
 * - This tells the UI that we're waiting for Cloudinary's response
 * - Added readystatechange as backup handler (some mobile browsers need it)
 */
async function getUploadAuth(folder: string): Promise<{
  cloudName: string;
  formDataExtras: Record<string, string>;
}> {
  if (UPLOAD_PRESET) {
    if (!CLOUD_NAME) {
      throw new Error(
        "Cloudinary is not configured. Please add these environment variables:\n" +
        "• VITE_CLOUDINARY_CLOUD_NAME\n" +
        "• VITE_CLOUDINARY_UPLOAD_PRESET\n\n" +
        "Then redeploy on Vercel (Project Settings → Environment Variables).",
      );
    }
    return { cloudName: CLOUD_NAME, formDataExtras: { upload_preset: UPLOAD_PRESET } };
  }

  // Signed flow — credentials come from our own serverless endpoint.
  const sig = await getUploadSignature(folder);
  return {
    cloudName: sig.cloud_name || CLOUD_NAME,
    formDataExtras: {
      api_key: sig.api_key,
      timestamp: String(sig.timestamp),
      signature: sig.signature,
    },
  };
}

function uploadViaXHR(
  file: File,
  folder: string,
  onProgress?: (progress: UploadProgress) => void,
): Promise<string> {
  return (async () => {
    const auth = await getUploadAuth(folder);
    return new Promise<string>((resolve, reject) => {

    const uploadUrl = `https://api.cloudinary.com/v1_1/${auth.cloudName}/auto/upload`;
    const xhr = new XMLHttpRequest();
    let uploadComplete = false;  // Track when upload phase ends
    let resolved = false;       // Prevent double resolve/reject

    // Timeout - increased for slow mobile networks
    xhr.timeout = UPLOAD_TIMEOUT_MS;

    // Progress tracking
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && !resolved) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress({
            loaded: e.loaded,
            total: e.total,
            percent,
            phase: 'uploading',
          });
          
          // When upload hits 100%, switch to processing phase after a short delay
          if (percent >= 100 && !uploadComplete) {
            uploadComplete = true;
            // Small delay then show processing state
            setTimeout(() => {
              if (!resolved) {
                onProgress({
                  loaded: e.loaded,
                  total: e.total,
                  percent: 100,
                  phase: 'processing',
                });
              }
            }, 500);
          }
        }
      };

      // Start with compressing phase
      onProgress({ loaded: 0, total: file.size, percent: 0, phase: 'compressing' });
    }

    /**
     * Helper to handle successful response - used by both onload and readystatechange
     */
    const handleSuccess = () => {
      if (resolved) return;
      
      try {
        const json = JSON.parse(xhr.responseText);

        if (xhr.status >= 200 && xhr.status < 300 && json.secure_url) {
          resolved = true;
          resolve(json.secure_url as string);
          return;
        }

        // Cloudinary returned an error
        const errMsg = json?.error?.message || `HTTP ${xhr.status}`;

        if (xhr.status === 400 || xhr.status === 401) {
          // Detect format-restriction errors specifically and give actionable advice
          const isFormatError = /format|extension|allowed/i.test(errMsg);
          const isSignatureError = /signature|signing|unsigned param/i.test(errMsg);
          resolved = true;
          reject(new Error(
            `Cloudinary rejected the upload: ${errMsg}\n\n` +
            (
              isFormatError
                ? "This is a format restriction on your upload configuration, NOT a signing issue.\n\n" +
                  "Fix: Go to Cloudinary Dashboard → Settings → Upload and check\n" +
                  "  the allowed formats of the preset / account settings.\n\n" +
                  "Note: This site already auto-converts WebP/HEIC/AVIF to JPEG before upload.\n" +
                  "If you're still seeing this, the conversion likely failed in your browser —\n" +
                  "try a different image or a different browser (Chrome recommended)."
                : isSignatureError
                  ? "The upload signature was rejected. This usually means:\n" +
                    "• The server clock and Cloudinary differ by more than 1 hour\n" +
                    "• CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET don't match (check for stray spaces)\n" +
                    "• The signature was reused after expiry — simply retry\n\n" +
                    "Fix: verify the three CLOUDINARY_* environment variables on Vercel, then redeploy."
                  : "This usually means:\n" +
                    "• The Cloudinary cloud name is wrong\n" +
                    "• The API key doesn't belong to this cloud\n" +
                    "• The account restricts unsigned/signed uploads — check Cloudinary settings"
            ),
          ));
        } else {
          resolved = true;
          reject(new Error(`Cloudinary error: ${errMsg}`));
        }
      } catch {
        resolved = true;
        reject(new Error(
          `Cloudinary returned invalid response (HTTP ${xhr.status}). ` +
          `Please try again.`,
        ));
      }
    };

    /**
     * Helper to handle errors - prevents double rejection
     */
    const handleError = (error: Error) => {
      if (resolved) return;
      resolved = true;
      reject(error);
    };

    // Success handler (primary)
    xhr.onload = handleSuccess;

    // Backup: readystatechange handler (some mobile browsers don't fire onload properly)
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4 && !resolved) {
        // Request complete, let onload handle it first, but if it didn't fire...
        setTimeout(() => {
          if (!resolved) {
            console.warn('[Cloudinary] onload did not fire, handling via readystate');
            handleSuccess();
          }
        }, 100);
      }
    };

    // Error handlers
    xhr.onerror = () => handleError(new Error(
      "Network error: The upload request failed to reach Cloudinary.\n\n" +
      "This is usually caused by:\n" +
      "• Your mobile carrier blocking uploads to api.cloudinary.com\n" +
      "• A slow/unstable connection (the upload timed out)\n" +
      "• An ad blocker or browser extension interfering\n\n" +
      "Try these fixes:\n" +
      "1. Switch to WiFi instead of mobile data\n" +
      "2. Try a different browser (Chrome recommended)\n" +
      "3. Disable any ad blockers for this site\n" +
      "4. The image will be auto-compressed to make uploads faster",
    ));

    xhr.ontimeout = () => handleError(new Error(
      `Upload timed out after ${UPLOAD_TIMEOUT_MS / 1000} seconds. ` +
      "Your connection may be too slow for this file size, or Cloudinary is taking too long to respond.\n\n" +
      "The image was uploaded successfully but Cloudinary's response didn't arrive in time.\n" +
      "This can happen on slow mobile networks. Try:\n" +
      "1. Use a smaller image (under 2MB)\n" +
      "2. Switch to WiFi or a faster network\n" +
      "3. Try again (the system will retry 3 times automatically)",
    ));

    xhr.onabort = () => handleError(new Error("Upload was cancelled."));

    // Build and send request
    xhr.open("POST", uploadUrl);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);
    for (const [k, v] of Object.entries(auth.formDataExtras)) {
      formData.append(k, v);
    }

    xhr.send(formData);
    });
  })();
}

// ─── Sleep helper ──────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Upload an image to Cloudinary with:
 * - Automatic image compression (5MB photo → ~500KB)
 * - 3x retry with progressive backoff
 * - Upload progress tracking with phases (compressing/uploading/processing)
 * - Detailed error messages for mobile network issues
 * - Connectivity pre-check
 * - Fix for "stuck at 100%" - shows Processing state while waiting for response
 */
export async function uploadToCloudinary(
  file: File,
  folder: string,
  onProgress?: (progress: UploadProgress) => void,
): Promise<string> {
  // Step 1: Notify compressing phase
  if (onProgress) {
    onProgress({ loaded: 0, total: file.size, percent: 0, phase: 'compressing' });
  }
  
  console.log(`[Cloudinary] Original file: ${file.name} (${(file.size / 1024).toFixed(0)}KB)`);
  
  // Step 2: Compress the image
  const compressedFile = await compressImage(file);
  console.log(`[Cloudinary] Uploading: ${(compressedFile.size / 1024).toFixed(0)}KB to folder "${folder}"`);

  // Step 3: Quick connectivity check (only on first attempt)
  const isReachable = await checkCloudinaryReachable();
  if (!isReachable) {
    console.warn("[Cloudinary] API might be unreachable from this network. Will try anyway...");
    // Don't abort — maybe the ping failed but the upload will work
  }

  // Step 4: Upload with retries
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[Cloudinary] Upload attempt ${attempt}/${MAX_RETRIES}...`);
      const url = await uploadViaXHR(compressedFile, folder, onProgress);
      console.log(`[Cloudinary] Upload successful on attempt ${attempt}!`);
      return url;
    } catch (err: any) {
      lastError = err;
      console.warn(`[Cloudinary] Attempt ${attempt} failed: ${err?.message?.substring(0, 100)}`);

      // Don't retry on client errors (wrong preset, etc.) — it won't succeed
      if (err?.message?.includes("Cloudinary rejected")) {
        throw err;
      }

      // Don't retry on abort
      if (err?.message?.includes("cancelled")) {
        throw err;
      }

      // Wait before retrying (progressive backoff)
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt;
        console.log(`[Cloudinary] Retrying in ${delay / 1000}s...`);
        // Reset progress for retry
        if (onProgress) {
          onProgress({ loaded: 0, total: compressedFile.size, percent: 0, phase: 'uploading' });
        }
        await sleep(delay);
      }
    }
  }

  // All retries exhausted
  throw lastError || new Error("Upload failed after 3 attempts.");
}
