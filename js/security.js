/**
 * ============================================================================
 * පිං පොත | Security & Anti-XSS Sanitization Layer
 * ============================================================================
 * Handles input sanitization, HTML escaping, strict payload validation,
 * safe URL filtering, and client-side spam mitigation.
 */

export const Security = {
  /**
   * HTML Entity Encoding to neutralize XSS attacks.
   * Replaces dangerous HTML characters with safe entities.
   */
  escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\//g, '&#x2F;');
  },

  /**
   * HTML Entity Decoding for populating forms in edit mode.
   */
  unescapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x2F;/g, '/');
  },

  /**
   * Cleans text by trimming excess whitespace and stripping dangerous control chars.
   */
  sanitizeText(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
      .trim();
  },

  /**
   * Validates URLs and data URIs.
   * Strictly disallows javascript:, data:text/html, vbscript:, etc.
   */
  sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return null;
    const cleanUrl = url.trim();

    // 1. Allow safely formatted Data URLs (Base64 images of all standard web formats)
    if (/^data:image\/[a-zA-Z0-9.+_-]+;base64,/i.test(cleanUrl)) {
      return cleanUrl;
    }

    // 2. Allow Blob URLs (Used during camera/file selection previews)
    if (cleanUrl.startsWith('blob:')) {
      return cleanUrl;
    }

    // 3. Allow Relative media paths (e.g., assets/..., ./..., /...)
    if (cleanUrl.startsWith('./') || cleanUrl.startsWith('/') || cleanUrl.startsWith('assets/')) {
      return cleanUrl;
    }

    // 4. Allow valid HTTPS/HTTP URLs
    try {
      const parsed = new URL(cleanUrl);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return cleanUrl;
      }
    } catch (e) {}

    console.warn('[Security] Blocked potentially unsafe media URL:', cleanUrl.substring(0, 40));
    return null;
  },

  /**
   * Validates phone numbers (Sri Lanka formats: 07x xxx xxxx, +94..., 0xx...)
   */
  sanitizePhone(phone) {
    if (!phone || typeof phone !== 'string') return '';
    const clean = phone.replace(/[^0-9+]/g, '');
    if (/^(\+94\d{9}|0\d{9})$/.test(clean)) {
      return clean;
    }
    return '';
  },

  /**
   * Check if text contains any banned or spam keywords
   */
  containsBannedWords(text, bannedWords = []) {
    if (!text || !Array.isArray(bannedWords) || bannedWords.length === 0) return { blocked: false };
    const lower = String(text).toLowerCase();
    for (const rawWord of bannedWords) {
      const word = (rawWord || '').trim().toLowerCase();
      if (word.length >= 2 && lower.includes(word)) {
        return { blocked: true, word };
      }
    }
    return { blocked: false };
  },

  /**
   * Strict post data schema validator before sending to storage/Firebase.
   * Throws an error or returns validation failure message.
   */
  validatePost(data, bannedWords = []) {
    const errors = [];

    // Title validation (Optional for all post types)
    const title = this.sanitizeText(data.title || '');
    if (title && title.length > 150) {
      errors.push('මාතෘකාව අකුරු 150කට වඩා අඩු විය යුතුය.');
    }

    // Description validation
    const desc = this.sanitizeText(data.description || '');
    if (data.type !== 'reel') {
      if (!desc || desc.length < 3) {
        errors.push('විස්තරය අකුරු 3කට වඩා වැඩි විය යුතුය.');
      } else if (desc.length > 3000) {
        errors.push('විස්තරය අකුරු 3000කට වඩා අඩු විය යුතුය.');
      }
    }

    // Banned words check (anti-spam / anti-vulgarity)
    if (bannedWords && Array.isArray(bannedWords) && bannedWords.length > 0) {
      const fullContent = `${title} ${desc} ${data.location || ''} ${data.contact || ''}`;
      const bannedCheck = this.containsBannedWords(fullContent, bannedWords);
      if (bannedCheck.blocked) {
        errors.push(`ඔබගේ සටහනේ නුසුදුසු හෝ තහනම් වචන ("${bannedCheck.word}") අඩංගු බව හඳුනාගැනිණි. කරුණාකර නිර්මල ධාර්මික සටහන් පමණක් පළ කරන්න.`);
      }
    }

    // Category whitelist
    const allowedCategories = ['සියල්ල', 'දානමය', 'සීලමය', 'භාවනාමය', 'සමාජ සත්කාර', 'ධර්ම දානමය', 'සුබපැතුම්', 'සිතුවිලි', 'සාමාන්‍ය', 'යළි බෙදාගැනීම්'];
    if (!allowedCategories.includes(data.category)) {
      errors.push('වලංගු පින්කම් වර්ගයක් තෝරන්න.');
    }

    // Type whitelist
    const allowedTypes = ['merit', 'need', 'repost', 'general', 'reel'];
    if (!allowedTypes.includes(data.type)) {
      errors.push('වලංගු සටහන් වර්ගයක් නොවේ.');
    }

    // Visibility whitelist
    const allowedVisibilities = ['public', 'private'];
    if (!allowedVisibilities.includes(data.visibility)) {
      errors.push('වලංගු පෙනෙන ආකාරයක් තෝරන්න.');
    }

    // Need type phone validation
    if (data.type === 'need') {
      const validPhone = this.sanitizePhone(data.contact);
      if (!validPhone) {
        errors.push('සත්කාර ඉල්ලීමක් සඳහා වලංගු දුරකථන අංකයක් ඇතුළත් කරන්න (උදා: 0712345678).');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized: {
        title: this.escapeHTML(title),
        description: this.escapeHTML(desc),
        category: data.category,
        type: data.type,
        visibility: data.type === 'need' ? 'public' : data.visibility,
        location: this.escapeHTML(this.sanitizeText(data.location || '')),
        contact: this.sanitizePhone(data.contact || ''),
        image: this.sanitizeUrl(data.image) || (data.videoThumbnail ? this.sanitizeUrl(data.videoThumbnail) : null),
        images: Array.isArray(data.images) && data.images.length > 0
          ? data.images.map(img => this.sanitizeUrl(img)).filter(Boolean).slice(0, 8)
          : (data.image ? [this.sanitizeUrl(data.image)].filter(Boolean) : (data.videoThumbnail ? [this.sanitizeUrl(data.videoThumbnail)].filter(Boolean) : [])),
        videoUrl: this.sanitizeUrl(data.videoUrl),
        videoId: data.videoId ? this.sanitizeText(data.videoId) : null,
        videoType: data.videoType || (data.videoId ? 'youtube' : null),
        isShorts: !!data.isShorts,
        videoThumbnail: this.sanitizeUrl(data.videoThumbnail),
        isOfficial: !!data.isOfficial,
        isPinned: !!data.isPinned,
        isVerifiedNeed: !!data.isVerifiedNeed
      }
    };
  },

  /**
   * Validate and sanitize comment text
   */
  validateComment(text) {
    const clean = this.sanitizeText(text || '');
    if (!clean || clean.length < 1) {
      return { isValid: false, error: 'අදහස් දැක්වීමක් ඇතුළත් කරන්න.' };
    }
    if (clean.length > 500) {
      return { isValid: false, error: 'අදහස් දැක්වීම අකුරු 500කට වඩා අඩු විය යුතුය.' };
    }
    return {
      isValid: true,
      text: this.escapeHTML(clean)
    };
  },

  /**
   * Anti-flood rate limiter to prevent spamming
   */
  checkRateLimit(key = 'last_post_time', cooldownMs = 4000) {
    const last = parseInt(sessionStorage.getItem(key) || '0', 10);
    const now = Date.now();
    if (now - last < cooldownMs) {
      const waitSec = Math.ceil((cooldownMs - (now - last)) / 1000);
      return { allowed: false, waitSec };
    }
    sessionStorage.setItem(key, now.toString());
    return { allowed: true };
  }
};
