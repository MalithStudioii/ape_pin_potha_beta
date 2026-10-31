/**
 * ============================================================================
 * පිං පොත | Smart Feed Algorithm & Kusala Resonance Ranking Engine
 * ============================================================================
 * An intelligent, time-decayed engagement ranking algorithm inspired by
 * Hacker News / Reddit Gravity and Wilson score, custom-tailored for
 * Buddhist and spiritual merit-sharing communities.
 *
 * Core Signals:
 * 1. Sadhu Count (සාදුකාර සංඛ්‍යාව) - Multiplier: 4.0
 * 2. Praises/Comments (අනුමෝදනා / ප්‍රාර්ථනා) - Multiplier: 6.0
 * 3. Reposts (යළි බෙදාගැනීම්) - Multiplier: 7.0
 * 4. Shares (බාහිර බෙදාගැනීම්) - Multiplier: 5.0
 * 5. Media Richness (පින්තූර අන්තර්ගතය) - Photo: +2.5, Collage: +4.0
 * 6. Urgent / Verified Need (සත්‍යාපිත සත්කාර) - Urgency boost: +15.0
 * 7. Freshness Discovery Window (අලුත් පින්කම් සඳහා අවස්ථාව) - Decaying boost for posts 0-4h old
 * 8. Gravity Time Decay (කාලය මත පදනම් වූ සංවරණ ගුරුත්වාකර්ෂණය) - (AgeInHours + 2.0)^1.35
 * 
 * Hierarchy:
 * - Tier 1: isPinned === true (Always topmost, ordered by timestamp)
 * - Tier 2: isOfficial === true (Platform official announcements, highly boosted)
 * - Tier 3: Algorithmic Score Ranking (Kusala Resonance)
 * ============================================================================
 */

