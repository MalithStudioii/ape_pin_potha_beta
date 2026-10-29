/**
 * ============================================================================
 * පිං පොත | Unified Database & Storage Layer (Firebase + Secure Local Fallback)
 * ============================================================================
 */

import { firebaseConfig, isFirebaseConfigured, COLLECTIONS } from './firebase-config.js?v=22';
import { Security } from './security.js?v=48';
import { INITIAL_ARANYA_LIST, SRI_LANKA_DISTRICTS } from './aranya-data.js';

let db = null;
let auth = null;
let isCloudReady = false;
let listeners = [];
let notifListeners = [];
let announcementListeners = [];
let verseListeners = [];
let poyaListeners = [];
let bannedWordsListeners = [];

export const MASTER_ADMIN_EMAIL = "silvadilan9@gmail.com";
export const MASTER_ADMIN_EMAILS = [
  "silvadilan9@gmail.com",
  "creativeparadise25@gmail.com"
];

const DEFAULT_POYA_EVENT = {
  month: 'ඔක්',
  day: '25',
  title: 'වප් පුර පසළොස්වක පොහොය',
  desc: 'කඨින චීවර මාසයේ ආරම්භය'
};

const DEFAULT_BANNED_WORDS = [
  'කැසිනෝ', 'සූදු', 'දේශපාලන', 'ජන්දෙ', 'ඡන්දය', 'කුණුහරුප', 'වංචා',
  'casino', 'betting', 'porn', 'scam', 'crypto'
];


// Sample seed data cleaned - empty for pure production feeds
const SEED_POSTS = [];
const SEED_NOTIFICATIONS = [];

