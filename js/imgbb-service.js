/**
 * ============================================================================
 * පිං පොත | ImgBB Cloud Image Upload Service
 * ============================================================================
 * ImgBB API මගින් නොමිලේ ඡායාරූප සත්කාරක පහසුකම (Free Unlimited Image Hosting)
 * API Endpoint: https://api.imgbb.com/1/upload
 */

export const IMGBB_CONFIG = {
  // සක්‍රීය ImgBB Free API Key එක
  apiKey: "f048c857d1c61df16a650b4b65074368"
};

/**
 * Get active ImgBB API Key (from config or localStorage)
 */
export function getImgBBApiKey() {
  return (
    IMGBB_CONFIG.apiKey ||
    localStorage.getItem('pinPotha_imgbb_apiKey') ||
    ""
  );
}

/**
 * Set and persist ImgBB API Key
 */
export function setImgBBApiKey(key) {
  const clean = (key || "").trim();
  IMGBB_CONFIG.apiKey = clean;
  localStorage.setItem('pinPotha_imgbb_apiKey', clean);
}

/**
 * Compresses an image file client-side before uploading to save bandwidth and ensure instant uploads
 * @param {File|Blob} file 
 * @param {number} maxWidth 
 * @param {number} quality 
 * @returns {Promise<Blob>}
 */
export function compressImageFile(file, maxWidth = 1200, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (file.type && !file.type.startsWith('image/')) {
      return reject(new Error("කරුණාකර වලංගු ඡායාරූපයක් (Image file) තෝරන්න."));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("ඡායාරූපය කියවීමට නොහැකි විය."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("ඡායාරූපය Load කිරීමට නොහැකි විය."));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // ImgBB API supports JPEG natively with 100% stability
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else resolve(file); // fallback to original file
          },
          'image/jpeg',
          quality
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Converts file or blob to an optimized, compressed base64 Data URL
 * @param {File|Blob} file 
 * @param {number} maxWidth 
 * @param {number} quality 
 * @returns {Promise<string>}
 */
export function fileToCompressedDataURL(file, maxWidth = 1200, quality = 0.82) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => resolve(e.target.result);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        try {
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch (err) {
          resolve(e.target.result);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Upload an image file to ImgBB and return direct image URL.
 * Falls back seamlessly to compressed base64 if cloud upload fails for any reason.
 * @param {File|Blob} file 
 * @param {string} [customName]
 * @returns {Promise<string>} Direct image URL or high-quality compressed Data URL
 */
export async function uploadToImgBB(file, customName = "pinpotha_upload") {
  // Pre-generate guaranteed offline/safe fallback
  let fallbackDataUrl = null;
  try {
    fallbackDataUrl = await fileToCompressedDataURL(file, 1200, 0.82);
  } catch (e) {
    console.warn("[Upload] Could not generate fallback data URL:", e);
  }

  const apiKey = getImgBBApiKey();

  // If no API key is set, immediately use crisp local compressed image
  if (!apiKey) {
    if (fallbackDataUrl) return fallbackDataUrl;
    throw new Error("ඡායාරූපය සැකසීමට නොහැකි විය.");
  }

  // Pre-compress to JPEG for fast upload and ImgBB reliability
  let uploadBlob = file;
  try {
    uploadBlob = await compressImageFile(file, 1200, 0.84);
  } catch (err) {
    console.warn("[ImgBB] Pre-compression skipped, uploading original:", err);
    uploadBlob = file;
  }

  try {
    const formData = new FormData();
    formData.append('image', uploadBlob, `${customName}.jpg`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const resData = await response.json();

    if (response.ok && resData && resData.success && resData.data) {
      const imageUrl = resData.data.display_url || resData.data.url;
      if (imageUrl) return imageUrl;
    }

    // Cloud upload failed (e.g. ImgBB "Internal upload error" or rate limit)
    console.warn("[ImgBB] Cloud response indicated failure, utilizing local fallback:", resData?.error?.message);
    if (fallbackDataUrl) {
      return fallbackDataUrl;
    }
    throw new Error(resData?.error?.message || "ImgBB upload error");
  } catch (err) {
    console.warn("[ImgBB] Network/API error, falling back to compressed local image:", err.message);
    if (fallbackDataUrl) {
      return fallbackDataUrl;
    }
    throw err;
  }
}