export const FeedAlgorithm = {
  // Configurable weights for easy tuning
  WEIGHTS: {
    SADHU: 4.0,
    COMMENT: 6.0,
    REPOST: 7.0,
    SHARE: 5.0,
    SINGLE_IMAGE: 2.5,
    MULTI_IMAGE: 4.0,
    VERIFIED_NEED: 15.0,
    OFFICIAL_BOOST: 25.0,
    BASE_KARMA: 12.0,
    GRAVITY: 1.35,
    GRAVITY_OFFSET: 2.0, // hours
    DISCOVERY_WINDOW_HOURS: 4.0,
    DISCOVERY_MAX_BONUS: 10.0
  },

  /**
   * Calculate the algorithmic resonance score for a single post.
   * Higher score means the post will appear higher in the smart feed.
   */
  calculateScore(post, now = Date.now()) {
    if (!post) return 0;

    // 1. Raw Engagement
    const sadhuCount = Math.max(0, parseInt(post.sadhuCount, 10) || (Array.isArray(post.sadhuUsers) ? post.sadhuUsers.length : 0));
    const commentsCount = Array.isArray(post.comments) ? post.comments.length : 0;
    const repostCount = Math.max(0, parseInt(post.repostCount, 10) || 0);
    const shareCount = Math.max(0, parseInt(post.shareCount, 10) || 0);

    let engagement = 
      (sadhuCount * this.WEIGHTS.SADHU) +
      (commentsCount * this.WEIGHTS.COMMENT) +
      (repostCount * this.WEIGHTS.REPOST) +
      (shareCount * this.WEIGHTS.SHARE);

    // 2. Media Richness Bonus
    const hasImages = (Array.isArray(post.images) && post.images.length > 1);
    const hasSingleImage = !hasImages && (post.image || (Array.isArray(post.images) && post.images.length === 1));
    if (post.videoId) {
      engagement += post.isShorts ? 6.0 : 5.0;
    } else if (hasImages) {
      engagement += this.WEIGHTS.MULTI_IMAGE;
    } else if (hasSingleImage) {
      engagement += this.WEIGHTS.SINGLE_IMAGE;
    }

    // 3. Verified Need Urgency Bonus (so people in real need receive timely help)
    if (post.type === 'need' && post.isVerifiedNeed) {
      engagement += this.WEIGHTS.VERIFIED_NEED;
    }

    // 4. Official Post Boost (Institutional platform announcements)
    if (post.isOfficial) {
      engagement += this.WEIGHTS.OFFICIAL_BOOST;
    }

    // 5. Time Decay calculation
    const postTime = parseInt(post.timestamp, 10) || now;
    const ageMs = Math.max(0, now - postTime);
    const ageHours = ageMs / (1000 * 60 * 60);

    // 6. Freshness Discovery Bonus (gives new good deeds a chance to be discovered)
    let discoveryBonus = 0;
    if (ageHours < this.WEIGHTS.DISCOVERY_WINDOW_HOURS) {
      discoveryBonus = this.WEIGHTS.DISCOVERY_MAX_BONUS * (1 - (ageHours / this.WEIGHTS.DISCOVERY_WINDOW_HOURS));
    }

    // 7. Gravity Decay Equation: Score = (Base + Engagement + Discovery) / (AgeHours + 2)^Gravity
    const numerator = this.WEIGHTS.BASE_KARMA + engagement + discoveryBonus;
    const denominator = Math.pow(ageHours + this.WEIGHTS.GRAVITY_OFFSET, this.WEIGHTS.GRAVITY);

    return numerator / denominator;
  },

  /**
   * Sort an array of posts based on the chosen mode:
   * - 'trending' (default): Smart Kusala Resonance with time decay
   * - 'latest': Pure chronological order (newest first)
   * - 'top_sadhu': Highest sadhu count first
   */
  rankPosts(posts, mode = 'trending', now = Date.now()) {
    if (!Array.isArray(posts) || posts.length === 0) return [];

    const cloned = [...posts];

    return cloned.sort((a, b) => {
      // 1. Pinned posts ALWAYS come first regardless of mode
      const aPin = a.isPinned ? 1 : 0;
      const bPin = b.isPinned ? 1 : 0;
      if (bPin !== aPin) {
        return bPin - aPin;
      }

      // 2. Official platform posts ALWAYS come right after pinned posts across all modes
      const aOff = a.isOfficial ? 1 : 0;
      const bOff = b.isOfficial ? 1 : 0;
      if (bOff !== aOff) {
        return bOff - aOff;
      }

      // 3. Mode-specific sorting
      if (mode === 'latest') {
        const aTime = a.timestamp || 0;
        const bTime = b.timestamp || 0;
        return bTime - aTime;
      }

      if (mode === 'top_sadhu') {
        const aSadhu = Math.max(0, parseInt(a.sadhuCount, 10) || (Array.isArray(a.sadhuUsers) ? a.sadhuUsers.length : 0));
        const bSadhu = Math.max(0, parseInt(b.sadhuCount, 10) || (Array.isArray(b.sadhuUsers) ? b.sadhuUsers.length : 0));
        if (bSadhu !== aSadhu) {
          return bSadhu - aSadhu;
        }
        return (b.timestamp || 0) - (a.timestamp || 0);
      }

      // 'trending' (Smart Resonance Algorithm)
      const aScore = this.calculateScore(a, now);
      const bScore = this.calculateScore(b, now);
      if (Math.abs(bScore - aScore) > 0.0001) {
        return bScore - aScore;
      }
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
  },

  /**
   * Check if a post is considered "Trending" (in top tier of engagement)
   * to display a subtle visual merit badge.
   */
  isTrendingPost(post, allPosts = [], now = Date.now()) {
    if (!post || post.isPinned || post.isOfficial) return false;
    const sadhu = Math.max(0, parseInt(post.sadhuCount, 10) || (Array.isArray(post.sadhuUsers) ? post.sadhuUsers.length : 0));
    if (sadhu < 3) return false; // Minimum threshold
    const score = this.calculateScore(post, now);
    return score >= 2.8;
  }
};