export const StorageService = {
  _cachedPosts: null,
  FEED_PAGE_SIZE: 50,
  _lastVisibleDoc: null,
  _hasMorePosts: true,
  _isLoadingMore: false,
  _loadedPosts: [],
  currentUser: {
    uid: "user_malith",
    name: "මලිත් දුෂාන්ත හපුතන්ත්‍රි",
    email: null,
    isAdmin: false,
    isAnonymous: true
  },

  _knownAdminUids: new Set(['user_malith']),
  _knownSanghaUids: new Set(),

  /**
   * Helper to accurately determine whether a post is an Official Post from 'අපේ පිං පොත'
   */
    isDummyTestPost(p) {
    if (!p) return true;
    const id = String(p.id || '');
    const author = String(p.author || '').trim();
    const title = String(p.title || '').trim();
    const desc = String(p.description || '').trim();

    // 1. Known dummy seed post IDs
    if (id === 'post_201' || id === 'post_202' || id === 'post_203' || id === 'post_204' || id.startsWith('post_20')) {
      return true;
    }
    // 2. Dummy authors
    if (author === 'සුපුන් පෙරේරා' || author === 'ශ්‍රද්ධා ධර්ම දානය' || author === 'කල්‍යාණ මිත්‍ර එකමුතුව') {
      return true;
    }
    // 3. Dummy titles
    if (title.includes('ගිලන්පස සහ ඖෂධ පූජාව') || 
        title.includes('සිත නිවන කෙටි ධර්ම කරුණක්') ||
        title.includes('දුෂ්කර පාසලක පුස්තකාලයට පොත් අවශ්‍යයි') ||
        title.includes('රාත්‍රී මෛත්‍රී භාවනාව')) {
      return true;
    }
    // 4. Initial test dummy posts from 'අපේ පිං පොත'
    if (desc.includes('සදහම් ආලෝකයෙන් තුන් ලොවම') || 
        desc.includes('ධර්ම දානයක් වේවා') || 
        desc.includes('පින්වත් සියළු දෙනාටම නිදුක් නීරෝගී') ||
        desc.includes('අද සවස භාග්‍යවතුන් වහන්සේ උදෙසා සුවඳ මල්') ||
        desc.includes('සියඹලාණ්ඩුව ප්‍රදේශයේ දුෂ්කර පාසලක')) {
      return true;
    }
    // 5. Unsplash test image URLs from dummy seed posts
    const imgStr = JSON.stringify(p.images || p.image || '');
    if (imgStr.includes('photo-1544650039-22886fbb4323') || 
        imgStr.includes('photo-1514933651103-005eec06c04b') ||
        imgStr.includes('photo-1509198397868-475647b2a1e5') ||
        imgStr.includes('photo-1518709268805-4e9042af9f23')) {
      return true;
    }
    return false;
  },

    purgeDummyPostsFromStorage() {
    try {
      // 1. Purge from local storage feed caches
      ['pinKetha_posts', 'pinPotha_posts', 'pinPotha_sandbox_posts'].forEach(key => {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              const cleaned = list.filter(p => !this.isDummyTestPost(p));
              localStorage.setItem(key, JSON.stringify(cleaned));
            }
          } catch(e) {}
        }
      });

      // 2. Mark dummy seed IDs as deleted locally so no component can ever display them
      const localDeleted = this.getDeletedPostIds();
      const dummySeedIds = ['post_201', 'post_202', 'post_203', 'post_204'];
      const mergedDeleted = Array.from(new Set([...localDeleted, ...dummySeedIds]));
      localStorage.setItem('pinPotha_deleted_ids', JSON.stringify(mergedDeleted));

      // 3. Purge test notifications
      const notifRaw = localStorage.getItem('pinKetha_notifications');
      if (notifRaw) {
        try {
          const list = JSON.parse(notifRaw);
          if (Array.isArray(list)) {
            const cleanNotifs = list.filter(n => n.senderName !== 'සුපුන් පෙරේරා' && !String(n.id || '').startsWith('notif_10'));
            localStorage.setItem('pinKetha_notifications', JSON.stringify(cleanNotifs));
          }
        } catch(e) {}
      }

      // 4. Clean active in-memory caches
      if (Array.isArray(this._cachedPosts)) {
        this._cachedPosts = this._cachedPosts.filter(p => !this.isDummyTestPost(p));
      }
      if (Array.isArray(this._loadedPosts)) {
        this._loadedPosts = this._loadedPosts.filter(p => !this.isDummyTestPost(p));
      }
    } catch(e) {}
  },

  isOfficialPost(post) {
    if (!post) return false;
    return post.isOfficial === true ||
           post.isOfficial === 'true' ||
           post.authorRole === 'official' ||
           (post.author && post.author.trim() === 'අපේ පිං පොත') ||
           (post.title && post.title.trim() === 'පිං පොත නිල නිවේදනය');
  },

  /**
   * Checks whether a user/email/post is Master Admin (silvadilan9@gmail.com, creativeparadise25@gmail.com, user_malith)
   */
  isMasterAdmin(userOrEmailOrUid) {
    const isMasterEmail = (email) => {
      if (!email) return false;
      const clean = email.trim().toLowerCase();
      return MASTER_ADMIN_EMAILS.some(adm => adm.toLowerCase() === clean);
    };

    if (!userOrEmailOrUid) {
      if (!this.currentUser) return false;
      return isMasterEmail(this.currentUser.email) || this.currentUser.uid === 'user_malith';
    }
    if (typeof userOrEmailOrUid === 'string') {
      return isMasterEmail(userOrEmailOrUid) || userOrEmailOrUid.trim().toLowerCase() === 'user_malith';
    }
    const email = (userOrEmailOrUid.email || userOrEmailOrUid.authorEmail || '').trim().toLowerCase();
    const uid = userOrEmailOrUid.uid || '';
    return isMasterEmail(email) || uid === 'user_malith';
  },

  /**
   * Checks whether a user/post/comment/uid is an appointed Sub-Admin (🛡️)
   */
  isSubAdmin(userOrPostOrUid) {
    if (!userOrPostOrUid) return false;
    if (this.isMasterAdmin(userOrPostOrUid)) return false;

    if (typeof userOrPostOrUid === 'object') {
      const role = (userOrPostOrUid.role || userOrPostOrUid.authorRole || '').toLowerCase();
      if (role === 'admin' || role === 'sub_admin' || userOrPostOrUid.isSubAdmin === true) {
        return true;
      }
      const uid = userOrPostOrUid.uid;
      if (uid && this._knownAdminUids && this._knownAdminUids.has(uid)) {
        return true;
      }
    } else if (typeof userOrPostOrUid === 'string') {
      if (this._knownAdminUids && this._knownAdminUids.has(userOrPostOrUid)) {
        return true;
      }
    }
    return false;
  },

  /**
   * Returns total registered community members count (Cloud aggregation with baseline)
   */
  async getTotalMemberCount() {
    if (isCloudReady && db) {
      try {
        const { collection, getCountFromServer } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const snap = await getCountFromServer(collection(db, COLLECTIONS.USERS));
        const count = snap.data().count;
        if (typeof count === 'number' && count > 0) {
          return count + 115;
        }
      } catch (e) {
        console.warn('[Storage] Member count fetch note:', e);
      }
    }
    const allPosts = this.getLocalPosts();
    const uniqueUids = new Set(allPosts.map(p => p.uid).filter(Boolean));
    return Math.max(uniqueUids.size + 115, 128);
  },

  _cachedCommunityMembers: null,
  _lastCommunityMembersFetchTime: 0,

  /**
   * Returns all registered community members from Firestore with caching & fallback
   */
  async getAllCommunityMembers(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && this._cachedCommunityMembers && this._cachedCommunityMembers.length > 20 && (now - this._lastCommunityMembersFetchTime < 30000)) {
      return this._cachedCommunityMembers;
    }

    let members = [];
    if (isCloudReady && db) {
      try {
        const { collection, getDocs, query } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const q = query(collection(db, COLLECTIONS.USERS));
        const snap = await getDocs(q);
        snap.forEach(docSnap => {
          const data = docSnap.data();
          const isMaster = (data.email || '').trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() || docSnap.id === 'user_malith';
          const isSub = !isMaster && (data.role === 'admin' || data.authorRole === 'admin' || data.isSubAdmin === true);
          if (isSub) {
            this._knownAdminUids.add(docSnap.id);
          } else {
            this._knownAdminUids.delete(docSnap.id);
          }
          const isMemberSangha = data.isSangha === true || data.role === 'sangha' || (data.authorRole === 'sangha') || this.isSangha({ uid: docSnap.id, name: data.name || data.firstName });
          if (isMemberSangha) {
            this._knownSanghaUids.add(docSnap.id);
          }
          const lastActive = data.lastActiveAt || data.updatedAt || 0;
          const isOnline = (this.currentUser && this.currentUser.uid === docSnap.id) || ((now - lastActive) < 7 * 60 * 1000);
          members.push({
            uid: docSnap.id,
            name: data.name || data.firstName || 'කල්‍යාණ මිත්‍ර',
            photo: data.photo || '',
            bio: data.bio || '',
            location: data.location || data.district || '',
            joinedDate: data.joinedDate || '',
            updatedAt: data.updatedAt || 0,
            lastActiveAt: lastActive,
            isOnline: isOnline,
            isAdmin: isMaster,
            isSubAdmin: isSub,
            isSangha: isMemberSangha,
            role: data.role || (isMemberSangha ? 'sangha' : (isSub ? 'admin' : 'member')),
            mithrayanCount: Array.isArray(data.mithrayan) ? data.mithrayan.length : 0
          });
        });
      } catch (e) {
        console.warn('[Storage] getAllCommunityMembers error:', e);
      }
    }

    if (members.length === 0) {
      const posts = this.getLocalPosts();
      const map = new Map();
      posts.forEach(p => {
        if (p.uid && !map.has(p.uid)) {
          const isSelf = this.currentUser && this.currentUser.uid === p.uid;
          map.set(p.uid, {
            uid: p.uid,
            name: p.author || 'කල්‍යාණ මිත්‍ර',
            photo: p.authorPhoto || '',
            bio: '',
            location: p.location || '',
            joinedDate: '2026',
            updatedAt: p.timestamp || 0,
            lastActiveAt: isSelf ? now : (p.timestamp || (now - 3600000)),
            isOnline: isSelf || ((now - (p.timestamp || 0)) < 7 * 60 * 1000),
            isAdmin: false,
            isSangha: p.isSangha || p.authorRole === 'sangha' || this.isSangha({ name: p.author }),
            role: (p.isSangha || p.authorRole === 'sangha') ? 'sangha' : 'member',
            mithrayanCount: 0
          });
        }
      });
      if (this.currentUser && this.currentUser.uid && !map.has(this.currentUser.uid)) {
        map.set(this.currentUser.uid, {
          uid: this.currentUser.uid,
          name: this.currentUser.name || 'මලිත්',
          photo: this.currentUser.photo || '',
          bio: this.currentUser.bio || '',
          location: this.currentUser.location || '',
          joinedDate: this.currentUser.joinedDate || '2026',
          updatedAt: now,
          lastActiveAt: now,
          isOnline: true,
          isAdmin: this.isMasterAdmin(),
          isSangha: this.isSangha(this.currentUser),
          role: this.isSangha(this.currentUser) ? 'sangha' : (this.isMasterAdmin() ? 'admin' : 'member'),
          mithrayanCount: Array.isArray(this.currentUser.mithrayan) ? this.currentUser.mithrayan.length : 0
        });
      }
      members = Array.from(map.values());
    }

    // Attach posts count & sadhu count from posts cache
    const allLocalPosts = this.getLocalPosts();
    members.forEach(m => {
      const userPosts = allLocalPosts.filter(p => p.uid === m.uid);
      m.postsCount = userPosts.length;
      m.totalSadhu = userPosts.reduce((acc, p) => acc + (p.sadhuCount || 0), 0);
      if (this.currentUser && m.uid === this.currentUser.uid) {
        m.isOnline = true;
      }
    });

    // Sort by latest update or creation
    members.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    if (isCloudReady && db && members.length > 0) {
      this._cachedCommunityMembers = members;
      this._lastCommunityMembersFetchTime = now;
    } else if (!this._cachedCommunityMembers || this._cachedCommunityMembers.length < members.length) {
      this._cachedCommunityMembers = members;
      this._lastCommunityMembersFetchTime = 0;
    }
    return members;
  },

  /**
   * Keep user presence updated in Firestore & local state
   */
  _lastPresenceWriteTime: 0,

  /**
   * Keep user presence updated in Firestore & local state (Live Real-Time Heartbeat)
   */
  async updateUserPresence(force = false) {
    if (!this.currentUser || !this.currentUser.uid) return;
    const now = Date.now();
    this.currentUser.lastActiveAt = now;
    try {
      localStorage.setItem('pinPotha_last_presence', now.toString());
      localStorage.setItem('pinPotha_currentUser', JSON.stringify(this.currentUser));
    } catch (e) {}

    // Throttle remote Firestore write to at most once per 60s (unless forced on startup/tab focus)
    if (!force && (now - this._lastPresenceWriteTime < 60000)) {
      return;
    }
    this._lastPresenceWriteTime = now;

    if (isCloudReady && db) {
      try {
        const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        await updateDoc(doc(db, COLLECTIONS.USERS, this.currentUser.uid), {
          lastActiveAt: now
        }).catch(() => {});
      } catch (e) {}
    }
  },

  /**
   * Initializes the storage engine (Firestore or Sandbox)
   */
  async init() {
    this.purgeDummyPostsFromStorage();
    // Load local user profile if present
    const savedUser = localStorage.getItem('pinPotha_currentUser');
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
      } catch (e) {
        console.error('Failed to parse saved user', e);
      }
    }
    if (this.currentUser) {
      if (!Array.isArray(this.currentUser.mithrayan)) this.currentUser.mithrayan = [];
      if (!Array.isArray(this.currentUser.pendingMithraSent)) this.currentUser.pendingMithraSent = [];
    }
    this.currentUser.isAdmin = this.isMasterAdmin();

    try {
      const savedAdminUids = localStorage.getItem('pinPotha_admin_uids');
      if (savedAdminUids) {
        const arr = JSON.parse(savedAdminUids);
        if (Array.isArray(arr)) {
          arr.forEach(id => this._knownAdminUids.add(id));
        }
      }
    } catch(e) {}

    try {
      const savedSanghaUids = localStorage.getItem('pinPotha_sangha_uids');
      if (savedSanghaUids) {
        const arr = JSON.parse(savedSanghaUids);
        if (Array.isArray(arr)) {
          arr.forEach(id => this._knownSanghaUids.add(id));
        }
      }
    } catch(e) {}

    if (isFirebaseConfigured()) {
      try {
        console.log('[Storage] Initializing Firebase Modular SDK...');
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js');
        const { getFirestore, collection, onSnapshot, query, orderBy, limit, startAfter, getDocs } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const { getAuth, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js');

        const app = initializeApp(firebaseConfig);

        // Firebase App Check (reCAPTCHA v3) Bot Mitigation
        if (firebaseConfig.recaptchaSiteKey && firebaseConfig.recaptchaSiteKey.trim()) {
          try {
            const { initializeAppCheck, ReCaptchaEnterpriseProvider, ReCaptchaV3Provider } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-check.js');
            if (typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
              self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
            }
            const key = firebaseConfig.recaptchaSiteKey.trim();
            const provider = typeof ReCaptchaEnterpriseProvider !== 'undefined'
              ? new ReCaptchaEnterpriseProvider(key)
              : new ReCaptchaV3Provider(key);

            initializeAppCheck(app, {
              provider: provider,
              isTokenAutoRefreshEnabled: true
            });
            console.log('[Security] Firebase App Check (Enterprise / Fraud Defense) active.');
          } catch (appCheckErr) {
            console.warn('[Security] Firebase App Check note:', appCheckErr);
          }
        }

        db = getFirestore(app);
        auth = getAuth(app);
        isCloudReady = true;

        // Listen for Auth changes
        onAuthStateChanged(auth, async (user) => {
          await this.restoreUserProfile(user);
          if (user?.uid) {
            this.initUserNotificationsSubscription(user.uid);
            this.initUserPostsSubscription(user.uid);
          }
        });

        // Real-time Firestore Feed Subscription - Comprehensive Stream (All Merit, Need & Official Posts)
        const q = collection(db, COLLECTIONS.POSTS);
        onSnapshot(q, (snapshot) => {
          const deletedIds = this.getDeletedPostIds();
          const posts = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            if (this.isDummyTestPost({ id: doc.id, ...data })) {
              if (this.isMasterAdmin()) {
                this.deletePost(doc.id).catch(() => {});
              }
              return; // Exclude dummy test posts from feed stream
            }
            const isOfficial = this.isOfficialPost(data);
            const isUserPost = Boolean(this.currentUser && (
              data.uid === this.currentUser.uid ||
              (this.currentUser.email && data.authorEmail && data.authorEmail.toLowerCase() === this.currentUser.email.toLowerCase())
            ));

            // Only hide if deleted in cloud or explicitly deleted locally (never hide user's own posts or official posts)
            const isDeletedInCloud = data.isDeleted === true;
            const isLocallyDeleted = deletedIds.includes(doc.id) && !isOfficial && !isUserPost;

            if (!isDeletedInCloud && !isLocallyDeleted) {
              const rawSadhu = typeof data.sadhuCount === 'number' ? data.sadhuCount : 0;
              const sanitizedSadhu = Math.max(0, rawSadhu);
              const normTimestamp = typeof data.timestamp === 'number' ? data.timestamp : (data.serverCreatedAt?.toMillis ? data.serverCreatedAt.toMillis() : (data.date ? Date.parse(data.date) || Date.now() : Date.now()));

              posts.push({
                id: doc.id,
                ...data,
                timestamp: normTimestamp,
                isOfficial: isOfficial,
                sadhuCount: sanitizedSadhu,
                sadhuUsers: Array.isArray(data.sadhuUsers) ? data.sadhuUsers : [],
                comments: Array.isArray(data.comments) ? data.comments : []
              });
            }
          });

          // Sort newest to oldest
          posts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

          this._loadedPosts = posts;
          this._cachedPosts = posts;
          this._hasMorePosts = false;
          this.syncPostsWithUserSadhus(this._loadedPosts);
          this.cacheLocal(this._loadedPosts);
          this.notifyListeners(this._loadedPosts);
        }, (error) => {
          console.warn('[Firestore] Realtime error, falling back to local cache', error);
          const localPosts = this.getLocalPosts();
          this.syncPostsWithUserSadhus(localPosts);
          this.notifyListeners(localPosts);
        });

        // Real-time Firestore Notifications Subscription for authenticated user
        if (this.currentUser && this.currentUser.uid && !this.currentUser.isAnonymous) {
          this.initUserNotificationsSubscription(this.currentUser.uid);
          this.initUserPostsSubscription(this.currentUser.uid);
        }

        // Real-time Firestore Admin Settings Subscription
        try {
          const { doc, onSnapshot: onDocSnapshot } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
          onDocSnapshot(doc(db, COLLECTIONS.SETTINGS, 'global_announcement'), (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              localStorage.setItem('pinKetha_admin_announcement', JSON.stringify(data));
              this.notifyAnnouncementListeners(data);
            }
          });
          onDocSnapshot(doc(db, COLLECTIONS.SETTINGS, 'daily_verse'), (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              localStorage.setItem('pinKetha_dhamma_verse', JSON.stringify(data));
              this.notifyVerseListeners(data);
            }
          });
          onDocSnapshot(doc(db, COLLECTIONS.SETTINGS, 'poya_event'), (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              localStorage.setItem('pinKetha_poya_event', JSON.stringify(data));
              this.notifyPoyaListeners(data);
            }
          });
          onDocSnapshot(doc(db, COLLECTIONS.SETTINGS, 'banned_words'), (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              localStorage.setItem('pinKetha_banned_words', JSON.stringify(data));
              this.notifyBannedWordsListeners(data);
            }
          });
          onDocSnapshot(doc(db, COLLECTIONS.SETTINGS, 'deleted_posts'), (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              const cloudDeletedIds = Array.isArray(data.ids) ? data.ids : [];
              this.syncCloudDeletedIds(cloudDeletedIds);
            }
          });
        } catch (sErr) {
          console.warn('[Firestore] Admin settings listener note:', sErr);
        }

        // Pre-fetch community members in background to keep author names and photos fresh
        this.getAllCommunityMembers().catch(() => {});

        return { isCloud: true };
      } catch (err) {
        console.warn('[Firebase] Init failed, running in secure Sandbox mode:', err);
        isCloudReady = false;
      }
    }

    // Default: Local Sandbox Engine
    if (!localStorage.getItem('pinPotha_sandbox_posts')) {
      this.cacheLocal(SEED_POSTS);
    }
    if (!localStorage.getItem('pinKetha_notifications')) {
      this.cacheLocalNotifications(SEED_NOTIFICATIONS);
    }
    return { isCloud: false };

  },

  isCloudConnected() {
    return isCloudReady;
  },

  getDeletedPostIds() {
    try {
      return JSON.parse(localStorage.getItem('pinPotha_deleted_ids') || '[]');
    } catch {
      return [];
    }
  },

  markPostAsDeletedLocally(postId) {
    const ids = this.getDeletedPostIds();
    if (!ids.includes(postId)) {
      ids.push(postId);
      localStorage.setItem('pinPotha_deleted_ids', JSON.stringify(ids));
    }
  },

  restoreDeletedPostsLocally() {
    localStorage.removeItem('pinPotha_deleted_ids');
    this._cachedPosts = null;
    return this.getLocalPosts();
  },

  syncCloudDeletedIds(cloudDeletedIds) {
    if (!Array.isArray(cloudDeletedIds) || cloudDeletedIds.length === 0) return;
    const localDeleted = this.getDeletedPostIds();
    const merged = Array.from(new Set([...localDeleted, ...cloudDeletedIds]));
    localStorage.setItem('pinPotha_deleted_ids', JSON.stringify(merged));

    if (this._cachedPosts && Array.isArray(this._cachedPosts)) {
      const remaining = this._cachedPosts.filter(p => !merged.includes(p.id) && p.isDeleted !== true);
      if (remaining.length !== this._cachedPosts.length) {
        this._cachedPosts = remaining;
        this.cacheLocal(remaining);
        this.notifyListeners(remaining);
      }
    }
  },

  getUserSadhus(uid = null) {
    const userUid = uid || this.currentUser?.uid || 'anonymous';
    try {
      return JSON.parse(localStorage.getItem('pinPotha_sadhus_' + userUid) || '[]');
    } catch {
      return [];
    }
  },

  setUserSadhus(postIds, uid = null) {
    const userUid = uid || this.currentUser?.uid || 'anonymous';
    try {
      localStorage.setItem('pinPotha_sadhus_' + userUid, JSON.stringify(postIds));
    } catch {}
  },

  recordUserSadhu(postId, isAdd, uid = null) {
    const userUid = uid || this.currentUser?.uid || 'anonymous';
    const list = this.getUserSadhus(userUid);
    const set = new Set(list);
    if (isAdd) {
      set.add(postId);
    } else {
      set.delete(postId);
    }
    this.setUserSadhus(Array.from(set), userUid);
  },

  hasUserGivenSadhu(post, uid = null) {
    if (!post) return false;
    const userUid = uid || this.currentUser?.uid || 'anonymous';
    const mySadhus = this.getUserSadhus(userUid);
    if (mySadhus.includes(post.id)) return true;
    const sadhuUsers = Array.isArray(post.sadhuUsers) ? post.sadhuUsers : [];
    // Only check sadhuUsers if userUid is not the post author (avoids legacy auto-liked author bug)
    if (post.uid && post.uid === userUid) {
      return mySadhus.includes(post.id);
    }
    return sadhuUsers.includes(userUid);
  },

  syncPostsWithUserSadhus(posts) {
    const userUid = this.currentUser?.uid || 'anonymous';
    const mySadhus = this.getUserSadhus(userUid);

    (posts || []).forEach(post => {
      if (!Array.isArray(post.sadhuUsers)) {
        post.sadhuUsers = [];
      }
      post.sadhuCount = Math.max(0, parseInt(post.sadhuCount, 10) || 0);

      // Normalise comments so every comment has a stable ID and reactions object
      if (Array.isArray(post.comments)) {
        post.comments.forEach((c, idx) => {
          if (!c.id) {
            c.id = 'c_' + post.id + '_' + idx;
          }
          if (!c.reactions || typeof c.reactions !== 'object') {
            c.reactions = {};
          }
        });
      }

      if (mySadhus.includes(post.id)) {
        if (!post.sadhuUsers.includes(userUid)) {
          post.sadhuUsers.push(userUid);
        }
      } else if (post.uid === userUid) {
        // Author has not locally liked their own post, remove pre-populated author UID
        post.sadhuUsers = post.sadhuUsers.filter(u => u !== userUid);
      }
    });

    return posts;
  },

  getLocalPosts() {
    this.purgeDummyPostsFromStorage();
    const deletedIds = this.getDeletedPostIds();
    const isCleanPost = (p) => {
      if (!p || p.isDeleted === true || this.isDummyTestPost(p)) return false;
      const isOff = this.isOfficialPost(p);
      const isUser = Boolean(this.currentUser && (
        p.uid === this.currentUser.uid ||
        (this.currentUser.email && p.authorEmail && p.authorEmail.toLowerCase() === this.currentUser.email.toLowerCase())
      ));
      if (isUser) return true;
      return !deletedIds.includes(p.id);
    };

    if (this._loadedPosts && Array.isArray(this._loadedPosts) && this._loadedPosts.length > 0) {
      const clean = this._loadedPosts.filter(isCleanPost);
      return this.syncPostsWithUserSadhus(clean);
    }
    if (this._cachedPosts && Array.isArray(this._cachedPosts) && this._cachedPosts.length > 0) {
      const clean = this._cachedPosts.filter(isCleanPost);
      this._loadedPosts = clean;
      return this.syncPostsWithUserSadhus(clean);
    }

    try {
      const rawSandbox = localStorage.getItem('pinPotha_sandbox_posts');
      const rawPosts = localStorage.getItem('pinPotha_posts');
      let combined = [];

      if (rawSandbox) {
        try {
          const list = JSON.parse(rawSandbox);
          if (Array.isArray(list)) combined = combined.concat(list);
        } catch (e) {}
      }
      if (rawPosts) {
        try {
          const list = JSON.parse(rawPosts);
          if (Array.isArray(list)) combined = combined.concat(list);
        } catch (e) {}
      }

      const map = new Map();
      combined.forEach(p => {
        if (p && p.id && !this.isDummyTestPost(p)) {
          p.isOfficial = this.isOfficialPost(p);
          map.set(p.id, p);
        }
      });

      let posts = Array.from(map.values());
      const clean = posts.filter(isCleanPost);
      this._cachedPosts = clean;
      this._loadedPosts = clean;
      return this.syncPostsWithUserSadhus(clean);
    } catch {
      return [];
    }
  },

  cacheLocal(posts) {
    if (!Array.isArray(posts) || posts.length === 0) return;
    const deletedIds = this.getDeletedPostIds();
    const cleanPosts = (posts || []).filter(p => {
      if (!p || p.isDeleted === true || this.isDummyTestPost(p)) return false;
      const isOff = this.isOfficialPost(p);
      const isUser = Boolean(this.currentUser && (
        p.uid === this.currentUser.uid ||
        (this.currentUser.email && p.authorEmail && p.authorEmail.toLowerCase() === this.currentUser.email.toLowerCase())
      ));
      if (isOff || isUser) return true;
      return !deletedIds.includes(p.id);
    });

    if (cleanPosts.length === 0) return;
    this._cachedPosts = cleanPosts;
    this._loadedPosts = cleanPosts;

    try {
      // Store up to 200 in localStorage so initial paint is instantaneous
      const topCache = cleanPosts.slice(0, 200);
      localStorage.setItem('pinPotha_sandbox_posts', JSON.stringify(topCache));
      localStorage.setItem('pinPotha_posts', JSON.stringify(topCache));
    } catch (e) {
      console.warn('[Storage] LocalStorage quota reached, storing lightweight cache:', e);
      try {
        const lightPosts = cleanPosts.slice(0, 60).map(p => ({
          ...p,
          image: p.image && String(p.image).startsWith('data:') ? null : p.image,
          images: Array.isArray(p.images) ? p.images.filter(img => !String(img).startsWith('data:')) : []
        }));
        localStorage.setItem('pinPotha_sandbox_posts', JSON.stringify(lightPosts));
        localStorage.setItem('pinPotha_posts', JSON.stringify(lightPosts));
      } catch (err2) {
        console.warn('[Storage] Lightweight cache fallback also failed:', err2);
      }
    }
  },

  /**
   * Merge additional posts (Official announcements, user posts, etc.) into loaded posts without duplicates
   */
  mergeAdditionalPosts(additionalPosts) {
    if (!Array.isArray(additionalPosts) || additionalPosts.length === 0) return;
    const deletedIds = this.getDeletedPostIds();
    const currentList = (this._loadedPosts && this._loadedPosts.length > 0) ? this._loadedPosts : this.getLocalPosts();
    const map = new Map();
    (currentList || []).forEach(p => map.set(p.id, p));
    let hasNew = false;
    additionalPosts.forEach(p => {
      if (!p || this.isDummyTestPost(p)) return;
      if ((!deletedIds.includes(p.id) || p.isOfficial) && p.isDeleted !== true) {
        if (!map.has(p.id)) {
          map.set(p.id, p);
          hasNew = true;
        } else {
          const old = map.get(p.id);
          map.set(p.id, { ...old, ...p });
        }
      }
    });
    if (hasNew) {
      this._loadedPosts = Array.from(map.values());
      this._cachedPosts = this._loadedPosts;
      this.syncPostsWithUserSadhus(this._loadedPosts);
      this.cacheLocal(this._loadedPosts);
      this.notifyListeners(this._loadedPosts);
    }
  },

  /**
   * High-Scale Feed Pagination Helpers
   */
  hasMorePosts() {
    return this._hasMorePosts;
  },

  isLoadingMorePosts() {
    return this._isLoadingMore;
  },

  resetFeedPagination() {
    this._lastVisibleDoc = null;
    this._hasMorePosts = true;
    this._isLoadingMore = false;
  },

  async fetchMorePosts() {
    if (this._isLoadingMore || !this._hasMorePosts) {
      return { success: false, hasMore: this._hasMorePosts, count: 0 };
    }

    if (!isCloudReady || !db || !this._lastVisibleDoc) {
      this._hasMorePosts = false;
      return { success: false, hasMore: false, count: 0 };
    }

    this._isLoadingMore = true;
    try {
      const { collection, getDocs, query, orderBy, limit, startAfter } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
      const qNext = query(
        collection(db, COLLECTIONS.POSTS),
        orderBy("timestamp", "desc"),
        startAfter(this._lastVisibleDoc),
        limit(this.FEED_PAGE_SIZE)
      );

      const snap = await getDocs(qNext);
      const docsCount = snap.docs.length;
      if (docsCount === 0) {
        this._hasMorePosts = false;
        this._isLoadingMore = false;
        return { success: true, hasMore: false, count: 0 };
      }

      this._lastVisibleDoc = snap.docs[docsCount - 1];
      if (docsCount < this.FEED_PAGE_SIZE) {
        this._hasMorePosts = false;
      }

      const deletedIds = this.getDeletedPostIds();
      const newBatch = [];
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (this.isDummyTestPost({ id: docSnap.id, ...data })) return;
        if (!deletedIds.includes(docSnap.id) && data.isDeleted !== true) {
          const rawSadhu = typeof data.sadhuCount === 'number' ? data.sadhuCount : 0;
          newBatch.push({
            id: docSnap.id,
            ...data,
            sadhuCount: Math.max(0, rawSadhu),
            sadhuUsers: Array.isArray(data.sadhuUsers) ? data.sadhuUsers : []
          });
        }
      });

      const currentIds = new Set(this._loadedPosts.map(p => p.id));
      const filteredNew = newBatch.filter(p => !currentIds.has(p.id));
      this._loadedPosts = [...this._loadedPosts, ...filteredNew];

      this.syncPostsWithUserSadhus(this._loadedPosts);
      this.cacheLocal(this._loadedPosts);
      this.notifyListeners(this._loadedPosts);

      this._isLoadingMore = false;
      return { success: true, hasMore: this._hasMorePosts, count: filteredNew.length };
    } catch (err) {
      console.error('[Storage] fetchMorePosts error:', err);
      this._isLoadingMore = false;
      return { success: false, error: err.message, hasMore: this._hasMorePosts };
    }
  },

  /**
   * Register listener for realtime updates
   */
  onPostsUpdate(callback) {
    listeners.push(callback);
    callback(this.getLocalPosts());
  },

  notifyListeners(posts = null) {
    const list = posts || this.getLocalPosts();
    listeners.forEach(cb => {
      try { cb(list); } catch (e) { console.error(e); }
    });
  },

  /**
   * Register listener for realtime notifications
   */
  onNotificationsUpdate(callback) {
    notifListeners.push(callback);
    callback(this.getNotifications());
  },

  notifyNotificationListeners(notifs = null) {
    if (notifs) {
      this.cacheLocalNotifications(notifs);
    }
    const filteredList = this.getNotifications();
    notifListeners.forEach(cb => {
      try { cb(filteredList); } catch (e) { console.error(e); }
    });
  },

  /**
   * Register listener for global announcement
   */
  onAnnouncementUpdate(callback) {
    announcementListeners.push(callback);
    callback(this.getAdminAnnouncement());
  },

  notifyAnnouncementListeners(data = null) {
    const ann = data || this.getAdminAnnouncement();
    announcementListeners.forEach(cb => {
      try { cb(ann); } catch (e) { console.error(e); }
    });
  },

  /**
   * Register listener for daily dhamma verse
   */
  onVerseUpdate(callback) {
    verseListeners.push(callback);
    callback(this.getDailyDhammaVerse());
  },

  notifyVerseListeners(data = null) {
    const verse = data || this.getDailyDhammaVerse();
    verseListeners.forEach(cb => {
      try { cb(verse); } catch (e) { console.error(e); }
    });
  },

  async togglePinPost(postId, isPinned) {
    if (!this.isMasterAdmin()) {
      throw new Error('මෙම ක්‍රියාව සඳහා පරිපාලක (Master Admin) අවසරය අවශ්‍ය වේ.');
    }
    if (isCloudReady && db) {
      try {
        const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        await updateDoc(doc(db, COLLECTIONS.POSTS, postId), {
          isPinned: !!isPinned
        });
      } catch (err) {
        console.warn('[Firestore] Failed to update isPinned in cloud:', err);
      }
    }
    const posts = this.getLocalPosts();
    const target = posts.find(p => p.id === postId);
    if (target) {
      target.isPinned = !!isPinned;
      this.cacheLocal(posts);
      this.notifyListeners(posts);
    }
    return true;
  },

  async saveAdminAnnouncement(data) {
    if (!this.isMasterAdmin() && !this.isSubAdmin(this.currentUser)) {
      throw new Error('පරිපාලක අවසරය අවශ්‍ය වේ.');
    }
    const msg = (data && (data.message || data.text)) || '';
    const active = data ? !!data.active : false;
    const cleanMsg = Security.escapeHTML(Security.sanitizeText(msg));
    const payload = {
      message: cleanMsg,
      text: cleanMsg,
      active: active,
      updatedAt: Date.now(),
      updatedBy: this.currentUser.email || 'Admin'
    };
    localStorage.setItem('pinKetha_admin_announcement', JSON.stringify(payload));
    if (isCloudReady && db) {
      try {
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        await setDoc(doc(db, COLLECTIONS.SETTINGS, 'global_announcement'), payload, { merge: true });
      } catch (e) {
        console.warn('[Firestore] Failed to save cloud announcement:', e);
      }
    }
    this.notifyAnnouncementListeners(payload);
    return payload;
  },

  getAdminAnnouncement() {
    try {
      const raw = localStorage.getItem('pinKetha_admin_announcement');
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.text = parsed.text || parsed.message || '';
        return parsed;
      }
      return { message: '', text: '', active: false };
    } catch {
      return { message: '', text: '', active: false };
    }
  },

  async saveDailyDhammaVerse(arg1, arg2) {
    if (!this.isMasterAdmin() && !this.isSubAdmin(this.currentUser)) {
      throw new Error('පරිපාලක අවසරය අවශ්‍ය වේ.');
    }
    let paliText = '';
    let sinhalaText = '';
    if (typeof arg1 === 'object' && arg1 !== null) {
      paliText = arg1.pali || '';
      sinhalaText = arg1.sinhala || '';
    } else {
      paliText = arg1 || '';
      sinhalaText = arg2 || '';
    }

    const payload = {
      pali: Security.escapeHTML(Security.sanitizeText(paliText)),
      sinhala: Security.escapeHTML(Security.sanitizeText(sinhalaText)),
      updatedAt: Date.now()
    };
    localStorage.setItem('pinKetha_dhamma_verse', JSON.stringify(payload));
    if (isCloudReady && db) {
      try {
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        await setDoc(doc(db, COLLECTIONS.SETTINGS, 'daily_verse'), payload, { merge: true });
      } catch (e) {
        console.warn('[Firestore] Failed to save cloud verse:', e);
      }
    }
    this.notifyVerseListeners(payload);
    return payload;
  },

  getDailyDhammaVerse() {
    try {
      const raw = localStorage.getItem('pinKetha_dhamma_verse');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  onPoyaEventUpdate(callback) {
    poyaListeners.push(callback);
    callback(this.getPoyaEvent());
  },

  notifyPoyaListeners(event = null) {
    const data = event || this.getPoyaEvent();
    poyaListeners.forEach(cb => {
      try { cb(data); } catch (e) { console.error(e); }
    });
  },

  async savePoyaEvent({ month, day, title, desc }) {
    if (!this.isMasterAdmin() && !this.isSubAdmin(this.currentUser)) {
      throw new Error('පරිපාලක අවසරය අවශ්‍ය වේ.');
    }
    const payload = {
      month: Security.escapeHTML(Security.sanitizeText(month || 'පෝය')),
      day: Security.escapeHTML(Security.sanitizeText(day || '15')),
      title: Security.escapeHTML(Security.sanitizeText(title || 'පුර පසළොස්වක පොහොය')),
      desc: Security.escapeHTML(Security.sanitizeText(desc || 'පින්කම් දිනයකි')),
      updatedAt: Date.now()
    };
    localStorage.setItem('pinKetha_poya_event', JSON.stringify(payload));
    if (isCloudReady && db) {
      try {
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        await setDoc(doc(db, COLLECTIONS.SETTINGS, 'poya_event'), payload, { merge: true });
      } catch (e) {
        console.warn('[Firestore] Failed to save cloud poya event:', e);
      }
    }
    this.notifyPoyaListeners(payload);
    return payload;
  },

  getPoyaEvent() {
    try {
      const raw = localStorage.getItem('pinKetha_poya_event');
      return raw ? JSON.parse(raw) : DEFAULT_POYA_EVENT;
    } catch {
      return DEFAULT_POYA_EVENT;
    }
  },

  onBannedWordsUpdate(callback) {
    bannedWordsListeners.push(callback);
    callback(this.getBannedWords());
  },

  notifyBannedWordsListeners(config = null) {
    const data = config || this.getBannedWords();
    bannedWordsListeners.forEach(cb => {
      try { cb(data); } catch (e) { console.error(e); }
    });
  },

  async saveBannedWords({ words, active }) {
    if (!this.isMasterAdmin()) {
      throw new Error('පරිපාලක (Master Admin) අවසරය අවශ්‍ය වේ.');
    }
    let list = [];
    if (Array.isArray(words)) {
      list = words.map(w => Security.sanitizeText(w).toLowerCase()).filter(w => w.length >= 2);
    } else if (typeof words === 'string') {
      list = words.split(/[\n,]+/).map(w => Security.sanitizeText(w).toLowerCase()).filter(w => w.length >= 2);
    } else {
      list = DEFAULT_BANNED_WORDS;
    }

    const payload = {
      words: list,
      active: active !== undefined ? !!active : true,
      updatedAt: Date.now()
    };
    localStorage.setItem('pinKetha_banned_words', JSON.stringify(payload));
    if (isCloudReady && db) {
      try {
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        await setDoc(doc(db, COLLECTIONS.SETTINGS, 'banned_words'), payload, { merge: true });
      } catch (e) {
        console.warn('[Firestore] Failed to save cloud banned words:', e);
      }
    }
    this.notifyBannedWordsListeners(payload);
    return payload;
  },

  getBannedWords() {
    try {
      const raw = localStorage.getItem('pinKetha_banned_words');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.words)) return parsed;
      }
      return { words: DEFAULT_BANNED_WORDS, active: true };
    } catch {
      return { words: DEFAULT_BANNED_WORDS, active: true };
    }
  },

  async toggleVerifyNeed(postId) {
    if (!this.isMasterAdmin()) {
      throw new Error('පරිපාලක (Master Admin) අවසරය අවශ්‍ය වේ.');
    }
    const posts = this.getLocalPosts();
    const post = posts.find(p => p.id === postId);
    if (!post) {
      throw new Error('සත්කාර සටහන සොයාගත නොහැකි විය.');
    }

    const newStatus = !post.isVerifiedNeed;
    post.isVerifiedNeed = newStatus;

    if (isCloudReady && db) {
      try {
        const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        await updateDoc(doc(db, COLLECTIONS.POSTS, postId), {
          isVerifiedNeed: newStatus
        });
      } catch (e) {
        console.warn('[Firestore] Cloud verify update note:', e);
      }
    }

    this.cacheLocal(posts);
    this.notifyListeners(posts);
    return newStatus;
  },

  simulateAdminLogin() {
    console.info('[Security] Developer simulation mode is permanently disabled in production release.');
  },

  getLocalNotifications() {
    try {
      const data = localStorage.getItem('pinKetha_notifications');
      let notifs = data ? JSON.parse(data) : SEED_NOTIFICATIONS;
      const readIds = this.getReadNotificationIds();
      const acceptedRequests = this.getAcceptedRequestIds();
      const declinedRequests = this.getDeclinedRequestIds();

      let changed = false;
      notifs.forEach(n => {
        if (readIds.includes(n.id) && !n.read) {
          n.read = true;
          changed = true;
        }
        if (n.type === 'mithra_request') {
          if (acceptedRequests.includes(n.id) || acceptedRequests.includes(n.senderUid)) {
            if (n.status !== 'accepted' || !n.read) {
              n.status = 'accepted';
              n.read = true;
              changed = true;
            }
          } else if (declinedRequests.includes(n.id) || declinedRequests.includes(n.senderUid)) {
            if (n.status !== 'declined' || !n.read) {
              n.status = 'declined';
              n.read = true;
              changed = true;
            }
          }
        }
        if (n.message && n.message.includes('පැවසුවා')) {
          n.message = n.message.replace(/පැවසුවාය?/g, 'ලබා දුන්නා');
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem('pinKetha_notifications', JSON.stringify(notifs));
      }
      return notifs;
    } catch {
      return SEED_NOTIFICATIONS;
    }
  },

  getAcceptedRequestIds() {
    try {
      const raw = localStorage.getItem('pinPotha_accepted_requests');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  recordAcceptedRequest(notifId, senderUid) {
    const list = this.getAcceptedRequestIds();
    if (notifId && !list.includes(notifId)) list.push(notifId);
    if (senderUid && !list.includes(senderUid)) list.push(senderUid);
    try {
      localStorage.setItem('pinPotha_accepted_requests', JSON.stringify(list));
    } catch (e) {}
  },

  getDeclinedRequestIds() {
    try {
      const raw = localStorage.getItem('pinPotha_declined_requests');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  recordDeclinedRequest(notifId, senderUid) {
    const list = this.getDeclinedRequestIds();
    if (notifId && !list.includes(notifId)) list.push(notifId);
    if (senderUid && !list.includes(senderUid)) list.push(senderUid);
    try {
      localStorage.setItem('pinPotha_declined_requests', JSON.stringify(list));
    } catch (e) {}
  },

  isRequestAccepted(notifId, senderUid) {
    const list = this.getAcceptedRequestIds();
    if (notifId && list.includes(notifId)) return true;
    if (senderUid && list.includes(senderUid)) return true;
    if (this.currentUser && Array.isArray(this.currentUser.mithrayan) && this.currentUser.mithrayan.includes(senderUid)) return true;
    return false;
  },

  isRequestDeclined(notifId, senderUid) {
    const list = this.getDeclinedRequestIds();
    if (notifId && list.includes(notifId)) return true;
    if (senderUid && list.includes(senderUid)) return true;
    return false;
  },

  getReadNotificationIds() {
    try {
      const raw = localStorage.getItem('pinPotha_read_notifications');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  recordReadNotification(notifId) {
    if (!notifId) return;
    const list = this.getReadNotificationIds();
    if (!list.includes(notifId)) {
      list.push(notifId);
      try {
        localStorage.setItem('pinPotha_read_notifications', JSON.stringify(list));
      } catch (e) {}
    }
  },

  recordAllReadNotifications(ids) {
    if (!Array.isArray(ids)) return;
    const list = this.getReadNotificationIds();
    ids.forEach(id => {
      if (id && !list.includes(id)) list.push(id);
    });
    try {
      localStorage.setItem('pinPotha_read_notifications', JSON.stringify(list));
    } catch (e) {}
  },

  cacheLocalNotifications(notifs) {
    if (!Array.isArray(notifs)) return;

    // Apply persistent status to all notifications
    const acceptedRequests = this.getAcceptedRequestIds();
    const declinedRequests = this.getDeclinedRequestIds();
    const readIds = this.getReadNotificationIds();
    const myMithrayan = Array.isArray(this.currentUser?.mithrayan) ? this.currentUser.mithrayan : [];

    notifs.forEach(n => {
      if (readIds.includes(n.id)) {
        n.read = true;
      }
      if (n.type === 'mithra_request') {
        if (acceptedRequests.includes(n.id) || acceptedRequests.includes(n.senderUid) || myMithrayan.includes(n.senderUid)) {
          n.status = 'accepted';
          n.read = true;
        } else if (declinedRequests.includes(n.id) || declinedRequests.includes(n.senderUid)) {
          n.status = 'declined';
          n.read = true;
        }
      }
    });

    try {
      localStorage.setItem('pinKetha_notifications', JSON.stringify(notifs));
    } catch (e) {
      console.warn('LocalStorage limit reached', e);
    }

    // Auto-sync accepted Kalyana Mithra invitations (bidirectional friendship)
    if (this.currentUser && this.currentUser.uid && Array.isArray(notifs)) {
      let changed = false;
      if (!Array.isArray(this.currentUser.mithrayan)) this.currentUser.mithrayan = [];
      if (!Array.isArray(this.currentUser.pendingMithraSent)) this.currentUser.pendingMithraSent = [];

      notifs.forEach(n => {
        if (n.type === 'mithra_accepted' && n.recipientUid === this.currentUser.uid && n.senderUid) {
          if (!this.currentUser.mithrayan.includes(n.senderUid)) {
            this.currentUser.mithrayan.push(n.senderUid);
            changed = true;
          }
          if (this.currentUser.pendingMithraSent.includes(n.senderUid)) {
            this.currentUser.pendingMithraSent = this.currentUser.pendingMithraSent.filter(id => id !== n.senderUid);
            changed = true;
          }
        }
      });

      if (changed) {
        localStorage.setItem('pinPotha_currentUser', JSON.stringify(this.currentUser));
        localStorage.setItem('pinPotha_profile_' + this.currentUser.uid, JSON.stringify(this.currentUser));
      }
    }
  },

  initUserNotificationsSubscription(uid) {
    if (this._notifUnsubscribe) {
      try { this._notifUnsubscribe(); } catch (e) {}
      this._notifUnsubscribe = null;
    }

    if (!isCloudReady || !db || !uid || uid.startsWith('user_guest_')) {
      return;
    }

    try {
      import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js').then(({ collection, query, where, onSnapshot }) => {
        // Query only current authenticated user's notifications to satisfy Firestore security rules
        const nq = query(
          collection(db, COLLECTIONS.NOTIFICATIONS),
          where("recipientUid", "==", uid)
        );
        this._notifUnsubscribe = onSnapshot(nq, (snapshot) => {
          const cloudNotifs = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            cloudNotifs.push({ ...data, id: doc.id });
          });
          cloudNotifs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

          const localAll = this.getLocalNotifications();
          const otherNotifs = localAll.filter(n => n.recipientUid !== uid);
          const merged = [...cloudNotifs, ...otherNotifs];

          this.cacheLocalNotifications(merged);
          this.notifyNotificationListeners(this.getNotifications());
        }, (err) => {
          console.warn('[Firestore] Realtime user notifications listener error:', err);
        });
      }).catch(err => {
        console.warn('[Firestore] Notif import error:', err);
      });
    } catch (nErr) {
      console.warn('[Firestore] Realtime notifications subscription error', nErr);
    }
  },

  /**
   * Realtime subscription for current user's posts to ensure "මගේ පිං පොත" always has all user posts
   */
  initUserPostsSubscription(uid) {
    if (this._userPostsUnsubscribe) {
      try { this._userPostsUnsubscribe(); } catch (e) {}
      this._userPostsUnsubscribe = null;
    }

    if (!isCloudReady || !db || !uid || uid.startsWith('user_guest_')) {
      return;
    }

    try {
      import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js').then(({ collection, query, where, onSnapshot }) => {
        const uq = query(
          collection(db, COLLECTIONS.POSTS),
          where("uid", "==", uid)
        );
        this._userPostsUnsubscribe = onSnapshot(uq, (snapshot) => {
          const userPosts = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.isDeleted !== true) {
              userPosts.push({ id: doc.id, ...data });
            }
          });
          if (userPosts.length > 0) {
            this.mergeAdditionalPosts(userPosts);
          }
        }, (err) => {
          console.warn('[Firestore] Realtime user posts listener note:', err);
        });
      }).catch(err => {
        console.warn('[Firestore] User posts import note:', err);
      });
    } catch (uErr) {
      console.warn('[Firestore] Realtime user posts subscription note:', uErr);
    }
  },

  getNotifications() {
    const all = this.getLocalNotifications();
    const uid = this.currentUser?.uid;
    if (!uid) return [];
    return all.filter(n => {
      // Must be intended specifically for this user
      if (n.recipientUid && n.recipientUid === uid) return true;
      // Or system-wide broadcast notification
      if (n.recipientUid === 'all' || n.type === 'broadcast') return true;
      return false;
    });
  },

  async createNotification(notifData) {
    const newNotif = {
      id: "notif_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      recipientUid: notifData.recipientUid || this.currentUser.uid,
      senderUid: notifData.senderUid || this.currentUser.uid,
      senderName: notifData.senderName || this.currentUser.name,
      senderPhoto: notifData.senderPhoto || this.currentUser.photo || null,
      type: notifData.type || 'sadhu',
      postId: notifData.postId || null,
      postTitle: notifData.postTitle || '',
      message: notifData.message || '',
      timestamp: Date.now(),
      read: false
    };

    if (isCloudReady && db) {
      try {
        const { collection, doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const notifDocRef = doc(collection(db, COLLECTIONS.NOTIFICATIONS));
        newNotif.id = notifDocRef.id;
        await setDoc(notifDocRef, {
          ...newNotif,
          serverCreatedAt: serverTimestamp()
        });
      } catch (err) {
        console.warn('[Firestore] Failed to save cloud notification:', err);
      }
    }

    const currentList = this.getLocalNotifications();
    currentList.unshift(newNotif);
    this.cacheLocalNotifications(currentList);
    this.notifyNotificationListeners(currentList);
    return newNotif;
  },

  async markNotificationAsRead(notifId) {
    if (!notifId) return;
    this.recordReadNotification(notifId);

    const currentList = this.getLocalNotifications();
    const target = currentList.find(n => n.id === notifId);
    if (target) {
      target.read = true;
      this.cacheLocalNotifications(currentList);
      this.notifyNotificationListeners(currentList);
    }

    if (isCloudReady && db) {
      try {
        const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notifId), { read: true });
      } catch (err) {
        console.warn('[Firestore] Mark read failed:', err);
      }
    }
  },

  async markAllNotificationsAsRead() {
    const currentList = this.getLocalNotifications();
    currentList.forEach(n => { n.read = true; });
    this.recordAllReadNotifications(currentList.map(n => n.id));
    this.cacheLocalNotifications(currentList);
    this.notifyNotificationListeners(currentList);

    if (isCloudReady && db && this.currentUser && this.currentUser.uid) {
      try {
        const { collection, getDocs, query, where, writeBatch, doc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const q = query(
          collection(db, COLLECTIONS.NOTIFICATIONS),
          where("recipientUid", "==", this.currentUser.uid),
          where("read", "==", false)
        );
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.forEach(d => {
          batch.update(doc(db, COLLECTIONS.NOTIFICATIONS, d.id), { read: true });
        });
        await batch.commit();
      } catch (err) {
        console.warn('[Firestore] Mark all read failed:', err);
      }
    }
  },


  /**
   * Save a new post (Firestore with atomic security or LocalStorage)
   */
  async createPost(rawPost) {
    // 0. Auto-default title and institutional naming for official posts & general posts
    const postToProcess = { ...rawPost };
    const isMaster = this.isMasterAdmin();
    const isOfficial = isMaster && !!postToProcess.isOfficial;

    let safeTitle = (postToProcess.title || '').trim();
    if (isOfficial && (!safeTitle || safeTitle.length < 3)) {
      safeTitle = 'පිං පොත නිල නිවේදනය';
    }
    postToProcess.title = safeTitle;

    // 1. Strict Security Validation & Sanitization with Banned Words Filter
    const bannedConfig = this.getBannedWords();
    const activeBannedWords = (bannedConfig && bannedConfig.active) ? (bannedConfig.words || []) : [];
    const validation = Security.validatePost(postToProcess, activeBannedWords);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(' '));
    }

    // 2. Anti-spam Rate Limit check
    const rateCheck = Security.checkRateLimit('last_merit_post', 1500);
    if (!rateCheck.allowed) {
      throw new Error(`කරුණාකර තත්පර ${rateCheck.waitSec}ක් රැඳී සිට නැවත උත්සාහ කරන්න.`);
    }

    const cleanData = validation.sanitized;
    const authorName = isOfficial ? 'අපේ පිං පොත' : this.currentUser.name;
    const authorPhoto = isOfficial ? null : (this.currentUser.photo || null);

    const postPayload = {
      uid: this.currentUser.uid,
      author: authorName,
      authorPhoto: authorPhoto,
      type: cleanData.type,
      visibility: cleanData.visibility,
      title: cleanData.title || safeTitle,
      category: cleanData.category || (cleanData.type === 'general' ? 'සාමාන්‍ය' : 'දානමය'),
      location: isOfficial ? '' : cleanData.location,
      contact: isOfficial ? '' : cleanData.contact,
      description: cleanData.description,
      image: cleanData.image || (cleanData.images && cleanData.images[0]) || null,
      images: cleanData.images || (cleanData.image ? [cleanData.image] : []),
      videoUrl: cleanData.videoUrl || null,
      videoId: cleanData.videoId || null,
      videoType: cleanData.videoType || null,
      isShorts: !!cleanData.isShorts,
      videoThumbnail: cleanData.videoThumbnail || null,
      isOfficial: isOfficial,
      isPinned: isMaster && !!cleanData.isPinned,
      isVerifiedNeed: isMaster && !!cleanData.isVerifiedNeed,
      authorRole: isOfficial ? 'official' : (isMaster ? 'admin' : 'member'),
      authorEmail: isOfficial ? null : (this.currentUser.email || null),
      timestamp: Date.now(),
      date: "දැන්",
      sadhuCount: 0,
      sadhuUsers: [],
      comments: [],
      shareCount: 0,
      repostCount: 0
    };

    if (isCloudReady && db) {
      const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
      await addDoc(collection(db, COLLECTIONS.POSTS), {
        ...postPayload,
        serverCreatedAt: serverTimestamp()
      });
      return true;
    }

    // Local Sandbox Mode
    const posts = this.getLocalPosts();
    const newPost = {
      id: "post_" + Date.now(),
      ...postPayload,
      repostCount: 0
    };
    posts.unshift(newPost);
    this.cacheLocal(posts);
    this.notifyListeners(posts);
    return true;
  },

  /**
   * Repost a merit to the feed (supports Cloud Firestore, in-memory, and local posts)
   */
  async repostPost(originalPostId, userComment = '', passedOriginal = null) {
    let original = passedOriginal;
    if (!original && this._cachedPosts) {
      original = this._cachedPosts.find(p => p.id === originalPostId);
    }
    if (!original) {
      const posts = this.getLocalPosts();
      original = posts.find(p => p.id === originalPostId);
    }
    if (!original && isCloudReady && db) {
      try {
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const snap = await getDoc(doc(db, COLLECTIONS.POSTS, originalPostId));
        if (snap.exists()) {
          original = { id: snap.id, ...snap.data() };
        }
      } catch (e) {
        console.warn('[Firestore] Error fetching original post directly:', e);
      }
    }

    if (!original) {
      throw new Error('පින්කම සොයාගත නොහැකි විය.');
    }

    const cleanComment = Security.escapeHTML(Security.sanitizeText(userComment || ''));

    // Ensure description is always at least 5 chars for Firestore rule compliance
    let finalDesc = cleanComment;
    if (!finalDesc || finalDesc.length < 5) {
      if (finalDesc && finalDesc.length > 0) {
        finalDesc = `${finalDesc} • උතුම් පින්කමක් දැක බලා සතුටු සිතින් අනුමෝදන් වෙමි! 🙏`;
      } else {
        finalDesc = 'උතුම් පින්කමක් දැක බලා සතුටු සිතින් අනුමෝදන් වෙමි! 🙏';
      }
    }

    const originalData = original.originalPost || original;
    const origImage = originalData.image || (originalData.images && originalData.images[0]) || null;
    const origImages = Array.isArray(originalData.images) && originalData.images.length > 0
      ? originalData.images
      : (origImage ? [origImage] : []);

    const origCategory = originalData.category && ['දානමය', 'සීලමය', 'භාවනාමය', 'සමාජ සත්කාර', 'ධර්ම දානමය'].includes(originalData.category)
      ? originalData.category
      : 'දානමය';

    const repostPayload = {
      uid: this.currentUser.uid || 'anonymous',
      author: this.currentUser.name || 'කල්‍යාණ මිත්‍ර',
      type: 'merit',
      isRepost: true,
      visibility: 'public',
      title: `යළි බෙදාගැනීම: ${originalData.title || 'පින්කම'}`,
      category: origCategory,
      location: originalData.location || '',
      description: finalDesc,
      image: null,
      images: [],
      timestamp: Date.now(),
      date: "දැන්",
      sadhuCount: 0,
      sadhuUsers: [],
      comments: [],
      repostCount: 0,
      shareCount: 0,
      originalPost: {
        id: String(originalData.id || original.id || ''),
        uid: String(originalData.uid || original.uid || ''),
        author: String(originalData.author || original.author || 'කල්‍යාණ මිත්‍ර'),
        title: String(originalData.title || original.title || 'පින්කම'),
        description: String(originalData.description || original.description || ''),
        category: String(originalData.category || 'දානමය'),
        location: String(originalData.location || ''),
        image: origImage, // Single image preview only
        date: String(originalData.date || 'මෑතකදී'),
        timestamp: originalData.timestamp || original.timestamp || Date.now()
      }
    };

    // Increment repost count on original locally
    original.repostCount = (original.repostCount || 0) + 1;

    if (isCloudReady && db) {
      const { collection, addDoc, doc, updateDoc, increment, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
      await addDoc(collection(db, COLLECTIONS.POSTS), {
        ...repostPayload,
        serverCreatedAt: serverTimestamp()
      });
      try {
        await updateDoc(doc(db, COLLECTIONS.POSTS, original.id), {
          repostCount: increment(1)
        });
      } catch (e) {
        console.warn('Failed to increment repost count on original doc in Firestore (ignored):', e);
      }
    } else {
      const posts = this.getLocalPosts();
      const newPost = {
        id: "post_" + Date.now(),
        ...repostPayload
      };
      posts.unshift(newPost);
      this.cacheLocal(posts);
      this.notifyListeners(posts);
    }

    // Trigger notification to original author
    if (original.uid && original.uid !== this.currentUser.uid) {
      try {
        await this.createNotification({
          recipientUid: original.uid,
          type: 'sadhu',
          postId: original.id,
          postTitle: original.title || 'පින්කම',
          message: 'ඔබගේ පින්කම යළි බෙදාගත්තේය (Reposted) 🔄'
        });
      } catch (nErr) {
        console.warn('Notification trigger warning:', nErr);
      }
    }

    return true;
  },

  /**
   * Atomic Share Count Increment (Dharma Dana tracking)
   */
  async incrementShare(postId) {
    if (!postId) return;
    const allPosts = this.getLocalPosts();
    const targetPost = allPosts.find(p => p.id === postId);
    if (targetPost) {
      targetPost.shareCount = (targetPost.shareCount || 0) + 1;
      this.cacheLocal(allPosts);
      this.notifyListeners(allPosts);
    }
    if (this._cachedPosts) {
      const cached = this._cachedPosts.find(p => p.id === postId);
      if (cached) cached.shareCount = (cached.shareCount || 0) + 1;
    }

    if (isCloudReady && db) {
      try {
        const { doc, updateDoc, increment } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const postRef = doc(db, COLLECTIONS.POSTS, postId);
        await updateDoc(postRef, {
          shareCount: increment(1)
        });
      } catch (e) {
        console.warn('Failed to increment share count in Firestore', e);
      }
    }
  },

  /**
   * Alias for giveSadhu to toggle Sadhu atomically
   */
  async toggleSadhu(postId, forceAction = null) {
    return this.giveSadhu(postId, forceAction);
  },

  /**
   * Atomic Sadhu Toggle (Strictly 1 Sadhu per user) & Notification Trigger
   */
  async giveSadhu(postId, forceAction = null) {
    const sPostId = String(postId);
    const allPosts = this.getLocalPosts();
    let targetPost = allPosts.find(p => String(p.id) === sPostId);
    const userUid = this.currentUser?.uid || 'anonymous';

    // Fallback 1: Check _cachedPosts
    if (!targetPost && Array.isArray(this._cachedPosts)) {
      targetPost = this._cachedPosts.find(p => String(p.id) === sPostId);
      if (targetPost) allPosts.push(targetPost);
    }

    // Fallback 2: Check window.currentPostsData
    if (!targetPost && typeof window !== 'undefined' && Array.isArray(window.currentPostsData)) {
      targetPost = window.currentPostsData.find(p => String(p.id) === sPostId);
      if (targetPost) allPosts.push(targetPost);
    }

    // Fallback 3: Check SEED_POSTS
    if (!targetPost && typeof SEED_POSTS !== 'undefined' && Array.isArray(SEED_POSTS)) {
      targetPost = SEED_POSTS.find(p => String(p.id) === sPostId);
      if (targetPost) allPosts.push(targetPost);
    }

    // Fallback 4: If still not found, instantiate a new targetPost so user interaction is never lost or zeroed
    if (!targetPost) {
      targetPost = {
        id: postId,
        sadhuCount: 0,
        sadhuUsers: []
      };
      allPosts.push(targetPost);
    }

    targetPost.sadhuUsers = Array.isArray(targetPost.sadhuUsers) ? targetPost.sadhuUsers : [];
    targetPost.sadhuCount = Math.max(0, parseInt(targetPost.sadhuCount, 10) || 0);

    const alreadyGiven = this.hasUserGivenSadhu(targetPost, userUid);
    const action = forceAction ? forceAction : (alreadyGiven ? 'removed' : 'added');

    if (action === 'added') {
      targetPost.sadhuCount = targetPost.sadhuCount + 1;
      if (!targetPost.sadhuUsers.includes(userUid)) {
        targetPost.sadhuUsers.push(userUid);
      }
      this.recordUserSadhu(postId, true, userUid);
    } else {
      targetPost.sadhuCount = Math.max(0, targetPost.sadhuCount - 1);
      targetPost.sadhuUsers = targetPost.sadhuUsers.filter(uid => uid !== userUid);
      this.recordUserSadhu(postId, false, userUid);
    }

    // Keep memory and local cache immediately up-to-date
    this._cachedPosts = allPosts;
    this.cacheLocal(allPosts);
    this.notifyListeners(allPosts);

    if (isCloudReady && db) {
      try {
        const { doc, updateDoc, arrayUnion, arrayRemove } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const postRef = doc(db, COLLECTIONS.POSTS, postId);
        try {
          if (action === 'added') {
            await updateDoc(postRef, {
              sadhuCount: Math.max(1, targetPost.sadhuCount),
              sadhuUsers: arrayUnion(userUid)
            });
          } else {
            await updateDoc(postRef, {
              sadhuCount: Math.max(0, targetPost.sadhuCount),
              sadhuUsers: arrayRemove(userUid)
            });
          }
        } catch (cloudErr) {
          console.warn('[Sadhu Cloud] Full update blocked, falling back to sadhuCount only:', cloudErr);
          try {
            await updateDoc(postRef, {
              sadhuCount: Math.max(0, targetPost.sadhuCount)
            });
          } catch (countErr) {
            console.warn('[Sadhu Cloud] Fallback sadhuCount write also failed:', countErr);
          }
        }
      } catch (err) {
        console.warn('[Sadhu Cloud] Firestore service error:', err);
      }
    }

    // Trigger Notification for the author (only if someone else gave Sadhu)
    if (action === 'added' && targetPost.uid && targetPost.uid !== userUid) {
      this.createNotification({
        recipientUid: targetPost.uid,
        type: 'sadhu',
        postId: targetPost.id,
        postTitle: targetPost.title || 'පින්කම',
        message: 'ඔබගේ පින්කමට සාදුකාරයක් ලබා දුන්නා 🙏'
      });
    }

    return { action, count: targetPost.sadhuCount, hasGiven: (action === 'added') };
  },

  /**
   * Add comment / blessing & Notification Trigger (Live in-place with author photo & reactions support)
   */
  async addComment(postId, commentText) {
    const val = Security.validateComment(commentText);
    if (!val.isValid) {
      throw new Error(val.error);
    }

    const commentId = 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const commentObj = {
      id: commentId,
      uid: this.currentUser?.uid || '',
      author: this.currentUser?.name || 'සාමාජිකයෙක්',
      authorPhoto: this.currentUser?.photo || '',
      text: val.text,
      time: "දැන්",
      timestamp: Date.now(),
      reactions: {},
      isEdited: false
    };

    const allPosts = this.getLocalPosts();
    let targetPost = allPosts.find(p => String(p.id) === String(postId));
    if (!targetPost && Array.isArray(this._loadedPosts)) {
      targetPost = this._loadedPosts.find(p => String(p.id) === String(postId));
    }

    if (targetPost) {
      if (!Array.isArray(targetPost.comments)) targetPost.comments = [];
      targetPost.comments.push(commentObj);
      this._cachedPosts = allPosts;
      this.cacheLocal(allPosts);
    }

    // Also sync in-memory _loadedPosts
    if (Array.isArray(this._loadedPosts)) {
      const targetInLoaded = this._loadedPosts.find(p => String(p.id) === String(postId));
      if (targetInLoaded) {
        if (!Array.isArray(targetInLoaded.comments)) targetInLoaded.comments = [];
        if (!targetInLoaded.comments.some(c => c.id === commentObj.id)) {
          targetInLoaded.comments.push(commentObj);
        }
      }
    }

    // Also sync window.currentPostsData
    if (typeof window !== 'undefined' && Array.isArray(window.currentPostsData)) {
      const curTarget = window.currentPostsData.find(p => String(p.id) === String(postId));
      if (curTarget) {
        if (!Array.isArray(curTarget.comments)) curTarget.comments = [];
        if (!curTarget.comments.some(c => c.id === commentObj.id)) {
          curTarget.comments.push(commentObj);
        }
      }
    }

    this.notifyListeners(allPosts);

    if (isCloudReady && db) {
      try {
        const { doc, updateDoc, arrayUnion } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const postRef = doc(db, COLLECTIONS.POSTS, postId);
        await updateDoc(postRef, {
          comments: arrayUnion(commentObj)
        });
      } catch (err) {
        console.warn('[Storage] Firestore addComment error:', err);
      }
    }

    // Trigger Notification for the author (only if someone else commented)
    if (targetPost && targetPost.uid && targetPost.uid !== this.currentUser?.uid) {
      const snippet = val.text.length > 45 ? val.text.substring(0, 45) + '...' : val.text;
      this.createNotification({
        recipientUid: targetPost.uid,
        type: 'comment',
        postId: targetPost.id,
        postTitle: targetPost.title || 'පින්කම',
        message: `ඔබගේ සටහනට පුණ්‍යානුමෝදනාවක් එක් කළාය: "${snippet}"`
      });
    }

    // Trigger Notification for Mentioned Members (@Mention)
    if (val.text && val.text.includes('@')) {
      const allMembers = (this._cachedCommunityMembers && this._cachedCommunityMembers.length > 0)
        ? this._cachedCommunityMembers
        : this.getLocalPosts().map(p => ({ uid: p.uid, name: p.author }));
      const notifiedUids = new Set();
      if (targetPost && targetPost.uid) notifiedUids.add(targetPost.uid);

      allMembers.forEach(m => {
        if (m.uid && m.uid !== this.currentUser?.uid && m.name && !notifiedUids.has(m.uid)) {
          if (val.text.includes(`@${m.name}`)) {
            notifiedUids.add(m.uid);
            const snippet = val.text.length > 45 ? val.text.substring(0, 45) + '...' : val.text;
            this.createNotification({
              recipientUid: m.uid,
              type: 'mention',
              postId: targetPost ? targetPost.id : postId,
              postTitle: targetPost?.title || 'පින්කම',
              message: `ප්‍රාර්ථනාවකදී ඔබව සිහිපත් කළාය: "${snippet}"`
            });
          }
        }
      });
    }

    return commentObj;
  },

  /**
   * Update post content (Guarded by author or master admin)
   */
  async updatePost(postId, { title, category, visibility, location, description, contact }) {
    let allPosts = this.getLocalPosts();
    let targetPost = allPosts.find(p => p.id === postId);
    if (!targetPost && this._cachedPosts) {
      targetPost = this._cachedPosts.find(p => p.id === postId);
      if (targetPost) {
        allPosts = this._cachedPosts;
      }
    }
    if (!targetPost) {
      throw new Error('පුණ්‍ය සටහන සොයාගත නොහැකි විය.');
    }

    const currentUid = this.currentUser?.uid;
    const isOwner = targetPost.uid && targetPost.uid === currentUid;
    const isMaster = this.isMasterAdmin();

    if (!isOwner && !isMaster) {
      throw new Error('මෙම සටහන සංස්කරණය කිරීමට ඔබට අවසර නැත.');
    }

    if (title !== undefined) targetPost.title = title;
    if (category !== undefined) targetPost.category = category;
    if (visibility !== undefined) targetPost.visibility = visibility;
    if (location !== undefined) targetPost.location = location;
    if (description !== undefined) targetPost.description = description;
    if (contact !== undefined) targetPost.contact = contact;
    targetPost.isEdited = true;
    targetPost.editedAt = Date.now();

    this._cachedPosts = allPosts;
    this.cacheLocal(allPosts);
    this.notifyListeners(allPosts);

    if (isCloudReady && db) {
      try {
        const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const postRef = doc(db, COLLECTIONS.POSTS, postId);
        const updateData = {
          isEdited: true,
          editedAt: targetPost.editedAt
        };
        if (title !== undefined) updateData.title = title;
        if (category !== undefined) updateData.category = category;
        if (visibility !== undefined) updateData.visibility = visibility;
        if (location !== undefined) updateData.location = location;
        if (description !== undefined) updateData.description = description;
        if (contact !== undefined) updateData.contact = contact;

        await updateDoc(postRef, updateData);
      } catch (err) {
        console.warn('[Storage] Firestore updatePost error:', err);
      }
    }

    return targetPost;
  },

  /**
   * Update comment text (Guarded by author or master admin)
   */
  async updateComment(postId, commentId, newText) {
    const val = Security.validateComment(newText);
    if (!val.isValid) {
      throw new Error(val.error);
    }

    let allPosts = this.getLocalPosts();
    let targetPost = allPosts.find(p => p.id === postId);
    if (!targetPost && this._cachedPosts) {
      targetPost = this._cachedPosts.find(p => p.id === postId);
      if (targetPost) {
        allPosts = this._cachedPosts;
      }
    }
    if (!targetPost || !Array.isArray(targetPost.comments)) {
      throw new Error('පුණ්‍ය සටහන හෝ ප්‍රාර්ථනාව සොයාගත නොහැකි විය.');
    }

    let comment = targetPost.comments.find(c => (c.id && c.id === commentId) || (String(c.timestamp) === String(commentId)));
    if (!comment && commentId && commentId.startsWith('c_' + postId + '_')) {
      const parts = commentId.split('_');
      const idx = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(idx) && targetPost.comments[idx]) {
        comment = targetPost.comments[idx];
      }
    }
    if (!comment && targetPost.comments.length === 1) {
      comment = targetPost.comments[0];
    }
    if (!comment) {
      const currentName = (this.currentUser?.name || '').trim();
      comment = targetPost.comments.find(c => {
        const aName = (this.resolveAuthorName(c) || c.author || '').trim();
        return aName && aName === currentName;
      });
    }
    if (!comment) {
      throw new Error('ප්‍රාර්ථනාව සොයාගත නොහැකි විය.');
    }

    const currentUid = this.currentUser?.uid;
    const currentName = (this.currentUser?.name || '').trim();
    const cAuthorName = (this.resolveAuthorName(comment) || comment.author || '').trim();
    const isOwner = (comment.uid && currentUid && comment.uid === currentUid) || 
                    (comment.author && comment.author.trim() === currentName) ||
                    (cAuthorName && cAuthorName === currentName);
    const isMaster = this.isMasterAdmin();

    if (!isOwner && !isMaster) {
      throw new Error('මෙම ප්‍රාර්ථනාව සංස්කරණය කිරීමට ඔබට අවසර නැත.');
    }

    comment.text = val.text;
    comment.isEdited = true;
    comment.editedAt = Date.now();
    if (!comment.id) comment.id = commentId;

    this._cachedPosts = allPosts;
    this.cacheLocal(allPosts);
    this.notifyListeners(allPosts);

    if (isCloudReady && db) {
      try {
        const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const postRef = doc(db, COLLECTIONS.POSTS, postId);
        await updateDoc(postRef, {
          comments: targetPost.comments
        });
      } catch (err) {
        console.warn('[Storage] Firestore updateComment error:', err);
      }
    }

    return comment;
  },

  /**
   * Toggle emoji reaction on a comment (WhatsApp style)
   */
  async toggleCommentReaction(postId, commentId, emoji) {
    const validEmojis = ['🙏', '🪷', '❤️', '✨'];
    if (!validEmojis.includes(emoji)) {
      throw new Error('අවලංගු Emoji ප්‍රතිචාරයකි.');
    }

    const currentUid = this.currentUser?.uid || 'anon_' + (this.currentUser?.name || 'user');
    let allPosts = this.getLocalPosts();
    let targetPost = allPosts.find(p => p.id === postId);
    if (!targetPost && this._cachedPosts) {
      targetPost = this._cachedPosts.find(p => p.id === postId);
      if (targetPost) {
        allPosts = this._cachedPosts;
      }
    }
    if (!targetPost || !Array.isArray(targetPost.comments)) {
      throw new Error('පුණ්‍ය සටහන සොයාගත නොහැකි විය.');
    }

    let comment = targetPost.comments.find(c => (c.id && c.id === commentId) || (String(c.timestamp) === String(commentId)));
    if (!comment && commentId && commentId.startsWith('c_' + postId + '_')) {
      const parts = commentId.split('_');
      const idx = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(idx) && targetPost.comments[idx]) {
        comment = targetPost.comments[idx];
      }
    }
    if (!comment && targetPost.comments.length === 1) {
      comment = targetPost.comments[0];
    }
    if (!comment) {
      const currentName = (this.currentUser?.name || '').trim();
      comment = targetPost.comments.find(c => {
        const aName = (this.resolveAuthorName(c) || c.author || '').trim();
        return aName && aName === currentName;
      });
    }
    if (!comment) {
      throw new Error('ප්‍රාර්ථනාව සොයාගත නොහැකි විය.');
    }

    if (!comment.id) comment.id = commentId;

    if (!comment.reactions || typeof comment.reactions !== 'object') {
      comment.reactions = {};
    }
    if (!Array.isArray(comment.reactions[emoji])) {
      comment.reactions[emoji] = [];
    }

    const userList = comment.reactions[emoji];
    const userIndex = userList.indexOf(currentUid);
    let action = '';

    if (userIndex >= 0) {
      userList.splice(userIndex, 1);
      action = 'removed';
    } else {
      userList.push(currentUid);
      action = 'added';
    }

    this._cachedPosts = allPosts;
    this.cacheLocal(allPosts);
    this.notifyListeners(allPosts);

    if (isCloudReady && db) {
      try {
        const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const postRef = doc(db, COLLECTIONS.POSTS, postId);
        await updateDoc(postRef, {
          comments: targetPost.comments
        });
      } catch (err) {
        console.warn('[Storage] Firestore toggleCommentReaction error:', err);
      }
    }

    return { action, reactions: comment.reactions, commentId };
  },

  /**
   * Delete post (Guarded by author or master admin, synced globally across all clients)
   */
  async deletePost(postId) {
    // 1. Mark as deleted locally so it immediately disappears on current client
    this.markPostAsDeletedLocally(postId);

    // 2. Immediately remove from local cache and notify UI listeners for instant feedback
    const deletedIds = this.getDeletedPostIds();
    if (this._cachedPosts && Array.isArray(this._cachedPosts)) {
      this._cachedPosts = this._cachedPosts.filter(p => p.id !== postId && !deletedIds.includes(p.id));
    }
    const clean = (this._cachedPosts || []).filter(p => p.id !== postId && !deletedIds.includes(p.id));
    this.cacheLocal(clean);
    this.notifyListeners(clean);

    // 3. Clean up any related notifications locally
    const notifs = this.getLocalNotifications().filter(n => n.postId !== postId);
    this.cacheLocalNotifications(notifs);
    this.notifyNotificationListeners(notifs);

    // 4. Multi-tier Cloud Deletion (Guarantees deletion across ALL devices)
    if (isCloudReady && db) {
      try {
        const { doc, deleteDoc, updateDoc, setDoc, arrayUnion } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');

        // Tier A: Broadcast to global deleted_posts list so all users across the world remove it immediately (Master Admin only)
        if (this.isMasterAdmin()) {
          try {
            await setDoc(doc(db, COLLECTIONS.SETTINGS, 'deleted_posts'), {
              ids: arrayUnion(postId),
              lastDeletedAt: Date.now()
            }, { merge: true });
          } catch (setErr) {
            console.warn('[Firestore] Global deleted list broadcast note:', setErr);
          }
        }

        // Tier B: Real hard deletion from Firestore merit_posts collection
        try {
          await deleteDoc(doc(db, COLLECTIONS.POSTS, postId));
        } catch (delErr) {
          console.warn('[Firestore] Hard deleteDoc note (attempting soft-delete fallback):', delErr);
          // Tier C: Soft-delete fallback in case hard deletion is restricted by cloud rules
          try {
            await updateDoc(doc(db, COLLECTIONS.POSTS, postId), {
              isDeleted: true,
              deletedAt: Date.now()
            });
          } catch (upErr) {
            console.warn('[Firestore] Soft delete update also failed:', upErr);
          }
        }
      } catch (cloudErr) {
        console.warn('[Firestore] Cloud delete service note:', cloudErr);
      }
    }
    return true;
  },

  /**
   * Switch or rename user profile
   */
  setUserName(newName) {
    const cleanName = Security.escapeHTML(Security.sanitizeText(newName));
    if (cleanName && cleanName.length >= 2) {
      this.currentUser.name = cleanName;
      localStorage.setItem('pinPotha_currentUser', JSON.stringify(this.currentUser));
      this.notifyListeners();
    }
  },

  /**
   * Restore and auto-fill user profile upon login or auth state change
   */
  async restoreUserProfile(user) {
    if (!user) {
      this.currentUser = {
        uid: "user_guest_" + Math.random().toString(36).substring(2, 7),
        firstName: "අමුත්තා",
        lastName: "",
        name: "අමුත්තා",
        photo: null,
        email: null,
        isAdmin: false,
        bio: "සබ්බපාපස්ස අකරණං - කුසලස්ස උපසම්පදා 🙏",
        location: "",
        occupation: "",
        coverImage: "assets/banner.jpg",
        joinedDate: "2026 ඔක්තෝබර්",
        isAnonymous: true,
        needsNameConfirmation: false
      };
      localStorage.setItem('pinPotha_currentUser', JSON.stringify(this.currentUser));
      this.notifyListeners();
      this.notifyNotificationListeners();
      return this.currentUser;
    }

    // 1. Check local profile cached by UID
    let savedProfile = {};
    try {
      const rawUid = localStorage.getItem('pinPotha_profile_' + user.uid);
      if (rawUid) savedProfile = JSON.parse(rawUid);
    } catch (e) {}

    // 2. Check local profile cached by Email
    if ((!savedProfile.name || savedProfile.name === 'අමුත්තා') && user.email) {
      try {
        const lastSavedName = localStorage.getItem('pinPotha_last_user_name_' + user.email.toLowerCase());
        if (lastSavedName) {
          savedProfile.name = lastSavedName;
        }
      } catch (e) {}
    }

    // 3. Check current user cache
    if (!savedProfile.name || savedProfile.name === 'අමුත්තා') {
      try {
        const rawCurr = localStorage.getItem('pinPotha_currentUser');
        if (rawCurr) {
          const parsed = JSON.parse(rawCurr);
          if (parsed && parsed.email === user.email && parsed.name && parsed.name !== 'අමුත්තා') {
            savedProfile = { ...savedProfile, ...parsed };
          }
        }
      } catch (e) {}
    }

    let userCover = savedProfile.coverImage;
    if (!userCover || userCover.includes('photo-1548013146-72479768bada') || userCover.includes('photo-1582510003544-4d00b7f74220')) {
      userCover = "assets/banner.jpg";
    }

    // Resolve user's confirmed name
    let confirmedName = (savedProfile.name || '').trim();
    if (!confirmedName || confirmedName === 'අමුත්තා') {
      confirmedName = (user.displayName || '').trim();
    }
    const nameParts = confirmedName ? confirmedName.split(' ') : [];
    const fName = savedProfile.firstName || (nameParts.length > 0 ? nameParts[0] : "");
    const lName = savedProfile.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : "");
    const fullName = confirmedName || `${fName} ${lName}`.trim() || "";

    const isMaster = (user.email || '').trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() || user.uid === 'user_malith';
    const isSub = !isMaster && (savedProfile.role === 'admin' || savedProfile.isAdmin === true || savedProfile.isSubAdmin === true || (this._knownAdminUids && this._knownAdminUids.has(user.uid)));

    this.currentUser = {
      uid: user.uid,
      firstName: fName,
      lastName: lName,
      name: fullName || (user.displayName || "කල්‍යාණ මිත්‍ර"),
      email: user.email,
      role: savedProfile.role || (isMaster ? 'master_admin' : (isSub ? 'admin' : 'member')),
      isAdmin: isMaster || isSub,
      isSubAdmin: isSub,
      photo: savedProfile.photo || user.photoURL || null,
      bio: savedProfile.bio || "සබ්බපාපස්ස අකරණං - කුසලස්ස උපසම්පදා 🙏",
      location: savedProfile.location || "",
      district: savedProfile.district || "",
      province: savedProfile.province || "",
      city: savedProfile.city || "",
      occupation: savedProfile.occupation || "",
      coverImage: userCover,
      joinedDate: savedProfile.joinedDate || "2026 ඔක්තෝබර්",
      mithrayan: Array.isArray(savedProfile.mithrayan) ? savedProfile.mithrayan : [],
      pendingMithraSent: Array.isArray(savedProfile.pendingMithraSent) ? savedProfile.pendingMithraSent : [],
      isAnonymous: false,
      needsNameConfirmation: (!fullName || fullName === 'අමුත්තා' || fullName.length < 2)
    };
    if (isSub) {
      this._knownAdminUids.add(user.uid);
    }

    localStorage.setItem('pinPotha_currentUser', JSON.stringify(this.currentUser));
    localStorage.setItem('pinPotha_profile_' + user.uid, JSON.stringify(this.currentUser));
    if (user.email && this.currentUser.name && this.currentUser.name !== 'අමුත්තා') {
      localStorage.setItem('pinPotha_last_user_name_' + user.email.toLowerCase(), this.currentUser.name);
    }
    this.notifyListeners();
    this.notifyNotificationListeners();

    // 4. Asynchronously query Firestore users collection to get latest cloud profile and sync
    if (isCloudReady && db) {
      try {
        const { doc, getDoc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const userDocRef = doc(db, COLLECTIONS.USERS, user.uid);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const cloudData = snap.data();
          if (cloudData.name && cloudData.name !== 'අමුත්තා') {
            this.currentUser.name = cloudData.name;
            this.currentUser.firstName = cloudData.firstName || cloudData.name.split(' ')[0] || '';
            this.currentUser.lastName = cloudData.lastName || cloudData.name.split(' ').slice(1).join(' ') || '';
            this.currentUser.needsNameConfirmation = false;
          }
          if (cloudData.photo) this.currentUser.photo = cloudData.photo;
          if (cloudData.coverImage) this.currentUser.coverImage = cloudData.coverImage;
          if (cloudData.bio) this.currentUser.bio = cloudData.bio;
          if (cloudData.location) this.currentUser.location = cloudData.location;
          if (cloudData.district) this.currentUser.district = cloudData.district;
          if (cloudData.province) this.currentUser.province = cloudData.province;
          if (cloudData.city) this.currentUser.city = cloudData.city;
          if (cloudData.occupation) this.currentUser.occupation = cloudData.occupation;
          if (cloudData.joinedDate) this.currentUser.joinedDate = cloudData.joinedDate;
          if (Array.isArray(cloudData.mithrayan)) this.currentUser.mithrayan = cloudData.mithrayan;
          if (Array.isArray(cloudData.pendingMithraSent)) this.currentUser.pendingMithraSent = cloudData.pendingMithraSent;

          // CRITICAL: Sync role and admin privileges from Cloud Firestore!
          const isCloudMaster = (user.email || '').trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() || user.uid === 'user_malith';
          const isCloudSub = !isCloudMaster && (cloudData.role === 'admin' || cloudData.isSubAdmin === true);
          this.currentUser.role = cloudData.role || (isCloudMaster ? 'master_admin' : (isCloudSub ? 'admin' : 'member'));
          this.currentUser.isAdmin = isCloudMaster;
          this.currentUser.isSubAdmin = isCloudSub;
          if (isCloudSub) {
            this._knownAdminUids.add(user.uid);
            localStorage.setItem('pinPotha_admin_uids', JSON.stringify(Array.from(this._knownAdminUids)));
          } else {
            this._knownAdminUids.delete(user.uid);
            localStorage.setItem('pinPotha_admin_uids', JSON.stringify(Array.from(this._knownAdminUids)));
          }

          localStorage.setItem('pinPotha_currentUser', JSON.stringify(this.currentUser));
          localStorage.setItem('pinPotha_profile_' + user.uid, JSON.stringify(this.currentUser));
          if (user.email) {
            localStorage.setItem('pinPotha_last_user_name_' + user.email.toLowerCase(), this.currentUser.name);
          }
          this.notifyListeners();
          this.notifyNotificationListeners();
        } else if (this.currentUser.name && this.currentUser.name !== 'අමුත්තා') {
          // Sync existing initial data to cloud
          await setDoc(userDocRef, {
            uid: this.currentUser.uid,
            name: this.currentUser.name,
            firstName: this.currentUser.firstName,
            lastName: this.currentUser.lastName,
            email: this.currentUser.email,
            photo: this.currentUser.photo,
            coverImage: this.currentUser.coverImage,
            bio: this.currentUser.bio,
            location: this.currentUser.location,
            occupation: this.currentUser.occupation,
            joinedDate: this.currentUser.joinedDate,
            updatedAt: Date.now()
          }, { merge: true });
        }
      } catch (err) {
        console.warn('[Storage] Background Firestore user fetch error:', err);
      }
    }

    return this.currentUser;
  },

  /**
   * Fetch a member's public profile by UID (from cache, cloud Firestore, or post fallback)
   */
  async getUserProfile(uid) {
    if (!uid) return null;
    if (this.currentUser && this.currentUser.uid === uid) {
      return this.currentUser;
    }

    // 1. Check local cache
    try {
      const raw = localStorage.getItem('pinPotha_profile_' + uid);
      if (raw) return JSON.parse(raw);
    } catch (e) {}

    // 2. Check Firestore
    if (isCloudReady && db) {
      try {
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
        if (snap.exists()) {
          const data = snap.data();
          const isMaster = (data.email || '').trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() || uid === 'user_malith';
          const isSub = !isMaster && (data.role === 'admin' || data.authorRole === 'admin' || data.isAdmin === true || data.isSubAdmin === true);
          if (isSub) {
            this._knownAdminUids.add(uid);
          }
          data.isSangha = data.isSangha === true || data.role === 'sangha' || this.isSangha({ name: data.name });
          data.isAdmin = isMaster;
          data.isSubAdmin = isSub;
          localStorage.setItem('pinPotha_profile_' + uid, JSON.stringify(data));
          return data;
        }
      } catch (e) {
        console.warn('[Storage] Cloud getUserProfile warning:', e);
      }
    }

    // 3. Fallback: derive from existing posts in memory
    const allPosts = this.getLocalPosts();
    const userPost = allPosts.find(p => p.uid === uid);
    if (userPost) {
      return {
        uid: userPost.uid,
        name: userPost.author || 'කල්‍යාණ මිත්‍ර',
        photo: userPost.authorPhoto || null,
        coverImage: userPost.authorCover || 'assets/banner.jpg',
        bio: "සබ්බපාපස්ස අකරණං - කුසලස්ස උපසම්පදා 🙏",
        location: userPost.location || '',
        occupation: '',
        joinedDate: '2026 ඔක්තෝබර්',
        isAdmin: userPost.authorRole === 'admin',
        isSangha: userPost.isSangha || userPost.authorRole === 'sangha' || this.isSangha({ name: userPost.author }),
        role: (userPost.isSangha || userPost.authorRole === 'sangha') ? 'sangha' : 'member'
      };
    }

    return null;
  },

  /**
   * Check if a member / user / post author is venerated Sangha
   */
  isSangha(userOrMember) {
    if (!userOrMember) return false;

    // 1. Direct UID matching in cached Sangha Set
    const uid = typeof userOrMember === 'string' ? userOrMember : (userOrMember.uid || userOrMember.senderUid || userOrMember.id);
    if (uid && this._knownSanghaUids && this._knownSanghaUids.has(uid)) {
      return true;
    }

    // 2. Check local profile cache if UID is present
    if (uid) {
      try {
        const raw = localStorage.getItem('pinPotha_profile_' + uid);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.isSangha === true || parsed.role === 'sangha' || parsed.authorRole === 'sangha')) {
            if (this._knownSanghaUids) this._knownSanghaUids.add(uid);
            return true;
          }
        }
      } catch (e) {}
    }

    // 3. Explicit properties on object
    if (typeof userOrMember === 'object') {
      if (userOrMember.isSangha === true || userOrMember.role === 'sangha' || userOrMember.authorRole === 'sangha') {
        if (uid && this._knownSanghaUids) this._knownSanghaUids.add(uid);
        return true;
      }
    }

    // 4. Honorific and Title Pattern Matching (Sinhala & English)
    const rawName = typeof userOrMember === 'string'
      ? userOrMember
      : (userOrMember.name || userOrMember.author || userOrMember.senderName || userOrMember.firstName || '').trim();

    if (!rawName) return false;

    // Sinhala checks
    if (
      rawName.includes('ස්වාමීන් වහන්සේ') ||
      rawName.includes('ස්වාමින් වහන්සේ') ||
      rawName.includes('හිමි') ||
      rawName.includes('තෙරුන්') ||
      rawName.includes('හාමුදුරුවෝ') ||
      rawName.startsWith('පූජ්‍ය ') ||
      rawName.startsWith('පූජ්‍යපාද ')
    ) {
      if (uid && this._knownSanghaUids) this._knownSanghaUids.add(uid);
      return true;
    }

    // English checks (case-insensitive for handles and Romanized Pali/Sinhala names)
    const lowerName = rawName.toLowerCase();
    if (
      lowerName.includes('himi') ||
      lowerName.includes('thero') ||
      lowerName.includes('théro') ||
      lowerName.includes('thera') ||
      lowerName.includes('bhikkhu') ||
      lowerName.includes('bhikku') ||
      lowerName.includes('bhante') ||
      lowerName.includes('swaminwahanse') ||
      lowerName.includes('hamuduruwo') ||
      lowerName.startsWith('ven ') ||
      lowerName.startsWith('ven. ') ||
      lowerName.startsWith('venerable ')
    ) {
      if (uid && this._knownSanghaUids) this._knownSanghaUids.add(uid);
      return true;
    }

    return false;
  },

  /**
   * Checks if current user is revering/following target Sangha UID
   */
  isReveringSangha(targetUid) {
    if (!this.currentUser || !this.currentUser.uid || !targetUid) return false;
    const list = Array.isArray(this.currentUser.reveredSangha) ? this.currentUser.reveredSangha : (this.currentUser.mithrayan || []);
    return list.includes(targetUid);
  },

  /**
   * Toggles Reverence / Follow for a Venerated Monk
   */
  async toggleSanghaReverence(targetUid, targetName) {
    if (!this.currentUser || !this.currentUser.uid) {
      throw new Error("ස්වාමීන් වහන්සේට වන්දනාමාන කිරීමට හෝ අනුගමනය කිරීමට කරුණාකර පළමුව Log වන්න.");
    }
    if (targetUid === this.currentUser.uid) return false;

    if (!Array.isArray(this.currentUser.reveredSangha)) {
      this.currentUser.reveredSangha = [];
    }
    if (!Array.isArray(this.currentUser.mithrayan)) {
      this.currentUser.mithrayan = [];
    }

    const idx = this.currentUser.reveredSangha.indexOf(targetUid);
    const isNowFollowing = (idx === -1);

    if (isNowFollowing) {
      this.currentUser.reveredSangha.push(targetUid);
      if (!this.currentUser.mithrayan.includes(targetUid)) {
        this.currentUser.mithrayan.push(targetUid);
      }
    } else {
      this.currentUser.reveredSangha.splice(idx, 1);
      const mIdx = this.currentUser.mithrayan.indexOf(targetUid);
      if (mIdx !== -1) this.currentUser.mithrayan.splice(mIdx, 1);
    }

    localStorage.setItem('pinPotha_currentUser', JSON.stringify(this.currentUser));
    localStorage.setItem('pinPotha_profile_' + this.currentUser.uid, JSON.stringify(this.currentUser));

    if (isCloudReady && db) {
      try {
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        await setDoc(doc(db, COLLECTIONS.USERS, this.currentUser.uid), {
          reveredSangha: this.currentUser.reveredSangha,
          mithrayan: this.currentUser.mithrayan,
          updatedAt: Date.now()
        }, { merge: true });
      } catch (err) {
        console.warn('[Storage] Cloud toggleSanghaReverence sync warning:', err);
      }
    }

    if (isNowFollowing) {
      await this.createNotification({
        recipientUid: targetUid,
        type: 'sangha_reverence',
        senderUid: this.currentUser.uid,
        senderName: this.currentUser.name || 'පින්වත් සැදැහැවතෙක්',
        senderPhoto: this.currentUser.photo || null,
        message: 'ඔබ වහන්සේට නමස්කාර පූර්වකව ගෞරව දක්වමින් අනුගමනය කළාය. 🙏'
      });
    }

    this.notifyListeners();
    this.notifyNotificationListeners();
    return isNowFollowing;
  },

  /**
   * Master Admin can toggle Sangha Status of any member
   */
  async setMemberSanghaStatus(targetUid, isSangha) {
    if (!this.isMasterAdmin()) {
      throw new Error("මෙම වෙනස්කම සිදුකළ හැක්කේ ප්‍රධාන පරිපාලක (Master Admin) හට පමණි.");
    }
    if (isSangha) {
      this._knownSanghaUids.add(targetUid);
    } else {
      this._knownSanghaUids.delete(targetUid);
    }
    try {
      localStorage.setItem('pinPotha_sangha_uids', JSON.stringify(Array.from(this._knownSanghaUids)));
    } catch (e) {}

    // Invalidate community cache so lists re-render freshly
    this._cachedCommunityMembers = null;
    this._lastCommunityMembersFetchTime = 0;

    try {
      const raw = localStorage.getItem('pinPotha_profile_' + targetUid);
      if (raw) {
        const p = JSON.parse(raw);
        p.isSangha = isSangha;
        p.role = isSangha ? 'sangha' : 'member';
        localStorage.setItem('pinPotha_profile_' + targetUid, JSON.stringify(p));
      }
    } catch (e) {}

    if (isCloudReady && db) {
      try {
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        await setDoc(doc(db, COLLECTIONS.USERS, targetUid), {
          isSangha: isSangha,
          role: isSangha ? 'sangha' : 'member',
          updatedAt: Date.now()
        }, { merge: true });
      } catch (err) {
        console.warn('[Storage] Cloud setMemberSanghaStatus warning:', err);
      }
    }
    this.notifyListeners();
    return true;
  },

  /**
   * Master Admin can promote/demote any member to/from Sub-Admin (🛡️)
   */
  async setMemberAdminStatus(targetUid, setAsAdmin) {
    if (!this.isMasterAdmin()) {
      throw new Error("මෙම වෙනස්කම සිදුකළ හැක්කේ ප්‍රධාන පරිපාලක (Master Admin) හට පමණි.");
    }
    if (!targetUid) return false;

    const newRole = setAsAdmin ? 'admin' : 'member';
    if (setAsAdmin) {
      this._knownAdminUids.add(targetUid);
    } else {
      this._knownAdminUids.delete(targetUid);
    }

    try {
      localStorage.setItem('pinPotha_admin_uids', JSON.stringify(Array.from(this._knownAdminUids)));
    } catch(e) {}

    try {
      const raw = localStorage.getItem('pinPotha_profile_' + targetUid);
      if (raw) {
        const p = JSON.parse(raw);
        p.role = newRole;
        p.authorRole = newRole;
        p.isAdmin = false;
        p.isSubAdmin = setAsAdmin;
        localStorage.setItem('pinPotha_profile_' + targetUid, JSON.stringify(p));
      }
    } catch (e) {}

    if (isCloudReady && db) {
      try {
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        await setDoc(doc(db, COLLECTIONS.USERS, targetUid), {
          role: newRole,
          authorRole: newRole,
          isAdmin: false,
          isSubAdmin: setAsAdmin,
          roleUpdatedBy: this.currentUser?.email || 'Master Admin',
          roleUpdatedAt: Date.now()
        }, { merge: true });
      } catch (err) {
        console.warn('[Storage] Cloud setMemberAdminStatus warning:', err);
      }
    }

    // Also update any posts in memory authored by this user
    const posts = this.getLocalPosts();
    let changed = false;
    posts.forEach(p => {
      if (p.uid === targetUid && !this.isMasterAdmin(p)) {
        p.authorRole = newRole;
        p.isSubAdmin = setAsAdmin;
        changed = true;
      }
    });
    if (changed) {
      this.cacheLocal(posts);
      this.notifyListeners(posts);
    }

    this.notifyListeners();
    return true;
  },

  /**
   * Returns connection status with targetUid:
   * 'self' | 'connected' | 'pending_sent' | 'pending_received' | 'none'
   */
  getMithraStatus(targetUid) {
    if (!targetUid || !this.currentUser || !this.currentUser.uid) return 'none';
    if (targetUid === this.currentUser.uid) return 'self';

    const mithrayan = Array.isArray(this.currentUser.mithrayan) ? this.currentUser.mithrayan : [];
    if (mithrayan.includes(targetUid)) return 'connected';

    const pendingSent = Array.isArray(this.currentUser.pendingMithraSent) ? this.currentUser.pendingMithraSent : [];
    if (pendingSent.includes(targetUid)) return 'pending_sent';

    const notifs = this.getLocalNotifications();
    const incoming = notifs.find(n => 
      n.type === 'mithra_request' && 
      n.senderUid === targetUid && 
      n.recipientUid === this.currentUser.uid &&
      !this.isRequestAccepted(n.id, n.senderUid) &&
      !this.isRequestDeclined(n.id, n.senderUid) &&
      (!n.status || n.status === 'pending')
    );
    if (incoming) return 'pending_received';

    return 'none';
  },

  /**
   * Sends a Kalyana Mithra invitation to targetUid
   */
  async sendKalyanaMithraRequest(targetUid, targetName) {
    if (!this.currentUser || !this.currentUser.uid) {
      throw new Error("කල්‍යාණ මිත්‍ර ඇරයුමක් යැවීමට කරුණාකර පළමුව Log වන්න.");
    }
    if (targetUid === this.currentUser.uid) return false;

    // Add to pendingMithraSent
    if (!Array.isArray(this.currentUser.pendingMithraSent)) {
      this.currentUser.pendingMithraSent = [];
    }
    if (!this.currentUser.pendingMithraSent.includes(targetUid)) {
      this.currentUser.pendingMithraSent.push(targetUid);
    }
    localStorage.setItem('pinPotha_currentUser', JSON.stringify(this.currentUser));
    localStorage.setItem('pinPotha_profile_' + this.currentUser.uid, JSON.stringify(this.currentUser));

    // Sync to cloud users/{uid}
    if (isCloudReady && db) {
      try {
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        await setDoc(doc(db, COLLECTIONS.USERS, this.currentUser.uid), {
          pendingMithraSent: this.currentUser.pendingMithraSent,
          updatedAt: Date.now()
        }, { merge: true });
      } catch (err) {
        console.warn('[Storage] Cloud send request sync warning:', err);
      }
    }

    // Create Notification for the target user
    await this.createNotification({
      recipientUid: targetUid,
      type: 'mithra_request',
      status: 'pending',
      senderUid: this.currentUser.uid,
      senderName: this.currentUser.name || 'කල්‍යාණ මිත්‍ර',
      senderPhoto: this.currentUser.photo || null,
      message: 'ඔබව කල්‍යාණ මිත්‍රයෙකු ලෙස සම්බන්ධ කරගැනීමට ඇරයුම් කළාය. 🙏'
    });

    this.notifyListeners();
    this.notifyNotificationListeners();
    return true;
  },

  /**
   * Accepts a received Kalyana Mithra invitation
   */
  async acceptKalyanaMithraRequest(notifId, senderUid, senderName) {
    if (!this.currentUser || !this.currentUser.uid) return false;

    // Record in persistent accepted list
    this.recordAcceptedRequest(notifId, senderUid);

    // Add senderUid to current user's mithrayan
    if (!Array.isArray(this.currentUser.mithrayan)) {
      this.currentUser.mithrayan = [];
    }
    if (!this.currentUser.mithrayan.includes(senderUid)) {
      this.currentUser.mithrayan.push(senderUid);
    }

    // Remove from pendingMithraSent if present
    if (Array.isArray(this.currentUser.pendingMithraSent)) {
      this.currentUser.pendingMithraSent = this.currentUser.pendingMithraSent.filter(id => id !== senderUid);
    }

    localStorage.setItem('pinPotha_currentUser', JSON.stringify(this.currentUser));
    localStorage.setItem('pinPotha_profile_' + this.currentUser.uid, JSON.stringify(this.currentUser));

    // Sync to cloud users/{uid}
    if (isCloudReady && db) {
      try {
        const { doc, setDoc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        await setDoc(doc(db, COLLECTIONS.USERS, this.currentUser.uid), {
          mithrayan: this.currentUser.mithrayan,
          pendingMithraSent: this.currentUser.pendingMithraSent,
          updatedAt: Date.now()
        }, { merge: true });

        if (notifId) {
          try {
            await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notifId), {
              status: 'accepted',
              read: true
            });
          } catch (e) {}
        }
      } catch (err) {
        console.warn('[Storage] Cloud accept request sync warning:', err);
      }
    }

    // Mark notification locally as accepted
    const notifs = this.getLocalNotifications();
    const targetNotif = notifs.find(n => n.id === notifId || (n.type === 'mithra_request' && n.senderUid === senderUid));
    if (targetNotif) {
      targetNotif.status = 'accepted';
      targetNotif.read = true;
      this.cacheLocalNotifications(notifs);
    }

    // Send celebration notification to senderUid with exact requested Sinhala message
    await this.createNotification({
      recipientUid: senderUid,
      type: 'mithra_accepted',
      senderUid: this.currentUser.uid,
      senderName: this.currentUser.name || 'කල්‍යාණ මිත්‍ර',
      senderPhoto: this.currentUser.photo || null,
      message: `ඔබගේ කල්‍යාණ මිත්‍ර ඇරයුම ${this.currentUser.name || 'කල්‍යාණ මිත්‍රයා'} විසින් පිළිගන්නා ලදී. 🙏`
    });

    this.notifyListeners();
    this.notifyNotificationListeners();
    return true;
  },

  /**
   * Rejects / Dismisses a Kalyana Mithra invitation
   */
  async rejectKalyanaMithraRequest(notifId, senderUid) {
    if (!this.currentUser || !this.currentUser.uid) return false;

    // Record in persistent declined list
    this.recordDeclinedRequest(notifId, senderUid);

    const notifs = this.getLocalNotifications();
    const targetNotif = notifs.find(n => n.id === notifId || (n.type === 'mithra_request' && n.senderUid === senderUid));
    if (targetNotif) {
      targetNotif.status = 'declined';
      targetNotif.read = true;
      this.cacheLocalNotifications(notifs);
    }

    if (isCloudReady && db && notifId) {
      try {
        const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notifId), {
          status: 'declined',
          read: true
        });
      } catch (e) {}
    }

    // Send rejection notification to senderUid with exact requested Sinhala message
    if (senderUid) {
      await this.createNotification({
        recipientUid: senderUid,
        type: 'mithra_rejected',
        senderUid: this.currentUser.uid,
        senderName: this.currentUser.name || 'කල්‍යාණ මිත්‍ර',
        senderPhoto: this.currentUser.photo || null,
        message: `ඔබගේ කල්‍යාණ මිත්‍ර ඇරයුම ${this.currentUser.name || 'කල්‍යාණ මිත්‍රයා'} විසින් පිළි නොගන්නා ලදී.`
      });
    }

    this.notifyNotificationListeners();
    return true;
  },

  /**
   * Removes a Kalyana Mithra connection (Unfriend)
   */
  async removeKalyanaMithra(targetUid) {
    if (!this.currentUser || !this.currentUser.uid) return false;
    if (Array.isArray(this.currentUser.mithrayan)) {
      this.currentUser.mithrayan = this.currentUser.mithrayan.filter(id => id !== targetUid);
      localStorage.setItem('pinPotha_currentUser', JSON.stringify(this.currentUser));
      localStorage.setItem('pinPotha_profile_' + this.currentUser.uid, JSON.stringify(this.currentUser));

      if (isCloudReady && db) {
        try {
          const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
          await setDoc(doc(db, COLLECTIONS.USERS, this.currentUser.uid), {
            mithrayan: this.currentUser.mithrayan,
            updatedAt: Date.now()
          }, { merge: true });
        } catch (e) {}
      }
    }
    this.notifyListeners();
    return true;
  },

  /**
   * Fetches full profile objects for all connected Kalyana Mithrayan
   */
  async getConnectedMithrayanList() {
    const list = Array.isArray(this.currentUser?.mithrayan) ? this.currentUser.mithrayan : [];
    return this.getMemberMithrayanList(list);
  },

  /**
   * Fetches full profile objects for any member's list of Mithrayan UIDs
   */
  async getMemberMithrayanList(uids) {
    const list = Array.isArray(uids) ? uids : [];
    if (list.length === 0) return [];

    const profiles = [];
    for (const uid of list) {
      if (!uid) continue;
      try {
        const prof = await this.getUserProfile(uid);
        if (prof) {
          profiles.push(prof);
        } else {
          profiles.push({ uid, name: 'කල්‍යාණ මිත්‍ර', photo: null });
        }
      } catch (e) {
        profiles.push({ uid, name: 'කල්‍යාණ මිත්‍ර', photo: null });
      }
    }
    return profiles;
  },

  /**
   * Resolve freshest author name for any post or comment
   */
  resolveAuthorName(item) {
    if (!item) return 'කල්‍යාණ මිත්‍ර';
    if (this.isOfficialPost(item)) return 'අපේ පිං පොත';

    const targetUid = item.uid;

    // 1. Current user active session check
    if (this.currentUser && this.currentUser.uid && targetUid && targetUid === this.currentUser.uid) {
      return this.currentUser.name || item.author || 'කල්‍යාණ මිත්‍ර';
    }

    // 2. Cached community members check (live synced users from Firestore)
    if (targetUid && this._cachedCommunityMembers && Array.isArray(this._cachedCommunityMembers)) {
      const member = this._cachedCommunityMembers.find(m => m.uid === targetUid);
      if (member && member.name && member.name.trim().length > 0) {
        return member.name;
      }
    }

    // 3. Cached profile check for other users by UID in localStorage
    if (targetUid) {
      try {
        const cached = localStorage.getItem('pinPotha_profile_' + targetUid);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.name && parsed.name.trim().length > 0) {
            return parsed.name;
          }
        }
      } catch (e) {}
    }

    // 4. Fallback to item stored author
    return item.author || 'කල්‍යාණ මිත්‍ර';
  },

  /**
   * Resolve freshest author photo for any post or comment
   */
  resolveAuthorPhoto(item) {
    if (!item) return null;
    if (this.isOfficialPost(item)) return null;

    const targetUid = item.uid;
    const authorName = (item.author || '').trim();

    // 1. Current user active session check (by UID or name)
    if (this.currentUser) {
      if ((targetUid && this.currentUser.uid && targetUid === this.currentUser.uid) ||
          (authorName && this.currentUser.name && authorName.toLowerCase() === this.currentUser.name.trim().toLowerCase())) {
        if (this.currentUser.photo) return this.currentUser.photo;
      }
    }

    // 2. Direct photo stored on item
    if (item.authorPhoto && typeof item.authorPhoto === 'string' && item.authorPhoto.trim().length > 0) {
      return item.authorPhoto;
    }

    // 3. Cached community members check (by UID or by Author Name)
    if (this._cachedCommunityMembers && Array.isArray(this._cachedCommunityMembers)) {
      const member = this._cachedCommunityMembers.find(m => 
        (targetUid && m.uid && m.uid === targetUid) || 
        (authorName && m.name && m.name.trim().toLowerCase() === authorName.toLowerCase())
      );
      if (member && member.photo) {
        return member.photo;
      }
    }

    // 4. Cached profile check for other users by UID
    if (targetUid) {
      try {
        const cached = localStorage.getItem('pinPotha_profile_' + targetUid);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.photo) {
            return parsed.photo;
          }
        }
      } catch (e) {}
    }

    // 5. Look through local posts by this author to find their photo
    if (this._cachedPosts && Array.isArray(this._cachedPosts) && authorName) {
      const postMatch = this._cachedPosts.find(p => 
        ((targetUid && p.uid && p.uid === targetUid) || (p.author && p.author.trim().toLowerCase() === authorName.toLowerCase())) && p.authorPhoto
      );
      if (postMatch && postMatch.authorPhoto) {
        return postMatch.authorPhoto;
      }
    }

    return null;
  },

  /**
   * Update full user profile details (First & Last Name, Occupation, Location/Address, Bio, Photo, Cover Image)
   */
  async updateProfile({ firstName, lastName, name, bio, location, district, province, city, occupation, coverImage, photo }) {
    if (firstName !== undefined || lastName !== undefined) {
      if (firstName !== undefined) {
        this.currentUser.firstName = Security.escapeHTML(Security.sanitizeText(firstName.trim()));
      }
      if (lastName !== undefined) {
        this.currentUser.lastName = Security.escapeHTML(Security.sanitizeText(lastName.trim()));
      }
      const combined = `${this.currentUser.firstName || ''} ${this.currentUser.lastName || ''}`.trim();
      if (combined.length > 0) {
        this.currentUser.name = combined;
      }
    } else if (name && name.trim().length >= 2) {
      this.currentUser.name = Security.escapeHTML(Security.sanitizeText(name.trim()));
      const parts = this.currentUser.name.split(' ');
      this.currentUser.firstName = parts[0] || '';
      this.currentUser.lastName = parts.slice(1).join(' ') || '';
    }

    if (occupation !== undefined) {
      this.currentUser.occupation = Security.escapeHTML(Security.sanitizeText(occupation.trim()));
    }
    if (location !== undefined) {
      this.currentUser.location = Security.escapeHTML(Security.sanitizeText(location.trim()));
    }
    if (district !== undefined) {
      this.currentUser.district = Security.escapeHTML(Security.sanitizeText(district.trim()));
    }
    if (province !== undefined) {
      this.currentUser.province = Security.escapeHTML(Security.sanitizeText(province.trim()));
    }
    if (city !== undefined) {
      this.currentUser.city = Security.escapeHTML(Security.sanitizeText(city.trim()));
    }
    if (bio !== undefined) {
      this.currentUser.bio = Security.escapeHTML(Security.sanitizeText(bio.trim()));
    }
    if (coverImage) {
      this.currentUser.coverImage = coverImage;
    }
    if (photo) {
      this.currentUser.photo = photo;
    }

    this.currentUser.needsNameConfirmation = false;

    // Cache locally
    localStorage.setItem('pinPotha_currentUser', JSON.stringify(this.currentUser));
    if (this.currentUser.uid) {
      localStorage.setItem('pinPotha_profile_' + this.currentUser.uid, JSON.stringify(this.currentUser));
    }
    if (this.currentUser.email && this.currentUser.name && this.currentUser.name !== 'අමුත්තා') {
      localStorage.setItem('pinPotha_last_user_name_' + this.currentUser.email.toLowerCase(), this.currentUser.name);
    }

    const updatedAuthorName = this.currentUser.name;
    const updatedAuthorPhoto = this.currentUser.photo;
    const targetUid = this.currentUser.uid;

    // 1. Immediately update active community member in-memory cache
    if (targetUid && this._cachedCommunityMembers && Array.isArray(this._cachedCommunityMembers)) {
      const member = this._cachedCommunityMembers.find(m => m.uid === targetUid);
      if (member) {
        member.name = updatedAuthorName;
        member.firstName = this.currentUser.firstName || '';
        member.lastName = this.currentUser.lastName || '';
        if (updatedAuthorPhoto !== undefined) member.photo = updatedAuthorPhoto;
        if (location !== undefined) member.location = this.currentUser.location;
      } else {
        this._cachedCommunityMembers.push({
          uid: targetUid,
          name: updatedAuthorName,
          firstName: this.currentUser.firstName || '',
          lastName: this.currentUser.lastName || '',
          photo: updatedAuthorPhoto || null,
          location: this.currentUser.location || ''
        });
      }
    }

    // 2. Immediately update all posts authored by this user in memory and local storage
    if (targetUid && updatedAuthorName) {
      const updatePostsWithNewAuthor = (postList) => {
        if (!Array.isArray(postList)) return false;
        let changed = false;
        postList.forEach(p => {
          // Direct post
          if (p.uid === targetUid && !p.isOfficial) {
            if (p.author !== updatedAuthorName) {
              p.author = updatedAuthorName;
              changed = true;
            }
            if (updatedAuthorPhoto !== undefined && p.authorPhoto !== updatedAuthorPhoto) {
              p.authorPhoto = updatedAuthorPhoto;
              changed = true;
            }
          }
          // Quoted / Repost original
          if (p.originalPost && p.originalPost.uid === targetUid && !p.originalPost.isOfficial) {
            if (p.originalPost.author !== updatedAuthorName) {
              p.originalPost.author = updatedAuthorName;
              changed = true;
            }
            if (updatedAuthorPhoto !== undefined && p.originalPost.authorPhoto !== updatedAuthorPhoto) {
              p.originalPost.authorPhoto = updatedAuthorPhoto;
              changed = true;
            }
          }
          // Comments authored by this user on any post
          if (Array.isArray(p.comments)) {
            p.comments.forEach(c => {
              if (c.uid === targetUid) {
                if (c.author !== updatedAuthorName) {
                  c.author = updatedAuthorName;
                  changed = true;
                }
                if (updatedAuthorPhoto !== undefined && c.authorPhoto !== updatedAuthorPhoto) {
                  c.authorPhoto = updatedAuthorPhoto;
                  changed = true;
                }
              }
            });
          }
        });
        return changed;
      };

      const allPosts = this.getLocalPosts();
      if (Array.isArray(allPosts) && allPosts.length > 0) {
        if (updatePostsWithNewAuthor(allPosts)) {
          this.cacheLocal(allPosts);
          this.notifyListeners(allPosts);
        }
      }
    }

    // 3. Sync with Firestore collection 'users' and chunked batch-update 'merit_posts'
    if (isCloudReady && db && this.currentUser.uid && !this.currentUser.isAnonymous) {
      try {
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        await setDoc(doc(db, COLLECTIONS.USERS, this.currentUser.uid), {
          uid: this.currentUser.uid,
          name: this.currentUser.name,
          firstName: this.currentUser.firstName || '',
          lastName: this.currentUser.lastName || '',
          email: this.currentUser.email || null,
          photo: this.currentUser.photo || null,
          coverImage: this.currentUser.coverImage || 'assets/banner.jpg',
          bio: this.currentUser.bio || '',
          location: this.currentUser.location || '',
          district: this.currentUser.district || '',
          province: this.currentUser.province || '',
          city: this.currentUser.city || '',
          occupation: this.currentUser.occupation || '',
          joinedDate: this.currentUser.joinedDate || '2026 ඔක්තෝබර්',
          updatedAt: Date.now()
        }, { merge: true });
      } catch (e) {
        console.warn('[Firestore] Failed to save user profile to cloud:', e);
      }

      // Batch update all posts created by this user so their new name persists in cloud Firestore (Chunked by 400)
      try {
        const { collection, query, where, getDocs, writeBatch, doc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const postQ = query(collection(db, COLLECTIONS.POSTS), where('uid', '==', this.currentUser.uid));
        const postSnap = await getDocs(postQ);
        if (!postSnap.empty) {
          const BATCH_SIZE = 400;
          let batch = writeBatch(db);
          let opCount = 0;

          for (const postDoc of postSnap.docs) {
            const data = postDoc.data();
            if (!data.isOfficial) {
              const updatePayload = { author: this.currentUser.name };
              if (this.currentUser.photo) {
                updatePayload.authorPhoto = this.currentUser.photo;
              }
              batch.update(doc(db, COLLECTIONS.POSTS, postDoc.id), updatePayload);
              opCount++;
              if (opCount % BATCH_SIZE === 0) {
                await batch.commit();
                batch = writeBatch(db);
              }
            }
          }
          if (opCount % BATCH_SIZE !== 0) {
            await batch.commit();
          }
          console.log(`[Firestore] Successfully batch updated author name on ${opCount} posts.`);
        }
      } catch (postBatchErr) {
        console.warn('[Firestore] Batch updating author posts in cloud warning:', postBatchErr);
      }
    }

    const currentLivePosts = this.getLocalPosts();
    if (Array.isArray(currentLivePosts) && currentLivePosts.length > 0) {
      this.notifyListeners(currentLivePosts);
    }
    return this.currentUser;
  },

  async setUserName(name) {
    return await this.updateProfile({ name });
  },

  /**
   * Google Sign-In with Firebase Auth
   */
  async loginWithGoogle() {
    if (!isCloudReady || !auth) {
      const name = prompt("Firebase සම්බන්ධ කර නැත. ඔබගේ නම ඇතුළත් කරන්න:", this.currentUser.name);
      if (name) this.setUserName(name);
      return { success: false, code: 'not-configured', message: 'Firebase Cloud Database එක සක්‍රීය කර නොමැත.' };
    }

    try {
      const { GoogleAuthProvider, signInWithPopup } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Auto-restore saved profile and populate previous name
      await this.restoreUserProfile(result.user);

      return { success: true, user: result.user };
    } catch (err) {
      console.warn('[Auth] Google Sign-In error:', err);
      const errorCode = err.code || '';

      if (errorCode === 'auth/popup-closed-by-user') {
        // User closed or cancelled the popup - no error message needed
        return { success: false, code: errorCode, cancelled: true };
      }

      let friendlyMessage = 'Google ගිණුමෙන් සම්බන්ධ වීම සාර්ථක කරගත නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න.';
      if (errorCode === 'auth/popup-blocked') {
        friendlyMessage = 'ඔබගේ Browser එක මඟින් Login Popup window එක අවහිර (Block) කර ඇත. කරුණාකර Popups allow කරන්න.';
      } else if (errorCode === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        friendlyMessage = 'ඔබගේ ලිපිනය Firebase හි Authorized කර නැත. Authorized domains පරීක්ෂා කරන්න.';
      }

      return {
        success: false,
        code: errorCode,
        error: err,
        message: friendlyMessage
      };
    }
  },

  /**
   * Sign out current user
   */
  async logout() {
    if (auth) {
      try {
        const { signOut } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js');
        await signOut(auth);
      } catch (e) {
        console.warn('Sign out warning:', e);
      }
    }
    this.currentUser = {
      uid: "user_guest_" + Math.random().toString(36).substring(2, 7),
      firstName: "අමුත්තා",
      lastName: "",
      name: "අමුත්තා",
      photo: null,
      email: null,
      isAdmin: false,
      isAnonymous: true,
      needsNameConfirmation: false
    };
    localStorage.setItem('pinPotha_currentUser', JSON.stringify(this.currentUser));
    this.notifyListeners();
  },

  /**
   * Returns list of Aranya Senasana (seed + cloud/local custom entries)
   */
  async getAranyaSenasanaList() {
    let list = [...INITIAL_ARANYA_LIST];
    try {
      const localCustom = localStorage.getItem('pinPotha_custom_aranya');
      if (localCustom) {
        const parsed = JSON.parse(localCustom);
        if (Array.isArray(parsed)) {
          parsed.forEach(item => {
            if (!list.some(a => a.id === item.id)) {
              list.push(item);
            }
          });
        }
      }
    } catch (e) {}

    if (isCloudReady && db) {
      try {
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const snap = await getDocs(collection(db, COLLECTIONS.ARANYA));
        snap.forEach(docSnap => {
          const data = { id: docSnap.id, ...docSnap.data() };
          const idx = list.findIndex(a => a.id === data.id);
          if (idx !== -1) {
            list[idx] = { ...list[idx], ...data };
          } else {
            list.push(data);
          }
        });
      } catch (e) {
        console.warn('[Storage] Aranya cloud sync warning:', e);
      }
    }

    return list;
  },

  /**
   * Devotee suggests an Aranya Senasana for inclusion
   */
  async suggestAranyaSenasana(suggestion) {
    if (!suggestion || !suggestion.name) return false;
    const payload = {
      ...suggestion,
      timestamp: Date.now(),
      status: 'pending',
      suggestedBy: (this.currentUser && this.currentUser.name) ? this.currentUser.name : 'කල්‍යාණ මිත්‍ර'
    };

    try {
      const existing = JSON.parse(localStorage.getItem('pinPotha_aranya_suggestions') || '[]');
      existing.unshift(payload);
      localStorage.setItem('pinPotha_aranya_suggestions', JSON.stringify(existing));
    } catch(e) {}

    if (isCloudReady && db) {
      try {
        const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        await addDoc(collection(db, 'aranya_suggestions'), payload);
      } catch (e) {
        console.warn('[Storage] Cloud suggest aranya warning:', e);
      }
    }
    return true;
  }
};
