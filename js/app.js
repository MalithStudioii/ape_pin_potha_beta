/**
 * ============================================================================
 * පිං පොත | Main Application Controller & UI Logic
 * ============================================================================
 */

import { StorageService } from './storage.js?v=104';
import { Security } from './security.js?v=97';
import { uploadToImgBB } from './imgbb-service.js?v=66';
import { SoundService, triggerHaptic } from './sound.js?v=66';
import { FeedAlgorithm } from './algorithm.js?v=66';

/* ==========================================================================
   Sri Lanka Provinces & Districts Dataset & Dropdown Helper Functions
   ========================================================================== */
export const SRI_LANKA_DISTRICTS_BY_PROVINCE = {
  "බස්නාහිර පළාත": ["කොළඹ", "ගම්පහ", "කළුතර"],
  "මධ්‍යම පළාත": ["මහනුවර", "මාතලේ", "නුවරඑළිය"],
  "දකුණු පළාත": ["ගාල්ල", "මාතර", "හම්බන්තොට"],
  "වයඹ පළාත": ["කුරුණෑගල", "පුත්තලම"],
  "සබරගමුව පළාත": ["රත්නපුර", "කෑගල්ල"],
  "උතුරු මැද පළාත": ["අනුරාධපුරය", "පොළොන්නරුව"],
  "ඌව පළාත": ["බදුල්ල", "මොණරාගල"],
  "නැගෙනහිර පළාත": ["ත්‍රිකුණාමලය", "මඩකලපුව", "අම්පාර"],
  "උතුරු පළාත": ["යාපනය", "කිලිනොච්චිය", "මන්නාරම", "වවුනියාව", "මුලතිව්"],
  "විදේශගත / වෙනත්": ["විදේශගත (Overseas)", "වෙනත් (Other)"]
};

export const DISTRICT_TO_PROVINCE = {};
Object.entries(SRI_LANKA_DISTRICTS_BY_PROVINCE).forEach(([prov, dists]) => {
  dists.forEach(d => {
    DISTRICT_TO_PROVINCE[d] = prov;
  });
});

window.SRI_LANKA_DISTRICTS_BY_PROVINCE = SRI_LANKA_DISTRICTS_BY_PROVINCE;
window.DISTRICT_TO_PROVINCE = DISTRICT_TO_PROVINCE;

export function populateDistrictSelect(prefix, selectedDistrict = '', filterProvince = '') {
  const distSelect = document.getElementById(`${prefix}DistrictSelect`);
  if (!distSelect) return;

  distSelect.innerHTML = '<option value="">-- දිස්ත්‍රික්කය තෝරන්න --</option>';

  if (filterProvince && SRI_LANKA_DISTRICTS_BY_PROVINCE[filterProvince]) {
    const group = document.createElement('optgroup');
    group.label = filterProvince;
    SRI_LANKA_DISTRICTS_BY_PROVINCE[filterProvince].forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.innerText = d;
      if (d === selectedDistrict) opt.selected = true;
      group.appendChild(opt);
    });
    distSelect.appendChild(group);

    const allOpt = document.createElement('option');
    allOpt.value = "__show_all__";
    allOpt.innerText = "🌐 සියලු දිස්ත්‍රික්ක පෙන්වන්න...";
    distSelect.appendChild(allOpt);
  } else {
    Object.entries(SRI_LANKA_DISTRICTS_BY_PROVINCE).forEach(([prov, dists]) => {
      const group = document.createElement('optgroup');
      group.label = prov;
      dists.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.innerText = d;
        if (d === selectedDistrict) opt.selected = true;
        group.appendChild(opt);
      });
      distSelect.appendChild(group);
    });
  }

  if (selectedDistrict && distSelect.value !== selectedDistrict) {
    distSelect.value = selectedDistrict;
  }
}
window.populateDistrictSelect = populateDistrictSelect;

window.handleProfileProvinceChange = function(prefix) {
  const provSelect = document.getElementById(`${prefix}ProvinceSelect`);
  const distSelect = document.getElementById(`${prefix}DistrictSelect`);
  if (!provSelect || !distSelect) return;

  const selectedProv = provSelect.value;
  const currentDist = distSelect.value;

  populateDistrictSelect(prefix, currentDist, selectedProv);
};

window.handleProfileDistrictChange = function(prefix) {
  const provSelect = document.getElementById(`${prefix}ProvinceSelect`);
  const distSelect = document.getElementById(`${prefix}DistrictSelect`);
  if (!distSelect) return;

  if (distSelect.value === '__show_all__') {
    populateDistrictSelect(prefix, '', '');
    return;
  }

  const selectedDist = distSelect.value;
  if (!selectedDist) return;

  const matchedProv = DISTRICT_TO_PROVINCE[selectedDist];
  if (matchedProv && provSelect) {
    provSelect.value = matchedProv;
    populateDistrictSelect(prefix, selectedDist, matchedProv);
  }
};

function resolveUserLocationFields(user) {
  let district = user.district || '';
  let province = user.province || '';
  let city = user.city || '';

  if (!district && user.location) {
    for (const d of Object.keys(DISTRICT_TO_PROVINCE)) {
      if (user.location.includes(d)) {
        district = d;
        province = DISTRICT_TO_PROVINCE[d];
        break;
      }
    }
    if (!province) {
      for (const p of Object.keys(SRI_LANKA_DISTRICTS_BY_PROVINCE)) {
        if (user.location.includes(p)) {
          province = p;
          break;
        }
      }
    }
    if (district && user.location.includes(district)) {
      const parts = user.location.split(district)[0].replace(/[, -]/g, '').trim();
      if (parts) city = parts;
    }
  }

  return { district, province, city };
}

window.FeedAlgorithm = FeedAlgorithm;
window.SoundService = SoundService;
window.triggerHaptic = triggerHaptic;
window.toggleSoundPreference = function(e) {
  SoundService.setSoundEnabled(e.target.checked);
};

export function isGuestUser() {
  const user = StorageService.currentUser;
  return !user || user.isAnonymous || !user.email;
}
window.isGuestUser = isGuestUser;

window.showAuthRequiredModal = function(actionName = 'මෙම ක්‍රියාව සිදු කිරීමට') {
  triggerHaptic(20);
  SoundService.playClick();
  const actEl = document.getElementById('authRequiredActionText');
  if (actEl) {
    actEl.innerText = `${actionName} සඳහා කරුණාකර Google මඟින් Login වන්න.`;
  }
  try {
    history.pushState({ type: 'modal', id: 'authRequiredModal' }, '');
  } catch (e) {}
  document.getElementById('authRequiredModal')?.classList.remove('hidden');
};

window.closeAuthRequiredModal = function() {
  document.getElementById('authRequiredModal')?.classList.add('hidden');
};

window.closeAuthRequiredOnBackdrop = function(e) {
  if (e.target.id === 'authRequiredModal') {
    closeAuthRequiredModal();
  }
};

window.openMandatoryNameModal = function() {
  const user = StorageService.currentUser || {};
  const fNameInp = document.getElementById('mandatoryFirstNameInput');
  const lNameInp = document.getElementById('mandatoryLastNameInput');
  if (fNameInp) fNameInp.value = user.firstName || (user.name && user.name !== 'අමුත්තා' ? user.name.split(' ')[0] : '');
  if (lNameInp) lNameInp.value = user.lastName || (user.name && user.name !== 'අමුත්තා' ? user.name.split(' ').slice(1).join(' ') : '');
  document.getElementById('mandatoryNameModal')?.classList.remove('hidden');
};

window.closeMandatoryNameModal = function() {
  document.getElementById('mandatoryNameModal')?.classList.add('hidden');
};

function checkAndPromptMandatoryName() {
  const user = StorageService.currentUser;
  if (!user || user.isAnonymous || !user.email) return;
  const name = (user.name || '').trim();
  if (!name || name === 'අමුත්තා' || name === 'කල්‍යාණ මිත්‍ර' || user.needsNameConfirmation) {
    openMandatoryNameModal();
  }
}
window.checkAndPromptMandatoryName = checkAndPromptMandatoryName;

let activeTab = 'feed';
let activeCategory = 'සියල්ල';
let selectedPostType = 'merit';
let compressedBase64Image = null;
let selectedImagesList = [];
let currentLightboxImages = [];
let currentLightboxIndex = 0;
let currentPostsData = [];
window.currentPostsData = currentPostsData;
let activeProfileSubTab = 'timeline';
let currentNotifications = [];
let activeNotifFilter = 'all';
let currentFeedSort = 'trending';

window.setFeedSort = function(sortMode) {
  triggerHaptic(15);
  SoundService.playClick();
  currentFeedSort = sortMode;

  ['trending', 'latest', 'top_sadhu'].forEach(m => {
    const pill = document.getElementById(`sort-pill-${m}`);
    if (pill) {
      if (m === sortMode) pill.classList.add('active');
      else pill.classList.remove('active');
    }
  });

  renderFeed();
};

const COVER_PRESETS = [
  {
    name: "ස්වර්ණමාලී මහා සෑ රදුන්",
    url: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1600&q=80"
  },
  {
    name: "ශාන්ත නෙළුම් විල",
    url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80"
  },
  {
    name: "සැදැහැති පහන් පූජාව",
    url: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1600&q=80"
  },
  {
    name: "ශ්‍රී මහා බෝ සමිඳුන්",
    url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80"
  },
  {
    name: "ශාන්ත ශ්‍රී ලංකා පරිසරය",
    url: "https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&w=1600&q=80"
  }
];

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  initSmartHeaderScroll();
  initMobileBottomBarLock();
  const initResult = await StorageService.init();
  updateCloudBanner(initResult.isCloud);
  updateUserInfoUI();
  updateCommunityMemberCount();

  // Load initial global announcement, daily verse, and Poya calendar from storage
  const initialAnnounce = StorageService.getAdminAnnouncement();
  if (initialAnnounce) renderGlobalAnnouncementUI(initialAnnounce);

  const initialVerse = StorageService.getDailyDhammaVerse();
  if (initialVerse) renderDailyVerseUI(initialVerse);

  const initialPoya = StorageService.getPoyaEvent();
  if (initialPoya) renderPoyaUI(initialPoya);

  // Pre-load local posts so feed is ready instantaneously on initial paint
  currentPostsData = StorageService.getLocalPosts() || [];
  window.currentPostsData = currentPostsData;
  renderFeed();
  renderSideNeeds();
  renderPcSidebarMembers();
  updateUserStats();

  // Subscribe to real-time database updates
  StorageService.onPostsUpdate((posts) => {
    const prevIds = (currentPostsData || []).map(p => p.id).join(',');
    const newIds = (posts || []).map(p => p.id).join(',');
    currentPostsData = posts || [];
    window.currentPostsData = currentPostsData;

    const container = document.getElementById('postsContainer');
    const hasRenderedCards = container && container.children.length > 0 && !container.querySelector('.feed-loading-shimmer');

    if (hasRenderedCards && prevIds.length > 0 && newIds.startsWith(prevIds)) {
      // Posts were appended at the bottom via pagination! Smooth append without resetting DOM or scroll position
      appendNewPostsToFeed(posts, prevIds);
    } else if (hasRenderedCards && prevIds === newIds && prevIds.length > 0) {
      // In-place updates to prevent feed DOM teardown, scroll jump, and image flicker
      updateFeedInPlace(currentPostsData);
    } else {
      renderFeed();
    }
    updateUserInfoUI();
    renderSideNeeds();
    updateUserStats();
    if (activeTab === 'profile') {
      renderProfileView();
    }
    // Refresh admin stats if admin modal is open
    const adminPanel = document.getElementById('settingsContentAdmin');
    if (adminPanel && !adminPanel.classList.contains('hidden')) {
      renderAdminDashboard();
    }
  });

  // Subscribe to real-time notifications
  StorageService.onNotificationsUpdate((notifs) => {
    currentNotifications = notifs || [];
    renderNotificationsList();
  });

  // Subscribe to real-time global announcement updates
  StorageService.onAnnouncementUpdate((announcement) => {
    renderGlobalAnnouncementUI(announcement);
  });

  // Subscribe to real-time daily verse updates
  StorageService.onVerseUpdate((verse) => {
    renderDailyVerseUI(verse);
  });

  // Subscribe to real-time Poya calendar updates
  StorageService.onPoyaEventUpdate((poya) => {
    renderPoyaUI(poya);
  });

  setupEventListeners();
  initPWAEngine();
  initPresenceEngine();

  // Initialize browser history state for mobile back button navigation
  try {
    history.replaceState({ type: 'tab', tab: 'feed' }, '');
  } catch (e) {}

  // Sync sound preference toggle
  const soundChk = document.getElementById('chkSoundEffects');
  if (soundChk) {
    soundChk.checked = SoundService.getSoundEnabled();
  }

  // Handle native hardware/browser Back Button & gesture
  window.addEventListener('popstate', (e) => {
    triggerHaptic(25);
    SoundService.playClick();

    // 1. If any modal overlay is visible, close the top modal
    const openModals = Array.from(document.querySelectorAll('.modal-overlay:not(.hidden)'));
    if (openModals.length > 0) {
      const topModal = openModals[openModals.length - 1];
      topModal.classList.add('hidden');
      if (topModal.id === 'cropAvatarModal' && window.cropperInstance) {
        window.cropperInstance.destroy();
        window.cropperInstance = null;
      }
      return;
    }

    // 2. If photo lightbox is open, close it
    const lightbox = document.getElementById('photoLightboxModal');
    if (lightbox && !lightbox.classList.contains('hidden')) {
      closeLightbox();
      return;
    }

    // 2.1. If Dharma Reels modal is open, close it
    const reelsModal = document.getElementById('reelsModal');
    if (reelsModal && !reelsModal.classList.contains('hidden')) {
      closeReelsViewer();
      return;
    }

    // 3. If notifications dropdown is open, close it
    const notifDropdown = document.getElementById('notificationsDropdown');
    if (notifDropdown && !notifDropdown.classList.contains('hidden')) {
      notifDropdown.classList.add('hidden');
      return;
    }

    // 4. Tab navigation history
    if (e.state && e.state.type === 'tab') {
      switchTab(e.state.tab, false);
    } else if (activeTab !== 'feed') {
      switchTab('feed', false);
    }
  });

  // Check URL query params for direct post sharing (?post=POST_ID)
  checkUrlDirectPost();
});


function updateCloudBanner(isConnected) {
  const banner = document.getElementById('cloudBanner');
  if (!banner) return;

  if (isConnected) {
    banner.style.display = 'none';
  } else {
    banner.className = 'cloud-status-banner';
    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 6px;">
        <i class="fa-solid fa-shield-halved" style="color: #d97706;"></i>
        <span><strong>Sandbox Mode:</strong> ආරක්ෂිතව ක්‍රියාත්මක වේ. Firebase Keys ඇතුළත් කළ පසු සජීවීව Cloud එකට සම්බන්ධ වේ.</span>
      </div>
      <button id="openFirebaseGuideBtn" style="background: none; border: 1px solid #d97706; color: #78350f; font-size: 0.68rem; font-weight: 700; padding: 2px 8px; border-radius: 9999px; cursor: pointer;">
        සම්බන්ධ කරන්නේ කෙසේද?
      </button>
    `;

    document.getElementById('openFirebaseGuideBtn')?.addEventListener('click', () => {
      alert(
        "🔥 Firebase Cloud සම්බන්ධ කරන ආකාරය:\n\n" +
        "1. console.firebase.google.com වෙත ගොස් නොමිලේ Project එකක් සාදන්න.\n" +
        "2. 'Cloud Firestore' සහ 'Authentication (Google Sign-In)' සක්‍රීය කරන්න.\n" +
        "3. Project Settings වෙත ගොස් ලැබෙන Config keys ටික js/firebase-config.js තුළට Copy කර Paste කරන්න.\n\n" +
        "එවිට සජීවී Cloud Database එක ස්වයංක්‍රීයව ක්‍රියාත්මක වේ!"
      );
    });
  }
}

function updateUserInfoUI() {
  const user = StorageService.currentUser;
  const isMaster = StorageService.isMasterAdmin();
  const isSub = StorageService.isSubAdmin(user);
  const isAdminUser = isMaster || isSub;
  const firstLetter = (user.name || 'අ').trim().charAt(0);

  const displayEl = document.getElementById('userNameDisplay');
  const sideNameEl = document.getElementById('sideUserName');
  const navAvatarEl = document.getElementById('navAvatar');
  const sideAvatarEl = document.getElementById('sideAvatar');
  const composerAvatarEl = document.getElementById('composerAvatar');
  const crownBtn = document.getElementById('headerAdminCrownBtn');

  if (displayEl) displayEl.innerText = user.name || 'අමුත්තා';
  if (sideNameEl) sideNameEl.innerText = user.name || 'අමුත්තා';

  // Toggle Header Crown Button for Master Admin & Sub-Admins
  if (crownBtn) {
    if (isAdminUser) {
      crownBtn.classList.remove('hidden');
      crownBtn.style.display = 'inline-flex';
      crownBtn.onclick = () => { window.location.href = 'admin.html'; };
      if (isMaster) {
        crownBtn.innerHTML = '<i class="fa-solid fa-crown"></i><span>Admin</span>';
        crownBtn.title = "👑 Master Admin Dashboard";
        crownBtn.classList.remove('header-admin-shield-btn');
      } else {
        crownBtn.innerHTML = '<i class="fa-solid fa-shield-halved"></i><span>Admin</span>';
        crownBtn.title = "🛡️ පිං පොත පරිපාලක Dashboard";
        crownBtn.classList.add('header-admin-shield-btn');
      }
    } else {
      crownBtn.classList.add('hidden');
      crownBtn.style.display = 'none';
      crownBtn.onclick = null;
    }
  }

  // Toggle Admin Edit buttons on Sidebar Widgets
  const btnEditVerse = document.getElementById('btnEditDailyVerse');
  if (btnEditVerse) {
    btnEditVerse.style.display = isAdminUser ? 'inline-flex' : 'none';
  }
  const btnEditPoya = document.getElementById('btnEditPoyaCalendar');
  if (btnEditPoya) {
    btnEditPoya.style.display = isAdminUser ? 'inline-flex' : 'none';
  }

  // Toggle Admin Tab Button in Settings Modal
  const adminTabBtn = document.getElementById('set-tab-admin');
  if (adminTabBtn) {
    if (isAdminUser) {
      adminTabBtn.classList.remove('hidden');
      adminTabBtn.style.display = 'inline-flex';
    } else {
      adminTabBtn.classList.add('hidden');
      adminTabBtn.style.display = 'none';
    }
  }

  const applyAvatar = (el) => {
    if (!el) return;
    if (user.photo) {
      el.innerHTML = `<img src="${user.photo}" alt="${user.name}" style="width: 100%; height: 100%; border-radius: 9999px; object-fit: cover; display: block;" onerror="this.parentElement.innerText='${firstLetter}';">`;
    } else {
      el.innerText = firstLetter;
    }
  };

  applyAvatar(navAvatarEl);
  applyAvatar(sideAvatarEl);
  applyAvatar(composerAvatarEl);

  // Sync User Info inside Mobile Slide Drawer
  const drawerAvatarEl = document.getElementById('drawerNavAvatar');
  const drawerNameEl = document.getElementById('drawerUserName');
  const drawerStatusEl = document.getElementById('drawerUserStatus');
  if (drawerNameEl) drawerNameEl.innerText = user.name || 'කල්‍යාණ මිතුරා';
  applyAvatar(drawerAvatarEl);
  if (drawerStatusEl) {
    if (isMaster) drawerStatusEl.textContent = '👑 Master Admin';
    else if (isSub) drawerStatusEl.textContent = '🛡️ Admin';
    else if (user.role === 'monk' || user.isMonk) drawerStatusEl.textContent = 'පූජනීය මහා සංඝරත්නය';
    else drawerStatusEl.textContent = 'කල්‍යාණ මිත්‍ර සාමාජික';
  }

  updateCommunityMemberCount();

  // Update Kalyana Mithra pending request badges
  const notifs = StorageService.getLocalNotifications() || [];
  const pendingMithraReqs = notifs.filter(n =>
    n.type === 'mithra_request' &&
    n.recipientUid === user.uid &&
    !StorageService.isRequestAccepted(n.id, n.senderUid) &&
    !StorageService.isRequestDeclined(n.id, n.senderUid) &&
    (!user.mithrayan || !user.mithrayan.includes(n.senderUid)) &&
    (!n.status || n.status === 'pending')
  );
  const pCount = pendingMithraReqs.length;
  const mobFriendsBadge = document.getElementById('mobFriendsBadge');
  const headerFriendsBadge = document.getElementById('headerFriendsBadge');
  if (mobFriendsBadge) {
    mobFriendsBadge.innerText = pCount;
    mobFriendsBadge.style.display = pCount > 0 ? 'inline-flex' : 'none';
  }
  if (headerFriendsBadge) {
    headerFriendsBadge.innerText = pCount;
    headerFriendsBadge.style.display = pCount > 0 ? 'inline-flex' : 'none';
  }
}

function updateUserStats() {
  const user = StorageService.currentUser;
  const myPosts = currentPostsData.filter(p => p.uid === user.uid);
  const totalSadhu = myPosts.reduce((acc, p) => acc + (p.sadhuCount || 0), 0);

  const statPostsEl = document.getElementById('statMyPosts');
  const statSadhuEl = document.getElementById('statMySadhu');

  if (statPostsEl) statPostsEl.innerText = myPosts.length;
  if (statSadhuEl) statSadhuEl.innerText = totalSadhu;
}

// Member Profile Modal Controllers (Facebook-Style Profile Viewer)
window.viewUserProfile = async function(uid, authorName) {
  triggerHaptic(15);
  SoundService.playClick();

  if (uid === 'official_pin_potha' || authorName === 'අපේ පිං පොත' || authorName === 'පිං පොත පරිපාලනය' || authorName === 'පිං පොත නිල නිවේදනය') {
    return;
  }

  if (isGuestUser()) {
    showAuthRequiredModal('සාමාජිකයින්ගේ Profile බැලීමට');
    return;
  }

  const current = StorageService.currentUser;
  if (current && ((uid && current.uid && uid === current.uid) || (!uid && authorName && current.name && authorName === current.name))) {
    switchTab('profile');
    return;
  }

  await openMemberProfileModal(uid, authorName);
};

let currentViewingMember = null;

window.viewMemberProfilePhoto = function(e) {
  if (e) e.stopPropagation();
  if (currentViewingMember && currentViewingMember.photo) {
    window.openLightbox([currentViewingMember.photo], 0);
  }
};

window.viewMemberCoverPhoto = function(e) {
  if (e) e.stopPropagation();
  const coverUrl = currentViewingMember?.coverImage || document.getElementById('memCoverImg')?.getAttribute('src') || 'assets/banner.jpg';
  if (coverUrl && !coverUrl.includes('data:image/svg+xml')) {
    window.openLightbox([coverUrl], 0);
  }
};

window.openMemberProfileModal = async function(uid, authorName) {
  const modal = document.getElementById('memberProfileModal');
  if (!modal) return;

  try {
    history.pushState({ type: 'modal', id: 'memberProfileModal' }, '');
  } catch (e) {}
  document.body.style.overflow = 'hidden';
  modal.classList.remove('hidden');

  // Load profile from StorageService
  const member = await StorageService.getUserProfile(uid) || {
    uid,
    name: authorName || 'කල්‍යාණ මිත්‍ර',
    photo: null,
    coverImage: 'assets/banner.jpg',
    bio: "සබ්බපාපස්ස අකරණං - කුසලස්ස උපසම්පදා 🙏",
    location: '',
    occupation: '',
    joinedDate: '2026 ඔක්තෝබර්'
  };

  currentViewingMember = member;

  const coverImg = document.getElementById('memCoverImg');
  if (coverImg) coverImg.src = member.coverImage || 'assets/banner.jpg';

  const isSangha = StorageService.isSangha(member);
  const isMaster = StorageService.isMasterAdmin();
  const currentUid = StorageService.currentUser?.uid;

  const avatarWrap = document.getElementById('memAvatarWrap');
  if (avatarWrap) {
    const initialChar = (member.name || authorName || 'ක').trim().charAt(0);
    const innerPhoto = member.photo 
      ? `<img src="${member.photo}" alt="${Security.escapeHTML(member.name || '')}" onerror="this.parentElement.innerHTML = '<span>${initialChar}</span>';">`
      : `<span>${initialChar}</span>`;

    if (isSangha) {
      avatarWrap.classList.add('sangha-framed-avatar');
      avatarWrap.innerHTML = `
        ${innerPhoto}
        <img src="assets/sangha-frame.png" class="sangha-vatapatha-frame" alt="වටාපත රාමුව">
      `;
    } else {
      avatarWrap.classList.remove('sangha-framed-avatar');
      avatarWrap.innerHTML = innerPhoto;
    }
  }

  const isProfileMaster = StorageService.isMasterAdmin(member);
  const isProfileSubAdmin = !isProfileMaster && StorageService.isSubAdmin(member);

  const nameEl = document.getElementById('memFullName');
  if (nameEl) {
    nameEl.innerHTML = `
      ${Security.escapeHTML(member.name || authorName || 'කල්‍යාණ මිත්‍ර')}
      ${isProfileMaster ? `<span class="badge-crown" style="font-size: 1.15rem;" title="Master Admin">👑</span>` : (isProfileSubAdmin ? `<span class="badge-shield" style="font-size: 1.05rem;" title="පරිපාලක (Admin)">🛡️</span>` : '')}
    `;
  }

  const badgeEl = document.getElementById('memVerifiedBadge');
  if (badgeEl) {
    if (isSangha) {
      badgeEl.className = 'sangha-verified-badge';
      badgeEl.innerHTML = `<i class="fa-solid fa-dharmachakra"></i> <span>පූජනීය මහා සංඝරත්නය</span>`;
    } else if (isProfileMaster) {
      badgeEl.className = 'official-author-badge';
      badgeEl.innerHTML = `<span class="badge-crown">👑</span> <span>Master Admin</span>`;
    } else if (isProfileSubAdmin) {
      badgeEl.className = 'admin-shield-badge';
      badgeEl.innerHTML = `<span class="badge-shield">🛡️</span> <span>පිං පොත පරිපාලක</span>`;
    } else if (member.email) {
      badgeEl.className = 'verified-pill';
      badgeEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>Google සත්‍යාපිත කල්‍යාණ මිත්‍ර</span>`;
    } else {
      badgeEl.className = 'verified-pill';
      badgeEl.innerHTML = `<i class="fa-solid fa-seedling"></i> <span>පිංවත් සාමාජික</span>`;
    }
  }

  const bioEl = document.getElementById('memBio');
  if (bioEl) bioEl.innerText = `"${member.bio || "සබ්බපාපස්ස අකරණං - කුසලස්ස උපසම්පදා 🙏"}"`;

  const occEl = document.getElementById('memOccupationText');
  const occWrap = document.getElementById('memMetaOccupation');
  if (occEl && occWrap) {
    if (member.occupation) {
      occEl.innerText = member.occupation;
      occWrap.style.display = 'inline-flex';
    } else {
      occWrap.style.display = 'none';
    }
  }

  const locEl = document.getElementById('memLocationText');
  const locWrap = document.getElementById('memMetaLocation');
  if (locEl && locWrap) {
    if (member.location) {
      locEl.innerText = member.location;
      locWrap.style.display = 'inline-flex';
    } else {
      locWrap.style.display = 'none';
    }
  }

  const joinedEl = document.getElementById('memJoinedText');
  if (joinedEl) joinedEl.innerText = `${member.joinedDate || '2026 ඔක්තෝබර්'} සිට සාමාජික`;

  // Filter public posts for this member
  const memberPosts = currentPostsData.filter(p => {
    const matchUid = uid && p.uid && p.uid === uid;
    const resolvedName = StorageService.resolveAuthorName(p);
    const matchAuthor = (member.name && resolvedName === member.name) || (authorName && resolvedName === authorName);
    return (matchUid || matchAuthor) && p.visibility !== 'private';
  });

  const totalSadhu = memberPosts.reduce((acc, p) => acc + (p.sadhuCount || 0), 0);
  const totalPhotos = memberPosts.filter(p => p.image || (p.images && p.images.length > 0)).length;

  const statMerits = document.getElementById('memStatMerits');
  const statSadhu = document.getElementById('memStatSadhu');
  const statPhotos = document.getElementById('memStatPhotos');
  const statMithrayan = document.getElementById('memStatMithrayan');
  if (statMerits) statMerits.innerText = memberPosts.length;
  if (statSadhu) statSadhu.innerText = totalSadhu;
  if (statPhotos) statPhotos.innerText = totalPhotos;
  if (statMithrayan) statMithrayan.innerText = Array.isArray(member.mithrayan) ? member.mithrayan.length : 0;

  // Kalyana Mithra & Sangha Reverence Action Button in Member Profile Modal
  const mithraStatus = StorageService.getMithraStatus(uid);
  const mithraWrap = document.getElementById('memMithraActionWrapper');
  if (mithraWrap) {
    if (uid === currentUid) {
      mithraWrap.innerHTML = '';
    } else if (isSangha) {
      const isRevering = StorageService.isReveringSangha(uid);
      mithraWrap.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 8px; align-items: center; width: 100%;">
          ${isRevering ? `
            <button type="button" class="btn-sangha-revered" onclick="handleToggleSanghaReverence('${uid}', '${Security.escapeHTML(member.name)}')">
              <i class="fa-solid fa-hands-praying"></i> <span>වන්දනා කරමි (නමස්කාර කර ඇත 🙏)</span>
            </button>
          ` : `
            <button type="button" class="btn-sangha-reverence" onclick="handleToggleSanghaReverence('${uid}', '${Security.escapeHTML(member.name)}')">
              <i class="fa-solid fa-hands-praying"></i> <span>නමස්කාර කරමි (අනුගමනය කරන්න 🙏)</span>
            </button>
          `}
          ${isMaster ? `
            <button type="button" style="background: rgba(217, 119, 6, 0.12); color: #b45309; border: 1px dashed #d97706; padding: 4px 12px; border-radius: 9999px; font-size: 0.68rem; font-weight: 700; cursor: pointer;" onclick="handleToggleAdminSanghaVerification('${uid}', false)">
              <i class="fa-solid fa-circle-xmark"></i> සංඝ තත්ත්වය ඉවත් කරන්න
            </button>
          ` : ''}
        </div>
      `;
    } else {
      let html = '';
      if (mithraStatus === 'connected') {
        html = `
          <button type="button" class="btn-connected-mithra" onclick="handleRemoveMithra('${uid}')" title="කල්‍යාණ මිත්‍ර සබඳතාව ඉවත් කරන්න">
            <i class="fa-solid fa-heart-circle-check"></i> <span>කල්‍යාණ මිතුරෙකි</span>
          </button>
        `;
      } else if (mithraStatus === 'pending_sent') {
        html = `
          <button type="button" class="btn-pending-mithra" disabled title="ඔබ විසින් ඇරයුමක් යවා ඇත">
            <i class="fa-solid fa-hourglass-half"></i> <span>ඇරයුම යවා ඇත</span>
          </button>
        `;
      } else if (mithraStatus === 'pending_received') {
        html = `
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button type="button" class="btn-accept-mithra" onclick="handleAcceptMithra(null, '${uid}', '${Security.escapeHTML(member.name)}')">
              <i class="fa-solid fa-circle-check"></i> <span>ඇරයුම පිළිගන්න (සාදු!)</span>
            </button>
            <button type="button" class="btn-notif-reject" onclick="handleRejectMithra(null, '${uid}')">
              <i class="fa-solid fa-xmark"></i> ඉවත් කරන්න
            </button>
          </div>
        `;
      } else {
        html = `
          <button type="button" class="btn-connect-mithra" onclick="handleSendMithra('${uid}', '${Security.escapeHTML(member.name)}')">
            <i class="fa-solid fa-hands-praying"></i> <span>කල්‍යාණ මිත්‍රයෙකු කරගන්න</span>
          </button>
        `;
      }
      if (isMaster && uid !== currentUid) {
        if (isProfileSubAdmin) {
          html += `
            <button type="button" class="btn-admin-manage-toggle btn-admin-demote" onclick="handleToggleUserAdminStatus('${uid}', false)">
              <i class="fa-solid fa-shield-xmark"></i> 🛡️ Admin තනතුර ඉවත් කරන්න
            </button>
          `;
        } else if (!isProfileMaster) {
          html += `
            <button type="button" class="btn-admin-manage-toggle btn-admin-promote" onclick="handleToggleUserAdminStatus('${uid}', true)">
              <i class="fa-solid fa-shield-halved"></i> 🛡️ Admin (පරිපාලක) ලෙස පත්කරන්න
            </button>
          `;
        }
        html += `
          <button type="button" style="background: rgba(217, 119, 6, 0.12); color: #b45309; border: 1px dashed #d97706; padding: 4px 12px; border-radius: 9999px; font-size: 0.68rem; font-weight: 700; cursor: pointer; margin-top: 6px;" onclick="handleToggleAdminSanghaVerification('${uid}', true)">
            <i class="fa-solid fa-dharmachakra"></i> පූජනීය සංඝරත්නය ලෙස සත්‍යාපනය කරන්න
          </button>
        `;
      }
      mithraWrap.innerHTML = html;
    }
  }

  // Render Facebook-Style Friends Section in Member Profile
  const memFriendsGrid = document.getElementById('memFriendsGrid');
  const memFriendsCountLbl = document.getElementById('memFriendsSubCount');
  const memberMithrayanUids = Array.isArray(member.mithrayan) ? member.mithrayan : [];
  if (memFriendsCountLbl) {
    memFriendsCountLbl.innerText = isSangha ? `වන්දනාමාන කරන සැදැහැවතුන් ${memberMithrayanUids.length} දෙනෙක්` : `මිතුරන් ${memberMithrayanUids.length} දෙනෙක්`;
  }
  if (memFriendsGrid) {
    if (memberMithrayanUids.length === 0) {
      memFriendsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 18px 10px; color: #94a3b8; font-size: 0.76rem; background: #f8fafc; border-radius: 12px; border: 1px dashed #e2e8f0;">
          <i class="fa-solid fa-users" style="font-size: 1.4rem; color: #cbd5e1; margin-bottom: 6px; display: block;"></i>
          තවමත් කල්‍යාණ මිතුරන් සම්බන්ධ වී නොමැත.
        </div>
      `;
    } else {
      memFriendsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 15px; font-size: 0.74rem; color: #64748b;">
          <i class="fa-solid fa-spinner fa-spin" style="color: #d97706;"></i> මිතුරන් ලැයිස්තුව පූරණය වෙමින් පවතී...
        </div>
      `;
      StorageService.getMemberMithrayanList(memberMithrayanUids).then(friends => {
        if (!friends || friends.length === 0) {
          memFriendsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 15px; color: #94a3b8; font-size: 0.76rem;">
              මිතුරන් සොයාගත නොහැකි විය.
            </div>
          `;
          return;
        }
        memFriendsGrid.innerHTML = friends.map(f => {
          const isFSangha = StorageService.isSangha(f);
          const initial = (f.name || 'ක').charAt(0);
          return `
          <div class="mem-fb-friend-card" onclick="openMemberProfileModal('${f.uid}', '${Security.escapeHTML(f.name)}')">
            <div class="mem-fb-friend-thumb ${isFSangha ? 'sangha-framed-avatar' : ''}">
              ${f.photo ? `<img src="${Security.sanitizeUrl(f.photo)}" alt="${Security.escapeHTML(f.name)}" onerror="this.parentElement.innerText = '${initial}';">` : initial}
              ${isFSangha ? '<img src="assets/sangha-frame.png" class="sangha-vatapatha-frame" alt="වටාපත" style="position:absolute; inset:-3px; width:calc(100% + 6px); height:calc(100% + 6px); pointer-events:none;">' : ''}
            </div>
            <div class="mem-fb-friend-info">
              <div class="mem-fb-friend-name" title="${Security.escapeHTML(f.name || 'කල්‍යාණ මිත්‍ර')}">
                <span>${Security.escapeHTML(f.name || 'කල්‍යාණ මිත්‍ර')}</span>
                ${isFSangha ? `<span class="sangha-author-badge" style="margin-left: 3px; padding: 1px 5px; font-size: 0.58rem;"><i class="fa-solid fa-dharmachakra"></i> සංඝරත්නය</span>` : ''}
              </div>
              <div class="mem-fb-friend-loc">
                <i class="fa-solid fa-location-dot" style="color: #ea580c; font-size: 0.6rem;"></i>
                <span>${Security.escapeHTML(f.district || f.location || 'ශ්‍රී ලංකා')}</span>
              </div>
            </div>
          </div>
        `;
        }).join('');
      });
    }
  }

  const headingEl = document.getElementById('memTimelineHeading');
  if (headingEl) headingEl.innerText = `${member.name || 'මෙම කල්‍යාණ මිත්‍රයා'} විසින් සිදුකළ පින්කම් (${memberPosts.length})`;

  const feedEl = document.getElementById('memPostsFeed');
  if (feedEl) {
    if (memberPosts.length === 0) {
      feedEl.innerHTML = `
        <div style="text-align: center; padding: 40px 16px; background: #ffffff; border-radius: 12px; border: 1px dashed #cbd5e1;">
          <i class="fa-solid fa-seedling" style="font-size: 2rem; color: #d97706; margin-bottom: 8px; display: block;"></i>
          <p style="font-weight: 700; color: #1e293b; margin-bottom: 4px;">තවම ප්‍රසිද්ධ පින්කම් පළ කර නොමැත</p>
          <p style="font-size: 0.76rem; color: #64748b;">මෙම කල්‍යාණ මිත්‍රයා විසින් ප්‍රසිද්ධ පින්කම් පළ කළ පසු ඒවා මෙහි දැකගත හැක.</p>
        </div>
      `;
    } else {
      feedEl.innerHTML = memberPosts.map(p => renderPostCardHTML(p, StorageService.currentUser)).join('');
    }
  }
};

window.closeMemberProfileModal = function() {
  document.getElementById('memberProfileModal')?.classList.add('hidden');
  document.body.style.overflow = '';
  currentViewingMember = null;
};

window.closeMemberProfileOnBackdrop = function(e) {
  if (e.target.id === 'memberProfileModal') {
    closeMemberProfileModal();
  }
};

// Tab Switching with History API integration
window.switchTab = function(tab, pushHistory = true) {
  triggerHaptic(12);

  // Auth guard: Guest users cannot access private profile or personal merit book
  if ((tab === 'profile' || tab === 'mybook') && isGuestUser()) {
    showAuthRequiredModal(tab === 'profile' ? 'ඔබගේ Profile එක බැලීමට' : 'පෞද්ගලික පිං පොත බැලීමට');
    return;
  }

  if (pushHistory && activeTab !== tab) {
    try {
      history.pushState({ type: 'tab', tab: tab }, '');
    } catch (e) {}
  }
  activeTab = tab;

  // Always reveal header when navigating between tabs
  document.querySelector('.app-header')?.classList.remove('header-hidden');

  // Update navigation buttons (both desktop & mobile)
  ['feed', 'profile', 'mybook', 'needs', 'friends', 'aranya'].forEach(t => {
    const dBtn = document.getElementById(`desk-tab-${t}`);
    const mBtn = document.getElementById(`mob-tab-${t}`);
    if (dBtn) {
      if (t === tab) dBtn.classList.add('active');
      else dBtn.classList.remove('active');
    }
    if (mBtn) {
      if (t === tab) mBtn.classList.add('active');
      else mBtn.classList.remove('active');
    }
  });

  const sideAranyaBtn = document.getElementById('side-btn-aranya');
  if (sideAranyaBtn) {
    if (tab === 'aranya') sideAranyaBtn.classList.add('active');
    else sideAranyaBtn.classList.remove('active');
  }

  const headerAranyaBtn = document.getElementById('headerAranyaBtn');
  if (headerAranyaBtn) {
    if (tab === 'aranya') headerAranyaBtn.classList.add('active');
    else headerAranyaBtn.classList.remove('active');
  }

  const userProfBtn = document.getElementById('userProfileBtn');
  if (userProfBtn) {
    if (tab === 'profile') userProfBtn.classList.add('active');
    else userProfBtn.classList.remove('active');
  }

  const feedLayout = document.getElementById('mainFeedLayout');
  const profileContainer = document.getElementById('profilePageContainer');
  const aranyaContainer = document.getElementById('aranyaPageContainer');
  const friendsContainer = document.getElementById('friendsPageContainer');
  const banner = document.getElementById('tabHeaderBanner');

  if (tab === 'profile') {
    if (feedLayout) {
      feedLayout.classList.add('hidden');
      feedLayout.style.setProperty('display', 'none', 'important');
    }
    if (aranyaContainer) {
      aranyaContainer.classList.add('hidden');
      aranyaContainer.style.setProperty('display', 'none', 'important');
    }
    if (friendsContainer) {
      friendsContainer.classList.add('hidden');
      friendsContainer.style.setProperty('display', 'none', 'important');
    }
    if (profileContainer) {
      profileContainer.classList.remove('hidden');
      profileContainer.style.setProperty('display', 'block', 'important');
    }
    if (banner) banner.style.display = 'none';

    try {
      renderProfileView();
    } catch (err) {
      console.error('[Profile] Error rendering profile view:', err);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  if (tab === 'aranya') {
    if (feedLayout) {
      feedLayout.classList.add('hidden');
      feedLayout.style.setProperty('display', 'none', 'important');
    }
    if (profileContainer) {
      profileContainer.classList.add('hidden');
      profileContainer.style.setProperty('display', 'none', 'important');
    }
    if (friendsContainer) {
      friendsContainer.classList.add('hidden');
      friendsContainer.style.setProperty('display', 'none', 'important');
    }
    if (aranyaContainer) {
      aranyaContainer.classList.remove('hidden');
      aranyaContainer.style.setProperty('display', 'block', 'important');
    }
    if (banner) banner.style.display = 'none';

    try {
      renderAranyaDirectoryView();
    } catch (err) {
      console.error('[Aranya] Error rendering aranya view:', err);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  if (tab === 'friends') {
    startKmpLivePolling();
    if (feedLayout) {
      feedLayout.classList.add('hidden');
      feedLayout.style.setProperty('display', 'none', 'important');
    }
    if (profileContainer) {
      profileContainer.classList.add('hidden');
      profileContainer.style.setProperty('display', 'none', 'important');
    }
    if (aranyaContainer) {
      aranyaContainer.classList.add('hidden');
      aranyaContainer.style.setProperty('display', 'none', 'important');
    }
    if (friendsContainer) {
      friendsContainer.classList.remove('hidden');
      friendsContainer.style.setProperty('display', 'block', 'important');
    }
    if (banner) banner.style.display = 'none';

    try {
      renderKmpDirectoryView();
    } catch (err) {
      console.error('[KMP] Error rendering friends view:', err);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  } else {
    stopKmpLivePolling();
  }

  // Non-profile, non-aranya, non-friends tabs: show main feed layout, hide special containers
  if (feedLayout) {
    feedLayout.classList.remove('hidden');
    feedLayout.style.removeProperty('display');
    feedLayout.style.display = '';
  }
  if (profileContainer) {
    profileContainer.classList.add('hidden');
    profileContainer.style.setProperty('display', 'none', 'important');
  }
  if (aranyaContainer) {
    aranyaContainer.classList.add('hidden');
    aranyaContainer.style.setProperty('display', 'none', 'important');
  }
  if (friendsContainer) {
    friendsContainer.classList.add('hidden');
    friendsContainer.style.setProperty('display', 'none', 'important');
  }

  // Context banner
  if (banner) {
    if (tab === 'mybook') {
      banner.style.display = 'block';
      banner.className = 'context-banner mybook';
      banner.innerHTML = `
        <h2>📖 මගේ පෞද්ගලික පිං පොත</h2>
        <p>ඔබ පොදු පවුරට එක් කළ සහ ඔබට පමණක් පෙනෙන (Private) සියලුම කුසල සටහන් මෙහි සුරක්ෂිතව ඇත.</p>
      `;
    } else if (tab === 'needs') {
      banner.style.display = 'block';
      banner.className = 'context-banner needs';
      banner.innerHTML = `
        <h2>🤝 කල්‍යාණ මිත්‍ර සත්කාර හවුල</h2>
        <p>විහාරස්ථාන, දුෂ්කර පාසල් සහ සමාජ සත්කාර සඳහා අවශ්‍ය ද්‍රව්‍යමය හා ශ්‍රම දායකත්වයන් පමණක් සම්බන්ධීකරණය කෙරේ.</p>
      `;
    } else {
      banner.style.display = 'none';
    }
  }

  // Manage Feed Sort Bar visibility
  const sortBar = document.getElementById('feedSortBar');
  if (sortBar) {
    if (tab === 'feed' || tab === 'needs') {
      sortBar.style.display = 'flex';
    } else {
      sortBar.style.display = 'none';
    }
  }

  renderFeed();
};

// Category Filtering
window.setCategory = function(cat) {
  activeCategory = cat;

  // Sidebar buttons
  document.querySelectorAll('.category-item').forEach(btn => {
    if (btn.getAttribute('data-cat') === cat) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  // Mobile pills
  document.querySelectorAll('.category-pill').forEach(btn => {
    if (btn.getAttribute('data-cat') === cat) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  renderFeed();
};

/**
 * Dynamic Relative Time Formatter in Sinhala
 * Returns natural human-readable relative time strings:
 * "දැන්", "1 වි. කලින්", "පැයකට පෙර", "පැය 4කට පෙර", "ඊයේ", "දවස් 10 කට පෙර", "මසකට පෙර", "අවුරුදු 3කට කලින්"
 */
export function formatRelativeTimeSinhala(timestamp, fallbackText = 'දැන්') {
  if (!timestamp) return fallbackText;

  let timeMs = 0;
  if (typeof timestamp === 'number') {
    timeMs = timestamp;
  } else if (timestamp instanceof Date) {
    timeMs = timestamp.getTime();
  } else if (typeof timestamp === 'string') {
    const parsed = Date.parse(timestamp);
    if (!isNaN(parsed)) {
      timeMs = parsed;
    } else {
      return timestamp; // Already localized text (e.g. 'දැන්', 'මෑතකදී')
    }
  } else if (timestamp && typeof timestamp.toMillis === 'function') {
    timeMs = timestamp.toMillis();
  } else if (timestamp && typeof timestamp.seconds === 'number') {
    timeMs = timestamp.seconds * 1000;
  } else {
    return fallbackText;
  }

  const now = Date.now();
  const diffSec = Math.floor((now - timeMs) / 1000);

  if (diffSec < 45) {
    return 'දැන්';
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin} වි. කලින්`;
  }

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    if (diffHours === 1) return 'පැයකට පෙර';
    return `පැය ${diffHours}කට පෙර`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    if (diffDays === 1) return 'ඊයේ';
    return `දවස් ${diffDays} කට පෙර`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    if (diffMonths === 1) return 'මසකට පෙර';
    return `මස ${diffMonths}කට පෙර`;
  }

  const diffYears = Math.floor(diffDays / 365);
  if (diffYears <= 1) {
    return 'වසරකට පෙර';
  }
  return `අවුරුදු ${diffYears}කට කලින්`;
}
window.formatRelativeTimeSinhala = formatRelativeTimeSinhala;

// Photo Collage Generator for Post Cards
function renderPostImagesCollage(post) {
  const images = (post.images && post.images.length > 0)
    ? post.images
    : (post.image ? [post.image] : []);

  if (images.length === 0) return '';

  const cleanImages = images.map(img => Security.sanitizeUrl(img) || img).filter(Boolean);
  if (cleanImages.length === 0) return '';

  // Cache images globally by post ID for instant, 100% reliable click access without attribute size limits
  if (typeof window !== 'undefined') {
    window._postImagesMap = window._postImagesMap || {};
    window._postImagesMap[String(post.id)] = cleanImages;
  }

  // 1 Image (Full View)
  if (cleanImages.length === 1) {
    return `
      <div class="photo-collage-container" data-post-id="${post.id}" onclick="openPostLightbox('${post.id}', 0, this)" role="button" tabindex="0" style="cursor: pointer;">
        <div class="collage-grid collage-1">
          <div class="collage-item" data-index="0" onclick="event.stopPropagation(); openPostLightbox('${post.id}', 0, this)" role="button" tabindex="0" style="cursor: pointer;">
            <img src="${cleanImages[0]}" alt="${Security.escapeHTML(post.title || '')}" onclick="event.stopPropagation(); openPostLightbox('${post.id}', 0, this)" loading="lazy" role="button" style="cursor: pointer;">
          </div>
        </div>
      </div>
    `;
  }

  // 2 Images (Side by Side)
  if (cleanImages.length === 2) {
    return `
      <div class="photo-collage-container" data-post-id="${post.id}" onclick="openPostLightbox('${post.id}', 0, this)" role="button" tabindex="0" style="cursor: pointer;">
        <div class="collage-grid collage-2">
          ${cleanImages.map((img, i) => `
            <div class="collage-item" data-index="${i}" onclick="event.stopPropagation(); openPostLightbox('${post.id}', ${i}, this)" role="button" tabindex="0" style="cursor: pointer;">
              <img src="${img}" alt="ඡායාරූපය ${i+1}" onclick="event.stopPropagation(); openPostLightbox('${post.id}', ${i}, this)" loading="lazy" role="button" style="cursor: pointer;">
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 3 Images (1 Large, 2 Stacked)
  if (cleanImages.length === 3) {
    return `
      <div class="photo-collage-container" data-post-id="${post.id}" onclick="openPostLightbox('${post.id}', 0, this)" role="button" tabindex="0" style="cursor: pointer;">
        <div class="collage-grid collage-3">
          ${cleanImages.map((img, i) => `
            <div class="collage-item" data-index="${i}" onclick="event.stopPropagation(); openPostLightbox('${post.id}', ${i}, this)" role="button" tabindex="0" style="cursor: pointer;">
              <img src="${img}" alt="ඡායාරූපය ${i+1}" onclick="event.stopPropagation(); openPostLightbox('${post.id}', ${i}, this)" loading="lazy" role="button" style="cursor: pointer;">
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 4 Images (2x2 Grid)
  if (cleanImages.length === 4) {
    return `
      <div class="photo-collage-container" data-post-id="${post.id}" onclick="openPostLightbox('${post.id}', 0, this)" role="button" tabindex="0" style="cursor: pointer;">
        <div class="collage-grid collage-4">
          ${cleanImages.map((img, i) => `
            <div class="collage-item" data-index="${i}" onclick="event.stopPropagation(); openPostLightbox('${post.id}', ${i}, this)" role="button" tabindex="0" style="cursor: pointer;">
              <img src="${img}" alt="ඡායාරූපය ${i+1}" onclick="event.stopPropagation(); openPostLightbox('${post.id}', ${i}, this)" loading="lazy" role="button" style="cursor: pointer;">
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 5 or More Images (Collage with +N Overlay on the 5th)
  const displayImages = cleanImages.slice(0, 5);
  const remainingCount = cleanImages.length - 5;

  return `
    <div class="photo-collage-container" data-post-id="${post.id}" onclick="openPostLightbox('${post.id}', 0, this)" role="button" tabindex="0" style="cursor: pointer;">
      <div class="collage-grid collage-5">
        ${displayImages.map((img, i) => {
          const isLast = (i === 4 && remainingCount > 0);
          return `
            <div class="collage-item" data-index="${i}" onclick="event.stopPropagation(); openPostLightbox('${post.id}', ${i}, this)" role="button" tabindex="0" style="cursor: pointer;">
              <img src="${img}" alt="ඡායාරූපය ${i+1}" onclick="event.stopPropagation(); openPostLightbox('${post.id}', ${i}, this)" loading="lazy" role="button" style="cursor: pointer;">
              ${isLast ? `
                <div class="collage-overlay">
                  <span>+${remainingCount + 1}</span>
                  <span class="sub-text">තවත් ඡායාරූප</span>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// ============================================================================
// YouTube Shorts and Video URL Parser & Embed Engine
// ============================================================================
export function parseVideoUrl(inputUrl) {
  if (!inputUrl || typeof inputUrl !== 'string') return null;
  const url = inputUrl.trim();
  
  // YouTube regex covering shorts, watch?v=, youtu.be, embed, live
  const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(ytRegex);
  
  if (match && match[1]) {
    const videoId = match[1];
    const isShorts = url.toLowerCase().includes('/shorts/');
    const videoThumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    return {
      type: 'youtube',
      videoId,
      isShorts,
      videoUrl: url,
      videoThumbnail
    };
  }

  return null;
}
window.parseVideoUrl = parseVideoUrl;

// Video Input Handlers in Post Composer
window.handleVideoUrlInput = function(e) {
  const url = (e.target?.value || '').trim();
  const clearBtn = document.getElementById('clearVideoBtn');
  const previewCard = document.getElementById('videoPreviewContainer');
  const previewThumb = document.getElementById('videoPreviewThumb');
  const previewBadge = document.getElementById('videoPreviewBadge');
  const previewTitle = document.getElementById('videoPreviewTitle');

  if (clearBtn) clearBtn.style.display = url ? 'flex' : 'none';

  if (!url) {
    if (previewCard) previewCard.style.display = 'none';
    return;
  }

  const parsed = parseVideoUrl(url);
  if (parsed && previewCard && previewThumb) {
    previewThumb.src = parsed.videoThumbnail;
    if (previewBadge) previewBadge.textContent = parsed.isShorts ? 'Shorts' : 'Video';
    if (previewTitle) previewTitle.textContent = parsed.isShorts ? 'YouTube Shorts හඳුනාගැනිණි' : 'YouTube වීඩියෝව හඳුනාගැනිණි';
    previewCard.style.display = 'flex';
  } else if (previewCard) {
    previewCard.style.display = 'none';
  }
};

window.clearVideoUrlInput = function() {
  const input = document.getElementById('postVideoUrl');
  if (input) input.value = '';
  const clearBtn = document.getElementById('clearVideoBtn');
  if (clearBtn) clearBtn.style.display = 'none';
  const previewCard = document.getElementById('videoPreviewContainer');
  if (previewCard) previewCard.style.display = 'none';
};

// ============================================================================
// Dedicated Standalone Shorts / Reel Upload Handlers
// ============================================================================
window.openShortsUploadModal = function() {
  if (isGuestUser()) {
    showAuthRequiredModal('නව Short Reel එකක් පළ කිරීමට');
    return;
  }

  try {
    history.pushState({ type: 'modal', id: 'shortsUploadModal' }, '');
  } catch (e) {}

  const modal = document.getElementById('shortsUploadModal');
  if (modal) {
    modal.classList.remove('hidden');
    clearStandaloneShortsInput();
    const captionEl = document.getElementById('standaloneShortsCaption');
    if (captionEl) captionEl.value = '';
    const input = document.getElementById('standaloneShortsUrl');
    if (input) {
      setTimeout(() => input.focus(), 250);
    }
  }
};

window.closeShortsModal = function() {
  const modal = document.getElementById('shortsUploadModal');
  if (modal) modal.classList.add('hidden');
  clearStandaloneShortsInput();
  const captionEl = document.getElementById('standaloneShortsCaption');
  if (captionEl) captionEl.value = '';
};

window.handleStandaloneShortsInput = function(e) {
  const url = (e.target?.value || '').trim();
  const clearBtn = document.getElementById('clearStandaloneShortsBtn');
  const previewCard = document.getElementById('standaloneShortsPreview');
  const previewThumb = document.getElementById('standaloneShortsThumb');
  const previewBadge = document.getElementById('standaloneShortsBadgeText');
  const previewTitle = document.getElementById('standaloneShortsTitle');

  if (clearBtn) clearBtn.style.display = url ? 'flex' : 'none';

  if (!url) {
    if (previewCard) previewCard.style.display = 'none';
    return;
  }

  const parsed = parseVideoUrl(url);
  if (parsed && previewCard && previewThumb) {
    previewThumb.src = parsed.videoThumbnail;
    if (previewBadge) previewBadge.textContent = parsed.isShorts ? 'Shorts' : 'Video';
    if (previewTitle) previewTitle.textContent = parsed.isShorts ? 'YouTube Shorts හඳුනාගැනිණි' : 'YouTube වීඩියෝව හඳුනාගැනිණි';
    previewCard.style.display = 'flex';
  } else if (previewCard) {
    previewCard.style.display = 'none';
  }
};

window.clearStandaloneShortsInput = function() {
  const input = document.getElementById('standaloneShortsUrl');
  if (input) input.value = '';
  const clearBtn = document.getElementById('clearStandaloneShortsBtn');
  if (clearBtn) clearBtn.style.display = 'none';
  const previewCard = document.getElementById('standaloneShortsPreview');
  if (previewCard) previewCard.style.display = 'none';
};

window.handleShortsUploadSubmit = async function(e) {
  e.preventDefault();

  // Anti-Bot Honeypot Trap: Automated spam bots filling hidden fields are immediately discarded
  const honeypotVal = (document.getElementById('shortsHoneypot')?.value || '').trim();
  if (honeypotVal) {
    console.warn('[Security] Automated bot submission rejected via shorts honeypot trap.');
    closeShortsModal();
    return;
  }

  // Authentication Guard: Guests must log in first
  if (isGuestUser()) {
    showAuthRequiredModal('නව Short Reel එකක් පළ කිරීමට');
    return;
  }

  const input = document.getElementById('standaloneShortsUrl');
  const url = (input?.value || '').trim();
  const parsed = parseVideoUrl(url);

  if (!parsed || !parsed.videoId) {
    alert("කරුණාකර වලංගු YouTube Shorts හෝ Video සබැඳියක් (Link) ඇතුළත් කරන්න.");
    if (input) input.focus();
    return;
  }

  const caption = (document.getElementById('standaloneShortsCaption')?.value || '').trim();
  const submitBtn = document.getElementById('submitShortsBtn');
  const submitBtnText = document.getElementById('submitShortsBtnText');

  const safeTitle = caption ? (caption.length > 50 ? caption.substring(0, 50) + '...' : caption) : 'ධර්ම Shorts';
  const safeDesc = caption || 'ධර්ම Shorts කෙටි වීඩියෝවක්';

  try {
    if (submitBtn) submitBtn.disabled = true;
    if (submitBtnText) submitBtnText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> පළවෙමින් පවතී...';

    await StorageService.createPost({
      type: 'general',
      title: safeTitle,
      description: safeDesc,
      category: 'ධර්ම දානමය',
      visibility: 'public',
      location: '',
      contact: '',
      image: parsed.videoThumbnail,
      images: [parsed.videoThumbnail],
      videoUrl: parsed.videoUrl,
      videoId: parsed.videoId,
      videoType: 'youtube',
      isShorts: true,
      videoThumbnail: parsed.videoThumbnail,
      isOfficial: false,
      isPinned: false
    });

    SoundService.playPublish();
    triggerHaptic([30, 60, 30]);
    closeShortsModal();

    // If reels modal was open or closed, reload reels viewer so the new Short appears immediately
    setTimeout(() => {
      openReelsViewer();
    }, 400);

  } catch (err) {
    alert("දෝෂයකි: " + err.message);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (submitBtnText) submitBtnText.innerHTML = 'පුණ්‍ය දැක්මට එක් කරන්න';
  }
};

// Video Facade Generator for Feed Cards (Directly opens in Fullscreen Dharma Reels)
function renderPostVideo(post) {
  if (!post || !post.videoId) return '';

  const isShorts = !!post.isShorts;
  const thumbUrl = Security.sanitizeUrl(post.videoThumbnail) || `https://img.youtube.com/vi/${encodeURIComponent(post.videoId)}/hqdefault.jpg`;
  const containerClass = isShorts ? 'shorts-container' : 'standard-container';

  return `
    <div class="post-video-container ${containerClass}" id="video-container-${post.id}">
      <div class="video-facade" onclick="openReelsViewer('${post.id}')" style="cursor: pointer;" title="පුණ්‍ය දැක්ම තුළ නරඹන්න">
        <img src="${thumbUrl}" class="video-facade-thumb" alt="${Security.escapeHTML(post.title || 'Video')}" loading="lazy">
        <div class="video-facade-overlay">
          <div class="video-facade-top-badge">
            <i class="fa-brands fa-youtube" style="color: #ef4444;"></i>
            <span>${isShorts ? 'ධර්ම Shorts' : 'ධර්ම වීඩියෝව'}</span>
          </div>

          <div class="video-facade-play-center">
            <div class="glowing-play-btn" title="පුණ්‍ය දැක්මෙන් නරඹන්න">
              <i class="fa-solid fa-play"></i>
            </div>
          </div>

          <div class="video-facade-bottom-actions">
            <button type="button" class="video-reels-btn" onclick="event.stopPropagation(); openReelsViewer('${post.id}')" title="පුණ්‍ය දැක්ම තුළ සම්පූර්ණ තිරයෙන් නරඹන්න">
              <i class="fa-solid fa-expand"></i>
              <span>පුණ්‍ය දැක්මෙන් බලන්න</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Inline Video Player Trigger (Redirects seamlessly to Fullscreen Reels)
window.playPostVideo = function(postId, videoId, isShorts) {
  window.openReelsViewer(postId);
};

function escapeRegex(str) {
  return (str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatCommentTextWithMentions(rawText) {
  if (!rawText) return '';
  let escaped = Security.escapeHTML(rawText);

  // 1. If we have cached community members, match specific member names first
  const members = window.allCommunityMembersCache || [];
  if (Array.isArray(members) && members.length > 0) {
    const sorted = [...members].sort((a, b) => ((b.name || '').length - (a.name || '').length));
    sorted.forEach(m => {
      if (!m.name || !m.name.trim()) return;
      const escName = Security.escapeHTML(m.name.trim());
      const pattern = new RegExp(`@${escapeRegex(escName)}(?=[\\s.,!?;:)]|$)`, 'g');
      escaped = escaped.replace(pattern, `<span class="comment-mention-tag" onclick="event.stopPropagation(); viewUserProfile('${m.uid}', '${escName.replace(/'/g, "\\'")}')" title="${escName} ගේ Profile එක බලන්න">@${escName}</span>`);
    });
  }

  // 2. Generic fallback for any other @name pattern
  escaped = escaped.replace(/(^|\s)@([a-zA-Z0-9\u0D80-\u0DFF_.-]+)/g, (match, prefix, name) => {
    if (match.includes('comment-mention-tag')) return match;
    return `${prefix}<span class="comment-mention-tag" title="@${name}">@${name}</span>`;
  });

  return escaped;
}

// Render single comment / blessing HTML with author profile picture, edit controls & WhatsApp-style emoji reactions
function renderSingleCommentHTML(c, postId, user, index) {
  if (!c) return '';
  const currentUser = user || StorageService.currentUser || {};
  const currentUid = currentUser.uid || 'anonymous';
  const currentName = (currentUser.name || '').trim();
  const isMaster = StorageService.isMasterAdmin();
  const cAuthorName = StorageService.resolveAuthorName(c);
  const cAuthorPhoto = StorageService.resolveAuthorPhoto(c);
  const isCommentSangha = StorageService.isSangha(c) || StorageService.isSangha({ name: cAuthorName, authorRole: c.authorRole });
  const isCommentMaster = StorageService.isMasterAdmin(c);
  const isCommentSubAdmin = !isCommentMaster && StorageService.isSubAdmin(c);
  
  if (!c.id) {
    c.id = 'c_' + postId + '_' + (index !== undefined ? index : '0');
  }
  const commentKey = c.id;

  const isOwner = (c.uid && c.uid === currentUid) || 
                  (c.author && c.author.trim() === currentName) ||
                  (cAuthorName && cAuthorName.trim() === currentName);
  const canEditComment = isOwner || isMaster;

  const reactions = (c.reactions && typeof c.reactions === 'object') ? c.reactions : {};

  return `
    <div class="comment-bubble" id="comment-bubble-${commentKey}">
      <div class="comment-avatar ${isCommentSangha ? 'sangha-framed-avatar' : ''}" onclick="viewUserProfile('${c.uid || ''}', '${Security.escapeHTML(cAuthorName)}')" style="cursor: pointer;" title="${Security.escapeHTML(cAuthorName)} ගේ Profile එක බලන්න">
        ${cAuthorPhoto ? `<img src="${Security.sanitizeUrl(cAuthorPhoto)}" alt="${Security.escapeHTML(cAuthorName)}" loading="lazy">` : `<span>${Security.escapeHTML(cAuthorName.charAt(0) || '👤')}</span>`}
        ${isCommentSangha ? '<img src="assets/sangha-frame.png" class="sangha-vatapatha-frame" alt="වටාපත">' : ''}
      </div>
      <div class="comment-text-box">
        <div class="comment-author-row">
          <div class="comment-meta-left">
            <span class="author-click-link" onclick="viewUserProfile('${c.uid || ''}', '${Security.escapeHTML(cAuthorName)}')" style="cursor: pointer; font-weight: 700; color: #1e293b;" title="${Security.escapeHTML(cAuthorName)} ගේ Profile එක බලන්න">${Security.escapeHTML(cAuthorName)}</span>
            ${isCommentMaster ? `<span class="badge-crown" title="Master Admin">👑</span>` : (isCommentSubAdmin ? `<span class="badge-shield" title="පරිපාලක (Admin)">🛡️</span>` : '')}
            ${isCommentSangha ? '<span class="sangha-author-badge" style="padding: 1.5px 7px; font-size: 0.62rem; margin-left: 4px;"><i class="fa-solid fa-dharmachakra"></i> පූජනීය සංඝරත්නය</span>' : ''}
            <span class="comment-time">${Security.escapeHTML(formatRelativeTimeSinhala(c.timestamp, c.time || 'දැන්'))}</span>
            ${c.isEdited ? '<span class="comment-edited-tag" title="මෙම ප්‍රාර්ථනාව සංස්කරණය කරන ලදී">(සංස්කරණය කළ)</span>' : ''}
          </div>
          <div class="comment-actions-right">
            ${canEditComment ? `
              <button type="button" class="btn-comment-action-mini" onclick="openEditCommentModal('${postId}', '${commentKey}')" title="${isMaster && !isOwner ? 'Admin ලෙස ප්‍රාර්ථනාව සංස්කරණය කරන්න' : 'ප්‍රාර්ථනාව සංස්කරණය කරන්න'}">
                <i class="fa-solid fa-pen"></i>
              </button>
            ` : ''}
          </div>
        </div>

        <div class="comment-body" id="comment-body-${commentKey}">${formatCommentTextWithMentions(c.text)}</div>

        <!-- WhatsApp-Style Emoji Reactions Bar on the corner of the prayer -->
        <div class="comment-reactions-footer">
          <div class="comment-emoji-bar">
            ${['🙏', '🪷', '❤️', '✨'].map(emoji => {
              const userList = (reactions[emoji] && Array.isArray(reactions[emoji])) ? reactions[emoji] : [];
              const count = userList.length;
              const hasReacted = userList.includes(currentUid);
              return `
                <button type="button" class="comment-emoji-pill ${hasReacted ? 'active' : ''} ${count > 0 ? 'has-count' : ''}" onclick="handleCommentReaction('${postId}', '${commentKey}', '${emoji}')" title="${emoji} ප්‍රතිචාරය දක්වන්න">
                  <span class="emoji-icon">${emoji}</span>
                  ${count > 0 ? `<span class="emoji-count">${count}</span>` : ''}
                </button>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderCommentsListHTML(postId, comments, user) {
  if (!Array.isArray(comments) || comments.length === 0) {
    return '';
  }
  return comments.map((c, idx) => renderSingleCommentHTML(c, postId, user, idx)).join('');
}

function appendCommentToDOM(postId, newComment) {
  const listEl = document.getElementById(`comments-list-${postId}`);
  if (!listEl) return;

  const commentKey = newComment.id;
  // If the comment was already rendered by reactive in-place sync, don't duplicate it!
  if (commentKey) {
    const existingEl = document.getElementById(`comment-bubble-${commentKey}`);
    if (existingEl) {
      try {
        existingEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch (e) {}
      return;
    }
  }

  const user = StorageService.currentUser;
  const existingBubbles = listEl.querySelectorAll('.comment-bubble').length;
  const commentHTML = renderSingleCommentHTML(newComment, postId, user, existingBubbles);
  listEl.insertAdjacentHTML('beforeend', commentHTML);

  const finalKey = commentKey || ('c_' + postId + '_' + existingBubbles);
  const newEl = document.getElementById(`comment-bubble-${finalKey}`);
  if (newEl) {
    try {
      newEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (e) {}
  }
}

function renderCommentsListContent(postId, comments) {
  const listEl = document.getElementById(`comments-list-${postId}`);
  if (!listEl) return;
  const user = StorageService.currentUser;
  listEl.innerHTML = renderCommentsListHTML(postId, comments, user);
}

function updatePostCommentCountUI(postId) {
  const allPosts = StorageService.getLocalPosts() || [];
  const targetPost = allPosts.find(p => p.id === postId);
  const count = (targetPost && Array.isArray(targetPost.comments)) ? targetPost.comments.length : 0;

  const btnC = document.getElementById(`comments-btn-${postId}`);
  const statC = document.getElementById(`stat-comments-${postId}`);
  if (btnC) btnC.innerText = count;
  if (statC) statC.innerText = count;
}

// Reusable Post Card HTML Generator
function renderPostCardHTML(post, user) {
  const isMaster = StorageService.isMasterAdmin();
  const isOwner = post.uid === user.uid;
  const canDelete = isOwner || isMaster;
  const canEditPost = isOwner || isMaster;
  const comments = post.comments || [];
  const isNeed = post.type === 'need';
  const isGeneral = post.type === 'general';
  const isRepost = post.type === 'repost' || post.isRepost === true || !!post.originalPost;
  const orig = post.originalPost;
  const currentUserUid = user && user.uid ? user.uid : 'anonymous';
  const sadhuUsers = Array.isArray(post.sadhuUsers) ? post.sadhuUsers : [];
  const hasGivenSadhu = sadhuUsers.includes(currentUserUid) || StorageService.hasUserGivenSadhu(post, currentUserUid);

  const isTrending = (currentFeedSort === 'trending' && FeedAlgorithm.isTrendingPost(post, currentPostsData));

  // Dynamically resolved author details (syncs immediately when someone updates profile name/photo)
  const postAuthorName = StorageService.resolveAuthorName(post);
  const postAuthorPhoto = StorageService.resolveAuthorPhoto(post);
  const isAuthorSangha = StorageService.isSangha(post) || StorageService.isSangha({ name: postAuthorName, authorRole: post.authorRole });
  const isAuthorMaster = StorageService.isMasterAdmin(post);
  const isAuthorSubAdmin = !isAuthorMaster && StorageService.isSubAdmin(post);
  const origAuthorName = orig ? StorageService.resolveAuthorName(orig) : '';
  const origAuthorPhoto = orig ? StorageService.resolveAuthorPhoto(orig) : null;
  if (orig && typeof window !== 'undefined') {
    const origImages = (orig.images && orig.images.length > 0) ? orig.images : (orig.image ? [orig.image] : []);
    const cleanOrigImages = origImages.map(img => Security.sanitizeUrl(img)).filter(Boolean);
    if (cleanOrigImages.length > 0) {
      window._postImagesMap = window._postImagesMap || {};
      window._postImagesMap[orig.id] = cleanOrigImages;
    }
  }

  return `
    <article class="post-card ${isNeed ? 'need-card' : ''} ${isRepost ? 'repost-card' : ''} ${post.isOfficial ? 'official-card' : ''} ${isAuthorSangha ? 'sangha-card' : ''}" id="post-elem-${post.id}">
      
      <!-- Pinned Banner (For non-official pinned posts) -->
      ${(!post.isOfficial && post.isPinned) ? `
        <div style="background: rgba(217, 119, 6, 0.08); color: #b45309; padding: 6px 14px; font-size: 0.74rem; font-weight: 700; display: flex; align-items: center; gap: 6px; border-bottom: 1px dashed rgba(217,119,6,0.25);">
          <i class="fa-solid fa-thumbtack" style="transform: rotate(45deg); color: #d97706;"></i>
          <span>පවුරේ මුදුනටම අමුණා ඇත (Pinned to Top)</span>
        </div>
      ` : ''}

      <!-- Repost Header (If Reposted) -->
      ${isRepost ? `
        <div class="repost-header-tag">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="repost-icon-circle" onclick="viewUserProfile('${post.uid}', '${Security.escapeHTML(postAuthorName)}')" style="cursor: pointer;" title="${Security.escapeHTML(postAuthorName)} ගේ Profile එක බලන්න">
              <i class="fa-solid fa-repeat"></i>
            </div>
            <div>
              <span class="repost-actor-name ${post.isOfficial ? '' : 'author-click-link'}" ${post.isOfficial ? '' : `onclick="viewUserProfile('${post.uid}', '${Security.escapeHTML(postAuthorName)}')"`} title="${Security.escapeHTML(postAuthorName)} ගේ Profile එක බලන්න"><strong>${Security.escapeHTML(post.isOfficial ? 'අපේ පිං පොත' : postAuthorName)}</strong> විසින් යළි බෙදාගන්නා ලදී</span>
              <span class="repost-time">${Security.escapeHTML(formatRelativeTimeSinhala(post.timestamp, post.date || 'දැන්'))}</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            ${isMaster ? `
              <button class="post-pin-btn ${post.isPinned ? 'is-pinned' : ''}" onclick="togglePinPrompt('${post.id}')" title="${post.isPinned ? 'Pin ඉවත් කරන්න' : 'මුදුනටම Pin කරන්න'}">
                <i class="fa-solid fa-thumbtack"></i>
              </button>
            ` : ''}
            ${canDelete ? `
              <button class="post-delete-btn ${isMaster && !isOwner ? 'admin-delete-btn' : ''}" onclick="deletePostPrompt('${post.id}')" title="${isMaster && !isOwner ? 'Master Admin ලෙස මකා දමන්න' : 'මකා දමන්න'}">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            ` : ''}
          </div>
        </div>

        ${post.description ? `
          <div class="repost-comment-bubble">
            <p>${Security.escapeHTML(post.description)}</p>
          </div>
        ` : ''}

        ${orig ? `
          <div class="quoted-merit-box" onclick="viewOriginalPost('${orig.id}', '${post.id}')" title="සම්පූර්ණ මුල් සටහන බලන්න ක්ලික් කරන්න">
            <div class="quoted-merit-header">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div class="quoted-avatar" onclick="event.stopPropagation(); viewUserProfile('${orig.uid}', '${Security.escapeHTML(origAuthorName)}')" style="cursor: pointer;" title="${Security.escapeHTML(origAuthorName)} ගේ Profile එක බලන්න">${origAuthorPhoto ? `<img src="${Security.sanitizeUrl(origAuthorPhoto)}" style="width: 100%; height: 100%; border-radius: 9999px; object-fit: cover;">` : Security.escapeHTML(origAuthorName.charAt(0))}</div>
                <div>
                  <div class="author-click-link" onclick="event.stopPropagation(); viewUserProfile('${orig.uid}', '${Security.escapeHTML(origAuthorName)}')" title="${Security.escapeHTML(origAuthorName)} ගේ Profile එක බලන්න" style="font-weight: 700; font-size: 0.82rem; color: #78350f;">${Security.escapeHTML(origAuthorName)}</div>
                  <div style="font-size: 0.68rem; color: #94a3b8;">${Security.escapeHTML(formatRelativeTimeSinhala(orig.timestamp, orig.date || 'මෑතකදී'))} ${orig.location ? '• ' + Security.escapeHTML(orig.location) : ''}</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="post-badge category">${Security.escapeHTML(orig.category || 'පින්කම')}</span>
                <span style="font-size: 0.72rem; color: #d97706; font-weight: 600; background: rgba(245, 158, 11, 0.12); padding: 2px 7px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;">
                  <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 10px;"></i> බලන්න
                </span>
              </div>
            </div>
            <h4 class="quoted-merit-title">${Security.escapeHTML(orig.title)}</h4>
            <p class="quoted-merit-desc">${Security.escapeHTML(orig.description || '')}</p>
            ${orig.videoId ? `
              <div class="quoted-merit-video-wrap" style="position: relative; border-radius: 10px; overflow: hidden; margin-top: 8px; max-width: 340px; cursor: pointer;" onclick="event.stopPropagation(); openReelsViewer('${orig.id}')" title="පුණ්‍ය දැක්ම තුළ නරඹන්න">
                <img src="${Security.sanitizeUrl(orig.videoThumbnail || `https://img.youtube.com/vi/${orig.videoId}/hqdefault.jpg`)}" alt="${Security.escapeHTML(orig.title)}" loading="lazy" style="width: 100%; max-height: 200px; object-fit: cover;">
                <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;">
                  <div class="glowing-play-btn" style="width: 44px; height: 44px; font-size: 1rem;"><i class="fa-solid fa-play"></i></div>
                </div>
              </div>
            ` : (orig.image || (orig.images && orig.images.length > 0) ? `
              <div class="quoted-merit-image" onclick="event.stopPropagation(); openPostLightbox('${orig.id}', 0, this)" style="cursor: pointer;" title="ඡායාරූපය විශාල කර බලන්න" role="button" tabindex="0">
                <img src="${Security.sanitizeUrl(orig.image || orig.images[0])}" alt="${Security.escapeHTML(orig.title)}" onclick="event.stopPropagation(); openPostLightbox('${orig.id}', 0, this)" loading="lazy" style="cursor: pointer;" role="button">
              </div>
            ` : '')}
          </div>
        ` : ''}
      ` : `
        <!-- Standard Post Header -->
        <div class="post-header">
          <div class="post-author-info">
            ${post.isOfficial ? `
              <div class="post-avatar official-avatar-circle" title="අපේ පිං පොත">
                <i class="fa-solid fa-dharmachakra" style="font-size: 1.35rem; color: #fef3c7; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));"></i>
              </div>
              <div>
                <div class="post-badges-wrap" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                  <span class="post-author-name official-author-name">අපේ පිං පොත</span>
                  ${post.visibility === 'private' ? '<span class="post-badge private"><i class="fa-solid fa-lock" style="font-size: 9px;"></i> Private</span>' : ''}
                </div>
                <div class="post-meta-sub">
                  <span>${Security.escapeHTML(formatRelativeTimeSinhala(post.timestamp, post.date || 'දැන්'))}</span>
                  ${post.location ? `<span>• <i class="fa-solid fa-location-dot" style="color: #d97706;"></i> ${Security.escapeHTML(post.location)}</span>` : ''}
                  <span>• <i class="fa-solid fa-earth-asia" style="font-size: 10px;"></i></span>
                </div>
              </div>
            ` : `
              <div class="post-avatar ${isNeed ? 'need' : ''} ${isAuthorSangha ? 'sangha-framed-avatar' : ''}" onclick="viewUserProfile('${post.uid}', '${Security.escapeHTML(postAuthorName)}')" style="cursor: pointer;" title="${Security.escapeHTML(postAuthorName)} ගේ Profile එක බලන්න">
                ${postAuthorPhoto ? `<img src="${Security.sanitizeUrl(postAuthorPhoto)}" style="width: 100%; height: 100%; border-radius: 9999px; object-fit: cover;">` : `<span>${Security.escapeHTML(postAuthorName.charAt(0))}</span>`}
                ${isAuthorSangha ? '<img src="assets/sangha-frame.png" class="sangha-vatapatha-frame" alt="වටාපත">' : ''}
              </div>
              <div>
                <div class="post-badges-wrap">
                  <span class="post-author-name author-click-link" onclick="viewUserProfile('${post.uid}', '${Security.escapeHTML(postAuthorName)}')" style="cursor: pointer;" title="${Security.escapeHTML(postAuthorName)} ගේ Profile එක බලන්න">${Security.escapeHTML(postAuthorName)}</span>
                  ${isAuthorMaster ? `<span class="badge-crown" title="Master Admin">👑</span>` : (isAuthorSubAdmin ? `<span class="badge-shield" title="පරිපාලක (Admin)">🛡️</span>` : '')}
                  ${isAuthorSangha ? `
                    <span class="sangha-author-badge" title="පූජනීය මහා සංඝරත්නය"><i class="fa-solid fa-dharmachakra"></i> පූජනීය සංඝරත්නය</span>
                  ` : ''}
                  ${isTrending ? '<span class="post-badge trending-badge" title="පින්වතුන් බොහෝදෙනෙකුගේ සාදුකාර ලැබූ ප්‍රමුඛ සටහනක්"><i class="fa-solid fa-fire-flame-curved"></i> ප්‍රමුඛ</span>' : ''}
                  ${!isGeneral ? `<span class="post-badge category">${Security.escapeHTML(post.category)}</span>` : ''}
                  ${isNeed ? '<span class="post-badge need">🤝 සත්කාර ඉල්ලීමක්</span>' : ''}
                  ${isNeed && post.isVerifiedNeed ? '<span class="verified-need-badge" title="පරිපාලනය විසින් සත්‍යාපනය කරන ලද සත්කාරයකි"><i class="fa-solid fa-circle-check"></i> සත්‍යාපිත සත්කාරයකි</span>' : ''}
                  ${post.visibility === 'private' ? '<span class="post-badge private"><i class="fa-solid fa-lock" style="font-size: 9px;"></i> Private</span>' : ''}
                </div>
                <div class="post-meta-sub">
                  <span>${Security.escapeHTML(formatRelativeTimeSinhala(post.timestamp, post.date || 'දැන්'))}</span>
                  ${post.isEdited ? `<span class="post-edited-tag" title="මෙම සටහන සංස්කරණය කරන ලදී">(සංස්කරණය කළ)</span>` : ''}
                  ${post.location ? `<span>• <i class="fa-solid fa-location-dot" style="color: #d97706;"></i> ${Security.escapeHTML(post.location)}</span>` : ''}
                  <span>• <i class="fa-solid ${post.visibility === 'private' ? 'fa-lock' : 'fa-earth-asia'}" style="font-size: 10px;"></i></span>
                </div>
              </div>
            `}
          </div>

          <div style="display: flex; align-items: center; gap: 6px;">
            ${isMaster && isNeed ? `
              <button class="post-verify-btn ${post.isVerifiedNeed ? 'verified' : ''}" onclick="toggleVerifyNeedPrompt('${post.id}')" title="${post.isVerifiedNeed ? 'සත්‍යාපනය ඉවත් කරන්න' : 'සත්කාරය සත්‍යාපනය කරන්න'}">
                <i class="fa-solid fa-circle-check"></i> <span class="btn-text-resp">${post.isVerifiedNeed ? 'Verified' : 'Verify'}</span>
              </button>
            ` : ''}
            ${isMaster ? `
              <button class="post-pin-btn ${post.isPinned ? 'is-pinned' : ''}" onclick="togglePinPrompt('${post.id}')" title="${post.isPinned ? 'Pin ඉවත් කරන්න' : 'මුදුනටම Pin කරන්න'}">
                <i class="fa-solid fa-thumbtack"></i>
              </button>
            ` : ''}
            ${canEditPost ? `
              <button class="post-edit-btn" onclick="openEditPostModal('${post.id}')" title="${isMaster && !isOwner ? 'Admin ලෙස සංස්කරණය කරන්න' : 'සටහන සංස්කරණය කරන්න'}">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
            ` : ''}
            ${canDelete ? `
              <button class="post-delete-btn ${isMaster && !isOwner ? 'admin-delete-btn' : ''}" onclick="deletePostPrompt('${post.id}')" title="${isMaster && !isOwner ? 'Master Admin ලෙස මකා දමන්න' : 'මකා දමන්න'}">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Post Content Body -->
        <div class="post-content-body">
          ${(() => {
            const cleanTitle = (post.title || '').trim();
            const cleanDesc = (post.description || '').trim();
            
            const normTitle = cleanTitle.replace(/\.\.\.$/, '').replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").trim().toLowerCase();
            const normDesc = cleanDesc.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").trim().toLowerCase();

            const isDuplicate = !cleanTitle || 
              cleanTitle === 'පුණ්‍ය සිතුවිලි' || 
              cleanTitle === 'පින්කම් සටහන' || 
              cleanTitle === 'සාමාන්‍ය සටහන' ||
              isGeneral ||
              (normDesc.startsWith(normTitle)) ||
              (normTitle.startsWith(normDesc)) ||
              (normTitle === normDesc);

            if (!isDuplicate && (!post.isOfficial || cleanTitle !== 'පිං පොත නිල නිවේදනය')) {
              return `<h3 class="post-title">${Security.escapeHTML(cleanTitle)}</h3>`;
            }
            return '';
          })()}
          <p class="post-desc">${Security.escapeHTML(post.description)}</p>
        </div>

        <!-- Media Images or Video Player Facade Grid -->
        ${post.videoId ? renderPostVideo(post) : renderPostImagesCollage(post)}
      `}

      <!-- Action Buttons Grid -->
      ${post.isOfficial ? `
        <div class="post-actions-grid official-actions-single">
          <button class="post-btn official-sadhu-only-btn ${hasGivenSadhu ? 'liked' : ''}" id="sadhu-btn-${post.id}" onclick="handleSadhuClick('${post.id}', this)" title="${hasGivenSadhu ? 'සාදුකාරය ඉවත් කරන්න' : 'සාදුකාරයක් ලබා දෙන්න'}">
            <span class="post-btn-icon sadhu-icon" style="font-size: 1.15rem;">🙏</span>
            <span class="post-btn-count" style="font-weight: 700;">සාදුකාර (<strong id="count-btn-${post.id}">${Math.max(0, parseInt(post.sadhuCount, 10) || 0)}</strong>)</span>
          </button>
        </div>
      ` : `
        <div class="post-actions-grid">
          <button class="post-btn ${hasGivenSadhu ? 'liked' : ''}" id="sadhu-btn-${post.id}" onclick="handleSadhuClick('${post.id}', this)" title="${hasGivenSadhu ? 'සාදුකාරය ඉවත් කරන්න' : 'සාදුකාරයක් ලබා දෙන්න'}">
            <span class="post-btn-icon sadhu-icon">🙏</span>
            <span class="post-btn-count"><strong id="count-btn-${post.id}">${Math.max(0, parseInt(post.sadhuCount, 10) || 0)}</strong></span>
          </button>

          <button class="post-btn" onclick="toggleCommentsSection('${post.id}')" title="${isGeneral ? 'සුබපැතුම්' : 'ප්‍රාර්ථනා'} බලන්න හෝ එක් කරන්න">
            <i class="fa-regular fa-comment-dots" style="color: #d97706;"></i>
            <span class="post-btn-count"><strong id="comments-btn-${post.id}">${comments.length}</strong></span>
          </button>

          ${!isNeed && post.visibility !== 'private' ? `
            <button class="post-btn" onclick="openRepostModal('${isRepost && orig ? orig.id : post.id}')" title="පවුරට යළි බෙදාගන්න (Repost)">
              <i class="fa-solid fa-repeat" style="color: #059669;"></i>
              <span class="post-btn-count"><strong id="reposts-btn-${post.id}">${post.repostCount || 0}</strong></span>
            </button>
          ` : ''}

          ${isNeed && post.contact ? `
            <a href="tel:${Security.sanitizePhone(post.contact)}" class="post-btn call-action" title="සෘජුව අමතන්න">
              <i class="fa-solid fa-phone"></i>
              <span class="post-btn-count">අමතන්න</span>
            </a>
          ` : `
            <button class="post-btn" onclick="handleShare('${post.id}')" title="බාහිරව බෙදාගන්න (Share)">
              <i class="fa-solid fa-share-nodes" style="color: #94a3b8;"></i>
              <span class="post-btn-count"><strong id="shares-btn-${post.id}">${post.shareCount || 0}</strong></span>
            </button>
          `}
        </div>
      `}

      <!-- Comments & Blessings Section (Collapsed by default, disabled on official posts) -->
      ${post.isOfficial ? '' : `
      <div class="comments-section" id="comments-box-${post.id}" style="display: none;">
        <div class="quick-blessings-scroll">
          ${(isGeneral || post.category === 'සුබපැතුම්' || post.category === 'සිතුවිලි') ? `
            <button class="blessing-chip" onclick="submitQuickBlessing('${post.id}', 'සුබ උදෑසනක් වේවා! 🌅🙏')">
              🌅 සුබ උදෑසනක් වේවා!
            </button>
            <button class="blessing-chip" onclick="submitQuickBlessing('${post.id}', 'තෙරුවන් සරණයි! වාසනාවන්ත දිනයක් වේවා! 🪷')">
              🙏 තෙරුවන් සරණයි!
            </button>
            <button class="blessing-chip" onclick="submitQuickBlessing('${post.id}', 'සුවපත් ප්‍රීතිමත් දවසක් වේවා! ✨')">
              ✨ සුවපත් දිනයක් වේවා!
            </button>
            <button class="blessing-chip" onclick="submitQuickBlessing('${post.id}', 'සාදු! සාදු! සාදු! 🙏')">
              🙏 සාදු! සාදු!
            </button>
          ` : `
            <button class="blessing-chip" onclick="submitQuickBlessing('${post.id}', 'සාදු! සාදු! සාදු! 🙏')">
              🙏 සාදු! සාදු! සාදු!
            </button>
            <button class="blessing-chip" onclick="submitQuickBlessing('${post.id}', 'මේ උතුම් පිනෙන් නිදුක් නීරෝගී සුවය ලැබේවා! 🪷')">
              🪷 නිදුක් නීරෝගී සුව ලැබේවා!
            </button>
            <button class="blessing-chip" onclick="submitQuickBlessing('${post.id}', 'සියලු දෙනාටම උතුම් ධර්මාවබෝධය පිණිසම හේතු වේවා! ✨')">
              ✨ ධර්මාවබෝධය වේවා!
            </button>
          `}
        </div>

        <div class="comments-list" id="comments-list-${post.id}">
          ${renderCommentsListHTML(post.id, comments, user)}
        </div>

        <form class="comment-form" onsubmit="handleCommentSubmit(event, '${post.id}')" style="position: relative;">
          <input type="text" id="comment-input-${post.id}" class="comment-input" required placeholder="${isGeneral ? 'සුබපැතුමක් හෝ සටහනක් එක් කරන්න...' : 'පුණ්‍යානුමෝදනා සටහනක් එක් කරන්න...'}" oninput="handleCommentInputMention(this, '${post.id}')" onkeydown="handleCommentInputKeydown(event, '${post.id}')" autocomplete="off">
          <div id="mention-dropdown-${post.id}" class="mention-autocomplete-dropdown hidden"></div>
          <button type="submit" class="comment-send-btn">
            <i class="fa-solid fa-paper-plane"></i>
          </button>
        </form>
      </div>
      `}
    </article>
  `;
}

// In-place feed card updater (preserves scroll position and prevents jump/jitter during Sadhu clicks)
function updateFeedInPlace(posts) {
  const user = StorageService.currentUser;
  (posts || []).forEach(post => {
    const confirmedCount = Math.max(0, parseInt(post.sadhuCount, 10) || 0);
    const countEl = document.getElementById(`count-${post.id}`);
    const btnCountEl = document.getElementById(`count-btn-${post.id}`);
    const sadhuBtn = document.getElementById(`sadhu-btn-${post.id}`);

    if (countEl && countEl.innerText !== String(confirmedCount)) {
      countEl.innerText = confirmedCount;
    }
    if (btnCountEl && btnCountEl.innerText !== String(confirmedCount)) {
      btnCountEl.innerText = confirmedCount;
    }
    if (sadhuBtn) {
      const hasGiven = StorageService.hasUserGivenSadhu(post, user?.uid);
      sadhuBtn.classList.toggle('liked', hasGiven);
      sadhuBtn.title = hasGiven ? 'සාදුකාරය ඉවත් කරන්න' : 'සාදුකාරයක් ලබා දෙන්න';
    }

    // Sync comments count in-place
    const comments = Array.isArray(post.comments) ? post.comments : [];
    const commentsBtn = document.getElementById(`comments-btn-${post.id}`);
    const statComments = document.getElementById(`stat-comments-${post.id}`);
    if (commentsBtn && commentsBtn.innerText !== String(comments.length)) {
      commentsBtn.innerText = comments.length;
    }
    if (statComments && statComments.innerText !== String(comments.length)) {
      statComments.innerText = comments.length;
    }

    // If comments list is currently open / visible, sync comments list in-place!
    const commentsBox = document.getElementById(`comments-box-${post.id}`);
    if (commentsBox && commentsBox.style.display !== 'none') {
      renderCommentsListContent(post.id, comments);
    }
  });
}

// Render Newsfeed
function renderFeed() {
  const container = document.getElementById('postsContainer');
  if (!container) return;

  const searchQ = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
  const user = StorageService.currentUser;

  const isMaster = StorageService.isMasterAdmin();

  const filtered = currentPostsData.filter(post => {
    if (!post) return false;

    if (searchQ) {
      const matchTitle = (post.title || '').toLowerCase().includes(searchQ);
      const matchDesc = (post.description || '').toLowerCase().includes(searchQ);
      const matchLoc = (post.location || '').toLowerCase().includes(searchQ);
      if (!matchTitle && !matchDesc && !matchLoc) return false;
    }

    const isOfficial = StorageService.isOfficialPost ? StorageService.isOfficialPost(post) : (post.isOfficial || post.author === 'අපේ පිං පොත');

    if (activeTab === 'feed') {
      if (activeCategory !== 'සියල්ල' && post.category !== activeCategory && !post.isPinned && !isOfficial) return false;
      return isOfficial || post.visibility !== 'private';
    }

    if (activeTab === 'mybook') {
      if (activeCategory !== 'සියල්ල' && post.category !== activeCategory) return false;
      const isOwner = (user && post.uid === user.uid) ||
                      (user && user.email && post.authorEmail && post.authorEmail.toLowerCase() === user.email.toLowerCase()) ||
                      (isMaster && (isOfficial || post.uid === 'user_malith' || post.author === 'අපේ පිං පොත'));
      return isOwner;
    }

    if (activeTab === 'needs') {
      if (activeCategory !== 'සියල්ල' && post.category !== activeCategory) return false;
      return post.type === 'need';
    }

    return true;
  });

  // Deduplicate by post id
  const seenIds = new Set();
  const deduplicatedFiltered = [];
  for (const p of filtered) {
    if (p && p.id && !seenIds.has(p.id)) {
      seenIds.add(p.id);
      deduplicatedFiltered.push(p);
    }
  }

  // Rank using the intelligent FeedAlgorithm (Trending / Latest / Top Sadhu)
  const ranked = (activeTab === 'mybook')
    ? deduplicatedFiltered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    : FeedAlgorithm.rankPosts(deduplicatedFiltered, currentFeedSort);

  if (ranked.length === 0) {
    if (activeTab === 'mybook') {
      container.innerHTML = `
        <div class="card" style="padding: 48px 20px; text-align: center; border: 1.5px dashed rgba(217, 119, 6, 0.35); border-radius: 20px; background: linear-gradient(180deg, #fffdf8, #fff8ea);">
          <div style="width: 72px; height: 72px; border-radius: 50%; background: #fffbeb; border: 2px solid #fef3c7; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; box-shadow: 0 4px 16px rgba(245, 158, 11, 0.18);">
            <i class="fa-solid fa-dharmachakra animate-spin-slow" style="font-size: 2.2rem; color: #d97706;"></i>
          </div>
          <h3 style="font-family: var(--font-serif); font-size: 1.15rem; font-weight: 700; color: #451a03; margin-bottom: 6px;">ඔබ තවම පින්කම් සටහන් කර නැත</h3>
          <p style="font-size: 0.82rem; color: #78350f; max-width: 440px; margin: 0 auto 20px auto; line-height: 1.6;">
            ඔබ සිදුකරන පින්කම් සහ කුසල ක්‍රියා මෙහි සටහන් කර ඔබේ ජීවිතයේ පුණ්‍ය පොත සම්පූර්ණ කරගන්න!
          </p>
          <button type="button" onclick="openModal('merit')" class="btn-profile-primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 11px 24px; font-weight: 700; font-size: 0.88rem; border-radius: 9999px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; border: none; cursor: pointer; box-shadow: 0 6px 18px rgba(217, 119, 6, 0.35);">
            <i class="fa-solid fa-plus"></i> පළමු සටහන එක් කරන්න!
          </button>
        </div>
      `;
    } else if (activeTab === 'needs') {
      container.innerHTML = `
        <div class="card" style="padding: 48px 20px; text-align: center; border: 1.5px dashed rgba(5, 150, 105, 0.35); border-radius: 20px; background: linear-gradient(180deg, #f0fdf4, #ecfdf5);">
          <div style="width: 72px; height: 72px; border-radius: 50%; background: #ecfdf5; border: 2px solid #a7f3d0; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; box-shadow: 0 4px 16px rgba(5, 150, 105, 0.18);">
            <i class="fa-solid fa-hand-holding-heart" style="font-size: 2.2rem; color: #059669;"></i>
          </div>
          <h3 style="font-family: var(--font-serif); font-size: 1.15rem; font-weight: 700; color: #065f46; margin-bottom: 6px;">දැනට සත්කාර ඉල්ලීම් නොමැත</h3>
          <p style="font-size: 0.82rem; color: #047857; max-width: 440px; margin: 0 auto 20px auto; line-height: 1.6;">
            විහාරස්ථාන, දුෂ්කර පාසල් හෝ සමාජ සත්කාරයක් සඳහා අවශ්‍යතාවයක් මෙහි සටහන් කරන්න.
          </p>
          <button type="button" onclick="openModal('need')" class="btn-profile-primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 11px 24px; font-weight: 700; font-size: 0.88rem; border-radius: 9999px; background: linear-gradient(135deg, #059669, #047857); color: #ffffff; border: none; cursor: pointer; box-shadow: 0 6px 18px rgba(5, 150, 105, 0.35);">
            <i class="fa-solid fa-plus"></i> අවශ්‍යතාවයක් එක් කරන්න
          </button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="card" style="padding: 48px 20px; text-align: center; border: 1.5px dashed rgba(217, 119, 6, 0.35); border-radius: 20px; background: linear-gradient(180deg, #fffdf8, #fff8ea);">
          <div style="width: 72px; height: 72px; border-radius: 50%; background: #fffbeb; border: 2px solid #fef3c7; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; box-shadow: 0 4px 16px rgba(245, 158, 11, 0.18);">
            <i class="fa-solid fa-dharmachakra animate-spin-slow" style="font-size: 2.2rem; color: #d97706;"></i>
          </div>
          <h3 style="font-family: var(--font-serif); font-size: 1.15rem; font-weight: 700; color: #451a03; margin-bottom: 6px;">මෙම කොටසේ තවම සටහන් නොමැත</h3>
          <p style="font-size: 0.82rem; color: #78350f; max-width: 440px; margin: 0 auto 20px auto; line-height: 1.6;">
            පළමු පුණ්‍ය සටහන එක් කරමින් අනෙක් පින්වතුන් සමඟ බෙදාගන්න!
          </p>
          <button type="button" onclick="openModal('merit')" class="btn-profile-primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 11px 24px; font-weight: 700; font-size: 0.88rem; border-radius: 9999px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; border: none; cursor: pointer; box-shadow: 0 6px 18px rgba(217, 119, 6, 0.35);">
            <i class="fa-solid fa-plus"></i> පළමු සටහන එක් කරන්න!
          </button>
        </div>
      `;
    }
    return;
  }

  const hasMore = StorageService.hasMorePosts ? StorageService.hasMorePosts() : false;
  const isLoading = StorageService.isLoadingMorePosts ? StorageService.isLoadingMorePosts() : false;

  let sentinelHtml = '';
  if (activeTab === 'feed' || activeTab === 'needs') {
    sentinelHtml = `
      <div id="infiniteScrollSentinel" class="infinite-scroll-sentinel">
        ${isLoading ? `
          <div class="infinite-scroll-loading">
            <i class="fa-solid fa-dharmachakra animate-spin-slow" style="color: #d97706; font-size: 1.3rem;"></i>
            <span>තවත් පින්කම් ලබා ගනිමින් පවතී...</span>
          </div>
        ` : (hasMore ? `
          <button type="button" class="btn-load-more-posts" onclick="handleLoadMorePostsClick()">
            <i class="fa-solid fa-arrow-down"></i> තවත් පින්කම් බලන්න (Load More)
          </button>
        ` : (ranked.length > 5 ? `
          <div class="infinite-scroll-end">
            <span class="end-icon">🪷</span>
            <span>ඔබ සියලුම පින්කම් කියවා අවසන්ය. සියලු දෙනාටම තෙරුවන් සරණයි! 🙏</span>
          </div>
        ` : ''))}
      </div>
    `;
  }

  container.innerHTML = ranked.map(post => renderPostCardHTML(post, user)).join('') + sentinelHtml;
  setupInfiniteScrollObserver();
}

// ============================================================================
// High-Scale Feed Pagination & Infinite Scroll Engine (Limit: 20)
// ============================================================================
let infiniteScrollObserver = null;
let isTriggeringLoadMore = false;

export function setupInfiniteScrollObserver() {
  if (infiniteScrollObserver) {
    infiniteScrollObserver.disconnect();
    infiniteScrollObserver = null;
  }

  const sentinel = document.getElementById('infiniteScrollSentinel');
  if (!sentinel) return;

  if ('IntersectionObserver' in window) {
    infiniteScrollObserver = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.isIntersecting) {
        triggerLoadMorePosts();
      }
    }, {
      rootMargin: '300px', // Pre-fetch before user reaches absolute bottom
      threshold: 0.05
    });

    infiniteScrollObserver.observe(sentinel);
  }
}
window.setupInfiniteScrollObserver = setupInfiniteScrollObserver;

export async function triggerLoadMorePosts() {
  if (isTriggeringLoadMore) return;
  if (!StorageService.hasMorePosts || !StorageService.hasMorePosts()) return;
  if (StorageService.isLoadingMorePosts && StorageService.isLoadingMorePosts()) return;

  isTriggeringLoadMore = true;
  updateSentinelUI();

  try {
    await StorageService.fetchMorePosts();
  } catch (err) {
    console.warn('[Feed] Error loading more posts:', err);
  } finally {
    isTriggeringLoadMore = false;
    updateSentinelUI();
  }
}
window.triggerLoadMorePosts = triggerLoadMorePosts;

export async function handleLoadMorePostsClick() {
  triggerHaptic(10);
  await triggerLoadMorePosts();
}
window.handleLoadMorePostsClick = handleLoadMorePostsClick;

export function updateSentinelUI() {
  const sentinel = document.getElementById('infiniteScrollSentinel');
  if (!sentinel) return;

  const hasMore = StorageService.hasMorePosts ? StorageService.hasMorePosts() : false;
  const isLoading = (StorageService.isLoadingMorePosts && StorageService.isLoadingMorePosts()) || isTriggeringLoadMore;

  if (isLoading) {
    sentinel.innerHTML = `
      <div class="infinite-scroll-loading">
        <i class="fa-solid fa-dharmachakra animate-spin-slow" style="color: #d97706; font-size: 1.3rem;"></i>
        <span>තවත් පින්කම් ලබා ගනිමින් පවතී...</span>
      </div>
    `;
  } else if (hasMore) {
    sentinel.innerHTML = `
      <button type="button" class="btn-load-more-posts" onclick="handleLoadMorePostsClick()">
        <i class="fa-solid fa-arrow-down"></i> තවත් පින්කම් බලන්න (Load More)
      </button>
    `;
  } else {
    sentinel.innerHTML = `
      <div class="infinite-scroll-end">
        <span class="end-icon">🪷</span>
        <span>ඔබ සියලුම පින්කම් කියවා අවසන්ය. සියලු දෙනාටම තෙරුවන් සරණයි! 🙏</span>
      </div>
    `;
  }
}
window.updateSentinelUI = updateSentinelUI;

export function appendNewPostsToFeed(allPosts, prevIdsStr) {
  const container = document.getElementById('postsContainer');
  if (!container) return;

  const prevIdSet = new Set(prevIdsStr.split(','));
  const user = StorageService.currentUser;
  const searchQ = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();

  const isMaster = StorageService.isMasterAdmin();
  // Extract only the newly arrived posts
  const newlyFetched = (allPosts || []).filter(p => !prevIdSet.has(p.id));
  const filteredNew = newlyFetched.filter(post => {
    if (!post) return false;

    if (searchQ) {
      const matchTitle = (post.title || '').toLowerCase().includes(searchQ);
      const matchDesc = (post.description || '').toLowerCase().includes(searchQ);
      const matchLoc = (post.location || '').toLowerCase().includes(searchQ);
      if (!matchTitle && !matchDesc && !matchLoc) return false;
    }

    const isOfficial = StorageService.isOfficialPost ? StorageService.isOfficialPost(post) : (post.isOfficial || post.author === 'අපේ පිං පොත');

    if (activeTab === 'feed') {
      if (activeCategory !== 'සියල්ල' && post.category !== activeCategory && !post.isPinned && !isOfficial) return false;
      return isOfficial || post.visibility !== 'private';
    }

    if (activeTab === 'mybook') {
      if (activeCategory !== 'සියල්ල' && post.category !== activeCategory) return false;
      const isOwner = (user && post.uid === user.uid) ||
                      (user && user.email && post.authorEmail && post.authorEmail.toLowerCase() === user.email.toLowerCase()) ||
                      (isMaster && (isOfficial || post.uid === 'user_malith' || post.author === 'අපේ පිං පොත'));
      return isOwner;
    }

    if (activeTab === 'needs') {
      if (activeCategory !== 'සියල්ල' && post.category !== activeCategory) return false;
      return post.type === 'need';
    }

    return true;
  });

  const sentinel = document.getElementById('infiniteScrollSentinel');
  if (filteredNew.length > 0) {
    const cardsHtml = filteredNew.map(post => renderPostCardHTML(post, user)).join('');
    if (sentinel) {
      sentinel.insertAdjacentHTML('beforebegin', cardsHtml);
    } else {
      container.insertAdjacentHTML('beforeend', cardsHtml);
    }
  }

  updateSentinelUI();
  setupInfiniteScrollObserver();
}
window.appendNewPostsToFeed = appendNewPostsToFeed;

// Side Needs Widget
function renderSideNeeds() {
  const container = document.getElementById('sideNeedsList');
  if (!container) return;

  const needs = currentPostsData.filter(p => p.type === 'need').slice(0, 3);
  if (needs.length === 0) {
    container.innerHTML = `<p style="font-size: 0.72rem; color: #94a3b8;">දැනට ඉල්ලීම් නොමැත.</p>`;
    return;
  }

  container.innerHTML = needs.map(n => `
    <div class="side-need-item" onclick="switchTab('needs')">
      <span class="side-need-location">${Security.escapeHTML(n.location || 'ලංකාව')}</span>
      <h4 class="side-need-title">${Security.escapeHTML(n.title)}</h4>
      <p style="font-size: 0.7rem; color: #64748b; margin-top: 3px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
        ${Security.escapeHTML(n.description)}
      </p>
    </div>
  `).join('');
}

// Global floating animation for Sadhu clicks attached to document.body
function triggerSadhuFloatingAnimation(target, posY) {
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;

  if (typeof target === 'number' && typeof posY === 'number') {
    x = target;
    y = posY;
  } else if (target && target.getBoundingClientRect) {
    const rect = target.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      x = rect.left + rect.width / 2;
      y = rect.top;
    }
  }

  // Never allow top-left corner (0, 0)
  if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y) || (x < 15 && y < 15)) {
    x = window.innerWidth / 2;
    y = window.innerHeight / 2;
  }

  // Clamp within viewport bounds so badge is never cut off
  const badgeWidthEstimate = 160;
  const clampedX = Math.max(badgeWidthEstimate / 2 + 12, Math.min(window.innerWidth - badgeWidthEstimate / 2 - 12, x));
  const clampedY = Math.max(45, y);

  // Floating Badge attached to document.body
  const badge = document.createElement('div');
  badge.className = 'sadhu-floating-badge';
  badge.innerHTML = '<span>🙏</span><span>සාදු! සාදු! සාදු!</span>';
  badge.style.left = `${Math.round(clampedX)}px`;
  badge.style.top = `${Math.round(clampedY)}px`;
  document.body.appendChild(badge);

  // Sparkling blessing particles
  const particles = ['✨', '🪷', '🌸', '✨'];
  particles.forEach((icon, idx) => {
    const p = document.createElement('div');
    p.className = 'sadhu-particle';
    p.innerText = icon;
    const tx = (idx - 1.5) * 32;
    p.style.setProperty('--tx', `calc(-50% + ${tx}px)`);
    p.style.left = `${Math.round(clampedX)}px`;
    p.style.top = `${Math.round(clampedY)}px`;
    p.style.animationDelay = `${idx * 65}ms`;
    document.body.appendChild(p);

    setTimeout(() => {
      p.remove();
    }, 1100);
  });

  setTimeout(() => {
    badge.remove();
  }, 1050);
}

// Global actions exposed to HTML
window.handleSadhuClick = async function(postId, btnElement) {
  if (isGuestUser()) {
    showAuthRequiredModal('සාදුකාර ලබා දීමට');
    return;
  }

  // Prevent double taps
  if (!window._sadhuClickBusy) window._sadhuClickBusy = {};
  if (window._sadhuClickBusy[postId]) return;
  window._sadhuClickBusy[postId] = true;

  // 1. Resolve button element and calculate coordinates immediately from DOM or event
  let btn = (btnElement && btnElement.isConnected) ? btnElement : document.getElementById(`sadhu-btn-${postId}`);
  let posX = window.innerWidth / 2;
  let posY = window.innerHeight / 2;

  if (btn && btn.isConnected) {
    const rect = btn.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      posX = rect.left + rect.width / 2;
      posY = rect.top;
    }
  } else if (window.event && typeof window.event.clientX === 'number' && (window.event.clientX > 10 || window.event.clientY > 10)) {
    posX = window.event.clientX;
    posY = window.event.clientY;
  }

  // Guard against top-left (0, 0)
  if (posX < 15 && posY < 15) {
    posX = window.innerWidth / 2;
    posY = window.innerHeight / 2;
  }

  // 2. Read current UI state
  const isCurrentlyLiked = btn ? btn.classList.contains('liked') : false;
  const countEl = document.getElementById(`count-${postId}`);
  const btnCountEl = document.getElementById(`count-btn-${postId}`);
  const currentCount = Math.max(0, parseInt(btnCountEl?.innerText || countEl?.innerText || '0', 10) || 0);

  // 3. Immediate Optimistic UI Feedback
  if (!isCurrentlyLiked) {
    // Giving Sadhu
    SoundService.playSadhu();
    triggerHaptic([15, 30, 20]);

    if (btn) {
      btn.classList.add('liked');
      btn.title = 'සාදුකාරය ඉවත් කරන්න';
    }
    const newCount = currentCount + 1;
    if (countEl) countEl.innerText = newCount;
    if (btnCountEl) btnCountEl.innerText = newCount;

    // Show floating blessing animation directly above the button
    triggerSadhuFloatingAnimation(posX, posY);
  } else {
    // Withdrawing Sadhu
    triggerHaptic(15);
    if (btn) {
      btn.classList.remove('liked');
      btn.title = 'සාදුකාරයක් ලබා දෙන්න';
    }
    const newCount = Math.max(0, currentCount - 1);
    if (countEl) countEl.innerText = newCount;
    if (btnCountEl) btnCountEl.innerText = newCount;
  }

  // 4. Atomic cloud & local persistence
  try {
    const desiredAction = isCurrentlyLiked ? 'removed' : 'added';
    const res = await StorageService.giveSadhu(postId, desiredAction);

    // Reconcile UI and in-memory post with confirmed storage response
    const confirmedCount = Math.max(0, parseInt(res.count, 10) || 0);

    if (Array.isArray(currentPostsData)) {
      const mPost = currentPostsData.find(p => p.id === postId);
      if (mPost) {
        const uUid = StorageService.currentUser?.uid || 'anonymous';
        if (!Array.isArray(mPost.sadhuUsers)) mPost.sadhuUsers = [];
        mPost.sadhuCount = confirmedCount;
        if (res.action === 'added') {
          if (!mPost.sadhuUsers.includes(uUid)) mPost.sadhuUsers.push(uUid);
        } else {
          mPost.sadhuUsers = mPost.sadhuUsers.filter(u => u !== uUid);
        }
      }
    }

    const freshBtn = document.getElementById(`sadhu-btn-${postId}`) || btn;
    const freshCountEl = document.getElementById(`count-${postId}`);
    const freshBtnCountEl = document.getElementById(`count-btn-${postId}`);

    if (freshCountEl) freshCountEl.innerText = confirmedCount;
    if (freshBtnCountEl) freshBtnCountEl.innerText = confirmedCount;

    if (freshBtn) {
      if (res.action === 'added') {
        freshBtn.classList.add('liked');
        freshBtn.title = 'සාදුකාරය ඉවත් කරන්න';
      } else if (res.action === 'removed') {
        freshBtn.classList.remove('liked');
        freshBtn.title = 'සාදුකාරයක් ලබා දෙන්න';
      }
    }
  } catch (err) {
    console.warn('[Sadhu] Toggle error:', err);
    // Revert optimistic update on hard error
    const rollbackBtn = document.getElementById(`sadhu-btn-${postId}`) || btn;
    if (rollbackBtn) {
      rollbackBtn.classList.toggle('liked', isCurrentlyLiked);
    }
    if (countEl) countEl.innerText = currentCount;
    if (btnCountEl) btnCountEl.innerText = currentCount;
  } finally {
    setTimeout(() => {
      delete window._sadhuClickBusy[postId];
    }, 350);
  }
};

window.toggleCommentsSection = function(postId) {
  const box = document.getElementById(`comments-box-${postId}`);
  if (box) {
    const isHidden = (box.style.display === 'none' || window.getComputedStyle(box).display === 'none');
    if (isHidden) {
      box.style.display = 'block';
      setTimeout(() => {
        document.getElementById(`comment-input-${postId}`)?.focus();
      }, 100);
    } else {
      box.style.display = 'none';
    }
  }
};

window.submitQuickBlessing = async function(postId, text) {
  if (isGuestUser()) {
    showAuthRequiredModal('ප්‍රාර්ථනා / ආශිර්වාද එක් කිරීමට');
    return;
  }

  window._commentSubmitting = window._commentSubmitting || {};
  if (window._commentSubmitting[postId]) return;
  window._commentSubmitting[postId] = true;

  try {
    const box = document.getElementById(`comments-box-${postId}`);
    if (box) box.style.display = 'block';
    SoundService.playSadhu();
    triggerHaptic(20);

    const newComment = await StorageService.addComment(postId, text);
    if (newComment) {
      appendCommentToDOM(postId, newComment);
    }
    updatePostCommentCountUI(postId);
  } catch (err) {
    alert(err.message);
  } finally {
    setTimeout(() => {
      delete window._commentSubmitting[postId];
    }, 450);
  }
};

window.handleCommentSubmit = async function(event, postId) {
  event.preventDefault();
  if (isGuestUser()) {
    showAuthRequiredModal('ප්‍රාර්ථනා සටහන් කිරීමට');
    return;
  }

  const input = document.getElementById(`comment-input-${postId}`);
  if (!input || !input.value.trim()) return;

  window._commentSubmitting = window._commentSubmitting || {};
  if (window._commentSubmitting[postId]) return;
  window._commentSubmitting[postId] = true;

  const text = input.value.trim();
  input.value = '';

  try {
    const box = document.getElementById(`comments-box-${postId}`);
    if (box) box.style.display = 'block';
    SoundService.playSadhu();
    triggerHaptic(20);

    const newComment = await StorageService.addComment(postId, text);
    if (newComment) {
      appendCommentToDOM(postId, newComment);
    }
    updatePostCommentCountUI(postId);
  } catch (err) {
    alert(err.message);
    if (input) input.value = text;
  } finally {
    setTimeout(() => {
      delete window._commentSubmitting[postId];
    }, 450);
  }
};

// ============================================================================
// @Mention Autocomplete & Handling System in Prayers / Comments
// ============================================================================
let activeMentionContext = null;

async function getMembersForMention() {
  if (window.allCommunityMembersCache && window.allCommunityMembersCache.length > 0) {
    return window.allCommunityMembersCache;
  }
  try {
    const members = await StorageService.getAllCommunityMembers();
    window.allCommunityMembersCache = members;
    return members;
  } catch (e) {
    return [];
  }
}

window.handleCommentInputMention = async function (input, postId) {
  if (!input) return;
  const cursorPos = input.selectionStart || 0;
  const val = input.value || '';
  const textBeforeCursor = val.slice(0, cursorPos);

  const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9\u0D80-\u0DFF_.\s-]*)$/);
  const dropdown = document.getElementById(`mention-dropdown-${postId}`);

  if (!match) {
    if (dropdown) dropdown.classList.add('hidden');
    activeMentionContext = null;
    return;
  }

  const query = match[1].toLowerCase();
  const atIndex = textBeforeCursor.lastIndexOf('@');

  const allMembers = await getMembersForMention();
  const curUser = StorageService.currentUser || {};
  const friends = Array.isArray(curUser.mithrayan) ? curUser.mithrayan : [];

  let filtered = allMembers.filter(m => {
    if (m.uid && curUser.uid && m.uid === curUser.uid) return false;
    if (!query) return true;
    const name = (m.name || '').toLowerCase();
    const loc = (m.location || '').toLowerCase();
    return name.includes(query) || loc.includes(query);
  });

  filtered.sort((a, b) => {
    const aFriend = friends.includes(a.uid);
    const bFriend = friends.includes(b.uid);
    if (aFriend && !bFriend) return -1;
    if (!aFriend && bFriend) return 1;
    return (a.name || '').localeCompare(b.name || '');
  });

  const results = filtered.slice(0, 6);

  if (results.length === 0 || !dropdown) {
    if (dropdown) dropdown.classList.add('hidden');
    activeMentionContext = null;
    return;
  }

  activeMentionContext = {
    postId,
    input,
    atIndex,
    results,
    selectedIndex: 0
  };

  renderMentionDropdown(dropdown, results, 0, postId);
};

function renderMentionDropdown(dropdown, results, selectedIndex, postId) {
  const curUser = StorageService.currentUser || {};
  const friends = Array.isArray(curUser.mithrayan) ? curUser.mithrayan : [];

  dropdown.innerHTML = results.map((m, idx) => {
    const isFriend = friends.includes(m.uid);
    const initial = (m.name || 'ක').charAt(0);
    const isSelected = idx === selectedIndex;
    const safeName = Security.escapeHTML(m.name || 'කල්‍යාණ මිත්‍ර');
    const jsName = safeName.replace(/'/g, "\\'");
    return `
      <div class="mention-item ${isSelected ? 'selected' : ''}" 
           onmousedown="event.preventDefault(); selectMentionMember('${postId}', '${m.uid}', '${jsName}')" 
           data-idx="${idx}">
        <div class="mention-avatar">
          ${m.photo ? `<img src="${Security.sanitizeUrl(m.photo)}" alt="${safeName}" onerror="this.parentElement.innerText='${initial}'">` : initial}
        </div>
        <div class="mention-info">
          <div class="mention-name">
            ${safeName}
            ${m.isAdmin ? '<i class="fa-solid fa-crown" style="color: #f59e0b; font-size: 0.68rem;" title="Master Admin"></i>' : ''}
          </div>
          ${m.location ? `<div class="mention-sub"><i class="fa-solid fa-location-dot" style="font-size: 8px; color: #ea580c;"></i> ${Security.escapeHTML(m.location)}</div>` : ''}
        </div>
        ${isFriend ? '<span class="mention-badge"><i class="fa-solid fa-heart" style="font-size: 7px;"></i> මිතුරෙකි</span>' : ''}
      </div>
    `;
  }).join('');

  dropdown.classList.remove('hidden');
}

window.selectMentionMember = function(postId, uid, memberName) {
  if (!activeMentionContext) return;
  const input = activeMentionContext.input;
  if (!input) return;

  const val = input.value || '';
  const atIndex = activeMentionContext.atIndex;
  const cursorPos = input.selectionStart || val.length;

  const beforeAt = val.slice(0, atIndex);
  const afterCursor = val.slice(cursorPos);
  const insertText = `@${memberName} `;

  input.value = beforeAt + insertText + afterCursor;

  const newPos = beforeAt.length + insertText.length;
  input.setSelectionRange(newPos, newPos);
  input.focus();

  const dropdown = document.getElementById(`mention-dropdown-${postId}`);
  if (dropdown) dropdown.classList.add('hidden');
  activeMentionContext = null;
};

window.handleCommentInputKeydown = function(event, postId) {
  if (!activeMentionContext || !activeMentionContext.results.length) return;
  const dropdown = document.getElementById(`mention-dropdown-${postId}`);
  if (!dropdown || dropdown.classList.contains('hidden')) return;

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    activeMentionContext.selectedIndex = (activeMentionContext.selectedIndex + 1) % activeMentionContext.results.length;
    renderMentionDropdown(dropdown, activeMentionContext.results, activeMentionContext.selectedIndex, postId);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    activeMentionContext.selectedIndex = (activeMentionContext.selectedIndex - 1 + activeMentionContext.results.length) % activeMentionContext.results.length;
    renderMentionDropdown(dropdown, activeMentionContext.results, activeMentionContext.selectedIndex, postId);
  } else if (event.key === 'Enter' || event.key === 'Tab') {
    event.preventDefault();
    const sel = activeMentionContext.results[activeMentionContext.selectedIndex];
    if (sel) {
      selectMentionMember(postId, sel.uid, sel.name);
    }
  } else if (event.key === 'Escape') {
    dropdown.classList.add('hidden');
    activeMentionContext = null;
  }
};

document.addEventListener('click', (e) => {
  if (!e.target.closest('.comment-form') && !e.target.closest('.reels-comment-input-wrap')) {
    document.querySelectorAll('.mention-autocomplete-dropdown').forEach(d => d.classList.add('hidden'));
    activeMentionContext = null;
  }
});

// WhatsApp-Style Emoji Reaction Controls
window.toggleCommentEmojiPicker = function(event, postId, commentKey) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  if (isGuestUser()) {
    showAuthRequiredModal('Emoji ප්‍රතිචාරයක් දැක්වීමට');
    return;
  }
  const popup = document.getElementById(`emoji-popup-${commentKey}`);
  if (!popup) return;
  const isHidden = popup.classList.contains('hidden');
  window.closeAllCommentEmojiPickers();
  if (isHidden) {
    popup.classList.remove('hidden');
  }
};

window.closeAllCommentEmojiPickers = function() {
  document.querySelectorAll('.comment-emoji-popup:not(.hidden)').forEach(el => {
    el.classList.add('hidden');
  });
};

window.handleCommentReaction = async function(postId, commentKey, emoji) {
  if (isGuestUser()) {
    showAuthRequiredModal('Emoji ප්‍රතිචාරයක් දැක්වීමට');
    return;
  }

  window.closeAllCommentEmojiPickers?.();
  SoundService.playTap?.() || SoundService.playSadhu?.();
  triggerHaptic(20);

  try {
    await StorageService.toggleCommentReaction(postId, commentKey, emoji);
    const allPosts = StorageService.getLocalPosts() || [];
    let targetPost = allPosts.find(p => p.id === postId);
    if (!targetPost && typeof currentPostsData !== 'undefined' && Array.isArray(currentPostsData)) {
      targetPost = currentPostsData.find(p => p.id === postId);
    }
    if (!targetPost && StorageService._cachedPosts) {
      targetPost = StorageService._cachedPosts.find(p => p.id === postId);
    }
    if (targetPost && Array.isArray(targetPost.comments)) {
      renderCommentsListContent(postId, targetPost.comments);
    }
  } catch (err) {
    console.warn('[Comment Reaction] Error:', err);
  }
};

// Edit Post Modal Handlers (Author & Master Admin)
window.openEditPostModal = function(postId) {
  if (isGuestUser()) {
    showAuthRequiredModal('සටහන සංස්කරණය කිරීමට');
    return;
  }

  const allPosts = StorageService.getLocalPosts() || [];
  let post = allPosts.find(p => p.id === postId);
  if (!post && typeof currentPostsData !== 'undefined' && Array.isArray(currentPostsData)) {
    post = currentPostsData.find(p => p.id === postId);
  }
  if (!post && StorageService._cachedPosts) {
    post = StorageService._cachedPosts.find(p => p.id === postId);
  }
  if (!post) {
    alert("පුණ්‍ය සටහන සොයාගත නොහැකි විය.");
    return;
  }

  const isMaster = StorageService.isMasterAdmin();
  const isOwner = post.uid && post.uid === StorageService.currentUser?.uid;
  if (!isOwner && !isMaster) {
    alert("මෙම සටහන සංස්කරණය කිරීමට ඔබට අවසර නැත.");
    return;
  }

  const modal = document.getElementById('editPostModal');
  if (!modal) return;

  const idEl = document.getElementById('editPostId');
  const titleEl = document.getElementById('editPostTitle');
  const catEl = document.getElementById('editPostCategory');
  const visEl = document.getElementById('editPostVisibility');
  const locEl = document.getElementById('editPostLocation');
  const descEl = document.getElementById('editPostDesc');

  if (idEl) idEl.value = post.id;
  if (titleEl) titleEl.value = post.title || '';
  if (catEl) catEl.value = post.category || 'දානමය';
  if (visEl) visEl.value = post.visibility || 'public';
  if (locEl) locEl.value = post.location || '';
  if (descEl) descEl.value = Security.unescapeHTML ? Security.unescapeHTML(post.description || '') : (post.description || '');

  const contactWrap = document.getElementById('editContactWrapper');
  const contactInput = document.getElementById('editPostContact');
  if (post.type === 'need') {
    if (contactWrap) contactWrap.style.display = 'block';
    if (contactInput) contactInput.value = post.contact || '';
  } else {
    if (contactWrap) contactWrap.style.display = 'none';
  }

  modal.classList.remove('hidden');
};

window.closeEditPostModal = function() {
  const modal = document.getElementById('editPostModal');
  if (modal) modal.classList.add('hidden');
  document.getElementById('editPostForm')?.reset();
};

window.handleEditPostSubmit = async function(event) {
  event.preventDefault();
  const postId = document.getElementById('editPostId')?.value;
  if (!postId) return;

  const title = (document.getElementById('editPostTitle')?.value || '').trim();
  const category = document.getElementById('editPostCategory')?.value || 'දානමය';
  const visibility = document.getElementById('editPostVisibility')?.value || 'public';
  const location = (document.getElementById('editPostLocation')?.value || '').trim();
  const description = (document.getElementById('editPostDesc')?.value || '').trim();
  const contact = (document.getElementById('editPostContact')?.value || '').trim();

  const submitBtn = document.getElementById('editPostSubmitBtn');
  const origBtnText = submitBtn ? submitBtn.innerHTML : '';

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> සුරකිමින්...';
    }

    await StorageService.updatePost(postId, {
      title,
      category,
      visibility,
      location,
      description,
      contact
    });

    SoundService.playPublish?.();
    triggerHaptic([25, 40]);
    window.closeEditPostModal();
    renderFeed();
  } catch (err) {
    alert("දෝෂයකි: " + err.message);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origBtnText;
    }
  }
};

// Edit Comment Modal Handlers (Author & Master Admin)
window.openEditCommentModal = function(postId, commentKey) {
  if (isGuestUser()) {
    showAuthRequiredModal('ප්‍රාර්ථනාව සංස්කරණය කිරීමට');
    return;
  }

  const allPosts = StorageService.getLocalPosts() || [];
  let targetPost = allPosts.find(p => p.id === postId);
  if (!targetPost && typeof currentPostsData !== 'undefined' && Array.isArray(currentPostsData)) {
    targetPost = currentPostsData.find(p => p.id === postId);
  }
  if (!targetPost && StorageService._cachedPosts) {
    targetPost = StorageService._cachedPosts.find(p => p.id === postId);
  }
  if (!targetPost || !Array.isArray(targetPost.comments)) {
    alert("ප්‍රාර්ථනාව සොයාගත නොහැකි විය.");
    return;
  }

  let comment = targetPost.comments.find(c => (c.id && c.id === commentKey) || (String(c.timestamp) === String(commentKey)));
  if (!comment && commentKey && commentKey.startsWith('c_' + postId + '_')) {
    const parts = commentKey.split('_');
    const idx = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(idx) && targetPost.comments[idx]) {
      comment = targetPost.comments[idx];
    }
  }
  if (!comment && targetPost.comments.length === 1) {
    comment = targetPost.comments[0];
  }
  if (!comment) {
    const currentName = (StorageService.currentUser?.name || '').trim();
    comment = targetPost.comments.find(c => {
      const aName = (StorageService.resolveAuthorName(c) || c.author || '').trim();
      return aName && aName === currentName;
    });
  }
  if (!comment) {
    alert("ප්‍රාර්ථනාව සොයාගත නොහැකි විය.");
    return;
  }

  if (!comment.id) {
    comment.id = commentKey;
  }

  const isMaster = StorageService.isMasterAdmin();
  const currentUid = StorageService.currentUser?.uid;
  const currentName = (StorageService.currentUser?.name || '').trim();
  const cAuthorName = (StorageService.resolveAuthorName(comment) || comment.author || '').trim();
  const isOwner = (comment.uid && currentUid && comment.uid === currentUid) || 
                  (comment.author && comment.author.trim() === currentName) ||
                  (cAuthorName && cAuthorName === currentName);

  if (!isOwner && !isMaster) {
    alert("මෙම ප්‍රාර්ථනාව සංස්කරණය කිරීමට ඔබට අවසර නැත.");
    return;
  }

  const modal = document.getElementById('editCommentModal');
  if (!modal) return;

  const postIdEl = document.getElementById('editCommentPostId');
  const commentIdEl = document.getElementById('editCommentId');
  const textEl = document.getElementById('editCommentText');

  if (postIdEl) postIdEl.value = postId;
  if (commentIdEl) commentIdEl.value = comment.id || commentKey;
  if (textEl) textEl.value = Security.unescapeHTML ? Security.unescapeHTML(comment.text) : comment.text;

  modal.classList.remove('hidden');
};

window.closeEditCommentModal = function() {
  const modal = document.getElementById('editCommentModal');
  if (modal) modal.classList.add('hidden');
  document.getElementById('editCommentForm')?.reset();
};

window.handleEditCommentSubmit = async function(event) {
  event.preventDefault();
  const postId = document.getElementById('editCommentPostId')?.value;
  const commentId = document.getElementById('editCommentId')?.value;
  const newText = (document.getElementById('editCommentText')?.value || '').trim();

  if (!postId || !commentId || !newText) return;

  const submitBtn = document.getElementById('editCommentSubmitBtn');
  const origBtnText = submitBtn ? submitBtn.innerHTML : '';

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> සුරකිමින්...';
    }

    const updated = await StorageService.updateComment(postId, commentId, newText);
    SoundService.playTap?.();
    triggerHaptic(20);
    window.closeEditCommentModal();

    const allPosts = StorageService.getLocalPosts() || [];
    const targetPost = allPosts.find(p => p.id === postId);
    if (targetPost && Array.isArray(targetPost.comments)) {
      renderCommentsListContent(postId, targetPost.comments);
    }
  } catch (err) {
    alert("දෝෂයකි: " + err.message);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origBtnText;
    }
  }
};

// Open and view original post in full detail in-place (when clicked from repost)
window.viewOriginalPost = function(origId, parentPostId) {
  SoundService.playTap?.() || triggerHaptic(15);

  // Directly retrieve post data and open it in the modal dialog right here
  let post = null;
  const allPosts = StorageService.getLocalPosts() || [];
  post = allPosts.find(p => p.id === origId);
  if (!post && typeof currentPostsData !== 'undefined' && Array.isArray(currentPostsData)) {
    post = currentPostsData.find(p => p.id === origId);
  }
  if (!post && StorageService._cachedPosts) {
    post = StorageService._cachedPosts.find(p => p.id === origId);
  }

  // Fallback: reconstruct from parent repost's originalPost object
  if (!post && parentPostId) {
    const parentPost = allPosts.find(p => p.id === parentPostId) || (typeof currentPostsData !== 'undefined' ? currentPostsData.find(p => p.id === parentPostId) : null);
    if (parentPost && parentPost.originalPost) {
      const orig = parentPost.originalPost;
      post = {
        id: orig.id || origId,
        author: StorageService.resolveAuthorName(orig) || orig.author || 'කල්‍යාණ මිත්‍ර',
        authorUid: orig.authorUid || orig.uid || null,
        authorPhoto: StorageService.resolveAuthorPhoto(orig) || orig.authorPhoto || null,
        title: orig.title || '',
        description: orig.description || '',
        category: orig.category || 'දානමය',
        location: orig.location || '',
        date: orig.date || 'මෑතකදී',
        image: orig.image || null,
        images: orig.images || (orig.image ? [orig.image] : []),
        type: orig.type || 'merit',
        visibility: 'public',
        sadhuCount: orig.sadhuCount || 0,
        comments: orig.comments || []
      };
    }
  }

  if (post) {
    openPostDetailModal(post);
  } else {
    alert("මෙම මුල් සටහනේ සම්පූර්ණ තොරතුරු සොයා ගැනීමට නොහැකි විය.");
  }
};

window.openPostDetailModal = function(post) {
  const modal = document.getElementById('postDetailModal');
  const body = document.getElementById('postDetailModalBody');
  const title = document.getElementById('postDetailModalHeaderTitle');
  if (!modal || !body) return;

  if (title) {
    title.innerText = post.isOfficial ? 'පිං පොත නිල නිවේදනය' : `${StorageService.resolveAuthorName(post)} ගේ සටහන`;
  }

  const currentUser = StorageService.currentUser;
  body.innerHTML = renderPostCardHTML(post, currentUser);

  // Ensure comments section inside the detail modal is opened for immediate reading
  const innerCommentsBox = body.querySelector(`.comments-section`);
  if (innerCommentsBox) {
    innerCommentsBox.style.display = 'block';
  }

  try {
    history.pushState({ type: 'modal', id: 'postDetailModal' }, '');
  } catch (e) {}

  modal.classList.remove('hidden');
};

window.closePostDetailModal = function() {
  const modal = document.getElementById('postDetailModal');
  const body = document.getElementById('postDetailModalBody');
  if (modal) modal.classList.add('hidden');
  if (body) body.innerHTML = '';
};

window.deletePostPrompt = async function(postId) {
  const isMaster = StorageService.isMasterAdmin();
  const confirmMsg = isMaster 
    ? "👑 Master Admin: මෙම පුණ්‍ය සටහන පද්ධතියෙන් සම්පූර්ණයෙන්ම ඉවත් කිරීමට අවශ්‍ය බව තහවුරු කරන්න?"
    : "මෙම පුණ්‍ය සටහන ඉවත් කිරීමට අවශ්‍ය බව තහවුරු කරන්න?";

  if (confirm(confirmMsg)) {
    const cardEl = document.getElementById(`post-elem-${postId}`);
    if (cardEl) {
      cardEl.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      cardEl.style.opacity = '0';
      cardEl.style.transform = 'scale(0.95) translateY(-10px)';
      cardEl.style.maxHeight = '0';
      cardEl.style.overflow = 'hidden';
      cardEl.style.margin = '0';
      cardEl.style.padding = '0';
      setTimeout(() => {
        if (cardEl && cardEl.parentNode) {
          cardEl.parentNode.removeChild(cardEl);
        }
      }, 320);
    }

    currentPostsData = (currentPostsData || []).filter(p => p.id !== postId);
    try {
      await StorageService.deletePost(postId);
      triggerHaptic(20);
      closePostDetailModal();
      updateUserStats();
      if (activeTab === 'profile') {
        renderProfileView();
      }
      const adminPanel = document.getElementById('settingsContentAdmin');
      if (adminPanel && !adminPanel.classList.contains('hidden')) {
        renderAdminDashboard();
      }
    } catch (err) {
      console.error('[Delete] Failed to delete post:', err);
      alert("සටහන ඉවත් කිරීමේදී දෝෂයක් සිදු විය: " + (err.message || 'නැවත උත්සාහ කරන්න.'));
    }
  }
};

// ==========================================================================
// Viral Share & WhatsApp Status Card Image Generator (html2canvas)
// ==========================================================================
let currentShareTargetPostId = null;
let currentGeneratedStatusCardDataUrl = null;
let currentGeneratedStatusCardBlob = null;
let currentGeneratedStatusCardFileName = null;

window.handleShare = function(postId) {
  SoundService.playShare();
  triggerHaptic(25);
  currentShareTargetPostId = postId;

  const modal = document.getElementById('shareChoiceModal');
  if (modal) {
    modal.classList.remove('hidden');
    try {
      history.pushState({ type: 'modal', id: 'shareChoiceModal' }, '');
    } catch (e) {}
  } else {
    executeNativeOrWhatsAppShare();
  }
};

window.closeShareChoiceModal = function() {
  const modal = document.getElementById('shareChoiceModal');
  if (modal) modal.classList.add('hidden');
};

window.closeShareChoiceModalOnBackdrop = function(e) {
  if (e.target.id === 'shareChoiceModal') {
    closeShareChoiceModal();
  }
};

window.closeStatusCardPreviewModal = function() {
  const modal = document.getElementById('statusCardPreviewModal');
  if (modal) modal.classList.add('hidden');
};

window.closeStatusCardPreviewOnBackdrop = function(e) {
  if (e.target.id === 'statusCardPreviewModal') {
    closeStatusCardPreviewModal();
  }
};

window.generateWhatsAppStatusCardFromModal = async function() {
  const postId = currentShareTargetPostId;
  if (!postId) return;

  const btn = document.getElementById('btnShareWhatsAppStatus');
  const originalBtnHTML = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `
      <div style="width: 44px; height: 44px; border-radius: 12px; background: #059669; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; flex-shrink: 0;">
        <i class="fa-solid fa-spinner fa-spin"></i>
      </div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 0.88rem; font-weight: 700; color: #065f46;">
          Status ඡායාරූපය සකසමින් පවතී...
        </div>
        <div style="font-size: 0.72rem; color: #047857; margin-top: 2px;">
          තත්පර කිහිපයකින් PNG කාඩ්පත සූදානම් වේ
        </div>
      </div>
    `;
  }

  try {
    const allPosts = StorageService.getLocalPosts();
    let post = (allPosts && allPosts.find(p => p.id === postId));
    if (!post && typeof currentPostsData !== 'undefined' && Array.isArray(currentPostsData)) {
      post = currentPostsData.find(p => p.id === postId);
    }
    if (!post && StorageService._cachedPosts) {
      post = StorageService._cachedPosts.find(p => p.id === postId);
    }
    if (!post) {
      post = { id: postId, title: 'පින්කමක්', description: '', author: 'කල්‍යාණ මිත්‍ර' };
    }

    const isRepost = post.isRepost || !!post.originalPost;
    const orig = post.originalPost || null;

    const realAuthor = post.isOfficial ? 'අපේ පිං පොත' : ((isRepost && orig) ? StorageService.resolveAuthorName(orig) : StorageService.resolveAuthorName(post));
    const realTitle = (isRepost && orig && orig.title) ? orig.title : (post.title || 'පින්කම');
    const realDesc = (isRepost && orig && orig.description) ? orig.description : (post.description || '');
    const realImage = (isRepost && orig ? (orig.image || (orig.images && orig.images[0])) : (post.image || (post.images && post.images[0]))) || null;
    const realCategory = (isRepost && orig && orig.category) ? orig.category : (post.category || 'පින්කම');
    const realLocation = (isRepost && orig && orig.location) ? orig.location : (post.location || '');
    const realDate = (isRepost && orig && orig.date) ? orig.date : (post.date || 'අද');
    const authorAvatar = (isRepost && orig) ? StorageService.resolveAuthorPhoto(orig) : StorageService.resolveAuthorPhoto(post);

    const authorInitial = realAuthor ? realAuthor.charAt(0) : 'ම';
    const avatarInner = post.isOfficial
      ? `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #d97706, #92400e);"><i class="fa-solid fa-dharmachakra" style="font-size: 1.4rem; color: #fef3c7;"></i></div>`
      : (authorAvatar 
        ? `<img src="${authorAvatar}" style="width: 100%; height: 100%; object-fit: cover; display: block;" crossorigin="anonymous">`
        : `<span style="font-family: serif; font-size: 1.3rem; font-weight: 700; color: #ffffff;">${authorInitial}</span>`);

    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const targetId = (isRepost && orig && orig.id) ? orig.id : post.id;
    const postUrl = `${origin}${pathname}?post=${encodeURIComponent(targetId)}`;

    const renderBox = document.getElementById('viralStatusCardRenderBox');
    if (!renderBox) throw new Error('Render box not found');

    const cleanDesc = realDesc ? realDesc.replace(/<[^>]*>?/gm, '').trim() : '';

    renderBox.innerHTML = `
      <div id="statusCardRoot" style="width: 580px; background: #fffcf7; border: 10px solid #78350f; border-radius: 26px; overflow: hidden; font-family: 'Noto Sans Sinhala', -apple-system, BlinkMacSystemFont, sans-serif; box-shadow: 0 10px 40px rgba(0,0,0,0.3); color: #1e293b; box-sizing: border-box;">
        
        <!-- Top Golden Gradient Strip -->
        <div style="background: linear-gradient(90deg, #d97706, #fbbf24, #f59e0b, #b45309); height: 8px;"></div>
        
        <!-- Header with Branding -->
        <div style="background: linear-gradient(135deg, #451a03 0%, #78350f 60%, #92400e 100%); padding: 18px 24px; color: #fff; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(251, 191, 36, 0.2); border: 2px solid #fbbf24; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #fbbf24;">
              ☸️
            </div>
            <div>
              <div style="font-family: 'Noto Serif Sinhala', serif; font-size: 1.35rem; font-weight: 700; color: #fffbeb; letter-spacing: 0.5px;">පිං පොත</div>
              <div style="font-size: 0.74rem; color: #fef3c7; opacity: 0.9;">කල්‍යාණ මිත්‍ර පුණ්‍ය ජාලය • apepinpotha.lk</div>
            </div>
          </div>
          <div style="background: rgba(251, 191, 36, 0.25); border: 1px solid #fbbf24; color: #fef3c7; font-size: 0.74rem; font-weight: 700; padding: 4px 12px; border-radius: 9999px;">
            ${Security.escapeHTML(realCategory)}
          </div>
        </div>

        <!-- Author Info Row -->
        <div style="padding: 16px 24px 12px 24px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px dashed rgba(217, 119, 6, 0.25); background: #ffffff;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: #f59e0b; color: #fff; font-size: 1.25rem; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 2.5px solid #d97706; overflow: hidden; flex-shrink: 0;">
              ${avatarInner}
            </div>
            <div>
              <div style="font-size: 1.05rem; font-weight: 700; color: #451a03; display: flex; align-items: center; gap: 6px;">
                <span>${Security.escapeHTML(realAuthor)}</span>
                <span style="color: #059669; font-size: 0.85rem;" title="සත්‍යාපිත කල්‍යාණ මිත්‍ර">✓</span>
              </div>
              <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">
                📅 ${Security.escapeHTML(realDate)} ${realLocation ? `• 📍 ${Security.escapeHTML(realLocation)}` : ''}
              </div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.74rem; font-weight: 700; color: #b45309; background: #fffbeb; padding: 4px 12px; border-radius: 8px; border: 1px solid #fde68a;">
              🙏 සාදු සාදු සාදු!
            </div>
          </div>
        </div>

        <!-- Post Content Body -->
        <div style="padding: 20px 24px; background: #fffcf7;">
          <h2 style="font-family: 'Noto Serif Sinhala', serif; font-size: 1.25rem; font-weight: 700; color: #451a03; line-height: 1.45; margin-bottom: 12px;">
            ${Security.escapeHTML(realTitle)}
          </h2>

          ${cleanDesc ? `
          <p style="font-size: 0.92rem; color: #334155; line-height: 1.65; white-space: pre-line; margin-bottom: 16px;">
            ${Security.escapeHTML(cleanDesc)}
          </p>
          ` : ''}

          ${realImage ? `
          <div style="border-radius: 16px; overflow: hidden; border: 2px solid #fde68a; box-shadow: 0 4px 18px rgba(0,0,0,0.08); margin-top: 10px; background: #000; text-align: center;">
            <img src="${realImage}" style="max-width: 100%; max-height: 380px; width: 100%; object-fit: contain; display: block;" crossorigin="anonymous">
          </div>
          ` : ''}
        </div>

        <!-- Bottom Footer Banner -->
        <div style="background: linear-gradient(135deg, #78350f, #451a03); padding: 16px 24px; color: #fff; display: flex; align-items: center; justify-content: space-between; border-top: 3px solid #fbbf24;">
          <div>
            <div style="font-size: 0.95rem; font-weight: 700; color: #fef08a;">
              🙏 දැකබලා සතුටු සිතින් අනුමෝදන් වන්න!
            </div>
            <div style="font-size: 0.74rem; color: #fef3c7; opacity: 0.9; margin-top: 2px;">
              ඔබ සිදුකරන පින්කම් සටහන් කරගන්න පිං පොතට එක්වන්න
            </div>
          </div>
          <div style="background: #fbbf24; color: #451a03; font-weight: 800; font-size: 0.78rem; padding: 6px 14px; border-radius: 9999px; white-space: nowrap;">
            🌐 apepinpotha.lk
          </div>
        </div>
      </div>
    `;

    await new Promise(r => setTimeout(r, 250));

    if (typeof html2canvas !== 'function') {
      throw new Error('html2canvas library is not loaded');
    }

    const cardRoot = document.getElementById('statusCardRoot');
    const canvas = await html2canvas(cardRoot, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false
    });

    const dataUrl = canvas.toDataURL('image/png');
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    const fileName = `pin_potha_status_${postId}.png`;

    currentGeneratedStatusCardDataUrl = dataUrl;
    currentGeneratedStatusCardBlob = blob;
    currentGeneratedStatusCardFileName = fileName;

    // Increment share counter
    try {
      StorageService.incrementShare(targetId);
      if (postId !== targetId) StorageService.incrementShare(postId);
      if (post) post.shareCount = (post.shareCount || 0) + 1;
      const shareBtnEl = document.getElementById(`shares-btn-${postId}`);
      const shareStatEl = document.getElementById(`stat-shares-${postId}`);
      if (shareBtnEl) shareBtnEl.innerText = post.shareCount;
      if (shareStatEl) shareStatEl.innerText = post.shareCount;
    } catch (e) {}

    closeShareChoiceModal();

    let sharedViaFile = false;
    if (blob && navigator.canShare) {
      try {
        const file = new File([blob], fileName, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `පිං පොත | ${realTitle}`,
            text: `🌸 "${realAuthor}" ගේ උතුම් පින්කම:\n✨ ${realTitle}\n\n🙏 මේ උතුම් පින්කම දැකබලා ඔබත් සාදුකාර දී පින් අනුමෝදන් වන්න:\n${postUrl}`
          });
          sharedViaFile = true;
        }
      } catch (shareErr) {
        if (shareErr.name === 'AbortError') {
          sharedViaFile = true;
        }
      }
    }

    const previewImg = document.getElementById('statusCardPreviewImg');
    const previewModal = document.getElementById('statusCardPreviewModal');
    if (previewImg && previewModal) {
      previewImg.src = dataUrl;
      previewModal.classList.remove('hidden');
      try {
        history.pushState({ type: 'modal', id: 'statusCardPreviewModal' }, '');
      } catch (e) {}
    }

    if (!sharedViaFile) {
      downloadCurrentStatusCard();
    }

  } catch (err) {
    console.error('[StatusCard] Generation failed:', err);
    alert('WhatsApp Status ඡායාරූපය සැකසීමේදී දෝෂයක් ඇතිවිය: ' + (err.message || 'කරුණාකර නැවත උත්සාහ කරන්න.'));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalBtnHTML;
    }
  }
};

window.downloadCurrentStatusCard = function() {
  if (!currentGeneratedStatusCardDataUrl) return;
  const a = document.createElement('a');
  a.href = currentGeneratedStatusCardDataUrl;
  a.download = currentGeneratedStatusCardFileName || `pin_potha_status_${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

window.openWhatsAppForStatusShare = function() {
  const postId = currentShareTargetPostId;
  const allPosts = StorageService.getLocalPosts() || [];
  const post = allPosts.find(p => p.id === postId) || {};
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  const postUrl = `${origin}${pathname}?post=${encodeURIComponent(postId || '')}`;
  const isOfficial = !!post.isOfficial;
  const authorName = StorageService.resolveAuthorName(post);
  const shareText = isOfficial
    ? `📢 අපේ පිං පොත නිල නිවේදනය: ${post.title || ''}\n🙏 කියවා අන් අයටද දැනුම් දෙන්න:\n${postUrl}`
    : `🌸 "${authorName}" ගේ උතුම් පින්කම: ${post.title || ''}\n🙏 දැකබලා සතුටු සිතින් අනුමෝදන් වන්න:\n${postUrl}`;
  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  window.open(waUrl, '_blank');
};

window.executeNativeOrWhatsAppShare = async function() {
  closeShareChoiceModal();
  const postId = currentShareTargetPostId;
  if (!postId) return;

  const allPosts = StorageService.getLocalPosts();
  let post = (allPosts && allPosts.find(p => p.id === postId));
  if (!post && typeof currentPostsData !== 'undefined' && Array.isArray(currentPostsData)) {
    post = currentPostsData.find(p => p.id === postId);
  }
  if (!post && StorageService._cachedPosts) {
    post = StorageService._cachedPosts.find(p => p.id === postId);
  }
  if (!post) {
    post = { id: postId, title: 'පින්කමක්', description: '', author: 'කල්‍යාණ මිත්‍ර' };
  }

  const isRepost = post.isRepost || !!post.originalPost;
  const orig = post.originalPost || null;
  const isOfficial = !!post.isOfficial;
  const realAuthor = isOfficial ? 'අපේ පිං පොත' : ((isRepost && orig) ? StorageService.resolveAuthorName(orig) : StorageService.resolveAuthorName(post));
  const realTitle = (isRepost && orig && orig.title) ? orig.title : (post.title || 'පින්කම');
  const realDesc = (isRepost && orig && orig.description) ? orig.description : (post.description || '');
  const realImage = (isRepost && orig ? (orig.image || (orig.images && orig.images[0])) : (post.image || (post.images && post.images[0]))) || null;

  const origin = window.location.origin;
  const pathname = window.location.pathname;
  const targetId = (isRepost && orig && orig.id) ? orig.id : post.id;
  const postUrl = `${origin}${pathname}?post=${encodeURIComponent(targetId)}`;

  try {
    StorageService.incrementShare(targetId);
    if (postId !== targetId) StorageService.incrementShare(postId);
    if (post) post.shareCount = (post.shareCount || 0) + 1;
    const shareBtnEl = document.getElementById(`shares-btn-${postId}`);
    const shareStatEl = document.getElementById(`stat-shares-${postId}`);
    if (shareBtnEl) shareBtnEl.innerText = post.shareCount;
    if (shareStatEl) shareStatEl.innerText = post.shareCount;
  } catch (e) {}

  let shareBody = isOfficial 
    ? `📢 අපේ පිං පොත නිල නිවේදනය:\n✨ ${realTitle}`
    : `🌸 "${realAuthor}" ගේ උතුම් පින්කම:\n✨ ${realTitle}`;
  if (!isOfficial && isRepost) {
    const reposterName = StorageService.resolveAuthorName(post);
    if (reposterName && reposterName !== realAuthor) {
      shareBody += `\n🔄 (යළි බෙදාගත්තේ: ${reposterName})`;
    }
  }
  if (realDesc) {
    const cleanSnippet = realDesc.replace(/<[^>]*>?/gm, '').trim();
    if (cleanSnippet && !cleanSnippet.includes('උතුම් පින්කමක් දැක බලා සතුටු සිතින් අනුමෝදන් වෙමි')) {
      const snippet = cleanSnippet.length > 140 ? cleanSnippet.substring(0, 140) + '...' : cleanSnippet;
      shareBody += `\n\n"${snippet}"`;
    }
  }
  shareBody += `\n\n🙏 මේ උතුම් පින්කම දැකබලා ඔබත් සාදුකාර දී පින් අනුමෝදන් වන්න:`;

  const shareTitle = `පිං පොත | ${realTitle}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: shareTitle,
        text: shareBody,
        url: postUrl
      });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }

  // Fallback for clipboard / WhatsApp web
  const fullTextWithUrl = `${shareBody}\n${postUrl}`;
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(fullTextWithUrl);
    }
  } catch (e) {}

  const openWhatsApp = confirm(
    `ලිපිනය (Link) සහ විස්තරය පිටපත් කරගන්නා ලදී! 🎉\n\nWhatsApp හරහා මිතුරන් සමඟ බෙදාගැනීමට අවශ්‍යද?`
  );
  if (openWhatsApp) {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullTextWithUrl)}`;
    window.open(waUrl, '_blank');
  }
};

window.copyPostLinkFromModal = async function() {
  closeShareChoiceModal();
  const postId = currentShareTargetPostId;
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  const postUrl = `${origin}${pathname}?post=${encodeURIComponent(postId || '')}`;
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(postUrl);
    }
    alert('ලිපිනය (Link) සාර්ථකව Copy කරගන්නා ලදී! 🎉');
  } catch (e) {
    prompt('මෙම Link එක Copy කරගන්න:', postUrl);
  }
};

// Check for deep-linked post in URL query (?post=post_123)
function checkUrlDirectPost() {
  const urlParams = new URLSearchParams(window.location.search);
  const targetPostId = urlParams.get('post');
  if (!targetPostId) return;

  const tryScroll = () => {
    const elem = document.getElementById(`post-elem-${targetPostId}`);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      elem.classList.add('highlight-shared-post');
      setTimeout(() => {
        elem.classList.remove('highlight-shared-post');
      }, 4500);
      return true;
    }
    return false;
  };

  if (!tryScroll()) {
    setTimeout(tryScroll, 600);
    setTimeout(tryScroll, 1600);
  }
}

// Modal & Form Handling
window.openModal = function(type = 'merit', triggerPhoto = false, triggerVideo = false) {
  if (isGuestUser()) {
    showAuthRequiredModal('නව පින්කමක් හෝ සටහනක් පළ කිරීමට');
    return;
  }

  try {
    history.pushState({ type: 'modal', id: 'postModal' }, '');
  } catch (e) {}
  const modal = document.getElementById('postModal');
  if (modal) modal.classList.remove('hidden');
  setPostType(type);
  selectedImagesList = [];
  renderComposerThumbnails();

  // Toggle Master Admin post controls
  const adminPostControls = document.getElementById('adminPostControls');
  if (adminPostControls) {
    if (StorageService.isMasterAdmin()) {
      adminPostControls.classList.remove('hidden');
      adminPostControls.style.display = 'block';
    } else {
      adminPostControls.classList.add('hidden');
      adminPostControls.style.display = 'none';
      const chkOfficial = document.getElementById('postIsOfficial');
      const chkPinned = document.getElementById('postIsPinned');
      if (chkOfficial) chkOfficial.checked = false;
      if (chkPinned) chkPinned.checked = false;
    }
  }

  if (triggerPhoto) {
    setTimeout(() => document.getElementById('photoInput')?.click(), 200);
  } else if (triggerVideo) {
    setTimeout(() => {
      const vInput = document.getElementById('postVideoUrl');
      if (vInput) {
        vInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        vInput.focus();
      }
    }, 200);
  }
};

window.openPrivateMeritComposer = function() {
  if (isGuestUser()) {
    showAuthRequiredModal('පෞද්ගලික පිං පොත භාවිතා කිරීමට');
    return;
  }

  window.openModal('merit');
  const visSelect = document.getElementById('postVisibility');
  if (visSelect) {
    visSelect.value = 'private';
  }
};

window.viewCoverPhoto = function(e) {
  if (e) e.stopPropagation();
  const coverImg = document.getElementById('profileCoverImg');
  const src = coverImg ? (coverImg.getAttribute('src') || coverImg.src) : null;
  if (src && !src.includes('data:image/svg+xml')) {
    window.openLightbox([src], 0);
  }
};

window.viewProfilePhoto = function(e) {
  if (e) e.stopPropagation();
  const user = StorageService.currentUser || {};
  if (user.photo) {
    window.openLightbox([user.photo], 0);
  } else {
    document.getElementById('editProfPhotoFileInput')?.click();
  }
};

window.closeModal = function() {
  const modal = document.getElementById('postModal');
  if (modal) modal.classList.add('hidden');
  document.getElementById('postForm')?.reset();
  window.clearVideoUrlInput();
  const chkOfficial = document.getElementById('adminIsOfficial') || document.getElementById('postIsOfficial');
  const chkPinned = document.getElementById('adminIsPinned') || document.getElementById('postIsPinned');
  if (chkOfficial) chkOfficial.checked = false;
  if (chkPinned) chkPinned.checked = false;
  const titleInput = document.getElementById('postTitle');
  if (titleInput) titleInput.required = false;
  compressedBase64Image = null;
  selectedImagesList = [];
  renderComposerThumbnails();
};

window.setPostType = function(type) {
  selectedPostType = type;
  const meritBtn = document.getElementById('typeMeritBtn');
  const generalBtn = document.getElementById('typeGeneralBtn');
  const needBtn = document.getElementById('typeNeedBtn');
  const titleWrap = document.getElementById('titleWrapper');
  const titleLabel = document.getElementById('titleLabel');
  const titleInput = document.getElementById('postTitle');
  const categoryVisibilityRow = document.getElementById('categoryVisibilityRow');
  const categoryWrap = document.getElementById('categoryWrapper');
  const catSelect = document.getElementById('postCategory');
  const visWrap = document.getElementById('visibilityWrapper');
  const locationContactRow = document.getElementById('locationContactRow');
  const locationWrap = document.getElementById('locationWrapper');
  const locInput = document.getElementById('postLocation');
  const contactWrap = document.getElementById('contactWrapper');
  const descLabel = document.getElementById('descLabel');
  const descInput = document.getElementById('postDesc');
  const submitBtnText = document.getElementById('submitMeritBtnText');

  // Reset active classes
  meritBtn?.classList.remove('active');
  generalBtn?.classList.remove('active-general');
  needBtn?.classList.remove('active-need');

  if (type === 'general') {
    generalBtn?.classList.add('active-general');

    // 1. Hide Title
    if (titleWrap) titleWrap.style.display = 'none';
    if (titleInput) {
      titleInput.required = false;
      titleInput.value = '';
    }

    // 2. Hide Category & make Visibility span full width
    if (categoryWrap) categoryWrap.style.display = 'none';
    if (categoryVisibilityRow) categoryVisibilityRow.style.gridTemplateColumns = '1fr';
    if (visWrap) visWrap.style.display = 'block';
    if (catSelect) catSelect.value = 'සාමාන්‍ය';

    // 3. Hide Location & Contact
    if (locationContactRow) locationContactRow.style.display = 'none';
    if (locationWrap) locationWrap.style.display = 'none';
    if (contactWrap) contactWrap.style.display = 'none';
    if (locInput) locInput.value = '';

    // 4. Update labels & placeholder
    if (descLabel) descLabel.innerText = 'සටහන / සුබපැතුම *';
    if (descInput) descInput.placeholder = 'අද දවසේ සිතුවිලි, සුබපැතුම් හෝ සාමාන්‍ය සටහන මෙහි ලියන්න...';
    if (submitBtnText) submitBtnText.innerText = 'පවුරට එක් කරන්න';

  } else if (type === 'need') {
    needBtn?.classList.add('active-need');

    // 1. Show Title for need
    if (titleWrap) titleWrap.style.display = 'block';
    if (titleLabel) titleLabel.innerText = 'සත්කාරයේ මාතෘකාව *';
    if (titleInput) {
      titleInput.required = true;
      titleInput.placeholder = 'සත්කාරයේ හෝ ආධාරයේ මාතෘකාව';
    }

    // 2. Show Category (full width since visibility is hidden for needs)
    if (categoryWrap) categoryWrap.style.display = 'block';
    if (categoryVisibilityRow) categoryVisibilityRow.style.gridTemplateColumns = '1fr';
    if (visWrap) visWrap.style.display = 'none';
    if (catSelect) catSelect.value = 'සමාජ සත්කාර';

    // 3. Show Location & Contact
    if (locationContactRow) locationContactRow.style.display = 'grid';
    if (locationWrap) locationWrap.style.display = 'block';
    if (contactWrap) contactWrap.style.display = 'block';

    // 4. Update labels & placeholder
    if (descLabel) descLabel.innerText = 'විස්තරය *';
    if (descInput) descInput.placeholder = 'අවශ්‍යතාවය, ලැබිය යුතු ආකාරය සහ නිවැරදි තොරතුරු විස්තර කරන්න...';
    if (submitBtnText) submitBtnText.innerText = 'සත්කාර ඉල්ලීම පළ කරන්න';

  } else {
    // Default: 'merit'
    meritBtn?.classList.add('active');

    // 1. Show Title for merit
    if (titleWrap) titleWrap.style.display = 'block';
    if (titleLabel) titleLabel.innerText = 'මාතෘකාව (විකල්ප)';
    if (titleInput) {
      titleInput.required = false;
      titleInput.placeholder = 'උදා: රුවන්වැලිසෑය අභියස සුවඳ මල් පූජාව (විකල්ප)';
    }

    // 2. Show Category & Visibility side-by-side
    if (categoryWrap) categoryWrap.style.display = 'block';
    if (categoryVisibilityRow) categoryVisibilityRow.style.gridTemplateColumns = '1fr 1fr';
    if (visWrap) visWrap.style.display = 'block';
    if (catSelect && ['සුබපැතුම්', 'සිතුවිලි', 'සාමාන්‍ය', 'සමාජ සත්කාර'].includes(catSelect.value)) {
      catSelect.value = 'දානමය';
    }

    // 3. Show Location, hide Contact
    if (locationContactRow) locationContactRow.style.display = 'grid';
    if (locationWrap) locationWrap.style.display = 'block';
    if (contactWrap) contactWrap.style.display = 'none';

    // 4. Update labels & placeholder
    if (descLabel) descLabel.innerText = 'විස්තරය *';
    if (descInput) descInput.placeholder = 'ඔබ සිදුකළ පින්කම සහ සිත පහදවාගත් ආකාරය විස්තර කරන්න...';
    if (submitBtnText) submitBtnText.innerText = 'පුණ්‍ය පවුරට එක් කරන්න';
  }
};

// Multi-Image Compression & Composer Thumbnails
window.handleMultipleImagesSelected = async function(event) {
  const files = Array.from(event.target.files || []);
  if (files.length === 0) return;

  const validFiles = files.filter(f => f.type.startsWith('image/'));
  if (validFiles.length === 0) {
    alert("කරුණාකර වලංගු ඡායාරූප (Images) තෝරන්න.");
    return;
  }

  // Maximum 5 images per post
  const remainingSlots = 5 - selectedImagesList.length;
  if (remainingSlots <= 0) {
    alert("එක් පින්කමක් සඳහා එක් කළ හැක්කේ උපරිම ඡායාරූප 5ක් පමණි.");
    return;
  }

  const filesToProcess = validFiles.slice(0, remainingSlots);
  const statsEl = document.getElementById('compressStats');
  const previewCont = document.getElementById('imagePreviewContainer');
  if (previewCont) previewCont.style.display = 'block';
  if (statsEl) statsEl.innerText = `ඡායාරූප ${filesToProcess.length}ක් සම්පීඩනය වෙමින් පවතී...`;

  for (const file of filesToProcess) {
    try {
      const base64 = await compressSingleImageFile(file);
      if (base64) selectedImagesList.push(base64);
    } catch (err) {
      console.warn('[Compression] Failed to compress image:', err);
    }
  }

  if (statsEl) statsEl.innerText = `ඡායාරූප ${selectedImagesList.length}ක් සාර්ථකව සූදානම් කෙරිණි (WebP, ~40KB)`;
  renderComposerThumbnails();
  event.target.value = '';
};

// Backward-compat alias for single upload triggers
window.compressImage = window.handleMultipleImagesSelected;

function compressSingleImageFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 700; // Optimal 600px-700px limit for fast mobile compression & small KB footprint
        let w = img.width;
        let h = img.height;
        if (w > MAX_DIM || h > MAX_DIM) {
          if (w > h) {
            h = Math.round((h * MAX_DIM) / w);
            w = MAX_DIM;
          } else {
            w = Math.round((w * MAX_DIM) / h);
            h = MAX_DIM;
          }
        }
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        ctx.drawImage(img, 0, 0, w, h);

        const webpData = canvas.toDataURL('image/webp', 0.60);
        resolve(webpData);
      };
      img.onerror = () => resolve(null);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

function renderComposerThumbnails() {
  const container = document.getElementById('imagePreviewContainer');
  const grid = document.getElementById('imagePreviewGrid');
  const statsEl = document.getElementById('compressStats');

  if (!container || !grid) return;

  if (selectedImagesList.length === 0) {
    container.style.display = 'none';
    grid.innerHTML = '';
    if (statsEl) statsEl.innerText = '';
    return;
  }

  container.style.display = 'block';
  grid.innerHTML = selectedImagesList.map((img, idx) => `
    <div class="composer-thumb-item" onclick="openLightbox(selectedImagesList, ${idx})" style="cursor: pointer;" title="විශාල කර බලන්න">
      <img src="${img}" alt="තෝරාගත් ඡායාරූපය ${idx + 1}">
      <button type="button" class="composer-thumb-remove" onclick="event.stopPropagation(); removeSelectedComposerImage(${idx})" title="ඉවත් කරන්න">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  `).join('');

  const totalSizeKB = Math.round(selectedImagesList.reduce((acc, img) => acc + (img.length * 3 / 4), 0) / 1024);
  if (statsEl) {
    statsEl.innerText = `ඡායාරූප ${selectedImagesList.length}/5 ක් තෝරාගන්නා ලදී (සම්පීඩිත ධාරිතාව: ~${totalSizeKB} KB) • විශාල කර බැලීමට පින්තූරය ඔබන්න`;
  }
}

window.removeSelectedComposerImage = function(index) {
  if (index >= 0 && index < selectedImagesList.length) {
    selectedImagesList.splice(index, 1);
    renderComposerThumbnails();
  }
};

// Fullscreen Photo Lightbox Gallery with Zoom & Touch Gesture Navigation
let currentLightboxZoom = 1;
let currentLightboxPanX = 0;
let currentLightboxPanY = 0;

function applyLightboxTransform(isDragging = false) {
  const imgEl = document.getElementById('lightboxActiveImage');
  if (!imgEl) return;
  if (currentLightboxZoom <= 1) {
    currentLightboxZoom = 1;
    currentLightboxPanX = 0;
    currentLightboxPanY = 0;
    imgEl.style.transform = 'translate(0px, 0px) scale(1)';
    imgEl.style.cursor = 'default';
  } else {
    imgEl.style.transform = `translate(${currentLightboxPanX}px, ${currentLightboxPanY}px) scale(${currentLightboxZoom})`;
    imgEl.style.cursor = isDragging ? 'grabbing' : 'grab';
  }
  imgEl.style.transition = isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.2, 0, 0.2, 1)';
}

export function zoomInLightbox(step = 0.5) {
  currentLightboxZoom = Math.min(4, Math.round((currentLightboxZoom + step) * 10) / 10);
  applyLightboxTransform(false);
  triggerHaptic(10);
}
window.zoomInLightbox = zoomInLightbox;

export function zoomOutLightbox(step = 0.5) {
  currentLightboxZoom = Math.max(1, Math.round((currentLightboxZoom - step) * 10) / 10);
  if (currentLightboxZoom === 1) {
    currentLightboxPanX = 0;
    currentLightboxPanY = 0;
  }
  applyLightboxTransform(false);
  triggerHaptic(10);
}
window.zoomOutLightbox = zoomOutLightbox;

export function resetZoomLightbox() {
  currentLightboxZoom = 1;
  currentLightboxPanX = 0;
  currentLightboxPanY = 0;
  applyLightboxTransform(false);
  triggerHaptic(10);
}
window.resetZoomLightbox = resetZoomLightbox;

export function openPostLightbox(postId, startIndex = 0, el = null) {
  try {
    const strId = (postId != null) ? String(postId) : '';
    let images = [];
    if (strId && window._postImagesMap && window._postImagesMap[strId] && window._postImagesMap[strId].length > 0) {
      images = window._postImagesMap[strId];
    }
    if ((!images || images.length === 0) && typeof currentPostsData !== 'undefined' && Array.isArray(currentPostsData)) {
      const p = currentPostsData.find(item => item && String(item.id) === strId);
      if (p) {
        images = (p.images && p.images.length > 0) ? p.images : (p.image ? [p.image] : []);
      }
    }
    if ((!images || images.length === 0) && typeof StorageService !== 'undefined' && StorageService.getLocalPosts) {
      try {
        const localPosts = StorageService.getLocalPosts() || [];
        const p = localPosts.find(item => item && String(item.id) === strId);
        if (p) {
          images = (p.images && p.images.length > 0) ? p.images : (p.image ? [p.image] : []);
        }
      } catch (e) {}
    }
    if ((!images || images.length === 0) && el) {
      const container = el.closest ? el.closest('.photo-collage-container') : null;
      if (container) {
        images = Array.from(container.querySelectorAll('img')).map(i => i.currentSrc || i.src).filter(Boolean);
      } else if (el.tagName === 'IMG') {
        images = [el.currentSrc || el.src];
      }
    }
    if ((!images || images.length === 0) && strId && (strId.startsWith('http') || strId.startsWith('data:') || strId.startsWith('blob:') || strId.startsWith('assets/'))) {
      images = [strId];
    }
    if (images && images.length > 0) {
      openLightbox(images, startIndex);
    } else {
      console.warn('[openPostLightbox] No images found for post:', postId);
    }
  } catch (err) {
    console.error('[openPostLightbox] Error:', err);
  }
}
window.openPostLightbox = openPostLightbox;

export function openLightbox(encodedImages, startIndex = 0) {
  try {
    let images = [];
    if (Array.isArray(encodedImages)) {
      images = [...encodedImages];
    } else if (typeof encodedImages === 'string') {
      const trimmed = encodedImages.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('%5B') || trimmed.startsWith('%5b')) {
        try {
          const decoded = trimmed.startsWith('%') ? decodeURIComponent(trimmed) : trimmed;
          const parsed = JSON.parse(decoded);
          if (Array.isArray(parsed)) images = parsed;
        } catch (e) {
          images = [trimmed];
        }
      } else if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('blob:') || trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('assets/')) {
        images = [trimmed];
      } else if (window._postImagesMap && window._postImagesMap[trimmed]) {
        images = window._postImagesMap[trimmed];
      } else {
        images = [trimmed];
      }
    }

    const cleanList = (images || []).map(img => {
      if (typeof img !== 'string') return null;
      return Security.sanitizeUrl(img) || img;
    }).filter(Boolean);

    if (cleanList.length > 0) {
      images = cleanList;
    }
    if (!images || images.length === 0) return;

    currentLightboxImages = images;
    currentLightboxIndex = startIndex >= 0 && startIndex < images.length ? startIndex : 0;

    resetZoomLightbox();

    const modal = document.getElementById('photoLightboxModal');
    const imgEl = document.getElementById('lightboxActiveImage');
    const counterEl = document.getElementById('lightboxCounter');
    const prevBtn = document.getElementById('lightboxPrevBtn');
    const nextBtn = document.getElementById('lightboxNextBtn');

    if (imgEl && currentLightboxImages[currentLightboxIndex]) {
      imgEl.src = currentLightboxImages[currentLightboxIndex];
    }
    if (counterEl) counterEl.innerText = `${currentLightboxIndex + 1} / ${currentLightboxImages.length}`;

    if (prevBtn) prevBtn.style.display = currentLightboxImages.length > 1 ? 'flex' : 'none';
    if (nextBtn) nextBtn.style.display = currentLightboxImages.length > 1 ? 'flex' : 'none';

    if (modal) {
      lastLightboxOpenTime = Date.now();
      try {
        history.pushState({ type: 'modal', id: 'photoLightboxModal' }, '');
      } catch (e) {}
      modal.classList.remove('hidden');
      modal.style.setProperty('display', 'flex', 'important');
      modal.style.background = '';
      if (imgEl) {
        imgEl.style.transform = 'translate(0px, 0px) scale(1)';
        imgEl.style.transition = '';
      }
      document.body.style.overflow = 'hidden';
    }
  } catch (err) {
    console.error('[Lightbox] Failed to open:', err);
  }
}
window.openLightbox = openLightbox;

export function closeLightbox() {
  resetZoomLightbox();
  const modal = document.getElementById('photoLightboxModal');
  const imgEl = document.getElementById('lightboxActiveImage');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.setProperty('display', 'none', 'important');
    modal.style.background = '';
    document.body.style.overflow = '';
  }
  if (imgEl) {
    imgEl.style.transform = 'translate(0px, 0px) scale(1)';
    imgEl.style.transition = '';
  }
}
window.closeLightbox = closeLightbox;

let lastLightboxOpenTime = 0;

export function closeLightboxOnBackdrop(e) {
  // Prevent immediate closure if the touch/click was part of opening
  if (Date.now() - lastLightboxOpenTime < 1000) {
    return;
  }
  // Only close if clicking outside the image content on the backdrop overlay
  if (e.target.classList.contains('lightbox-backdrop') || e.target.id === 'photoLightboxModal') {
    if (currentLightboxZoom > 1) {
      resetZoomLightbox();
    } else {
      closeLightbox();
    }
  }
}
window.closeLightboxOnBackdrop = closeLightboxOnBackdrop;

export function nextLightboxImage() {
  if (currentLightboxImages.length <= 1) return;
  currentLightboxIndex = (currentLightboxIndex + 1) % currentLightboxImages.length;
  updateLightboxView();
  triggerHaptic(15);
}
window.nextLightboxImage = nextLightboxImage;

export function prevLightboxImage() {
  if (currentLightboxImages.length <= 1) return;
  currentLightboxIndex = (currentLightboxIndex - 1 + currentLightboxImages.length) % currentLightboxImages.length;
  updateLightboxView();
  triggerHaptic(15);
}
window.prevLightboxImage = prevLightboxImage;

export function updateLightboxView() {
  resetZoomLightbox();
  const imgEl = document.getElementById('lightboxActiveImage');
  const counterEl = document.getElementById('lightboxCounter');
  if (imgEl) imgEl.src = currentLightboxImages[currentLightboxIndex];
  if (counterEl) counterEl.innerText = `${currentLightboxIndex + 1} / ${currentLightboxImages.length}`;
}

// Arrow key & keyboard zoom navigation for Lightbox
document.addEventListener('keydown', (e) => {
  const modal = document.getElementById('photoLightboxModal');
  if (modal && !modal.classList.contains('hidden')) {
    if (e.key === 'ArrowRight') window.nextLightboxImage();
    else if (e.key === 'ArrowLeft') window.prevLightboxImage();
    else if (e.key === 'Escape') window.closeLightbox();
    else if (e.key === '+' || e.key === '=') window.zoomInLightbox();
    else if (e.key === '-' || e.key === '_') window.zoomOutLightbox();
    else if (e.key === '0') window.resetZoomLightbox();
  }
});

// Universal Photo Open Handler (Shared between Touch & Click)
let lastPhotoTriggerTime = 0;

function handlePhotoOpenTarget(target) {
  if (!target) return false;
  if (target.closest('.lightbox-top-bar') || target.closest('.lightbox-nav-btn')) return false;
  if (target.closest('.composer-thumb-remove')) return false;

  // 1. Post Photo Collage Grid item or container
  const collageContainer = target.closest('.photo-collage-container');
  if (collageContainer) {
    const postId = collageContainer.dataset.postId || collageContainer.getAttribute('data-post-id');
    let images = [];
    if (postId && window._postImagesMap && window._postImagesMap[String(postId)] && window._postImagesMap[String(postId)].length > 0) {
      images = window._postImagesMap[String(postId)];
    }
    if ((!images || images.length === 0) && typeof currentPostsData !== 'undefined' && Array.isArray(currentPostsData)) {
      const p = currentPostsData.find(item => item && String(item.id) === String(postId));
      if (p) {
        images = (p.images && p.images.length > 0) ? p.images : (p.image ? [p.image] : []);
      }
    }
    if ((!images || images.length === 0) && typeof StorageService !== 'undefined' && StorageService.getLocalPosts) {
      try {
        const localPosts = StorageService.getLocalPosts() || [];
        const p = localPosts.find(item => item && String(item.id) === String(postId));
        if (p) {
          images = (p.images && p.images.length > 0) ? p.images : (p.image ? [p.image] : []);
        }
      } catch (e) {}
    }
    if (!images || images.length === 0) {
      images = Array.from(collageContainer.querySelectorAll('img')).map(img => img.currentSrc || img.src).filter(Boolean);
    }
    if (!images || images.length === 0) {
      const directImg = target.tagName === 'IMG' ? target : target.querySelector('img');
      if (directImg && (directImg.currentSrc || directImg.src)) {
        images = [directImg.currentSrc || directImg.src];
      }
    }

    let startIndex = 0;
    const collageItem = target.closest('.collage-item');
    if (collageItem) {
      const dataIdx = collageItem.dataset.index || collageItem.getAttribute('data-index');
      if (dataIdx !== null && dataIdx !== undefined && !isNaN(parseInt(dataIdx, 10))) {
        startIndex = parseInt(dataIdx, 10);
      } else {
        const allItems = Array.from(collageContainer.querySelectorAll('.collage-item'));
        const idx = allItems.indexOf(collageItem);
        if (idx >= 0) startIndex = idx;
      }
    }

    if (images && images.length > 0) {
      window.openLightbox(images, startIndex);
      return true;
    }
    return false;
  }

  // 2. Quoted Merit Image
  const quoted = target.closest('.quoted-merit-image');
  if (quoted) {
    const img = quoted.querySelector('img') || (target.tagName === 'IMG' ? target : null);
    if (img && (img.currentSrc || img.src)) {
      window.openLightbox([img.currentSrc || img.src], 0);
      return true;
    }
  }

  // 3. Profile Gallery Card
  const gallery = target.closest('.gallery-card');
  if (gallery) {
    const img = gallery.querySelector('img') || (target.tagName === 'IMG' ? target : null);
    if (img && (img.currentSrc || img.src)) {
      window.openLightbox([img.currentSrc || img.src], 0);
      return true;
    }
  }

  // 4. Composer Upload Preview Thumbnails
  const thumb = target.closest('.composer-thumb-item');
  if (thumb) {
    const allThumbs = Array.from(document.querySelectorAll('.composer-thumb-item'));
    const idx = allThumbs.indexOf(thumb);
    if (typeof selectedImagesList !== 'undefined' && selectedImagesList.length > 0) {
      window.openLightbox(selectedImagesList, Math.max(0, idx));
      return true;
    }
  }

  return false;
}

// =========================================================================
// Facebook-style High-Precision Photo Tap & Click Handler (Mobile & Desktop)
// =========================================================================
let photoTouchStartX = 0;
let photoTouchStartY = 0;
let photoTouchStartTime = 0;
let photoTouchTarget = null;
let photoTouchMoved = false;

// 26px threshold accommodates natural finger compression/roll on high-DPI screens without canceling taps
const PHOTO_TAP_MAX_DISTANCE = 26;
// Up to 650ms accommodates natural and deliberate mobile taps
const PHOTO_TAP_MAX_DURATION = 650;

document.addEventListener('touchstart', (e) => {
  if (e.touches.length !== 1) {
    photoTouchTarget = null;
    return;
  }
  const touch = e.touches[0];
  const target = touch.target;
  const isPhotoTarget = target.closest('.photo-collage-container') ||
                        target.closest('.quoted-merit-image') ||
                        target.closest('.gallery-card') ||
                        target.closest('.composer-thumb-item');
  if (isPhotoTarget) {
    photoTouchStartX = touch.clientX;
    photoTouchStartY = touch.clientY;
    photoTouchStartTime = Date.now();
    photoTouchTarget = target;
    photoTouchMoved = false;
  } else {
    photoTouchTarget = null;
  }
}, { passive: true });

document.addEventListener('touchmove', (e) => {
  if (!photoTouchTarget || e.touches.length !== 1) return;
  const touch = e.touches[0];
  const dx = touch.clientX - photoTouchStartX;
  const dy = touch.clientY - photoTouchStartY;
  // Only classify as a feed scroll if user drags beyond 26px
  if (Math.hypot(dx, dy) > PHOTO_TAP_MAX_DISTANCE) {
    photoTouchMoved = true;
    photoTouchTarget = null;
  }
}, { passive: true });

document.addEventListener('touchend', (e) => {
  if (!photoTouchTarget || photoTouchMoved) {
    photoTouchTarget = null;
    return;
  }
  const duration = Date.now() - photoTouchStartTime;
  const target = photoTouchTarget;
  photoTouchTarget = null;

  if (duration < PHOTO_TAP_MAX_DURATION && target) {
    if (Date.now() - lastPhotoTriggerTime < 400) return;
    lastPhotoTriggerTime = Date.now();
    const handled = handlePhotoOpenTarget(target);
    if (handled && e.cancelable) {
      // Prevent browser's delayed synthetic click to avoid duplicate execution
      e.preventDefault();
    }
  }
}, { passive: false });

document.addEventListener('touchcancel', () => {
  photoTouchTarget = null;
  photoTouchMoved = false;
});

// Desktop Mouse Click & Fallback Browser Click Interceptor (Event Delegation - Capture Phase)
document.addEventListener('click', (e) => {
  if (e.target.closest('.lightbox-top-bar') || e.target.closest('.lightbox-nav-btn')) return;
  if (e.target.closest('.composer-thumb-remove')) return;

  const isPhotoTarget = e.target.closest('.photo-collage-container') ||
                        e.target.closest('.quoted-merit-image') ||
                        e.target.closest('.gallery-card') ||
                        e.target.closest('.composer-thumb-item');
  if (isPhotoTarget) {
    // If touchend already handled this tap, prevent duplicate execution from synthetic click
    if (Date.now() - lastPhotoTriggerTime < 450) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    lastPhotoTriggerTime = Date.now();
    e.preventDefault();
    e.stopPropagation();
    handlePhotoOpenTarget(e.target);
  }
}, true);

// Fullscreen Photo Lightbox Gestures (Swipe Left/Right, Swipe Down to Dismiss, Pinch & Double-tap Zoom)
function initLightboxTouchGestures() {
  const modal = document.getElementById('photoLightboxModal');
  const imgEl = document.getElementById('lightboxActiveImage');
  if (!modal || !imgEl) return;

  let touchStartX = 0;
  let touchStartY = 0;
  let touchDeltaX = 0;
  let touchDeltaY = 0;
  let isTouching = false;
  let isPinching = false;
  let isDraggingPan = false;
  let panStartX = 0;
  let panStartY = 0;
  let initialPinchDistance = 0;
  let pinchStartZoom = 1;
  let lastTapTime = 0;

  modal.addEventListener('touchstart', (e) => {
    if (e.target.closest('.lightbox-top-bar') || e.target.closest('.lightbox-nav-btn')) return;

    if (e.touches.length === 1) {
      isTouching = true;
      isPinching = false;
      const t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      touchDeltaX = 0;
      touchDeltaY = 0;

      if (currentLightboxZoom > 1) {
        isDraggingPan = true;
        panStartX = t.clientX - currentLightboxPanX;
        panStartY = t.clientY - currentLightboxPanY;
      }
    } else if (e.touches.length === 2) {
      isTouching = false;
      isDraggingPan = false;
      isPinching = true;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      initialPinchDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      pinchStartZoom = currentLightboxZoom;
    }
  }, { passive: false });

  modal.addEventListener('touchmove', (e) => {
    if (isPinching && e.touches.length === 2) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      if (initialPinchDistance > 0) {
        const factor = currentDist / initialPinchDistance;
        currentLightboxZoom = Math.min(4, Math.max(1, Math.round((pinchStartZoom * factor) * 100) / 100));
        applyLightboxTransform(true);
      }
    } else if (isTouching && e.touches.length === 1) {
      const t = e.touches[0];
      touchDeltaX = t.clientX - touchStartX;
      touchDeltaY = t.clientY - touchStartY;

      if (currentLightboxZoom > 1 && isDraggingPan) {
        e.preventDefault();
        currentLightboxPanX = t.clientX - panStartX;
        currentLightboxPanY = t.clientY - panStartY;
        applyLightboxTransform(true);
      } else if (currentLightboxZoom === 1) {
        // Vertical Swipe-Down/Up to Dismiss (Facebook style)
        if (Math.abs(touchDeltaY) > Math.abs(touchDeltaX) * 1.1) {
          e.preventDefault();
          const scale = Math.max(0.72, 1 - Math.abs(touchDeltaY) / 900);
          imgEl.style.transition = 'none';
          imgEl.style.transform = `translate(0px, ${touchDeltaY}px) scale(${scale})`;
          const bgOpacity = Math.max(0.25, 0.96 - Math.abs(touchDeltaY) / 500);
          modal.style.background = `rgba(10, 10, 15, ${bgOpacity})`;
        } else if (Math.abs(touchDeltaX) > Math.abs(touchDeltaY) && currentLightboxImages.length > 1) {
          // Horizontal Swipe to view next/prev image
          e.preventDefault();
          imgEl.style.transition = 'none';
          imgEl.style.transform = `translate(${touchDeltaX * 0.4}px, 0px) scale(1)`;
        }
      }
    }
  }, { passive: false });

  modal.addEventListener('touchend', (e) => {
    if (isPinching) {
      isPinching = false;
      if (currentLightboxZoom < 1.05) {
        resetZoomLightbox();
      } else {
        applyLightboxTransform(false);
      }
      return;
    }

    if (isTouching) {
      isTouching = false;
      const now = Date.now();
      const tapDist = Math.hypot(touchDeltaX, touchDeltaY);

      // Double-tap to zoom in (2.2x) or reset (1x)
      if (tapDist < 12 && (now - lastTapTime) < 300) {
        lastTapTime = 0;
        if (currentLightboxZoom > 1) {
          resetZoomLightbox();
        } else {
          currentLightboxZoom = 2.2;
          applyLightboxTransform(false);
          triggerHaptic(15);
        }
        return;
      }
      lastTapTime = now;

      if (currentLightboxZoom > 1) {
        isDraggingPan = false;
        applyLightboxTransform(false);
      } else {
        // Vertical swipe to dismiss threshold (Facebook style)
        if (Math.abs(touchDeltaY) > 75 && Math.abs(touchDeltaY) > Math.abs(touchDeltaX) * 1.1) {
          window.closeLightbox();
          modal.style.background = '';
          return;
        }

        // Horizontal swipe to next/prev image threshold
        if (Math.abs(touchDeltaX) > 45 && Math.abs(touchDeltaX) > Math.abs(touchDeltaY) * 1.2 && currentLightboxImages.length > 1) {
          imgEl.style.transition = 'transform 0.22s cubic-bezier(0.2, 0, 0.2, 1)';
          if (touchDeltaX < 0) {
            window.nextLightboxImage();
          } else {
            window.prevLightboxImage();
          }
        } else {
          // Snap back to center
          imgEl.style.transition = 'transform 0.22s cubic-bezier(0.2, 0, 0.2, 1)';
          imgEl.style.transform = 'translate(0px, 0px) scale(1)';
          modal.style.background = '';
        }
      }
    }
  });

  // Desktop Mouse Drag when Zoomed
  let isMouseDragging = false;
  let mouseStartX = 0;
  let mouseStartY = 0;

  imgEl.addEventListener('mousedown', (e) => {
    if (currentLightboxZoom > 1) {
      e.preventDefault();
      isMouseDragging = true;
      mouseStartX = e.clientX - currentLightboxPanX;
      mouseStartY = e.clientY - currentLightboxPanY;
      imgEl.style.cursor = 'grabbing';
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (isMouseDragging && currentLightboxZoom > 1) {
      e.preventDefault();
      currentLightboxPanX = e.clientX - mouseStartX;
      currentLightboxPanY = e.clientY - mouseStartY;
      applyLightboxTransform(true);
    }
  });

  window.addEventListener('mouseup', () => {
    if (isMouseDragging) {
      isMouseDragging = false;
      if (imgEl) imgEl.style.cursor = currentLightboxZoom > 1 ? 'grab' : 'default';
      applyLightboxTransform(false);
    }
  });

  // Desktop Mouse Wheel Zoom
  modal.addEventListener('wheel', (e) => {
    if (modal.classList.contains('hidden')) return;
    e.preventDefault();
    if (e.deltaY < 0) {
      window.zoomInLightbox(0.3);
    } else {
      window.zoomOutLightbox(0.3);
    }
  }, { passive: false });
}

// ============================================================================
// Fullscreen Dharma Reels / Shorts Vertical Swipe Viewer (පුණ්‍ය දැක්ම)
// ============================================================================
let currentReelsObserver = null;
let activeReelPostId = null;

window.openReelsViewer = function(initialPostId = null) {
  const modal = document.getElementById('reelsModal');
  const viewport = document.getElementById('reelsViewport');
  if (!modal || !viewport) return;

  // Filter all posts that have a valid videoId
  const posts = (Array.isArray(currentPostsData) && currentPostsData.length > 0) ? currentPostsData : StorageService.getLocalPosts();
  const videoPosts = posts.filter(p => p.videoId && p.isDeleted !== true);

  if (videoPosts.length === 0) {
    alert("දැනට පුණ්‍ය දැක්මේ Shorts වීඩියෝ සටහන් නොමැත. ඔබේ ප්‍රථම ධර්ම Shorts සටහන දැන්ම එක් කරන්න!");
    window.openShortsUploadModal();
    return;
  }

  try {
    history.pushState({ type: 'modal', id: 'reelsModal' }, '');
  } catch (e) {}

  document.body.style.overflow = 'hidden';
  modal.classList.remove('hidden');

  // Determine starting index
  let startIndex = 0;
  if (initialPostId) {
    const idx = videoPosts.findIndex(p => p.id === initialPostId);
    if (idx !== -1) startIndex = idx;
  }

  // Render slides into reelsViewport
  viewport.innerHTML = videoPosts.map((reel, index) => {
    const authorName = StorageService.resolveAuthorName(reel) || reel.author || 'කල්‍යාණ මිත්‍රයෙක්';
    const authorPhoto = StorageService.resolveAuthorPhoto(reel) || reel.authorPhoto || null;
    const sadhuCount = Math.max(0, parseInt(reel.sadhuCount, 10) || (Array.isArray(reel.sadhuUsers) ? reel.sadhuUsers.length : 0));
    const commentsCount = Array.isArray(reel.comments) ? reel.comments.length : 0;
    const hasGivenSadhu = StorageService.hasUserGivenSadhu ? StorageService.hasUserGivenSadhu(reel) : false;
    const thumbUrl = Security.sanitizeUrl(reel.videoThumbnail) || `https://img.youtube.com/vi/${encodeURIComponent(reel.videoId)}/hqdefault.jpg`;

    return `
      <div class="reels-slide" id="reel-slide-${reel.id}" data-post-id="${reel.id}" data-video-id="${reel.videoId}">
        <div class="reels-media-wrap" id="reel-media-${reel.id}">
          <div class="reels-slide-facade" id="reel-facade-${reel.id}" onclick="loadReelIframe('${reel.id}', '${reel.videoId}')">
            <img src="${thumbUrl}" class="reels-slide-thumb" alt="${Security.escapeHTML(reel.title || 'Dharma Short')}" loading="lazy">
            <div class="glowing-play-btn" style="position: absolute;"><i class="fa-solid fa-play"></i></div>
          </div>
        </div>

        <!-- Floating Actions on Right -->
        <div class="reels-actions-col">
          <div style="display: flex; flex-direction: column; align-items: center;">
            <button type="button" class="reels-action-circle ${hasGivenSadhu ? 'active-sadhu' : ''}" id="reel-sadhu-btn-${reel.id}" onclick="handleReelSadhu('${reel.id}', this, event)" title="සාදුකාර දෙන්න">
              <span>🙏</span>
            </button>
            <span class="reels-action-count" id="reel-sadhu-count-${reel.id}">${sadhuCount}</span>
          </div>

          <div style="display: flex; flex-direction: column; align-items: center;">
            <button type="button" class="reels-action-circle" id="reel-comment-btn-${reel.id}" onclick="openReelCommentsDrawer('${reel.id}')" title="පුණ්‍යානුමෝදනා හා ප්‍රාර්ථනා">
              <i class="fa-regular fa-comment-dots" style="color: #fde68a;"></i>
            </button>
            <span class="reels-action-count" id="reel-comment-count-${reel.id}">${commentsCount}</span>
          </div>

          <div style="display: flex; flex-direction: column; align-items: center;">
            <button type="button" class="reels-action-circle" id="reel-share-btn-${reel.id}" onclick="handleReelShare('${reel.id}', this)" title="බෙදාගන්න">
              <i class="fa-solid fa-share-nodes" style="color: #ffffff;"></i>
            </button>
            <span class="reels-action-count" id="reel-share-count-${reel.id}">${reel.shareCount || 0}</span>
          </div>
        </div>

        <!-- Bottom Post Information Overlay -->
        <div class="reels-bottom-info">
          <div class="reels-author-row">
            <div class="reels-author-avatar" onclick="closeReelsViewer(); viewUserProfile('${reel.uid}', '${Security.escapeHTML(authorName)}')" style="cursor: pointer;">
              ${authorPhoto ? `<img src="${Security.sanitizeUrl(authorPhoto)}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : Security.escapeHTML(authorName.charAt(0))}
            </div>
            <div>
              <span class="reels-author-name" onclick="closeReelsViewer(); viewUserProfile('${reel.uid}', '${Security.escapeHTML(authorName)}')">${Security.escapeHTML(authorName)}</span>
            </div>
            <span class="reels-category-tag">${Security.escapeHTML(reel.category || 'ධර්ම දානමය')}</span>
          </div>

          ${reel.title && reel.title !== 'පින්කම් සටහන' ? `<div class="reels-post-title">${Security.escapeHTML(reel.title)}</div>` : ''}
          <div class="reels-post-desc" id="reel-desc-${reel.id}">
            ${Security.escapeHTML(reel.description || '')}
          </div>
          ${(reel.description && reel.description.length > 80) ? `
            <button type="button" class="reels-desc-more-btn" onclick="toggleReelDesc('${reel.id}')" id="reel-more-btn-${reel.id}">තවත්...</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Setup Intersection Observer for buttery smooth auto-play on scroll
  if (currentReelsObserver) {
    currentReelsObserver.disconnect();
  }

  currentReelsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const slide = entry.target;
      const postId = slide.getAttribute('data-post-id');
      const videoId = slide.getAttribute('data-video-id');

      if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
        activeReelPostId = postId;
        loadReelIframe(postId, videoId);
      } else {
        unloadReelIframe(postId, videoId);
      }
    });
  }, {
    root: viewport,
    threshold: 0.6
  });

  const slides = viewport.querySelectorAll('.reels-slide');
  slides.forEach(s => currentReelsObserver.observe(s));

  // Scroll to starting slide if not 0
  if (startIndex > 0 && slides[startIndex]) {
    setTimeout(() => {
      slides[startIndex].scrollIntoView({ behavior: 'auto' });
    }, 50);
  } else if (slides[0]) {
    const firstPostId = slides[0].getAttribute('data-post-id');
    const firstVideoId = slides[0].getAttribute('data-video-id');
    loadReelIframe(firstPostId, firstVideoId);
  }

  // Show Animated Swipe Guidance Hint for Newcomers
  showReelsSwipeHint();
};

window.loadReelIframe = function(postId, videoId) {
  const mediaWrap = document.getElementById(`reel-media-${postId}`);
  if (!mediaWrap) return;

  const existingIframe = mediaWrap.querySelector('iframe');
  if (existingIframe) return; // already loaded

  const cleanVideoId = encodeURIComponent(videoId);
  mediaWrap.innerHTML = `
    <iframe class="reels-iframe"
      src="https://www.youtube-nocookie.com/embed/${cleanVideoId}?autoplay=1&playsinline=1&modestbranding=1&rel=0&enablejsapi=1"
      title="Dharma Short Player"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen>
    </iframe>
  `;
};

window.unloadReelIframe = function(postId, videoId) {
  const mediaWrap = document.getElementById(`reel-media-${postId}`);
  if (!mediaWrap) return;

  const existingIframe = mediaWrap.querySelector('iframe');
  if (!existingIframe) return;

  const thumbUrl = `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
  mediaWrap.innerHTML = `
    <div class="reels-slide-facade" id="reel-facade-${postId}" onclick="loadReelIframe('${postId}', '${videoId}')">
      <img src="${thumbUrl}" class="reels-slide-thumb" alt="Dharma Short" loading="lazy">
      <div class="glowing-play-btn" style="position: absolute;"><i class="fa-solid fa-play"></i></div>
    </div>
  `;
};

window.closeReelsViewer = function() {
  const modal = document.getElementById('reelsModal');
  const viewport = document.getElementById('reelsViewport');
  if (modal) modal.classList.add('hidden');
  closeReelCommentsDrawer();
  dismissReelsSwipeHint();
  if (currentReelsObserver) {
    currentReelsObserver.disconnect();
    currentReelsObserver = null;
  }
  if (viewport) {
    viewport.innerHTML = ''; // completely unload all iframes and audio
  }
  document.body.style.overflow = '';
};

window.scrollReelNext = function() {
  const viewport = document.getElementById('reelsViewport');
  if (viewport) {
    viewport.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
  }
};

window.scrollReelPrev = function() {
  const viewport = document.getElementById('reelsViewport');
  if (viewport) {
    viewport.scrollBy({ top: -window.innerHeight, behavior: 'smooth' });
  }
};

window.toggleReelDesc = function(postId) {
  const desc = document.getElementById(`reel-desc-${postId}`);
  const btn = document.getElementById(`reel-more-btn-${postId}`);
  if (!desc) return;
  desc.classList.toggle('expanded');
  if (btn) {
    btn.textContent = desc.classList.contains('expanded') ? 'අඩු කරන්න' : 'තවත්...';
  }
};

// ============================================================================
// Swipe Guidance Hint Controller
// ============================================================================
let reelsSwipeHintTimeout = null;

window.showReelsSwipeHint = function() {
  const hint = document.getElementById('reelsSwipeHint');
  const viewport = document.getElementById('reelsViewport');
  if (!hint) return;

  hint.classList.remove('hidden');
  hint.classList.remove('visible');
  void hint.offsetWidth; // trigger reflow
  hint.classList.add('visible');

  clearTimeout(reelsSwipeHintTimeout);
  reelsSwipeHintTimeout = setTimeout(() => {
    dismissReelsSwipeHint();
  }, 4200);

  if (viewport) {
    const dismissOnAction = () => {
      dismissReelsSwipeHint();
      viewport.removeEventListener('scroll', dismissOnAction);
      viewport.removeEventListener('touchmove', dismissOnAction);
    };
    viewport.addEventListener('scroll', dismissOnAction, { passive: true, once: true });
    viewport.addEventListener('touchmove', dismissOnAction, { passive: true, once: true });
  }
};

window.dismissReelsSwipeHint = function(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  const hint = document.getElementById('reelsSwipeHint');
  if (!hint) return;
  hint.classList.remove('visible');
  clearTimeout(reelsSwipeHintTimeout);
  setTimeout(() => {
    hint.classList.add('hidden');
  }, 350);
};

// ============================================================================
// Floating Sadhu Reactions Animation & Sadhu Toggle
// ============================================================================
window.spawnFloatingSadhu = function(sourceEl, event) {
  const modal = document.getElementById('reelsModal') || document.body;
  let startX = window.innerWidth - 45;
  let startY = window.innerHeight - 200;

  if (sourceEl && sourceEl.getBoundingClientRect) {
    const rect = sourceEl.getBoundingClientRect();
    startX = rect.left + rect.width / 2;
    startY = rect.top + rect.height / 2;
  } else if (event && event.clientX) {
    startX = event.clientX;
    startY = event.clientY;
  }

  const icons = ['🙏', '✨', '🪷', '🌸', '🙏', '✨'];
  const count = 5;

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = 'floating-sadhu-particle';
    particle.textContent = icons[i % icons.length];

    const offsetX = (Math.random() - 0.5) * 36;
    const driftX1 = `${(Math.random() - 0.5) * 60}px`;
    const driftX2 = `${(Math.random() - 0.5) * 90}px`;
    const driftX3 = `${(Math.random() - 0.5) * 120}px`;
    const rot1 = `${(Math.random() - 0.5) * 30}deg`;
    const rot2 = `${(Math.random() - 0.5) * 45}deg`;
    const rot3 = `${(Math.random() - 0.5) * 30}deg`;

    particle.style.left = `${startX + offsetX}px`;
    particle.style.top = `${startY}px`;
    particle.style.setProperty('--drift-x1', driftX1);
    particle.style.setProperty('--drift-x2', driftX2);
    particle.style.setProperty('--drift-x3', driftX3);
    particle.style.setProperty('--rot1', rot1);
    particle.style.setProperty('--rot2', rot2);
    particle.style.setProperty('--rot3', rot3);
    particle.style.animationDelay = `${i * 80}ms`;

    modal.appendChild(particle);

    setTimeout(() => {
      particle.remove();
    }, 1450);
  }
};

window.handleReelSadhu = async function(postId, btnEl, event) {
  if (event && event.stopPropagation) event.stopPropagation();

  // Spawns immediate floating reaction particles
  spawnFloatingSadhu(btnEl, event);
  SoundService.playSadhu();
  triggerHaptic([30, 60]);

  const countEl = document.getElementById(`reel-sadhu-count-${postId}`);
  const currentCount = parseInt(countEl?.textContent || '0', 10);
  const isCurrentlyLiked = btnEl ? btnEl.classList.contains('active-sadhu') : false;

  // Immediate optimistic UI update
  if (!isCurrentlyLiked) {
    if (btnEl) btnEl.classList.add('active-sadhu');
    if (countEl) countEl.textContent = currentCount + 1;
  } else {
    if (btnEl) btnEl.classList.remove('active-sadhu');
    if (countEl) countEl.textContent = Math.max(0, currentCount - 1);
  }

  try {
    const desiredAction = isCurrentlyLiked ? 'removed' : 'added';
    const res = await StorageService.giveSadhu(postId, desiredAction);
    const confirmedCount = (res && typeof res.count === 'number') ? res.count : (isCurrentlyLiked ? Math.max(0, currentCount - 1) : currentCount + 1);

    if (res && res.hasGiven) {
      if (btnEl) btnEl.classList.add('active-sadhu');
    } else {
      if (btnEl) btnEl.classList.remove('active-sadhu');
    }
    if (countEl) {
      countEl.textContent = confirmedCount;
    }

    // Sync in-memory currentPostsData so subsequent views have the updated count
    if (typeof currentPostsData !== 'undefined' && Array.isArray(currentPostsData)) {
      const mPost = currentPostsData.find(p => p.id === postId);
      if (mPost) {
        const uUid = StorageService.currentUser?.uid || 'anonymous';
        if (!Array.isArray(mPost.sadhuUsers)) mPost.sadhuUsers = [];
        mPost.sadhuCount = confirmedCount;
        if (res && res.action === 'added') {
          if (!mPost.sadhuUsers.includes(uUid)) mPost.sadhuUsers.push(uUid);
        } else {
          mPost.sadhuUsers = mPost.sadhuUsers.filter(u => u !== uUid);
        }
      }
    }

    // Also sync the post card in the main feed
    const cardCountEl = document.getElementById(`count-btn-${postId}`);
    const cardMainCountEl = document.getElementById(`count-${postId}`);
    const cardBtnEl = document.getElementById(`sadhu-btn-${postId}`);
    if (cardCountEl) cardCountEl.textContent = confirmedCount;
    if (cardMainCountEl) cardMainCountEl.textContent = confirmedCount;
    if (cardBtnEl) {
      if (res && res.hasGiven) cardBtnEl.classList.add('liked');
      else cardBtnEl.classList.remove('liked');
    }
  } catch (err) {
    console.warn('[Reel Sadhu Error]', err);
    // rollback optimistic count on failure
    if (countEl) countEl.textContent = currentCount;
    if (isCurrentlyLiked) {
      if (btnEl) btnEl.classList.add('active-sadhu');
    } else {
      if (btnEl) btnEl.classList.remove('active-sadhu');
    }
  }
};

// ============================================================================
// Reels Share & In-Reel Feedback Toast
// ============================================================================
window.showReelsToast = function(msg) {
  const toast = document.getElementById('reelsToast');
  const toastText = document.getElementById('reelsToastText');
  if (!toast) return;
  if (toastText) toastText.textContent = msg;
  toast.classList.remove('hidden');
  toast.classList.remove('visible');
  void toast.offsetWidth;
  toast.classList.add('visible');
  clearTimeout(window._reelsToastTimeout);
  window._reelsToastTimeout = setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.classList.add('hidden'), 350);
  }, 2800);
};

window.handleReelShare = async function(postId, btnEl) {
  SoundService.playShare();
  triggerHaptic(25);

  const reel = (typeof currentPostsData !== 'undefined' && currentPostsData.find(p => p.id === postId)) ||
               (StorageService.getLocalPosts() || []).find(p => p.id === postId);

  const shareTitle = reel?.title || 'අපේ පින් පොත - පුණ්‍ය දැක්ම';
  const shareText = `ධර්ම කරුණක් / පින්කමක් නරඹන්න: ${reel?.title || 'පුණ්‍ය දැක්ම Shorts'}`;
  const shareUrl = `${window.location.origin}${window.location.pathname}?post=${encodeURIComponent(postId)}`;

  // Increment share count atomically
  try {
    await StorageService.incrementShare(postId);
  } catch (e) {
    console.warn('Increment share error', e);
  }

  // Update UI count in reel and post card
  const countEl = document.getElementById(`reel-share-count-${postId}`);
  const cardShareCount = document.getElementById(`shares-btn-${postId}`);
  if (countEl) {
    const currentVal = parseInt(countEl.textContent || '0', 10);
    countEl.textContent = currentVal + 1;
  }
  if (cardShareCount) {
    const currentVal = parseInt(cardShareCount.textContent || '0', 10);
    cardShareCount.textContent = currentVal + 1;
  }

  if (navigator.share) {
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: shareUrl
      });
      showReelsToast('සාර්ථකව බෙදාගන්නා ලදී!');
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }

  // Fallback: Copy link to clipboard
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(shareUrl);
    } else {
      const tempInput = document.createElement('textarea');
      tempInput.value = shareUrl;
      tempInput.style.position = 'fixed';
      tempInput.style.opacity = '0';
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
    }
    showReelsToast('සබැඳිය පිටපත් කරගන්නා ලදී! (Link Copied)');
  } catch (err) {
    showReelsToast('සබැඳිය පිටපත් කළ නොහැකි විය.');
  }
};

// ============================================================================
// TikTok-Style In-Place Comments Drawer Controller
// ============================================================================
let activeReelsCommentPostId = null;

window.openReelCommentsDrawer = function(postId) {
  activeReelsCommentPostId = postId;
  const drawer = document.getElementById('reelsCommentsDrawer');
  if (!drawer) return;

  const post = (typeof currentPostsData !== 'undefined' && currentPostsData.find(p => p.id === postId)) ||
               (StorageService.getLocalPosts() || []).find(p => p.id === postId);

  const curUser = StorageService.currentUser;
  const userPhoto = curUser?.photoURL || curUser?.photo;
  const userName = curUser?.name || 'ඔබ';
  const avatarBox = document.getElementById('reelsDrawerUserAvatar');
  if (avatarBox) {
    avatarBox.innerHTML = userPhoto
      ? `<img src="${Security.sanitizeUrl(userPhoto)}" alt="${Security.escapeHTML(userName)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`
      : Security.escapeHTML(userName.charAt(0) || '👤');
  }

  renderReelCommentsList(post);
  drawer.classList.remove('hidden');

  setTimeout(() => {
    const input = document.getElementById('reelsCommentInput');
    if (input && window.innerWidth > 768) input.focus();
  }, 200);
};

window.closeReelCommentsDrawer = function() {
  const drawer = document.getElementById('reelsCommentsDrawer');
  if (drawer) drawer.classList.add('hidden');
  activeReelsCommentPostId = null;
};

window.renderReelCommentsList = function(post) {
  const body = document.getElementById('reelsCommentsBody');
  const countBadge = document.getElementById('reelsDrawerCount');
  if (!body) return;

  const comments = (post && Array.isArray(post.comments)) ? post.comments : [];
  if (countBadge) countBadge.textContent = comments.length;

  if (comments.length === 0) {
    body.innerHTML = `
      <div class="reels-comments-empty">
        <div class="reels-empty-icon">🪷</div>
        <h4>පළමු පුණ්‍යානුමෝදනාව දක්වන්න</h4>
        <p>මෙම උතුම් ධර්ම සටහනට ඔබගේ ප්‍රාර්ථනාව හෝ අනුමෝදනාව පහතින් සටහන් කරන්න.</p>
      </div>
    `;
    return;
  }

  body.innerHTML = comments.map(c => {
    const cAuthorName = StorageService.resolveAuthorName(c);
    const cAuthorPhoto = StorageService.resolveAuthorPhoto(c);
    return `
      <div class="reels-comment-item">
        <div class="reels-comment-avatar" onclick="closeReelsViewer(); viewUserProfile('${c.uid || ''}', '${Security.escapeHTML(cAuthorName)}')" style="cursor: pointer;" title="${Security.escapeHTML(cAuthorName)} ගේ Profile එක බලන්න">
          ${cAuthorPhoto ? `<img src="${Security.sanitizeUrl(cAuthorPhoto)}" alt="${Security.escapeHTML(cAuthorName)}">` : Security.escapeHTML(cAuthorName.charAt(0) || '👤')}
        </div>
        <div class="reels-comment-content">
          <div class="reels-comment-author-line">
            <span class="reels-comment-author" onclick="closeReelsViewer(); viewUserProfile('${c.uid || ''}', '${Security.escapeHTML(cAuthorName)}')">${Security.escapeHTML(cAuthorName)}</span>
            <span class="reels-comment-time">${Security.escapeHTML(formatRelativeTimeSinhala(c.timestamp, c.time || 'දැන්'))}</span>
          </div>
          <div class="reels-comment-text">${formatCommentTextWithMentions(c.text)}</div>
        </div>
      </div>
    `;
  }).join('');

  body.scrollTop = body.scrollHeight;
};

window.submitReelComment = async function(event) {
  if (event && event.preventDefault) event.preventDefault();
  if (!activeReelsCommentPostId) return;

  if (isGuestUser()) {
    showAuthRequiredModal('පුණ්‍යානුමෝදනා හෝ ප්‍රාර්ථනා සටහන් කිරීමට');
    return;
  }

  const input = document.getElementById('reelsCommentInput');
  if (!input) return;
  const commentText = input.value.trim();
  if (!commentText) return;

  const submitBtn = document.getElementById('reelsCommentSubmitBtn');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const postId = activeReelsCommentPostId;
    await StorageService.addComment(postId, commentText);
    SoundService.playSadhu();
    triggerHaptic(20);
    input.value = '';

    const allPosts = StorageService.getLocalPosts() || [];
    const updatedPost = allPosts.find(p => p.id === postId);
    if (updatedPost && typeof currentPostsData !== 'undefined') {
      const idx = currentPostsData.findIndex(p => p.id === postId);
      if (idx !== -1) currentPostsData[idx] = updatedPost;
    }

    renderReelCommentsList(updatedPost);

    const countEl = document.getElementById(`reel-comment-count-${postId}`);
    const commentsLen = updatedPost && Array.isArray(updatedPost.comments) ? updatedPost.comments.length : 0;
    if (countEl) countEl.textContent = commentsLen;

    const cardBtnC = document.getElementById(`comments-btn-${postId}`);
    const cardStatC = document.getElementById(`stat-comments-${postId}`);
    if (cardBtnC) cardBtnC.innerText = commentsLen;
    if (cardStatC) cardStatC.innerText = commentsLen;
  } catch (err) {
    alert(err.message || 'පුණ්‍යානුමෝදනාව එක් කිරීමට නොහැකි විය.');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
};

window.submitReelQuickBlessing = async function(text) {
  if (!activeReelsCommentPostId) return;
  if (isGuestUser()) {
    showAuthRequiredModal('පුණ්‍යානුමෝදනා හෝ ප්‍රාර්ථනා සටහන් කිරීමට');
    return;
  }

  try {
    const postId = activeReelsCommentPostId;
    await StorageService.addComment(postId, text);
    SoundService.playSadhu();
    triggerHaptic(20);

    const allPosts = StorageService.getLocalPosts() || [];
    const updatedPost = allPosts.find(p => p.id === postId);
    if (updatedPost && typeof currentPostsData !== 'undefined') {
      const idx = currentPostsData.findIndex(p => p.id === postId);
      if (idx !== -1) currentPostsData[idx] = updatedPost;
    }

    renderReelCommentsList(updatedPost);

    const countEl = document.getElementById(`reel-comment-count-${postId}`);
    const commentsLen = updatedPost && Array.isArray(updatedPost.comments) ? updatedPost.comments.length : 0;
    if (countEl) countEl.textContent = commentsLen;

    const cardBtnC = document.getElementById(`comments-btn-${postId}`);
    const cardStatC = document.getElementById(`stat-comments-${postId}`);
    if (cardBtnC) cardBtnC.innerText = commentsLen;
    if (cardStatC) cardStatC.innerText = commentsLen;
  } catch (err) {
    alert(err.message || 'පුණ්‍යානුමෝදනාව එක් කිරීමට නොහැකි විය.');
  }
};

// Backward-compatibility alias
window.openReelComments = function(postId) {
  openReelCommentsDrawer(postId);
};

// Desktop Keyboard Navigation for Reels
document.addEventListener('keydown', (e) => {
  const reelsModal = document.getElementById('reelsModal');
  if (reelsModal && !reelsModal.classList.contains('hidden')) {
    if (e.key === 'Escape') {
      const drawer = document.getElementById('reelsCommentsDrawer');
      if (drawer && !drawer.classList.contains('hidden')) {
        closeReelCommentsDrawer();
        return;
      }
      window.closeReelsViewer();
    } else if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      window.scrollReelNext();
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      window.scrollReelPrev();
    }
  }
});

// Setup Listeners
function setupEventListeners() {
  initLightboxTouchGestures();

  let isSubmittingPost = false;

  document.getElementById('postForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSubmittingPost) return;

    // Anti-Bot Honeypot Trap: Automated spam bots filling hidden fields are immediately discarded
    const honeypotVal = (document.getElementById('meritHoneypot')?.value || '').trim();
    if (honeypotVal) {
      console.warn('[Security] Automated bot submission rejected via post honeypot trap.');
      closeModal();
      return;
    }

    // Authentication Guard: Guests must log in first
    if (isGuestUser()) {
      showAuthRequiredModal('පින්කමක් හෝ සටහනක් පළ කිරීමට');
      return;
    }

    const submitBtn = document.getElementById('submitPostBtn') || e.target.querySelector('button[type="submit"]');
    const originalBtnHTML = submitBtn ? submitBtn.innerHTML : '';

    const isMaster = StorageService.isMasterAdmin();
    const isOfficial = isMaster && (!!document.getElementById('adminIsOfficial')?.checked || !!document.getElementById('postIsOfficial')?.checked);
    const isPinned = isMaster && (!!document.getElementById('adminIsPinned')?.checked || !!document.getElementById('postIsPinned')?.checked);

    let title = (document.getElementById('postTitle')?.value || '').trim();
    if (selectedPostType === 'general') {
      title = isOfficial ? 'පිං පොත නිල නිවේදනය' : title;
    } else if (isOfficial && !title) {
      title = 'පිං පොත නිල නිවේදනය';
    }

    const category = selectedPostType === 'general' ? (document.getElementById('postCategory')?.value || 'සාමාන්‍ය') : (document.getElementById('postCategory')?.value || 'දානමය');
    const visibility = selectedPostType === 'need' ? 'public' : (document.getElementById('postVisibility')?.value || 'public');
    const location = (selectedPostType === 'general' || isOfficial) ? '' : (document.getElementById('postLocation')?.value || '').trim();
    const contact = selectedPostType === 'need' ? (document.getElementById('postContact')?.value || '').trim() : '';
    const description = (document.getElementById('postDesc')?.value || '').trim();
    const rawVideoUrl = (document.getElementById('postVideoUrl')?.value || '').trim();
    const parsedVideo = parseVideoUrl(rawVideoUrl);

    try {
      isSubmittingPost = true;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> පළවෙමින් පවතී...';
      }

      const postImages = [...selectedImagesList];
      let primaryImage = postImages[0] || null;
      if (!primaryImage && parsedVideo && parsedVideo.videoThumbnail) {
        primaryImage = parsedVideo.videoThumbnail;
        if (postImages.length === 0) {
          postImages.push(parsedVideo.videoThumbnail);
        }
      }

      await StorageService.createPost({
        type: selectedPostType,
        title,
        category,
        visibility,
        location,
        contact,
        description,
        image: primaryImage,
        images: postImages,
        videoUrl: parsedVideo ? parsedVideo.videoUrl : null,
        videoId: parsedVideo ? parsedVideo.videoId : null,
        videoType: parsedVideo ? parsedVideo.type : null,
        isShorts: parsedVideo ? parsedVideo.isShorts : false,
        videoThumbnail: parsedVideo ? parsedVideo.videoThumbnail : null,
        isOfficial,
        isPinned
      });

      SoundService.playPublish();
      triggerHaptic([25, 50, 25]);
      closeModal();
      if (selectedPostType === 'need') switchTab('needs');
      else if (visibility === 'private') switchTab('mybook');
      else switchTab('feed');
    } catch (err) {
      alert("දෝෂයකි: " + err.message);
    } finally {
      isSubmittingPost = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
      }
    }
  });

  document.getElementById('userProfileBtn')?.addEventListener('click', () => {
    switchTab('profile');
  });

  // Close notifications dropdown and emoji pickers on outside click
  document.addEventListener('click', (e) => {
    const notifWrapper = document.getElementById('notificationsWrapper');
    if (notifWrapper && !notifWrapper.contains(e.target)) {
      closeNotificationDropdown();
    }
    if (!e.target.closest('.comment-emoji-popup') && !e.target.closest('.btn-comment-react-btn')) {
      window.closeAllCommentEmojiPickers?.();
    }
  });


  document.getElementById('editProfileForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const firstName = document.getElementById('editProfFirstNameInput')?.value || '';
    const lastName = document.getElementById('editProfLastNameInput')?.value || '';
    const occupation = document.getElementById('editProfOccupationInput')?.value || '';
    const province = document.getElementById('editProfProvinceSelect')?.value || '';
    const district = document.getElementById('editProfDistrictSelect')?.value || '';
    const city = (document.getElementById('editProfCityInput')?.value || '').trim();
    const bio = document.getElementById('editProfBioInput')?.value || '';
    const photo = document.getElementById('editProfPhotoInput')?.value || '';

    let location = '';
    if (city && district) {
      location = `${city}, ${district}`;
    } else if (district && province) {
      location = `${district}, ${province}`;
    } else if (district) {
      location = district;
    } else if (province) {
      location = province;
    } else if (city) {
      location = city;
    }

    await StorageService.updateProfile({ firstName, lastName, occupation, location, district, province, city, bio, photo });
    closeEditProfileModal();
    updateUserInfoUI();
    renderProfileView();
    renderFeed();
  });

  document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('profileNameInput');
    const newName = (input?.value || '').trim();
    if (newName && newName.length >= 2) {
      await StorageService.setUserName(newName);
      closeProfileModal();
      updateUserInfoUI();
      if (typeof activeTab !== 'undefined' && activeTab === 'profile') renderProfileView();
      renderFeed();
      triggerHaptic([25, 50, 25]);
      SoundService.playSadhu();
      alert("ඔබගේ නම සාර්ථකව වෙනස් විය! සියලුම සටහන් යාවත්කාලීන විය. 🙏");
    } else {
      alert("කරුණාකර වලංගු නමක් ඇතුළත් කරන්න (අවම වශයෙන් අකුරු 2ක්).");
    }
  });

  document.getElementById('googleLoginBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('googleLoginBtn');
    const alertBox = document.getElementById('authStatusAlert');

    if (alertBox) {
      alertBox.classList.add('hidden');
      alertBox.innerHTML = '';
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>සම්බන්ධ වෙමින් පවතී...</span>`;
    }

    const res = await StorageService.loginWithGoogle();

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-brands fa-google" style="color: #ea4335; font-size: 1rem;"></i> <span>Google ගිණුමෙන් සම්බන්ධ වන්න</span>`;
    }

    if (res && res.success) {
      closeProfileModal();
      closeAuthRequiredModal();
      updateUserInfoUI();
      updateUserStats();
      renderFeed();
      if (activeTab === 'profile') renderProfileView();
      checkAndPromptMandatoryName();
    } else if (res && !res.success && !res.cancelled && res.message && res.code !== 'auth/popup-closed-by-user') {
      if (alertBox) {
        alertBox.classList.remove('hidden');
        alertBox.style.background = '#fef2f2';
        alertBox.style.border = '1px solid #fca5a5';
        alertBox.style.color = '#991b1b';
        alertBox.innerHTML = `
          <div style="font-weight: 600; font-size: 0.8rem; display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-circle-exclamation"></i>
            <span>${Security.escapeHTML(res.message)}</span>
          </div>
        `;
      }
    }
  });

  document.getElementById('authGuardLoginBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('authGuardLoginBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>සම්බන්ධ වෙමින් පවතී...</span>`;
    }

    const res = await StorageService.loginWithGoogle();

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-brands fa-google" style="color: #ea4335; font-size: 1.1rem;"></i> <span>Google ගිණුමෙන් Login වන්න</span>`;
    }

    if (res && res.success) {
      closeAuthRequiredModal();
      closeProfileModal();
      updateUserInfoUI();
      updateUserStats();
      renderFeed();
      if (activeTab === 'profile') renderProfileView();
      checkAndPromptMandatoryName();
    } else if (res && !res.success && !res.cancelled && res.message && res.code !== 'auth/popup-closed-by-user') {
      alert(res.message);
    }
  });

  document.getElementById('mandatoryNameForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fName = (document.getElementById('mandatoryFirstNameInput')?.value || '').trim();
    const lName = (document.getElementById('mandatoryLastNameInput')?.value || '').trim();
    if (!fName || fName.length < 2) {
      alert('කරුණාකර ඔබගේ නම (First Name) ඇතුළත් කරන්න.');
      return;
    }
    const fullName = `${fName} ${lName}`.trim();
    await StorageService.updateProfile({ firstName: fName, lastName: lName, name: fullName });
    closeMandatoryNameModal();
    updateUserInfoUI();
    if (activeTab === 'profile') renderProfileView();
    renderFeed();
    triggerHaptic([25, 50, 25]);
    SoundService.playSadhu();
  });

  document.getElementById('googleLogoutBtn')?.addEventListener('click', async () => {
    await StorageService.logout();
    updateUserInfoUI();
    updateUserStats();
    renderFeed();
    openProfileModal();
  });

  document.getElementById('searchInput')?.addEventListener('input', () => {
    renderFeed();
  });
}

// ============================================================================
// Facebook-Style Premium Profile Controllers
// ============================================================================

function renderProfileView() {
  const user = StorageService.currentUser || {};
  const myPosts = currentPostsData.filter(p => p.uid && user.uid && p.uid === user.uid);
  const myPrivatePosts = currentPostsData.filter(p => p.uid && user.uid && p.uid === user.uid && p.visibility === 'private');
  const myPhotosPosts = currentPostsData.filter(p => p.uid && user.uid && p.uid === user.uid && p.image);
  const totalSadhu = myPosts.reduce((acc, p) => acc + (p.sadhuCount || 0), 0);

  // Update community member counter badge
  updateCommunityMemberCount();

  // 1. Cover Photo
  const coverImg = document.getElementById('profileCoverImg');
  if (coverImg) {
    let activeCover = user.coverImage;
    if (!activeCover || activeCover.includes('photo-1548013146-72479768bada') || activeCover.includes('photo-1582510003544-4d00b7f74220')) {
      activeCover = "assets/banner.jpg";
    }
    coverImg.src = activeCover;
  }

  // 2. Elevated Avatar & Composer Avatar
  const profAvatarWrap = document.getElementById('profAvatarWrap');
  if (profAvatarWrap) {
    if (user.photo) {
      profAvatarWrap.innerHTML = `<img src="${user.photo}" alt="${user.name}" onerror="this.parentElement.innerText = '${(user.name || 'ක').trim().charAt(0)}';">`;
    } else {
      profAvatarWrap.innerText = (user.name || 'ක').trim().charAt(0);
    }
  }
  const profCompAvatar = document.getElementById('profComposerAvatar');
  if (profCompAvatar) {
    if (user.photo) {
      profCompAvatar.innerHTML = `<img src="${user.photo}" alt="${user.name}" style="width: 100%; height: 100%; border-radius: 9999px; object-fit: cover;" onerror="this.parentElement.innerText = '${(user.name || 'ක').trim().charAt(0)}';">`;
    } else {
      profCompAvatar.innerText = (user.name || 'ක').trim().charAt(0);
    }
  }

  // 3. Name & Verified Badge & Admin Dash Button
  const isMaster = StorageService.isMasterAdmin();
  const isSub = StorageService.isSubAdmin(user);
  const isAdminUser = isMaster || isSub;
  const isSangha = StorageService.isSangha(user);

  const nameEl = document.getElementById('profFullName');
  if (nameEl) {
    nameEl.innerHTML = `
      ${Security.escapeHTML(user.name || 'කල්‍යාණ මිත්‍ර')}
      ${isMaster ? `<span class="badge-crown" style="font-size: 1.15rem;" title="Master Admin">👑</span>` : (isSub ? `<span class="badge-shield" style="font-size: 1.05rem;" title="පරිපාලක (Admin)">🛡️</span>` : '')}
    `;
  }

  const badgeEl = document.getElementById('profVerifiedBadge');
  if (badgeEl) {
    badgeEl.style.display = 'inline-flex';
    if (isSangha) {
      badgeEl.className = 'sangha-verified-badge';
      badgeEl.innerHTML = `<i class="fa-solid fa-dharmachakra"></i> <span>පූජනීය මහා සංඝරත්නය</span>`;
    } else if (isMaster) {
      badgeEl.className = 'official-author-badge';
      badgeEl.innerHTML = `<span class="badge-crown">👑</span> <span>Master Admin</span>`;
    } else if (isSub) {
      badgeEl.className = 'admin-shield-badge';
      badgeEl.innerHTML = `<span class="badge-shield">🛡️</span> <span>පිං පොත පරිපාලක</span>`;
    } else if (user.email && !user.isAnonymous) {
      badgeEl.className = 'verified-pill';
      badgeEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>Google සත්‍යාපිත කල්‍යාණ මිත්‍ර</span>`;
    } else {
      badgeEl.className = 'verified-pill';
      badgeEl.style.background = '#fef3c7';
      badgeEl.style.color = '#92400e';
      badgeEl.style.borderColor = '#fde68a';
      badgeEl.innerHTML = `<i class="fa-solid fa-seedling"></i> <span>පිංවත් සාමාජික</span>`;
    }
  }

  // Profile Admin Dashboard Quick Jump Button
  const profAdminBtn = document.getElementById('profAdminDashboardBtn');
  const profAdminIcon = document.getElementById('profAdminDashboardIcon');
  const profAdminText = document.getElementById('profAdminDashboardText');
  if (profAdminBtn) {
    if (isAdminUser) {
      profAdminBtn.style.display = 'inline-flex';
      if (isMaster) {
        if (profAdminIcon) profAdminIcon.className = 'fa-solid fa-crown';
        if (profAdminText) profAdminText.innerText = 'Master Admin Dashboard';
        profAdminBtn.style.background = 'linear-gradient(135deg, #d97706, #b45309)';
      } else {
        if (profAdminIcon) profAdminIcon.className = 'fa-solid fa-shield-halved';
        if (profAdminText) profAdminText.innerText = 'පරිපාලක Dashboard';
        profAdminBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      }
    } else {
      profAdminBtn.style.display = 'none';
    }
  }

  // 4. Header Auth action button
  const authBtn = document.getElementById('profAuthActionBtn');
  if (authBtn) {
    if (user.email && !user.isAnonymous) {
      authBtn.className = 'btn-profile-danger';
      authBtn.innerHTML = `<i class="fa-solid fa-right-from-bracket"></i> <span>Sign Out</span>`;
      authBtn.title = 'ගිණුමෙන් ඉවත් වන්න';
    } else {
      authBtn.className = 'btn-profile-secondary';
      authBtn.innerHTML = `<i class="fa-brands fa-google" style="color: #ea4335;"></i> <span>Google Login</span>`;
      authBtn.title = 'Google ගිණුමෙන් සම්බන්ධ වන්න';
    }
  }

  // 5. Dhamma Bio
  const bioText = user.bio || "සබ්බපාපස්ස අකරණං - කුසලස්ස උපසම්පදා 🙏";
  const bioEl = document.getElementById('profDhammaBio');
  const widgetBioEl = document.getElementById('profWidgetBio');
  if (bioEl) bioEl.innerText = `"${bioText}"`;
  if (widgetBioEl) widgetBioEl.innerText = `"${bioText}"`;

  // 6. Meta Tags & Details
  const occText = (user.occupation || "").trim();
  const occEl = document.getElementById('profOccupationText');
  const metaOccWrap = document.getElementById('profMetaOccupation');
  const widgetOccEl = document.getElementById('profWidgetOccupation');
  const widgetOccRow = document.getElementById('profWidgetOccRow');
  if (occEl) occEl.innerText = occText;
  if (widgetOccEl) widgetOccEl.innerText = occText;
  if (metaOccWrap) metaOccWrap.style.display = occText ? 'inline-flex' : 'none';
  if (widgetOccRow) widgetOccRow.style.display = occText ? 'flex' : 'none';

  const locText = (user.location || "").trim();
  const locEl = document.getElementById('profLocationText');
  const metaLocWrap = document.getElementById('profMetaLocation');
  const widgetLocEl = document.getElementById('profWidgetLocation');
  const widgetLocRow = document.getElementById('profWidgetLocRow');
  if (locEl) locEl.innerText = locText;
  if (widgetLocEl) widgetLocEl.innerText = locText;
  if (metaLocWrap) metaLocWrap.style.display = locText ? 'inline-flex' : 'none';
  if (widgetLocRow) widgetLocRow.style.display = locText ? 'flex' : 'none';

  const emailEl = document.getElementById('profEmailText');
  const metaEmailWrap = document.getElementById('profMetaEmail');
  if (emailEl) {
    if (user.email) {
      emailEl.innerText = user.email;
      if (metaEmailWrap) metaEmailWrap.style.display = 'inline-flex';
    } else {
      if (metaEmailWrap) metaEmailWrap.style.display = 'none';
    }
  }

  const joinedEl = document.getElementById('profJoinedText');
  if (joinedEl) joinedEl.innerText = `${user.joinedDate || '2026 ඔක්තෝබර්'} සිට සාමාජික`;

  const widgetAccount = document.getElementById('profWidgetAccount');
  if (widgetAccount) widgetAccount.innerText = (user.email && !user.isAnonymous) ? 'Google සත්‍යාපිත' : 'සාමාන්‍ය සාමාජික';

  // 7. Counters
  const countTimeline = document.getElementById('profCountTimeline');
  const countPhotos = document.getElementById('profCountPhotos');
  const countPrivate = document.getElementById('profCountPrivate');
  const widgetPosts = document.getElementById('profWidgetPosts');
  const widgetSadhu = document.getElementById('profWidgetSadhu');

  if (countTimeline) countTimeline.innerText = myPosts.length;
  if (countPhotos) countPhotos.innerText = myPhotosPosts.length;
  if (countPrivate) countPrivate.innerText = myPrivatePosts.length;
  if (widgetPosts) widgetPosts.innerText = myPosts.length;
  if (widgetSadhu) widgetSadhu.innerText = totalSadhu;

  // 8. Badges Widget
  renderProfileBadges(myPosts, totalSadhu, user);

  // 9. Mini Photos (up to 6)
  const miniPhotosGrid = document.getElementById('profMiniPhotosGrid');
  if (miniPhotosGrid) {
    if (myPhotosPosts.length === 0) {
      miniPhotosGrid.innerHTML = `
        <div style="grid-column: span 3; text-align: center; padding: 20px 0; color: #94a3b8; font-size: 0.75rem;">
          <i class="fa-solid fa-camera" style="font-size: 1.4rem; margin-bottom: 6px; opacity: 0.6; display: block;"></i>
          තවම ඡායාරූප එක් කර නැත
        </div>
      `;
    } else {
      miniPhotosGrid.innerHTML = myPhotosPosts.slice(0, 6).map(p => `
        <div class="mini-photo-item" onclick="setProfileSubTab('photos')" title="${Security.escapeHTML(p.title)}">
          <img src="${Security.sanitizeUrl(p.image)}" alt="${Security.escapeHTML(p.title)}" loading="lazy">
        </div>
      `).join('');
    }
  }

  // 10. Sub-tab Content & Grid sync
  const curSubTab = (typeof activeProfileSubTab !== 'undefined' && activeProfileSubTab) ? activeProfileSubTab : 'timeline';
  const grid = document.getElementById('profileContentGrid') || document.querySelector('.profile-content-grid');
  if (grid) {
    grid.classList.remove('subtab-timeline', 'subtab-friends', 'subtab-photos', 'subtab-stats', 'subtab-private');
    grid.classList.add(`subtab-${curSubTab}`);
    grid.setAttribute('data-active-subtab', curSubTab);
  }
  const sidebarCol = document.querySelector('.profile-sidebar-col');
  if (sidebarCol) {
    sidebarCol.style.display = (curSubTab === 'timeline') ? '' : 'none';
  }
  renderProfileSubTabContent(user, myPosts, myPhotosPosts, myPrivatePosts, totalSadhu);
}

function renderProfileBadges(myPosts, totalSadhu, user) {
  const container = document.getElementById('profBadgesContainer');
  if (!container) return;

  const badges = [];

  // Check completed spiritual challenge badges
  let earnedBadges = [];
  try {
    earnedBadges = JSON.parse(localStorage.getItem('pinPotha_earned_badges') || '[]');
  } catch (e) {}

  SPIRITUAL_CHALLENGES.forEach(ch => {
    if (earnedBadges.includes(ch.id)) {
      badges.push({ icon: ch.icon, text: ch.badgeText, class: ch.badgeClass });
    }
  });

  if (user.email && !user.isAnonymous) {
    badges.push({ icon: 'fa-shield-halved', text: 'සත්‍යාපිත සාමාජික', class: 'emerald' });
  }
  if (myPosts.length >= 1) {
    badges.push({ icon: 'fa-seedling', text: 'ප්‍රථම පියවර', class: 'blue' });
  }
  if (myPosts.length >= 3) {
    badges.push({ icon: 'fa-star', text: 'සත්පුරුෂ මිත්‍ර', class: 'gold' });
  }
  if (totalSadhu >= 5) {
    badges.push({ icon: 'fa-hands-praying', text: 'සාදු සම්මානිත', class: 'gold' });
  }
  if (myPosts.some(p => p.category === 'දානමය')) {
    badges.push({ icon: 'fa-bowl-rice', text: 'දාන පාරමිතා', class: 'emerald' });
  }
  if (myPosts.some(p => p.category === 'භාවනාමය')) {
    badges.push({ icon: 'fa-spa', text: 'භාවනානුයෝගී', class: 'purple' });
  }
  if (myPosts.some(p => p.category === 'සීලමය')) {
    badges.push({ icon: 'fa-heart', text: 'සීලවන්ත', class: 'blue' });
  }
  if (myPosts.some(p => p.category === 'සමාජ සත්කාර')) {
    badges.push({ icon: 'fa-hand-holding-heart', text: 'සත්කාර හවුල්කාර', class: 'emerald' });
  }
  if (myPosts.some(p => p.category === 'ධර්ම දානමය' || p.isRepost || (p.shareCount && p.shareCount > 0) || (p.repostCount && p.repostCount > 0))) {
    badges.push({ icon: 'fa-share-nodes', text: 'ධර්ම දාන පාරමිතා', class: 'blue' });
  }

  if (badges.length === 0) {
    badges.push({ icon: 'fa-seedling', text: 'නවක සාමාජික', class: 'gold' });
  }

  container.innerHTML = badges.map(b => `
    <span class="badge-chip ${b.class}">
      <i class="fa-solid ${b.icon}"></i>
      <span>${b.text}</span>
    </span>
  `).join('');
}

window.setProfileSubTab = function(subTab) {
  activeProfileSubTab = subTab;
  const user = StorageService.currentUser || {};
  const myPosts = currentPostsData.filter(p => p.uid && user.uid && p.uid === user.uid);
  const myPrivatePosts = currentPostsData.filter(p => p.uid && user.uid && p.uid === user.uid && p.visibility === 'private');
  const myPhotosPosts = currentPostsData.filter(p => p.uid && user.uid && p.uid === user.uid && p.image);
  const totalSadhu = myPosts.reduce((acc, p) => acc + (p.sadhuCount || 0), 0);

  // Sync state class on profile-content-grid to toggle sidebar visibility
  const grid = document.getElementById('profileContentGrid') || document.querySelector('.profile-content-grid');
  if (grid) {
    grid.classList.remove('subtab-timeline', 'subtab-friends', 'subtab-photos', 'subtab-stats', 'subtab-private');
    grid.classList.add(`subtab-${subTab}`);
    grid.setAttribute('data-active-subtab', subTab);
  }
  const sidebarCol = document.querySelector('.profile-sidebar-col');
  if (sidebarCol) {
    sidebarCol.style.display = (subTab === 'timeline') ? '' : 'none';
  }

  ['timeline', 'friends', 'photos', 'stats', 'private'].forEach(t => {
    const btn = document.getElementById(`prof-sub-${t}`);
    const cap = t.charAt(0).toUpperCase() + t.slice(1);
    const view = document.getElementById(`subTab${cap}View`);
    if (btn) {
      if (t === subTab) btn.classList.add('active');
      else btn.classList.remove('active');
    }
    if (view) {
      if (t === subTab) {
        view.classList.remove('hidden');
        view.style.display = 'block';
      } else {
        view.classList.add('hidden');
        view.style.display = 'none';
      }
    }
  });

  const mobFriendsBtn = document.getElementById('mob-tab-friends');
  if (mobFriendsBtn) {
    if (subTab === 'friends') mobFriendsBtn.classList.add('active');
    else mobFriendsBtn.classList.remove('active');
  }

  renderProfileSubTabContent(user, myPosts, myPhotosPosts, myPrivatePosts, totalSadhu);
};

function renderProfileSubTabContent(user, myPosts, myPhotosPosts, myPrivatePosts, totalSadhu) {
  // 1. Timeline
  const timelineContainer = document.getElementById('profTimelinePosts');
  if (timelineContainer && activeProfileSubTab === 'timeline') {
    if (myPosts.length === 0) {
      timelineContainer.innerHTML = `
        <div class="card" style="padding: 48px 20px; text-align: center; border: 1.5px dashed rgba(217, 119, 6, 0.35); border-radius: 20px; background: linear-gradient(180deg, #fffdf8, #fff8ea);">
          <div style="width: 72px; height: 72px; border-radius: 50%; background: #fffbeb; border: 2px solid #fef3c7; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; box-shadow: 0 4px 16px rgba(245, 158, 11, 0.18);">
            <i class="fa-solid fa-dharmachakra animate-spin-slow" style="font-size: 2.2rem; color: #d97706;"></i>
          </div>
          <h3 style="font-family: var(--font-serif); font-size: 1.15rem; font-weight: 700; color: #451a03; margin-bottom: 6px;">ඔබ තවම පින්කම් සටහන් කර නැත</h3>
          <p style="font-size: 0.82rem; color: #78350f; max-width: 440px; margin: 0 auto 20px auto; line-height: 1.6;">
            ඔබ සිදුකරන පින්කම් සහ කුසල ක්‍රියා මෙහි සටහන් කර ඔබේ ජීවිතයේ පුණ්‍ය පොත සම්පූර්ණ කරගන්න!
          </p>
          <button type="button" onclick="openModal('merit')" class="btn-profile-primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 11px 24px; font-weight: 700; font-size: 0.88rem; border-radius: 9999px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; border: none; cursor: pointer; box-shadow: 0 6px 18px rgba(217, 119, 6, 0.35);">
            <i class="fa-solid fa-plus"></i> පළමු සටහන එක් කරන්න!
          </button>
        </div>
      `;
    } else {
      timelineContainer.innerHTML = myPosts.map(p => renderPostCardHTML(p, user)).join('');
    }
  }

  // 2. Kalyana Mithrayan (Spiritual Friends) Sub-tab
  const friendsContainer = document.getElementById('profConnectedMithrayanList');
  const pendingSection = document.getElementById('profPendingRequestsSection');
  const pendingList = document.getElementById('profPendingRequestsList');
  const pendingCountText = document.getElementById('pendingRequestsCountText');
  const summaryText = document.getElementById('connectedMithrayanSummary');
  const countMithrayan = document.getElementById('profCountMithrayan');

  // Update tab counter whenever profile subtab content is rendered
  const mithrayanUids = Array.isArray(user.mithrayan) ? user.mithrayan : [];
  if (countMithrayan) countMithrayan.innerText = mithrayanUids.length;
  const countBadge = document.getElementById('profCountMithrayanBadge');
  if (countBadge) countBadge.innerText = mithrayanUids.length;

  if (activeProfileSubTab === 'friends') {
    applyFriendsViewModeUI();
  }

  if (activeProfileSubTab === 'friends' && friendsContainer) {
    // Check pending incoming requests
    const notifs = StorageService.getLocalNotifications();
    const pendingIncoming = notifs.filter(n => 
      n.type === 'mithra_request' && 
      n.recipientUid === user.uid && 
      !StorageService.isRequestAccepted(n.id, n.senderUid) &&
      !StorageService.isRequestDeclined(n.id, n.senderUid) &&
      (!user.mithrayan || !user.mithrayan.includes(n.senderUid)) &&
      (!n.status || n.status === 'pending')
    );

    if (pendingSection && pendingList) {
      if (pendingIncoming.length > 0) {
        pendingSection.style.display = 'block';
        if (pendingCountText) pendingCountText.innerText = `(${pendingIncoming.length})`;
        pendingList.innerHTML = pendingIncoming.map(req => {
          const isReqSangha = StorageService.isSangha(req) || StorageService.isSangha({ uid: req.senderUid, name: req.senderName });
          const initial = (req.senderName || 'ක').charAt(0);
          return `
          <div class="mithra-card" style="border-color: #fde68a; background: #fffdf8;">
            <div class="mithra-card-avatar ${isReqSangha ? 'sangha-framed-avatar' : ''}" onclick="openMemberProfileModal('${req.senderUid}', '${Security.escapeHTML(req.senderName)}')" style="cursor: pointer;">
              ${req.senderPhoto ? `<img src="${Security.sanitizeUrl(req.senderPhoto)}" alt="${Security.escapeHTML(req.senderName)}" onerror="this.parentElement.innerText = '${initial}';">` : initial}
              ${isReqSangha ? '<img src="assets/sangha-frame.png" class="sangha-vatapatha-frame" alt="වටාපත">' : ''}
            </div>
            <div class="mithra-card-details" onclick="openMemberProfileModal('${req.senderUid}', '${Security.escapeHTML(req.senderName)}')" style="cursor: pointer;">
              <div class="mithra-card-name">
                <span>${Security.escapeHTML(req.senderName || 'කල්‍යාණ මිත්‍ර')}</span>
                ${isReqSangha ? `<span class="sangha-author-badge" style="margin-left: 4px; padding: 1px 7px; font-size: 0.62rem;"><i class="fa-solid fa-dharmachakra"></i> පූජනීය සංඝරත්නය</span>` : ''}
              </div>
              <div class="mithra-card-loc">
                <i class="fa-solid fa-clock"></i> <span>ඇරයුමක් එවා ඇත</span>
              </div>
            </div>
            <div class="mithra-card-actions">
              <button type="button" class="btn-notif-accept" style="flex: 1; justify-content: center;" onclick="handleAcceptMithra('${req.id}', '${req.senderUid}', '${Security.escapeHTML(req.senderName)}')">
                <i class="fa-solid fa-circle-check"></i> පිළිගන්න
              </button>
              <button type="button" class="btn-notif-reject" onclick="handleRejectMithra('${req.id}', '${req.senderUid}')">
                <i class="fa-solid fa-xmark"></i> ඉවත් කරන්න
              </button>
            </div>
          </div>
        `;
        }).join('');
      } else {
        pendingSection.style.display = 'none';
      }
    }

    if (summaryText) summaryText.innerText = `මිතුරන් ${mithrayanUids.length} දෙනෙක්`;

    if (mithrayanUids.length === 0) {
      friendsContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; color: #94a3b8; background: #ffffff; border-radius: 16px; border: 1.5px dashed #e2e8f0;">
          <i class="fa-solid fa-users" style="font-size: 2.4rem; color: #d97706; margin-bottom: 12px; opacity: 0.6;"></i>
          <h3 style="font-size: 1rem; font-weight: 700; color: #334155;">තවමත් කල්‍යාණ මිතුරන් සම්බන්ධ වී නොමැත</h3>
          <p style="font-size: 0.78rem; color: #64748b; margin-top: 4px; max-width: 440px; margin-left: auto; margin-right: auto; line-height: 1.6;">
            පුණ්‍ය පවුරේ සිටින අනෙකුත් සාමාජිකයින්ගේ පැතිකඩ (Profile) වෙත ගොස් <strong>"කල්‍යාණ මිත්‍රයෙකු කරගන්න"</strong> බොත්තම ඔබා ඔබේ පින්කම් මිතුරු පවුර පුළුල් කරගන්න. 🙏
          </p>
        </div>
      `;
    } else {
      friendsContainer.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin" style="color: #d97706;"></i> මිතුරන් ලැයිස්තුව සූදානම් වෙමින් පවතී...</div>`;
      StorageService.getConnectedMithrayanList().then(profiles => {
        if (!profiles || profiles.length === 0) {
          friendsContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: #94a3b8;">
              <p style="font-size: 0.8rem;">කල්‍යාණ මිතුරන් සොයාගත නොහැකි විය.</p>
            </div>
          `;
          return;
        }
        friendsContainer.innerHTML = profiles.map(m => {
          const isMemberSangha = StorageService.isSangha(m);
          const isMemberMaster = StorageService.isMasterAdmin(m);
          const isMemberSubAdmin = !isMemberMaster && StorageService.isSubAdmin(m);
          const initial = (m.name || 'ක').charAt(0);
          return `
          <div class="mithra-card">
            <div class="mithra-card-avatar ${isMemberSangha ? 'sangha-framed-avatar' : ''}" onclick="openMemberProfileModal('${m.uid}', '${Security.escapeHTML(m.name)}')" style="cursor: pointer;">
              ${m.photo ? `<img src="${Security.sanitizeUrl(m.photo)}" alt="${Security.escapeHTML(m.name)}" onerror="this.parentElement.innerText = '${initial}';">` : `<span>${initial}</span>`}
              ${isMemberSangha ? '<img src="assets/sangha-frame.png" class="sangha-vatapatha-frame" alt="වටාපත">' : ''}
            </div>
            <div class="mithra-card-details" onclick="openMemberProfileModal('${m.uid}', '${Security.escapeHTML(m.name)}')" style="cursor: pointer;">
              <div class="mithra-card-name">
                <span>${Security.escapeHTML(m.name || 'කල්‍යාණ මිත්‍ර')}</span>
                ${isMemberMaster ? `<span class="badge-crown" title="Master Admin">👑</span>` : (isMemberSubAdmin ? `<span class="badge-shield" title="පරිපාලක (Admin)">🛡️</span>` : '')}
                ${isMemberSangha ? `<span class="sangha-author-badge" style="margin-left: 4px; padding: 1px 7px; font-size: 0.62rem;"><i class="fa-solid fa-dharmachakra"></i> පූජනීය සංඝරත්නය</span>` : ''}
              </div>
              <div class="mithra-card-loc">
                <i class="fa-solid fa-location-dot" style="color: #ea580c;"></i>
                <span>${Security.escapeHTML(m.district || m.location || 'ශ්‍රී ලංකා')}</span>
              </div>
            </div>
            <div class="mithra-card-actions">
              <button type="button" class="btn-mithra-view" onclick="openMemberProfileModal('${m.uid}', '${Security.escapeHTML(m.name)}')">
                <i class="fa-solid fa-eye"></i> පැතිකඩ
              </button>
              <button type="button" class="btn-mithra-view" style="color: #ef4444; border-color: #fecaca; background: #fff1f2;" onclick="handleRemoveMithra('${m.uid}')" title="මිතුරු සබඳතාව ඉවත් කරන්න">
                <i class="fa-solid fa-user-xmark"></i>
              </button>
            </div>
          </div>
        `;
        }).join('');
        applyFriendsViewModeUI();
      });
    }
  }

  // 3. Photos Gallery
  const photosContainer = document.getElementById('profFullPhotosGrid');
  if (photosContainer && activeProfileSubTab === 'photos') {
    if (myPhotosPosts.length === 0) {
      photosContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; color: #94a3b8;">
          <i class="fa-solid fa-images" style="font-size: 2.5rem; color: #d97706; margin-bottom: 12px; opacity: 0.6;"></i>
          <h3 style="font-size: 1rem; font-weight: 700; color: #334155;">ඡායාරූප සහිත පින්කම් නොමැත</h3>
          <p style="font-size: 0.78rem; color: #94a3b8; margin-top: 4px;">පින්කමක් පළ කරන විට ඡායාරූපයක් එක් කරන්න, එය මෙහි ලස්සන ගැලරියක් ලෙස දිස්වේ.</p>
        </div>
      `;
    } else {
      // Cache photos in _postImagesMap so openPostLightbox opens them in high-def Lightbox
      myPhotosPosts.forEach(p => {
        const pImages = (p.images && p.images.length > 0) ? p.images : (p.image ? [p.image] : []);
        const cleanPImages = pImages.map(img => Security.sanitizeUrl(img)).filter(Boolean);
        if (cleanPImages.length > 0) {
          window._postImagesMap = window._postImagesMap || {};
          window._postImagesMap[p.id] = cleanPImages;
        }
      });

      photosContainer.innerHTML = myPhotosPosts.map(p => `
        <div class="gallery-card" onclick="openPostLightbox('${p.id}', 0, this)" title="${Security.escapeHTML(p.title)}" style="cursor: pointer;" role="button" tabindex="0">
          <img src="${Security.sanitizeUrl(p.image || (p.images && p.images[0]))}" alt="${Security.escapeHTML(p.title)}" onclick="event.stopPropagation(); openPostLightbox('${p.id}', 0, this)" loading="lazy" role="button" style="cursor: pointer;">
          <div class="gallery-overlay">
            <h4 style="font-size: 0.82rem; font-weight: 700; line-height: 1.3;">${Security.escapeHTML(p.title)}</h4>
            <p style="font-size: 0.68rem; opacity: 0.85; margin-top: 2px;">
              <i class="fa-solid fa-calendar-days"></i> ${Security.escapeHTML(p.date || 'මෑතකදී')}
            </p>
          </div>
        </div>
      `).join('');
    }
  }

  // 3. Stats & Analytics Dashboard
  const statsContainer = document.getElementById('profStatsDetails');
  if (statsContainer && activeProfileSubTab === 'stats') {
    const categories = [
      { key: 'දානමය', label: 'දානමය පින්කම් (Dana)', color: '#059669', icon: 'fa-bowl-rice' },
      { key: 'සීලමය', label: 'සීලමය පින්කම් (Sila)', color: '#2563eb', icon: 'fa-hands-praying' },
      { key: 'භාවනාමය', label: 'භාවනාමය පින්කම් (Bhavana)', color: '#9333ea', icon: 'fa-spa' },
      { key: 'සමාජ සත්කාර', label: 'සමාජ සත්කාර (Social Service)', color: '#e11d48', icon: 'fa-hand-holding-heart' },
      { key: 'ධර්ම දානමය', label: 'ධර්ම දානමය පින්කම් (Dharma Dana)', color: '#0284c7', icon: 'fa-share-nodes' }
    ];

    // Calculate Dharma Dana: shares received + reposts received on our posts + posts in ධර්ම දානමය / reposts by us
    let totalDharmaDana = 0;
    myPosts.forEach(p => {
      const recShares = p.shareCount || 0;
      const recReposts = p.repostCount || 0;
      totalDharmaDana += (recShares + recReposts);
      if (p.category === 'ධර්ම දානමය' || p.isRepost) {
        totalDharmaDana += 1;
      }
    });

    const catCounts = {};
    categories.forEach(c => catCounts[c.key] = 0);
    myPosts.forEach(p => {
      if (catCounts[p.category] !== undefined) catCounts[p.category]++;
      else catCounts['දානමය']++;
    });
    catCounts['ධර්ම දානමය'] = Math.max(catCounts['ධර්ම දානමය'] || 0, totalDharmaDana);

    const totalParamiActions = Object.values(catCounts).reduce((a, b) => a + b, 0) || 1;
    const totalComments = myPosts.reduce((acc, p) => acc + (p.comments ? p.comments.length : 0), 0);

    statsContainer.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 24px;">
        <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 14px 10px; text-align: center;">
          <span style="font-size: 1.5rem; font-weight: 800; color: #b45309; display: block;">${myPosts.length}</span>
          <span style="font-size: 0.73rem; font-weight: 700; color: #78350f;">මුළු පින්කම් සටහන්</span>
        </div>
        <div style="background: #ecfdf5; border: 1px solid #d1fae5; border-radius: 12px; padding: 14px 10px; text-align: center;">
          <span style="font-size: 1.5rem; font-weight: 800; color: #047857; display: block;">${totalSadhu}</span>
          <span style="font-size: 0.73rem; font-weight: 700; color: #065f46;">ලද මුළු සාදුකාර</span>
        </div>
        <div style="background: #eff6ff; border: 1px solid #dbeafe; border-radius: 12px; padding: 14px 10px; text-align: center;">
          <span style="font-size: 1.5rem; font-weight: 800; color: #1d4ed8; display: block;">${totalComments}</span>
          <span style="font-size: 0.73rem; font-weight: 700; color: #1e40af;">පුණ්‍යානුමෝදනා (Comments)</span>
        </div>
        <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 14px 10px; text-align: center;">
          <span style="font-size: 1.5rem; font-weight: 800; color: #0284c7; display: block;">${totalDharmaDana}</span>
          <span style="font-size: 0.73rem; font-weight: 700; color: #0369a1;">ධර්ම දානමය පින්කම්</span>
          <span style="font-size: 0.65rem; color: #64748b; display: block; margin-top: 2px;">(Shares & Reposts)</span>
        </div>
      </div>

      <h4 style="font-size: 0.88rem; font-weight: 800; color: #334155; margin-bottom: 14px;">
        <i class="fa-solid fa-list-check" style="color: #d97706;"></i> පාරමිතා කාණ්ඩ අනුව වර්ගීකරණය
      </h4>
      <div style="display: flex; flex-direction: column; gap: 14px;">
        ${categories.map(c => {
          const count = catCounts[c.key] || 0;
          const percent = totalParamiActions > 0 ? Math.round((count / totalParamiActions) * 100) : 0;
          return `
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 5px;">
                <span><i class="fa-solid ${c.icon}" style="color: ${c.color}; margin-right: 6px;"></i> ${c.label}</span>
                <span>${count} (${percent}%)</span>
              </div>
              <div style="height: 10px; background: #f1f5f9; border-radius: 9999px; overflow: hidden;">
                <div style="height: 100%; width: ${percent}%; background: ${c.color}; border-radius: 9999px; transition: width 0.6s ease;"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // 4. Private Merits Book
  const privateContainer = document.getElementById('profPrivatePosts');
  if (privateContainer && activeProfileSubTab === 'private') {
    // Render Daily Checklist & Spiritual Challenges
    renderDailyChecklist();
    renderSpiritualChallenges();

    if (myPrivatePosts.length === 0) {
      privateContainer.innerHTML = `
        <div class="card" style="padding: 38px 20px; text-align: center;">
          <i class="fa-solid fa-book-bookmark" style="font-size: 2.2rem; color: #d97706; margin-bottom: 12px; opacity: 0.8;"></i>
          <h3 style="font-size: 1rem; font-weight: 700; color: #334155;">පෞද්ගලික සටහන් කිසිවක් නැත</h3>
          <p style="font-size: 0.8rem; color: #64748b; margin-top: 6px; max-width: 480px; margin-left: auto; margin-right: auto;">
            දෛනික Checklist එක Auto-Log කිරීමෙන් හෝ ඔබට පමණක් බලා ගැනීමට අවශ්‍ය ඔබ සිදුකළ විශේෂ පින්කම් මෙහි සටහන් කරගත හැක.
          </p>
          <button type="button" class="btn btn-primary" onclick="openPrivateMeritComposer()" style="margin-top: 16px; padding: 9px 20px; font-size: 0.84rem; font-weight: 700; border-radius: 10px; display: inline-flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-plus"></i> වෙනත් පින්කමක් සටහන් කරන්න
          </button>
        </div>
      `;
    } else {
      privateContainer.innerHTML = myPrivatePosts.map(p => renderPostCardHTML(p, user)).join('');
    }
  }
}

// Edit Profile & Cover Modal Actions
window.openEditProfileModal = function() {
  const user = StorageService.currentUser || {};
  const fNameInp = document.getElementById('editProfFirstNameInput');
  const lNameInp = document.getElementById('editProfLastNameInput');
  const occInp = document.getElementById('editProfOccupationInput');
  const bioInp = document.getElementById('editProfBioInput');
  const photoInp = document.getElementById('editProfPhotoInput');

  let fName = user.firstName || '';
  let lName = user.lastName || '';
  if (!fName && user.name) {
    const parts = user.name.trim().split(' ');
    fName = parts[0] || '';
    lName = parts.slice(1).join(' ') || '';
  }

  if (fNameInp) fNameInp.value = fName;
  if (lNameInp) lNameInp.value = lName;
  if (occInp) occInp.value = user.occupation || '';
  if (bioInp) bioInp.value = user.bio || '';
  if (photoInp) photoInp.value = user.photo || '';

  // Populate Province and District dropdowns
  const { district, province, city } = resolveUserLocationFields(user);
  const provSelect = document.getElementById('editProfProvinceSelect');
  const cityInp = document.getElementById('editProfCityInput');
  if (provSelect) provSelect.value = province;
  populateDistrictSelect('editProf', district, province);
  if (cityInp) cityInp.value = city;

  const previewAvatar = document.getElementById('editProfPhotoPreview');
  if (previewAvatar) {
    if (user.photo) {
      previewAvatar.innerHTML = `<img src="${user.photo}" alt="${user.name}" style="width: 100%; height: 100%; object-fit: cover;">`;
    } else {
      previewAvatar.innerText = (user.name || 'අ').trim().charAt(0);
    }
  }

  const uploadStatus = document.getElementById('profPhotoUploadStatus');
  if (uploadStatus) {
    uploadStatus.innerText = "පැහැදිලි ඡායාරූපයක් තෝරාගන්න.";
    uploadStatus.style.color = "#78350f";
  }

  document.getElementById('editProfileModal')?.classList.remove('hidden');
};

window.closeEditProfileModal = function() {
  document.getElementById('editProfileModal')?.classList.add('hidden');
};

let cropperInstance = null;
let coverCropperInstance = null;

window.handleProfilePhotoSelected = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  openCropModalForFile(file);
  event.target.value = '';
};

window.openCropModalForFile = function(file) {
  if (!file) return;
  if (file.type && !file.type.startsWith('image/')) {
    alert("කරුණාකර වලංගු ඡායාරූපයක් (Image file) තෝරන්න.");
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const cropImg = document.getElementById('imageToCrop');
    if (!cropImg) return;

    try {
      history.pushState({ type: 'modal', id: 'cropAvatarModal' }, '');
    } catch (err) {}
    document.getElementById('cropAvatarModal')?.classList.remove('hidden');

    if (cropperInstance) {
      cropperInstance.destroy();
      cropperInstance = null;
    }

    cropImg.onload = function() {
      if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
      }
      cropperInstance = new Cropper(cropImg, {
        aspectRatio: 1,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 0.85,
        restore: false,
        guides: false,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
        ready() {
          const zoomRange = document.getElementById('cropperZoomRange');
          if (zoomRange) zoomRange.value = 1;
        },
        zoom(e) {
          const zoomRange = document.getElementById('cropperZoomRange');
          if (zoomRange && e && e.detail) {
            zoomRange.value = Math.min(Math.max(e.detail.ratio, 0.1), 3);
          }
        }
      });
    };
    cropImg.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

window.closeCropModal = function() {
  document.getElementById('cropAvatarModal')?.classList.add('hidden');
  if (cropperInstance) {
    cropperInstance.destroy();
    cropperInstance = null;
  }
};

window.zoomCropper = function(delta) {
  if (cropperInstance) {
    cropperInstance.zoom(delta);
  }
};

window.setCropperZoom = function(val) {
  if (cropperInstance) {
    cropperInstance.zoomTo(parseFloat(val));
  }
};

window.rotateCropper = function(deg) {
  if (cropperInstance) {
    cropperInstance.rotate(deg);
  }
};

window.applyAndSaveCroppedAvatar = async function() {
  if (!cropperInstance) return;

  const btn = document.getElementById('btnSaveCroppedAvatar');
  const btnText = document.getElementById('btnSaveCroppedAvatarText');

  try {
    if (btn) btn.disabled = true;
    if (btnText) btnText.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> සුරකිමින් පවතී...`;

    // 1. Get 400x400 high-resolution cropped canvas with fallback
    let canvas = null;
    try {
      canvas = cropperInstance.getCroppedCanvas({
        width: 400,
        height: 400,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
      });
    } catch (e) {
      console.warn("Cropper getCroppedCanvas failed:", e);
    }

    if (!canvas) {
      const cropImg = document.getElementById('imageToCrop');
      canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(cropImg, 0, 0, 400, 400);
    }

    // 2. Convert to JPEG blob (universally compatible)
    const blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.88);
    });

    // 3. Upload to ImgBB (with automatic local fallback)
    const uploadedUrl = await uploadToImgBB(blob || canvas.toDataURL('image/jpeg', 0.85), `avatar_${Date.now()}`);

    // 4. Save to StorageService and localStorage immediately!
    StorageService.updateProfile({ photo: uploadedUrl });

    // 5. Update UI everywhere
    updateUserInfoUI();
    if (activeTab === 'profile') {
      renderProfileView();
    }

    // Also update preview in edit modal if open
    const previewAvatar = document.getElementById('editProfPhotoPreview');
    const hiddenInput = document.getElementById('editProfPhotoInput');
    if (previewAvatar) {
      previewAvatar.innerHTML = `<img src="${uploadedUrl}" style="width: 100%; height: 100%; object-fit: cover;">`;
    }
    if (hiddenInput) {
      hiddenInput.value = uploadedUrl;
    }

    closeCropModal();
  } catch (err) {
    console.error("Avatar crop error:", err);
    alert("ඡායාරූපය සුරැකීමේ දෝෂයකි: " + err.message);
  } finally {
    if (btn) btn.disabled = false;
    if (btnText) btnText.innerHTML = `තහවුරු කර සුරකින්න`;
  }
};

// Cover Photo Cropper & Resizer
window.handleCoverPhotoSelected = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  openCoverCropModal(file);
  event.target.value = '';
};

window.openCoverCropModal = function(file) {
  if (!file) return;
  if (file.type && !file.type.startsWith('image/')) {
    alert("කරුණාකර වලංගු ඡායාරූපයක් (Image file) තෝරන්න.");
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const cropImg = document.getElementById('coverImageToCrop');
    if (!cropImg) return;

    try {
      history.pushState({ type: 'modal', id: 'cropCoverModal' }, '');
    } catch (err) {}
    document.getElementById('cropCoverModal')?.classList.remove('hidden');

    if (coverCropperInstance) {
      coverCropperInstance.destroy();
      coverCropperInstance = null;
    }

    cropImg.onload = function() {
      if (coverCropperInstance) {
        coverCropperInstance.destroy();
        coverCropperInstance = null;
      }
      coverCropperInstance = new Cropper(cropImg, {
        aspectRatio: 16 / 6,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 0.95,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
        ready() {
          const zoomRange = document.getElementById('coverCropperZoomRange');
          if (zoomRange) zoomRange.value = 1;
        },
        zoom(e) {
          const zoomRange = document.getElementById('coverCropperZoomRange');
          if (zoomRange && e && e.detail) {
            zoomRange.value = Math.min(Math.max(e.detail.ratio, 0.1), 3);
          }
        }
      });
    };
    cropImg.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

window.closeCoverCropModal = function() {
  document.getElementById('cropCoverModal')?.classList.add('hidden');
  if (coverCropperInstance) {
    coverCropperInstance.destroy();
    coverCropperInstance = null;
  }
};

window.zoomCoverCropper = function(delta) {
  if (coverCropperInstance) coverCropperInstance.zoom(delta);
};

window.setCoverCropperZoom = function(val) {
  if (coverCropperInstance) coverCropperInstance.zoomTo(parseFloat(val));
};

window.rotateCoverCropper = function(deg) {
  if (coverCropperInstance) coverCropperInstance.rotate(deg);
};

window.applyAndSaveCroppedCover = async function() {
  if (!coverCropperInstance) return;

  const btn = document.getElementById('btnSaveCroppedCover');
  const btnText = document.getElementById('btnSaveCroppedCoverText');

  try {
    if (btn) btn.disabled = true;
    if (btnText) btnText.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> කවරය සුරකිමින් පවතී...`;

    // 1. Get 1200x450 high-resolution cropped canvas with fallback
    let canvas = null;
    try {
      canvas = coverCropperInstance.getCroppedCanvas({
        width: 1200,
        height: 450,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
      });
    } catch (e) {
      console.warn("Cover cropper getCroppedCanvas failed:", e);
    }

    if (!canvas) {
      const cropImg = document.getElementById('coverImageToCrop');
      canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 450;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(cropImg, 0, 0, 1200, 450);
    }

    // 2. Convert to JPEG blob
    const blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85);
    });

    // 3. Upload to ImgBB (with automatic local fallback)
    const uploadedUrl = await uploadToImgBB(blob || canvas.toDataURL('image/jpeg', 0.82), `cover_${Date.now()}`);

    // 4. Save to StorageService
    StorageService.updateProfile({ coverImage: uploadedUrl });

    // 5. Update UI
    closeCoverCropModal();
    closeCoverModal();
    renderProfileView();
  } catch (err) {
    console.error("Cover crop error:", err);
    alert("කවරයේ ඡායාරූපය සුරැකීමේ දෝෂයකි: " + err.message);
  } finally {
    if (btn) btn.disabled = false;
    if (btnText) btnText.innerHTML = `කවරයේ ඡායාරූපය සුරකින්න`;
  }
};

window.uploadCoverPhoto = function(event) {
  window.handleCoverPhotoSelected(event);
};

window.openCoverModal = function() {
  try {
    history.pushState({ type: 'modal', id: 'editCoverModal' }, '');
  } catch (e) {}
  const currentUser = StorageService.currentUser;
  const currentImg = document.getElementById('coverCurrentPreviewImg');
  if (currentImg && currentUser) {
    currentImg.src = currentUser.coverImage || 'assets/banner.jpg';
  }
  const statusText = document.getElementById('coverUploadStatusText');
  if (statusText) {
    statusText.style.display = 'none';
    statusText.innerText = '';
  }
  document.getElementById('editCoverModal')?.classList.remove('hidden');
};

window.closeCoverModal = function() {
  document.getElementById('editCoverModal')?.classList.add('hidden');
};

window.selectCoverPreset = function(url) {
  StorageService.updateProfile({ coverImage: url });
  closeCoverModal();
  renderProfileView();
};

window.applyCustomCoverUrl = function() {
  const input = document.getElementById('customCoverUrlInput');
  if (!input || !input.value.trim()) {
    alert("කරුණාකර වලංගු Image URL ලිපිනයක් ඇතුළත් කරන්න.");
    return;
  }
  StorageService.updateProfile({ coverImage: input.value.trim() });
  input.value = '';
  closeCoverModal();
  renderProfileView();
};

window.logoutFromApp = async function() {
  if (confirm("ඔබට ඔබගේ ගිණුමෙන් ඉවත් වීමට (Sign Out) අවශ්‍ය බව තහවුරු කරන්න?")) {
    await StorageService.logout();
    updateUserInfoUI();
    switchTab('feed');
  }
};

window.handleProfileAuthAction = function() {
  const user = StorageService.currentUser;
  if (user.email && !user.isAnonymous) {
    logoutFromApp();
  } else {
    openProfileModal();
  }
};

// ============================================================================
// Google Auth & Basic Profile Modals
// ============================================================================

window.openProfileModal = function() {
  const modal = document.getElementById('profileModal');
  const user = StorageService.currentUser;
  if (modal) modal.classList.remove('hidden');

  const nameInput = document.getElementById('profileNameInput');
  const display = document.getElementById('modalUserDisplay');
  const avatar = document.getElementById('modalUserAvatar');
  const status = document.getElementById('modalUserStatus');
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  const googleLogoutBtn = document.getElementById('googleLogoutBtn');
  const alertBox = document.getElementById('authStatusAlert');

  if (alertBox) {
    alertBox.classList.add('hidden');
    alertBox.innerHTML = '';
  }

  if (nameInput) nameInput.value = user.name || '';
  if (display) display.innerText = user.name || 'අමුත්තා';

  if (avatar) {
    if (user.photo) {
      avatar.innerHTML = `<img src="${user.photo}" alt="${user.name}" style="width: 100%; height: 100%; border-radius: 9999px; object-fit: cover; display: block;" onerror="this.remove();">`;
    } else {
      avatar.innerText = (user.name || 'අ').trim().charAt(0);
    }
  }

  if (status) {
    if (user.email && !user.isAnonymous) {
      status.innerHTML = `<span style="color: #059669; font-weight: 600;"><i class="fa-solid fa-circle-check"></i> Google සත්‍යාපිතයි (${user.email})</span>`;
    } else {
      status.innerText = 'කල්‍යාණ මිත්‍ර පුණ්‍ය සාමාජික (නොමිලේ)';
    }
  }

  // Toggle login vs logout buttons
  if (user.email && !user.isAnonymous) {
    if (googleLoginBtn) googleLoginBtn.classList.add('hidden');
    if (googleLogoutBtn) googleLogoutBtn.classList.remove('hidden');
  } else {
    if (googleLoginBtn) googleLoginBtn.classList.remove('hidden');
    if (googleLogoutBtn) googleLogoutBtn.classList.add('hidden');
  }
};

window.closeProfileModal = function() {
  const modal = document.getElementById('profileModal');
  if (modal) modal.classList.add('hidden');
};

// ============================================================================
// Notifications System Controller & UI Handlers
// ============================================================================

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'මෑතකදී';
  const diffSec = Math.floor((Date.now() - Number(timestamp)) / 1000);
  if (diffSec < 60) return 'සුළු මොහොතකට පෙර';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `විනාඩි ${diffMin}කට පෙර`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `පැය ${diffHours}කට පෙර`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'ඊයේ';
  if (diffDays < 7) return `දින ${diffDays}කට පෙර`;
  const diffWeeks = Math.floor(diffDays / 7);
  return `සති ${diffWeeks}කට පෙර`;
}

window.toggleNotificationDropdown = function(e) {
  if (e) e.stopPropagation();
  const dropdown = document.getElementById('notificationsDropdown');
  const btn = document.getElementById('notificationBellBtn');
  const mobBtn = document.getElementById('mob-tab-notif');
  if (!dropdown) return;

  const isHidden = dropdown.style.display === 'none' || dropdown.classList.contains('hidden');
  if (isHidden) {
    dropdown.style.display = 'flex';
    dropdown.classList.remove('hidden');
    if (btn) btn.classList.add('active');
    if (mobBtn) mobBtn.classList.add('active');
    renderNotificationsList();
    // Mark notifications as read so badge clears and notifications do not reappear as unread
    StorageService.markAllNotificationsAsRead();
  } else {
    dropdown.style.display = 'none';
    dropdown.classList.add('hidden');
    if (btn) btn.classList.remove('active');
    if (mobBtn) mobBtn.classList.remove('active');
  }
};

window.closeNotificationDropdown = function() {
  const dropdown = document.getElementById('notificationsDropdown');
  const btn = document.getElementById('notificationBellBtn');
  const mobBtn = document.getElementById('mob-tab-notif');
  if (dropdown) {
    dropdown.style.display = 'none';
    dropdown.classList.add('hidden');
  }
  if (btn) btn.classList.remove('active');
  if (mobBtn) mobBtn.classList.remove('active');
};

window.filterNotifications = function(filterType, e) {
  if (e) e.stopPropagation();
  activeNotifFilter = filterType;

  ['all', 'sadhu', 'comment'].forEach(type => {
    const chip = document.getElementById(`notif-chip-${type}`);
    if (chip) {
      if (type === filterType) chip.classList.add('active');
      else chip.classList.remove('active');
    }
  });

  renderNotificationsList();
};

window.renderNotificationsList = function() {
  const listEl = document.getElementById('notifList');
  const badgeEl = document.getElementById('notificationBadge');
  const pillEl = document.getElementById('notifUnreadPill');
  if (!listEl) return;

  const notifs = currentNotifications || [];
  const unreadCount = notifs.filter(n => !n.read).length;

  // Update Badge in Navbar & Mobile Bottom Bar
  const mobBadgeEl = document.getElementById('mobNotifBadge');
  if (badgeEl) {
    if (unreadCount > 0) {
      badgeEl.innerText = unreadCount > 99 ? '99+' : unreadCount;
      badgeEl.style.display = 'inline-flex';
    } else {
      badgeEl.style.display = 'none';
    }
  }
  if (mobBadgeEl) {
    if (unreadCount > 0) {
      mobBadgeEl.innerText = unreadCount > 99 ? '99+' : unreadCount;
      mobBadgeEl.style.display = 'inline-flex';
    } else {
      mobBadgeEl.style.display = 'none';
    }
  }

  // Update Pill inside Dropdown Header
  if (pillEl) {
    if (unreadCount > 0) {
      pillEl.innerText = `${unreadCount}ක් අලුත්`;
      pillEl.style.display = 'inline-block';
    } else {
      pillEl.style.display = 'none';
    }
  }

  // Apply Filter
  let filtered = notifs;
  if (activeNotifFilter === 'sadhu') {
    filtered = notifs.filter(n => n.type === 'sadhu');
  } else if (activeNotifFilter === 'comment') {
    filtered = notifs.filter(n => n.type === 'comment');
  }

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="notif-empty">
        <i class="fa-regular fa-bell-slash"></i>
        <p><strong>තවමත් දැනුම්දීම් නොමැත</strong></p>
        <p style="margin-top: 4px; color: rgba(254, 243, 199, 0.5);">ඔබගේ පින්කම් සඳහා ලැබෙන සාදුකාර සහ පුණ්‍යානුමෝදනා මෙහි සටහන් වේ.</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = filtered.map(n => {
    const isUnread = !n.read;
    const initial = (n.senderName || 'ක').trim().charAt(0);
    const photo = n.senderPhoto;
    const timeAgo = formatTimeAgo(n.timestamp);

    let typeIconHtml = '';
    let mithraActionHtml = '';

    const currUser = StorageService.currentUser;
    const isFriendAlready = Array.isArray(currUser?.mithrayan) && currUser.mithrayan.includes(n.senderUid);
    const isAccepted = n.status === 'accepted' || isFriendAlready || StorageService.isRequestAccepted(n.id, n.senderUid);
    const isDeclined = n.status === 'declined' || n.status === 'rejected' || StorageService.isRequestDeclined(n.id, n.senderUid);

    if (n.type === 'sadhu') {
      typeIconHtml = '<span class="notif-type-icon sadhu" title="සාදුකාරයක්">🙏</span>';
    } else if (n.type === 'comment') {
      typeIconHtml = '<span class="notif-type-icon comment" title="පුණ්‍යානුමෝදනාවක්"><i class="fa-solid fa-comment" style="font-size: 8px;"></i></span>';
    } else if (n.type === 'mention') {
      typeIconHtml = '<span class="notif-type-icon mention" title="ඔබව සිහිපත් කළාය" style="background: #fef3c7; color: #d97706;"><i class="fa-solid fa-at" style="font-size: 9px;"></i></span>';
    } else if (n.type === 'sangha_reverence') {
      typeIconHtml = '<span class="notif-type-icon sangha" title="නමස්කාර ගෞරවය" style="background: #fef3c7; color: #b45309;"><i class="fa-solid fa-hands-praying" style="font-size: 9px;"></i></span>';
    } else if (n.type === 'mithra_request') {
      typeIconHtml = '<span class="notif-type-icon mithra" title="කල්‍යාණ මිත්‍ර ඇරයුම">🪷</span>';
      if (!isAccepted && !isDeclined && (!n.status || n.status === 'pending')) {
        mithraActionHtml = `
          <div class="notif-mithra-actions" onclick="event.stopPropagation()">
            <button type="button" class="btn-notif-accept" onclick="handleAcceptMithra('${n.id}', '${n.senderUid}', '${Security.escapeHTML(n.senderName)}')">
              <i class="fa-solid fa-circle-check"></i> පිළිගන්න (සාදු!)
            </button>
            <button type="button" class="btn-notif-reject" onclick="handleRejectMithra('${n.id}', '${n.senderUid}', '${Security.escapeHTML(n.senderName)}')">
              <i class="fa-solid fa-xmark"></i> ඉවත් කරන්න
            </button>
          </div>
        `;
      } else if (isAccepted) {
        mithraActionHtml = `
          <div style="font-size: 0.72rem; color: #059669; font-weight: 700; margin-top: 5px;">
            <i class="fa-solid fa-circle-check"></i> ඇරයුම සාදරයෙන් පිළිගන්නා ලදී
          </div>
        `;
      } else if (isDeclined) {
        mithraActionHtml = `
          <div style="font-size: 0.72rem; color: #94a3b8; font-weight: 600; margin-top: 5px;">
            <i class="fa-solid fa-xmark"></i> ඇරයුම ඉවත් කරන ලදී
          </div>
        `;
      }
    } else if (n.type === 'mithra_accepted') {
      typeIconHtml = '<span class="notif-type-icon mithra" title="කල්‍යාණ මිත්‍ර සබඳතාව">✨</span>';
    } else if (n.type === 'mithra_rejected') {
      typeIconHtml = '<span class="notif-type-icon" style="background: #fee2e2; color: #ef4444;" title="කල්‍යාණ මිත්‍ර ඇරයුම"><i class="fa-solid fa-user-xmark" style="font-size: 8px;"></i></span>';
    } else {
      typeIconHtml = '<span class="notif-type-icon sathkara" title="සත්කාරයක්">🤝</span>';
    }

    let notifBodyText = '';
    if (n.type === 'sangha_reverence') {
      notifBodyText = `<strong>${Security.escapeHTML(n.senderName || 'පින්වත් සැදැහැවතෙක්')}</strong> ඔබ වහන්සේට නමස්කාර පූර්වකව ගෞරව දක්වමින් අනුගමනය කළාය. 🙏`;
    } else if (n.type === 'mithra_accepted') {
      notifBodyText = `ඔබගේ කල්‍යාණ මිත්‍ර ඇරයුම <strong>${Security.escapeHTML(n.senderName || 'කල්‍යාණ මිත්‍රයා')}</strong> විසින් පිළිගන්නා ලදී. 🙏`;
    } else if (n.type === 'mithra_rejected') {
      notifBodyText = `ඔබගේ කල්‍යාණ මිත්‍ර ඇරයුම <strong>${Security.escapeHTML(n.senderName || 'කල්‍යාණ මිත්‍රයා')}</strong> විසින් පිළි නොගන්නා ලදී.`;
    } else if (n.type === 'mithra_request') {
      notifBodyText = `<strong>${Security.escapeHTML(n.senderName || 'කල්‍යාණ මිත්‍ර')}</strong> ඔබව කල්‍යාණ මිත්‍රයෙකු ලෙස සම්බන්ධ කරගැනීමට ඇරයුම් කළාය. 🙏`;
    } else {
      notifBodyText = `<strong>${Security.escapeHTML(n.senderName || 'කල්‍යාණ මිත්‍ර')}</strong> ${Security.escapeHTML(n.message || '')}`;
    }

    return `
      <div class="notif-item ${isUnread ? 'unread' : ''}" onclick="handleNotificationClick('${n.id}', '${n.postId || ''}', '${n.type || ''}', '${n.senderUid || ''}')">
        <div class="notif-avatar-wrap">
          <div class="notif-avatar">
            ${photo ? `<img src="${Security.sanitizeUrl(photo)}" alt="${Security.escapeHTML(n.senderName)}" onerror="this.parentElement.innerText = '${initial}';">` : initial}
          </div>
          ${typeIconHtml}
        </div>
        <div class="notif-body">
          <div class="notif-body-text">
            ${notifBodyText}
            ${n.postTitle ? `
              <div class="notif-post-title-preview" title="${Security.escapeHTML(n.postTitle)}">
                <i class="fa-solid fa-file-pen" style="color: #d97706; font-size: 0.72rem;"></i>
                <span>"${Security.escapeHTML(n.postTitle)}"</span>
              </div>
            ` : ''}
          </div>
          ${mithraActionHtml}
          <div class="notif-time">
            <i class="fa-regular fa-clock" style="font-size: 0.65rem;"></i>
            <span>${timeAgo}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
};

window.handleNotificationClick = async function(notifId, postId, postType, senderUid) {
  // Mark as read
  if (notifId) {
    try {
      await StorageService.markNotificationAsRead(notifId);
    } catch (e) {
      console.warn('Error marking notification read:', e);
    }
  }

  // Close dropdown
  closeNotificationDropdown();

  // If friend request or acceptance, open member profile
  if (postType === 'mithra_request' || postType === 'mithra_accepted' || postType === 'mithra_rejected') {
    const targetUid = senderUid || postId;
    if (targetUid) {
      openMemberProfileModal(targetUid);
    }
    return;
  }

  if (!postId) return;

  // Determine if post belongs to needs or feed
  const post = (currentPostsData || []).find(p => p.id === postId) || 
               (StorageService.getLocalPosts() || []).find(p => p.id === postId);

  const targetTab = (postType === 'sathkara' || (post && post.type === 'need')) ? 'needs' : 'feed';
  
  // Switch to target tab
  switchTab(targetTab);

  // If a filter is currently active in the feed, reset to 'all' so the post is visible
  if (targetTab === 'feed' && typeof currentCategoryFilter !== 'undefined' && currentCategoryFilter !== 'all') {
    filterCategory('all', false);
  }

  // Function to perform scroll & highlight
  const focusAndHighlight = () => {
    const elem = document.getElementById(`post-elem-${postId}`);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      elem.classList.remove('highlight-post-pulse');
      // Trigger reflow for clean re-trigger
      void elem.offsetWidth;
      elem.classList.add('highlight-post-pulse');

      // If it was a comment or mention notification, automatically expand comments box
      if (postType === 'comment' || postType === 'mention') {
        const box = document.getElementById(`comments-box-${postId}`);
        if (box) box.style.display = 'block';
      }

      // Add temporary reaction notice tag if not already added
      let noticeTag = elem.querySelector('.notif-target-indicator');
      if (!noticeTag) {
        noticeTag = document.createElement('div');
        noticeTag.className = 'notif-target-indicator';
        noticeTag.innerHTML = `<i class="fa-solid fa-bell" style="color: #d97706;"></i> <span>ඔබගේ මෙම පින්කම සඳහා ප්‍රතිචාරයක් ලැබුණි</span>`;
        elem.insertBefore(noticeTag, elem.firstChild);
        setTimeout(() => {
          noticeTag?.remove();
        }, 5000);
      }

      setTimeout(() => {
        elem.classList.remove('highlight-post-pulse');
      }, 3500);
      return true;
    }
    return false;
  };

  // Try immediately, or retry after DOM renders
  if (!focusAndHighlight()) {
    setTimeout(() => {
      if (!focusAndHighlight()) {
        setTimeout(focusAndHighlight, 350);
      }
    }, 180);
  }
};

window.markAllNotificationsAsRead = async function(e) {
  if (e) e.stopPropagation();
  try {
    await StorageService.markAllNotificationsAsRead();
  } catch (err) {
    console.warn('Error marking all notifications read:', err);
  }
};

// ============================================================================
// Community Member Counter & Directory Controller (PC & Mobile)
// ============================================================================

let allCommunityMembersCache = [];
let activeFriendsSegment = 'my';
let currentDirectoryFilterType = 'all';
let currentDirectorySearchQuery = '';

export async function updateCommunityMemberCount() {
  try {
    const counterPill = document.getElementById('headerMemberCounter');
    const countText = document.getElementById('globalMemberCountText');

    const totalCount = await StorageService.getTotalMemberCount();
    const formatted = Number(totalCount).toLocaleString('en-US');
    if (countText) {
      countText.innerText = `කල්‍යාණ මිතුරන් ${formatted}+ ක්`;
    }
    if (counterPill) {
      counterPill.setAttribute('title', `කල්‍යාණ මිතුරු පවුර (${formatted} දෙනෙක්)`);
    }

    // Refresh PC right sidebar members preview
    renderPcSidebarMembers();
  } catch (err) {
    console.warn('[App] Update community member count warning:', err);
  }
}
window.updateCommunityMemberCount = updateCommunityMemberCount;

// ============================================================================
// Friends & Directory View Mode (Grid vs List)
// ============================================================================
let currentFriendsViewMode = localStorage.getItem('pinPotha_friends_view_mode') || 'grid';

window.setFriendsViewMode = function (mode) {
  triggerHaptic(15);
  SoundService?.playClick?.();
  currentFriendsViewMode = mode;
  localStorage.setItem('pinPotha_friends_view_mode', mode);
  applyFriendsViewModeUI();
};

function applyFriendsViewModeUI() {
  const mode = currentFriendsViewMode || 'grid';
  
  // Containers
  const myFriendsList = document.getElementById('profConnectedMithrayanList');
  const dirMembersList = document.getElementById('profDirectoryMembersList');
  const pendingList = document.getElementById('profPendingRequestsList');

  [myFriendsList, dirMembersList, pendingList].forEach(el => {
    if (el) {
      if (mode === 'list') {
        el.classList.add('list-view');
      } else {
        el.classList.remove('list-view');
      }
    }
  });

  // Buttons in Panel 1 (My Friends)
  const btnGridMy = document.getElementById('viewBtnGridMy');
  const btnListMy = document.getElementById('viewBtnListMy');
  if (btnGridMy && btnListMy) {
    btnGridMy.classList.toggle('active', mode === 'grid');
    btnListMy.classList.toggle('active', mode === 'list');
  }

  // Buttons in Panel 2 (All Members)
  const btnGridAll = document.getElementById('viewBtnGridAll');
  const btnListAll = document.getElementById('viewBtnListAll');
  if (btnGridAll && btnListAll) {
    btnGridAll.classList.toggle('active', mode === 'grid');
    btnListAll.classList.toggle('active', mode === 'list');
  }
}

window.openFriendsView = function(segment = 'my') {
  if (isGuestUser()) {
    showAuthRequiredModal('කල්‍යාණ මිතුරු පවුර නැරඹීමට');
    return;
  }
  try {
    closeMemberProfileModal();
    closeNotificationDropdown();
  } catch (e) {}
  switchTab('profile');
  setProfileSubTab('friends');
  switchFriendsSegment(segment);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.openFriendsViewWithTab = function(segment) {
  openFriendsView(segment);
};

window.switchFriendsSegment = function(seg) {
  activeFriendsSegment = seg;
  const myBtn = document.getElementById('friendsSegmentMyBtn');
  const allBtn = document.getElementById('friendsSegmentAllBtn');
  const myPanel = document.getElementById('friendsPanelMy');
  const allPanel = document.getElementById('friendsPanelAll');

  if (seg === 'all') {
    if (myBtn) myBtn.classList.remove('active');
    if (allBtn) allBtn.classList.add('active');
    if (myPanel) myPanel.style.display = 'none';
    if (allPanel) allPanel.style.display = 'block';
    renderCommunityDirectory();
  } else {
    if (myBtn) myBtn.classList.add('active');
    if (allBtn) allBtn.classList.remove('active');
    if (myPanel) myPanel.style.display = 'block';
    if (allPanel) allPanel.style.display = 'none';
  }
  applyFriendsViewModeUI();
};

function applyDirectoryFilters(members, filterType, query) {
  let result = [...members];
  const currentUser = StorageService.currentUser || {};
  const currentMithrayan = Array.isArray(currentUser.mithrayan) ? currentUser.mithrayan : [];

  if (query && query.trim()) {
    const q = query.trim().toLowerCase();
    result = result.filter(m =>
      (m.name || '').toLowerCase().includes(q) ||
      (m.location || '').toLowerCase().includes(q) ||
      (m.bio || '').toLowerCase().includes(q)
    );
  }

  if (filterType === 'recent') {
    result.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } else if (filterType === 'not_connected') {
    result = result.filter(m => m.uid !== currentUser.uid && !currentMithrayan.includes(m.uid));
  }

  return result;
}

window.renderCommunityDirectory = async function(filtered = null) {
  const container = document.getElementById('profDirectoryMembersList');
  const countSummary = document.getElementById('directoryMembersCountSummary');
  const allBadge = document.getElementById('profCountAllMembersBadge');
  if (!container) return;

  if (!filtered && allCommunityMembersCache.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 32px 20px; color: #94a3b8;">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.8rem; color: #d97706; margin-bottom: 8px;"></i>
        <p style="font-size: 0.82rem; font-weight: 600;">පිං පොත සාමාජික එකමුතුව සූදානම් වෙමින් පවතී...</p>
      </div>
    `;
    allCommunityMembersCache = await StorageService.getAllCommunityMembers();
  }

  let list = filtered || allCommunityMembersCache;
  if (!filtered) {
    list = applyDirectoryFilters(allCommunityMembersCache, currentDirectoryFilterType, currentDirectorySearchQuery);
  }

  const currentUser = StorageService.currentUser || {};
  const currentMithrayan = Array.isArray(currentUser.mithrayan) ? currentUser.mithrayan : [];
  const currentSent = Array.isArray(currentUser.pendingMithraSent) ? currentUser.pendingMithraSent : [];

  if (allBadge) {
    allBadge.innerText = allCommunityMembersCache.length;
  }
  if (countSummary) {
    countSummary.innerText = `සාමාජිකයින් ${list.length} ක්`;
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; color: #94a3b8; background: #ffffff; border-radius: 16px; border: 1.5px dashed #e2e8f0;">
        <i class="fa-solid fa-user-slash" style="font-size: 2rem; color: #d97706; margin-bottom: 8px; opacity: 0.6;"></i>
        <h4 style="font-size: 0.95rem; font-weight: 700; color: #334155;">කිසිදු සාමාජිකයෙකු හමු නොවීය</h4>
        <p style="font-size: 0.76rem; color: #64748b; margin-top: 4px;">වෙනත් නමකින් හෝ නගරයකින් සොයා බලන්න.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(m => {
    const isMe = m.uid === currentUser.uid;
    const isFriend = currentMithrayan.includes(m.uid);
    const isSent = currentSent.includes(m.uid);
    const initial = (m.name || 'ක').charAt(0);

    const isMemberSangha = StorageService.isSangha(m);
    const isMemberMaster = StorageService.isMasterAdmin(m);
    const isMemberSubAdmin = !isMemberMaster && StorageService.isSubAdmin(m);

    let actionBtnHtml = '';
    if (isMe) {
      actionBtnHtml = `<span class="badge-connected-friend" style="background: #fef3c7; border-color: #fde68a; color: #92400e;"><i class="fa-solid fa-circle-user"></i> ඔබගේ පැතිකඩ</span>`;
    } else if (isMemberSangha) {
      const isRevered = StorageService.isReveringSangha(m.uid);
      actionBtnHtml = isRevered
        ? `<button type="button" class="btn-sangha-revered" style="padding: 5px 10px; font-size: 0.72rem;" onclick="event.stopPropagation(); handleToggleSanghaReverence('${m.uid}', '${Security.escapeHTML(m.name)}')"><i class="fa-solid fa-hands-praying"></i> වන්දනා කර ඇත 🙏</button>`
        : `<button type="button" class="btn-sangha-reverence" style="padding: 5px 10px; font-size: 0.72rem;" onclick="event.stopPropagation(); handleToggleSanghaReverence('${m.uid}', '${Security.escapeHTML(m.name)}')"><i class="fa-solid fa-hands-praying"></i> නමස්කාර කරමි 🙏</button>`;
    } else if (isFriend) {
      actionBtnHtml = `<span class="badge-connected-friend"><i class="fa-solid fa-circle-check"></i> මිතුරෙකි</span>`;
    } else if (isSent) {
      actionBtnHtml = `<span class="btn-mithra-pending"><i class="fa-solid fa-clock"></i> ඇරයුමක් යවා ඇත</span>`;
    } else {
      actionBtnHtml = `
        <button type="button" class="btn-profile-primary" style="flex: 1; padding: 6px 10px; font-size: 0.72rem; justify-content: center; gap: 4px;" onclick="event.stopPropagation(); handleSendMithraFromDirectory('${m.uid}', '${Security.escapeHTML(m.name)}')">
          <i class="fa-solid fa-user-plus"></i> ඇරයුම් කරන්න
        </button>
      `;
    }

    return `
      <div class="mithra-card directory-member-card" onclick="openMemberProfileModal('${m.uid}', '${Security.escapeHTML(m.name)}')">
        <div class="mithra-card-avatar ${isMemberSangha ? 'sangha-framed-avatar' : ''}" style="cursor: pointer;">
          ${m.photo ? `<img src="${Security.sanitizeUrl(m.photo)}" alt="${Security.escapeHTML(m.name)}" onerror="this.parentElement.innerText = '${initial}';">` : `<span>${initial}</span>`}
          ${isMemberSangha ? '<img src="assets/sangha-frame.png" class="sangha-vatapatha-frame" alt="වටාපත">' : ''}
        </div>
        <div class="mithra-card-details">
          <div class="mithra-card-name" style="cursor: pointer;">
            <span>${Security.escapeHTML(m.name || 'කල්‍යාණ මිත්‍ර')}</span>
            ${isMemberMaster ? `<span class="badge-crown" title="Master Admin">👑</span>` : (isMemberSubAdmin ? `<span class="badge-shield" title="පරිපාලක (Admin)">🛡️</span>` : '')}
            ${isMemberSangha ? `<span class="sangha-author-badge" style="margin-left: 4px; padding: 1px 7px; font-size: 0.62rem;"><i class="fa-solid fa-dharmachakra"></i> පූජනීය සංඝරත්නය</span>` : ''}
          </div>
          <div class="mithra-card-loc">
            ${m.location ? `<i class="fa-solid fa-location-dot" style="color: #ea580c;"></i> <span>${Security.escapeHTML(m.location)}</span>` : `<i class="fa-solid fa-calendar-check" style="color: #059669;"></i> <span>${Security.escapeHTML(m.joinedDate || '2026')}</span>`}
          </div>
          ${m.bio ? `<p class="directory-card-bio">${Security.escapeHTML(m.bio)}</p>` : ''}
        </div>
        <div class="mithra-card-actions" onclick="event.stopPropagation()">
          ${actionBtnHtml}
          <button type="button" class="btn-mithra-view" onclick="openMemberProfileModal('${m.uid}', '${Security.escapeHTML(m.name)}')" title="සම්පූර්ණ පැතිකඩ බලන්න">
            <i class="fa-solid fa-eye"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
  applyFriendsViewModeUI();
};

window.handleDirectoryMemberSearch = function(query) {
  currentDirectorySearchQuery = query;
  const list = applyDirectoryFilters(allCommunityMembersCache, currentDirectoryFilterType, currentDirectorySearchQuery);
  renderCommunityDirectory(list);
};

window.filterDirectoryBy = function(type) {
  currentDirectoryFilterType = type;
  const chips = [
    { type: 'all', id: 'dirChipAll' },
    { type: 'recent', id: 'dirChipRecent' },
    { type: 'not_connected', id: 'dirChipNotConnected' }
  ];
  chips.forEach(c => {
    const el = document.getElementById(c.id);
    if (el) {
      if (c.type === type) el.classList.add('active');
      else el.classList.remove('active');
    }
  });

  const list = applyDirectoryFilters(allCommunityMembersCache, currentDirectoryFilterType, currentDirectorySearchQuery);
  renderCommunityDirectory(list);
};

window.renderPcSidebarMembers = async function(filterQuery = '') {
  const container = document.getElementById('pcSidebarMemberList');
  const countPill = document.getElementById('pcCommunityCountPill');
  if (!container) return;

  if (allCommunityMembersCache.length === 0) {
    allCommunityMembersCache = await StorageService.getAllCommunityMembers();
  }

  const currentUser = StorageService.currentUser || {};
  const currentMithrayan = Array.isArray(currentUser.mithrayan) ? currentUser.mithrayan : [];
  const currentSent = Array.isArray(currentUser.pendingMithraSent) ? currentUser.pendingMithraSent : [];

  if (countPill) {
    countPill.innerText = `${allCommunityMembersCache.length} දෙනෙක්`;
  }

  let list = allCommunityMembersCache;
  if (filterQuery && filterQuery.trim()) {
    const q = filterQuery.trim().toLowerCase();
    list = list.filter(m =>
      (m.name || '').toLowerCase().includes(q) ||
      (m.location || '').toLowerCase().includes(q)
    );
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 16px 8px; color: #94a3b8; font-size: 0.74rem;">
        සාමාජිකයින් හමු නොවීය.
      </div>
    `;
    return;
  }

  // Display top 6 in sidebar preview
  const displayList = list.slice(0, 6);

  container.innerHTML = displayList.map(m => {
    const isMe = m.uid === currentUser.uid;
    const isFriend = currentMithrayan.includes(m.uid);
    const isSent = currentSent.includes(m.uid);
    const initial = (m.name || 'ක').charAt(0);

    let actionBtn = '';
    if (isMe) {
      actionBtn = `<span style="font-size: 0.65rem; color: #92400e; font-weight: 700;">(ඔබ)</span>`;
    } else if (isFriend) {
      actionBtn = `<i class="fa-solid fa-circle-check" style="color: #059669; font-size: 0.85rem;" title="කල්‍යාණ මිතුරෙකි"></i>`;
    } else if (isSent) {
      actionBtn = `<i class="fa-solid fa-clock" style="color: #d97706; font-size: 0.82rem;" title="ඇරයුමක් යවා ඇත"></i>`;
    } else {
      actionBtn = `
        <button type="button" class="sidebar-member-action-btn" onclick="event.stopPropagation(); handleSidebarMemberAction('${m.uid}', '${Security.escapeHTML(m.name)}')" title="කල්‍යාණ මිත්‍ර ඇරයුමක් යවන්න">
          <i class="fa-solid fa-user-plus"></i>
        </button>
      `;
    }

    const isMemberSangha = StorageService.isSangha(m);
    return `
      <div class="sidebar-member-item" onclick="openMemberProfileModal('${m.uid}', '${Security.escapeHTML(m.name)}')" title="${Security.escapeHTML(m.name)} ගේ පැතිකඩ බලන්න">
        <div class="sidebar-member-avatar ${isMemberSangha ? 'sangha-framed-avatar' : ''}">
          ${m.photo ? `<img src="${Security.sanitizeUrl(m.photo)}" alt="${Security.escapeHTML(m.name)}" onerror="this.parentElement.innerText = '${initial}';">` : `<span>${initial}</span>`}
          ${isMemberSangha ? '<img src="assets/sangha-frame.png" class="sangha-vatapatha-frame" alt="වටාපත">' : ''}
        </div>
        <div class="sidebar-member-info">
          <div class="sidebar-member-name">
            <span>${Security.escapeHTML(m.name || 'කල්‍යාණ මිත්‍ර')}</span>
            ${m.isAdmin ? `<i class="fa-solid fa-crown" style="color: #f59e0b; font-size: 0.65rem;" title="Master Admin"></i>` : ''}
            ${isMemberSangha ? `<span class="sangha-author-badge" style="margin-left: 3px; padding: 1px 5px; font-size: 0.58rem;"><i class="fa-solid fa-dharmachakra"></i> සංඝරත්නය</span>` : ''}
          </div>
          <div class="sidebar-member-meta">
            ${m.location ? `<i class="fa-solid fa-location-dot"></i> ${Security.escapeHTML(m.location)}` : (m.joinedDate ? `<i class="fa-solid fa-calendar-check"></i> ${Security.escapeHTML(m.joinedDate)}` : 'කල්‍යාණ මිත්‍ර')}
          </div>
        </div>
        <div>
          ${actionBtn}
        </div>
      </div>
    `;
  }).join('');
};

window.handlePcSidebarMemberSearch = function(query) {
  renderPcSidebarMembers(query);
};

window.handleSidebarMemberAction = async function(targetUid, targetName) {
  await handleSendMithra(targetUid, targetName);
  renderPcSidebarMembers();
  if (activeFriendsSegment === 'all') {
    renderCommunityDirectory();
  }
};

window.handleSendMithraFromDirectory = async function(targetUid, targetName) {
  await handleSendMithra(targetUid, targetName);
  renderCommunityDirectory();
  renderPcSidebarMembers();
  if (activeTab === 'friends') renderKmpDirectoryView(true);
};

// ============================================================================
// Real-Time User Presence & Kalyana Mithuru Pawura Live Sync Engine
// ============================================================================
let kmpLivePollTimer = null;

function startKmpLivePolling() {
  if (kmpLivePollTimer) clearInterval(kmpLivePollTimer);
  kmpLivePollTimer = setInterval(async () => {
    if (activeTab === 'friends' && !document.hidden) {
      try {
        await renderKmpDirectoryView(true);
      } catch (e) {
        console.warn('[KMP] Live poll error:', e);
      }
    }
  }, 20000); // Poll every 20 seconds for live updates
}

function stopKmpLivePolling() {
  if (kmpLivePollTimer) {
    clearInterval(kmpLivePollTimer);
    kmpLivePollTimer = null;
  }
}

window.refreshKmpDirectoryLive = async function(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  triggerHaptic(15);
  const dot = document.getElementById('kmpLivePulseDot');
  if (dot) dot.style.animation = 'spin 0.6s linear infinite';
  try {
    await StorageService.updateUserPresence(true);
    await renderKmpDirectoryView(true);
  } finally {
    if (dot) dot.style.animation = '';
  }
};

function initPresenceEngine() {
  // Update presence immediately on start
  StorageService.updateUserPresence(true);

  // Background heartbeat every 60s
  setInterval(() => {
    if (!document.hidden) {
      StorageService.updateUserPresence();
    }
  }, 60000);

  // Handle visibility transitions
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      StorageService.updateUserPresence(true);
      if (activeTab === 'friends') {
        renderKmpDirectoryView(true);
      }
    }
  });

  // Track user actions (throttled to 60s inside StorageService)
  ['click', 'touchstart', 'keydown'].forEach(evt => {
    window.addEventListener(evt, () => {
      StorageService.updateUserPresence();
    }, { passive: true });
  });
}

// ============================================================================
// Kalyana Mithuru Pawura (Direct Directory Page) Controller
// ============================================================================
window.openFriendsView = function(segment) {
  window.switchTab('friends');
  if (segment) {
    const targetSeg = segment === 'my' ? 'friends' : segment;
    if (window.switchKmpSegment) window.switchKmpSegment(targetSeg);
  }
};

let kmpActiveSegment = 'all'; // 'all', 'friends', 'online', 'sangha', 'suggested', 'requests'
let kmpSearchQuery = '';
let kmpSortMode = 'active'; // 'active', 'newest', 'name'
let kmpViewMode = 'grid'; // 'grid', 'list'
let kmpMembersCache = [];

window.switchKmpSegment = function(seg) {
  triggerHaptic(12);
  kmpActiveSegment = seg;

  const chips = ['all', 'friends', 'online', 'sangha', 'suggested', 'requests'];
  chips.forEach(s => {
    const chip = document.getElementById(`kmpSeg${s.charAt(0).toUpperCase() + s.slice(1)}`);
    if (chip) {
      if (s === seg) chip.classList.add('active');
      else chip.classList.remove('active');
    }
  });

  renderKmpDirectoryView(false);
};

window.handleKmpSearch = function(val) {
  kmpSearchQuery = (val || '').trim();
  const clearBtn = document.getElementById('kmpClearSearchBtn');
  if (clearBtn) {
    if (kmpSearchQuery) clearBtn.classList.remove('hidden');
    else clearBtn.classList.add('hidden');
  }
  renderKmpDirectoryView(false);
};

window.clearKmpSearch = function() {
  kmpSearchQuery = '';
  const input = document.getElementById('kmpSearchInput');
  if (input) input.value = '';
  const clearBtn = document.getElementById('kmpClearSearchBtn');
  if (clearBtn) clearBtn.classList.add('hidden');
  renderKmpDirectoryView(false);
};

window.handleKmpSortChange = function(sort) {
  kmpSortMode = sort || 'active';
  renderKmpDirectoryView(false);
};

window.setKmpViewMode = function(mode) {
  kmpViewMode = mode;
  const gridBtn = document.getElementById('kmpViewGridBtn');
  const listBtn = document.getElementById('kmpViewListBtn');
  const container = document.getElementById('kmpGridContainer');

  if (gridBtn && listBtn) {
    if (mode === 'grid') {
      gridBtn.classList.add('active');
      listBtn.classList.remove('active');
    } else {
      listBtn.classList.add('active');
      gridBtn.classList.remove('active');
    }
  }

  if (container) {
    if (mode === 'list') container.classList.add('list-view');
    else container.classList.remove('list-view');
  }
};

window.resetKmpFilters = function() {
  kmpActiveSegment = 'all';
  kmpSearchQuery = '';
  kmpSortMode = 'active';
  const searchInput = document.getElementById('kmpSearchInput');
  if (searchInput) searchInput.value = '';
  const clearBtn = document.getElementById('kmpClearSearchBtn');
  if (clearBtn) clearBtn.classList.add('hidden');
  const sortSelect = document.getElementById('kmpSortSelect');
  if (sortSelect) sortSelect.value = 'active';

  const chips = ['all', 'friends', 'online', 'sangha', 'suggested', 'requests'];
  chips.forEach(s => {
    const chip = document.getElementById(`kmpSeg${s.charAt(0).toUpperCase() + s.slice(1)}`);
    if (chip) {
      if (s === 'all') chip.classList.add('active');
      else chip.classList.remove('active');
    }
  });

  renderKmpDirectoryView(false);
};

window.renderKmpDirectoryView = async function(forceRefresh = false) {
  const container = document.getElementById('kmpGridContainer');
  const emptyState = document.getElementById('kmpEmptyState');
  if (!container) return;

  // Keep current user presence alive
  try {
    StorageService.updateUserPresence();
  } catch (e) {}

  if (kmpMembersCache.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; color: #78350f;">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 2.2rem; color: #d97706; margin-bottom: 12px;"></i>
        <p style="font-size: 0.92rem; font-weight: 700;">කල්‍යාණ මිතුරු පවුර සූදානම් වෙමින් පවතී...</p>
      </div>
    `;
  }

  if (forceRefresh || kmpMembersCache.length === 0) {
    kmpMembersCache = await StorageService.getAllCommunityMembers(forceRefresh);
  }

  const currentUser = StorageService.currentUser || {};
  const currentMithrayan = Array.isArray(currentUser.mithrayan) ? currentUser.mithrayan : [];
  const currentSent = Array.isArray(currentUser.pendingMithraSent) ? currentUser.pendingMithraSent : [];

  // Notifications for pending incoming requests
  const notifs = StorageService.getLocalNotifications() || [];
  const pendingIncoming = notifs.filter(n =>
    n.type === 'mithra_request' &&
    n.recipientUid === currentUser.uid &&
    !StorageService.isRequestAccepted(n.id, n.senderUid) &&
    !StorageService.isRequestDeclined(n.id, n.senderUid) &&
    (!currentUser.mithrayan || !currentUser.mithrayan.includes(n.senderUid)) &&
    (!n.status || n.status === 'pending')
  );

  // Calculate live presence stats
  let onlineCount = kmpMembersCache.filter(m => m.isOnline).length;
  if (onlineCount === 0 && currentUser.uid) onlineCount = 1;

  const totalMembers = kmpMembersCache.length;
  const friendsCount = currentMithrayan.length;
  const sanghaCount = kmpMembersCache.filter(m => m.isSangha).length;

  // Update Hero & Segments counters
  const liveEl = document.getElementById('kmpLiveOnlineCount');
  if (liveEl) liveEl.innerText = `${onlineCount} දෙනෙක්`;

  const totalEl = document.getElementById('kmpTotalMembersCount');
  if (totalEl) totalEl.innerText = totalMembers;

  const myFriendsEl = document.getElementById('kmpMyFriendsCount');
  if (myFriendsEl) myFriendsEl.innerText = friendsCount;

  const sanghaEl = document.getElementById('kmpSanghaMembersCount');
  if (sanghaEl) sanghaEl.innerText = sanghaCount;

  const countAll = document.getElementById('kmpSegCountAll');
  if (countAll) countAll.innerText = totalMembers;

  const countFriends = document.getElementById('kmpSegCountFriends');
  if (countFriends) countFriends.innerText = friendsCount;

  const countOnline = document.getElementById('kmpSegCountOnline');
  if (countOnline) countOnline.innerText = onlineCount;

  const countSangha = document.getElementById('kmpSegCountSangha');
  if (countSangha) countSangha.innerText = sanghaCount;

  const countReq = document.getElementById('kmpSegCountRequests');
  if (countReq) {
    countReq.innerText = pendingIncoming.length;
    if (pendingIncoming.length > 0) {
      countReq.classList.remove('hidden');
    } else {
      countReq.classList.add('hidden');
    }
  }

  // Filter based on segment
  let list = [...kmpMembersCache];

  if (kmpActiveSegment === 'friends') {
    list = list.filter(m => currentMithrayan.includes(m.uid));
  } else if (kmpActiveSegment === 'online') {
    list = list.filter(m => m.isOnline);
  } else if (kmpActiveSegment === 'sangha') {
    list = list.filter(m => m.isSangha);
  } else if (kmpActiveSegment === 'suggested') {
    list = list.filter(m => m.uid !== currentUser.uid && !currentMithrayan.includes(m.uid));
    list.sort((a, b) => ((b.postsCount || 0) + (b.totalSadhu || 0)) - ((a.postsCount || 0) + (a.totalSadhu || 0)));
  } else if (kmpActiveSegment === 'requests') {
    const senderUids = pendingIncoming.map(r => r.senderUid);
    list = list.filter(m => senderUids.includes(m.uid));
    pendingIncoming.forEach(req => {
      if (!list.some(m => m.uid === req.senderUid)) {
        list.push({
          uid: req.senderUid,
          name: req.senderName || 'කල්‍යාණ මිත්‍ර',
          photo: req.senderPhoto || '',
          bio: 'කල්‍යාණ මිතුරු ඇරයුමක් එවා ඇත',
          location: '',
          joinedDate: '2026',
          isOnline: true,
          isSangha: StorageService.isSangha(req) || StorageService.isSangha({ uid: req.senderUid, name: req.senderName }),
          role: 'member',
          postsCount: 1,
          totalSadhu: 0,
          mithrayanCount: 0
        });
      }
    });
  }

  // Search filter
  if (kmpSearchQuery) {
    const q = kmpSearchQuery.toLowerCase();
    list = list.filter(m =>
      (m.name || '').toLowerCase().includes(q) ||
      (m.bio || '').toLowerCase().includes(q) ||
      (m.location || '').toLowerCase().includes(q)
    );
  }

  // Sorting
  if (kmpSortMode === 'active') {
    list.sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return (b.lastActiveAt || b.updatedAt || 0) - (a.lastActiveAt || a.updatedAt || 0);
    });
  } else if (kmpSortMode === 'newest') {
    list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } else if (kmpSortMode === 'name') {
    list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  // Results count & segment badge
  const resultsCountEl = document.getElementById('kmpResultsCount');
  if (resultsCountEl) resultsCountEl.innerText = `සාමාජිකයින් ${list.length} දෙනෙක්`;

  const badgeEl = document.getElementById('kmpResultsSegmentBadge');
  if (badgeEl) {
    const segNames = {
      all: 'සියලු සාමාජිකයින්',
      friends: 'මගේ මිතුරන්',
      online: 'දැන් Online',
      sangha: 'මහා සංඝරත්නය',
      suggested: 'යෝජිත මිතුරන්',
      requests: 'ලැබුණු ඇරයුම්'
    };
    badgeEl.innerText = segNames[kmpActiveSegment] || 'සියල්ල';
  }

  // Empty state handling
  if (list.length === 0) {
    if (emptyState) {
      emptyState.classList.remove('hidden');
      emptyState.style.display = 'block';
      const emptyTitle = document.getElementById('kmpEmptyTitle');
      const emptyDesc = document.getElementById('kmpEmptyDesc');
      if (kmpActiveSegment === 'friends') {
        if (emptyTitle) emptyTitle.innerText = 'තවමත් කල්‍යාණ මිතුරන් සම්බන්ධ වී නොමැත';
        if (emptyDesc) emptyDesc.innerText = 'සාමාජික නාමාවලියෙන් නව කල්‍යාණ මිතුරන්ට ඇරයුම් කර ඔබේ පවුර පුළුල් කරගන්න.';
      } else if (kmpActiveSegment === 'requests') {
        if (emptyTitle) emptyTitle.innerText = 'ලැබුණු ඇරයුම් කිසිවක් නොමැත';
        if (emptyDesc) emptyDesc.innerText = 'නව කල්‍යාණ මිතුරු ඇරයුම් ලැබුණු විට මෙහි දිස්වනු ඇත.';
      } else if (kmpActiveSegment === 'online') {
        if (emptyTitle) emptyTitle.innerText = 'දැනට වෙනත් සාමාජිකයින් Online නොමැත';
        if (emptyDesc) emptyDesc.innerText = 'මඳ වේලාවකින් නැවත පරික්ෂා කර බලන්න.';
      } else {
        if (emptyTitle) emptyTitle.innerText = 'කිසිදු සාමාජිකයෙකු හමු නොවීය';
        if (emptyDesc) emptyDesc.innerText = 'ඔබ සොයන නම හෝ පෙරහන වෙනස් කර නැවත සොයා බලන්න.';
      }
    }
    container.innerHTML = '';
    return;
  }

  if (emptyState) {
    emptyState.classList.add('hidden');
    emptyState.style.display = 'none';
  }

  // Render cards
  container.innerHTML = list.map(m => {
    const isMe = m.uid === currentUser.uid;
    const isFriend = currentMithrayan.includes(m.uid);
    const isSent = currentSent.includes(m.uid);
    const initial = (m.name || 'ක').charAt(0);

    const isMemberSangha = StorageService.isSangha(m);
    const isMemberMaster = StorageService.isMasterAdmin(m);
    const isMemberSubAdmin = !isMemberMaster && StorageService.isSubAdmin(m);

    // Incoming request check
    const pendingReq = pendingIncoming.find(r => r.senderUid === m.uid);

    let actionBtnHtml = '';
    if (isMe) {
      actionBtnHtml = `
        <span class="kmp-badge-friend" style="background: #fef3c7; border-color: #fde68a; color: #92400e;">
          <i class="fa-solid fa-circle-user"></i> ඔබගේ Profile එක
        </span>
      `;
    } else if (pendingReq) {
      actionBtnHtml = `
        <button type="button" class="kmp-btn-action-primary" style="background: linear-gradient(135deg, #10b981, #059669);" onclick="event.stopPropagation(); handleAcceptKmpRequest('${pendingReq.id}', '${m.uid}', '${Security.escapeHTML(m.name)}')">
          <i class="fa-solid fa-circle-check"></i> පිළිගන්න
        </button>
        <button type="button" class="kmp-btn-view-profile" onclick="event.stopPropagation(); handleRejectKmpRequest('${pendingReq.id}', '${m.uid}')" title="ඉවත් කරන්න">
          <i class="fa-solid fa-xmark"></i>
        </button>
      `;
    } else if (isMemberSangha) {
      const isRevered = StorageService.isReveringSangha(m.uid);
      actionBtnHtml = isRevered
        ? `<button type="button" class="kmp-btn-action-primary" style="background: #fef3c7; color: #92400e; border: 1px solid #fde68a;" onclick="event.stopPropagation(); handleToggleSanghaReverence('${m.uid}', '${Security.escapeHTML(m.name)}')"><i class="fa-solid fa-hands-praying"></i> නමස්කාර කර ඇත 🙏</button>`
        : `<button type="button" class="kmp-btn-action-primary" style="background: linear-gradient(135deg, #d97706, #b45309);" onclick="event.stopPropagation(); handleToggleSanghaReverence('${m.uid}', '${Security.escapeHTML(m.name)}')"><i class="fa-solid fa-hands-praying"></i> නමස්කාර කරමි 🙏</button>`;
    } else if (isFriend) {
      actionBtnHtml = `<span class="kmp-badge-friend"><i class="fa-solid fa-circle-check"></i> කල්‍යාණ මිතුරෙකි</span>`;
    } else if (isSent) {
      actionBtnHtml = `<span class="kmp-badge-friend" style="background: #fffbeb; color: #b45309; border-color: #fde68a;"><i class="fa-solid fa-clock"></i> ඇරයුමක් යවා ඇත</span>`;
    } else {
      actionBtnHtml = `
        <button type="button" class="kmp-btn-action-primary" onclick="event.stopPropagation(); handleSendKmpRequest('${m.uid}', '${Security.escapeHTML(m.name)}')">
          <i class="fa-solid fa-user-plus"></i> මිතුරු වන්න
        </button>
      `;
    }

    return `
      <div class="kmp-card" onclick="openMemberProfileModal('${m.uid}', '${Security.escapeHTML(m.name)}')">
        <div class="kmp-card-top">
          <div class="kmp-avatar-wrap ${isMemberSangha ? 'kmp-sangha-avatar' : ''}">
            ${m.photo ? `<img src="${Security.sanitizeUrl(m.photo)}" alt="${Security.escapeHTML(m.name)}" class="kmp-avatar-img" onerror="this.parentElement.innerHTML = '<div class=\\'kmp-avatar-initial\\'>${initial}</div>';">` : `<div class="kmp-avatar-initial">${initial}</div>`}
            ${m.isOnline ? `<span class="kmp-online-dot" title="දැන් සජීවීව Online"></span>` : ''}
            ${isMemberSangha ? '<img src="assets/sangha-frame.png" class="sangha-vatapatha-frame" alt="වටාපත">' : ''}
          </div>
          <div class="kmp-card-meta">
            <div class="kmp-name-row">
              <span class="kmp-member-name">${Security.escapeHTML(m.name || 'කල්‍යාණ මිත්‍ර')}</span>
              ${isMemberMaster ? `<span class="badge-crown" title="Master Admin">👑</span>` : (isMemberSubAdmin ? `<span class="badge-shield" title="පරිපාලක (Admin)">🛡️</span>` : '')}
              ${isMemberSangha ? `<span class="sangha-author-badge" style="margin-left: 3px; padding: 1px 6px; font-size: 0.6rem;"><i class="fa-solid fa-dharmachakra"></i> පූජනීය සංඝරත්නය</span>` : ''}
            </div>
            ${m.isOnline
              ? `<div class="kmp-presence-tag"><span class="kmp-pulse-dot-mini"></span> <span>දැන් Online</span></div>`
              : `<div class="kmp-presence-tag offline"><i class="fa-solid fa-clock-rotate-left"></i> <span>ක්‍රියාකාරී විය</span></div>`
            }
            ${m.location ? `<div class="kmp-location-text"><i class="fa-solid fa-location-dot" style="color: #ea580c;"></i> <span>${Security.escapeHTML(m.location)}</span></div>` : ''}
          </div>
        </div>

        ${m.bio ? `<p class="kmp-card-bio">${Security.escapeHTML(m.bio)}</p>` : ''}

        <div class="kmp-card-stats">
          <span title="පින්කම් සටහන්"><i class="fa-solid fa-dharmachakra" style="color: #d97706;"></i> පින්කම්: <strong>${m.postsCount || 0}</strong></span>
          <span title="ලද සාදුකාර"><i class="fa-solid fa-hands-praying" style="color: #ea580c;"></i> සාදු: <strong>${m.totalSadhu || 0}</strong></span>
          <span title="මිතුරන්"><i class="fa-solid fa-user-group" style="color: #059669;"></i> මිතුරන්: <strong>${m.mithrayanCount || 0}</strong></span>
        </div>

        <div class="kmp-card-actions" onclick="event.stopPropagation()">
          ${actionBtnHtml}
          <button type="button" class="kmp-btn-view-profile" onclick="openMemberProfileModal('${m.uid}', '${Security.escapeHTML(m.name)}')" title="සම්පූර්ණ පැතිකඩ (Profile) බලන්න">
            <i class="fa-solid fa-user"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
};

window.handleSendKmpRequest = async function(targetUid, targetName) {
  await handleSendMithra(targetUid, targetName);
  renderKmpDirectoryView(true);
};

window.handleAcceptKmpRequest = async function(notifId, senderUid, senderName) {
  await handleAcceptMithra(notifId, senderUid, senderName);
  renderKmpDirectoryView(true);
};

window.handleRejectKmpRequest = async function(notifId, senderUid) {
  await handleRejectMithra(notifId, senderUid);
  renderKmpDirectoryView(true);
};

// ============================================================================
// Kalyana Mithra (Buddhist Spiritual Friendship) Controller
// ============================================================================

window.handleToggleSanghaReverence = async function(targetUid, targetName) {
  if (isGuestUser()) {
    showAuthRequiredModal('ස්වාමීන් වහන්සේට වන්දනාමාන කිරීමට හෝ අනුගමනය කිරීමට');
    return;
  }
  if (!targetUid) return;

  try {
    triggerHaptic('success');
    SoundService.play('sadhu');
  } catch (e) {}

  try {
    const isNowFollowing = await StorageService.toggleSanghaReverence(targetUid, targetName);
    alert(isNowFollowing 
      ? `සාදු! සාදු! ${targetName || 'පූජනීය ස්වාමීන් වහන්සේ'} වෙත ඔබගේ වන්දනාමාන ගෞරවය සටහන් විය. 🙏`
      : `වන්දනාමාන සටහන ඉවත් කරන ලදී.`
    );

    const memModal = document.getElementById('memberProfileModal');
    if (memModal && !memModal.classList.contains('hidden')) {
      await openMemberProfileModal(targetUid, targetName);
    }
    if (activeTab === 'profile') {
      renderProfileView();
    }
    updateUserInfoUI();
  } catch (err) {
    console.error('Failed to toggle Sangha reverence:', err);
    alert(err.message || 'වන්දනාමාන සටහන සිදුකිරීමට නොහැකි විය.');
  }
};

window.handleToggleAdminSanghaVerification = async function(targetUid, newStatus) {
  if (!StorageService.isMasterAdmin()) {
    alert("මෙම පහසුකම භාවිතා කළ හැක්කේ Master Admin හට පමණි.");
    return;
  }
  const promptText = newStatus 
    ? "මෙම සාමාජික ගිණුම 'පූජනීය මහා සංඝරත්නය' ලෙස සත්‍යාපනය කිරීමට අවශ්‍යද?"
    : "මෙම සාමාජික ගිණුමේ 'පූජනීය සංඝරත්නය' තත්ත්වය ඉවත් කිරීමට අවශ්‍යද?";
  if (!confirm(promptText)) return;

  try {
    await StorageService.setMemberSanghaStatus(targetUid, newStatus);
    allCommunityMembersCache = [];
    renderCommunityDirectory();
    renderFeed();
    alert("සාර්ථකයි! සංඝ සත්‍යාපන තත්ත්වය යාවත්කාලීන කරන ලදී. 🙏");
    const memModal = document.getElementById('memberProfileModal');
    if (memModal && !memModal.classList.contains('hidden')) {
      await openMemberProfileModal(targetUid);
    }
  } catch (e) {
    alert(e.message || "දෝෂයක් සිදුවිය.");
  }
};

window.handleToggleUserAdminStatus = async function(targetUid, setAsAdmin) {
  if (!StorageService.isMasterAdmin()) {
    alert("මෙම පහසුකම භාවිතා කළ හැක්කේ Master Admin හට පමණි.");
    return;
  }
  const promptText = setAsAdmin 
    ? "මෙම සාමාජිකයාව 'පිං පොත පරිපාලක (🛡️ Admin)' කෙනෙකු ලෙස පත් කිරීමට අවශ්‍යද?"
    : "මෙම සාමාජිකයාගේ '🛡️ Admin' තනතුර ඉවත් කිරීමට අවශ්‍යද?";
  if (!confirm(promptText)) return;

  try {
    await StorageService.setMemberAdminStatus(targetUid, setAsAdmin);
    SoundService.playSadhu();
    triggerHaptic([30, 60, 30]);
    alert(setAsAdmin ? "🎉 සාදු! සාමාජිකයාව සාර්ථකව පිං පොත පරිපාලක (🛡️ Admin) ලෙස පත් කරන ලදී!" : "සාමාජිකයාගේ Admin තනතුර ඉවත් කරන ලදී.");
    const memModal = document.getElementById('memberProfileModal');
    if (memModal && !memModal.classList.contains('hidden')) {
      await openMemberProfileModal(targetUid);
    }
    renderFeed();
  } catch (e) {
    alert(e.message || "දෝෂයක් සිදුවිය.");
  }
};

window.handleSendMithra = async function(targetUid, targetName) {
  if (isGuestUser()) {
    showAuthRequiredModal('කල්‍යාණ මිත්‍ර ඇරයුමක් යැවීමට');
    return;
  }
  if (!targetUid) return;

  try {
    triggerHaptic('light');
    SoundService.play('button');
  } catch (e) {}

  try {
    await StorageService.sendKalyanaMithraRequest(targetUid, targetName);
    alert(`සාදු! ${targetName || 'මෙම කල්‍යාණ මිත්‍රයා'} වෙත ඔබගේ කල්‍යාණ මිත්‍ර ඇරයුම සාර්ථකව යවන ලදී. 🙏`);

    // Refresh member modal if open
    const memModal = document.getElementById('memberProfileModal');
    if (memModal && !memModal.classList.contains('hidden')) {
      await openMemberProfileModal(targetUid, targetName);
    }
    // Refresh profile if currently viewing
    if (activeTab === 'profile') {
      renderProfileView();
    }
    if (activeTab === 'friends') {
      renderKmpDirectoryView(true);
    }
    updateUserInfoUI();
  } catch (err) {
    console.error('Failed to send Kalyana Mithra request:', err);
    alert(err.message || 'ඇරයුම යැවීමට නොහැකි විය.');
  }
};
window.sendKalyanaMithraRequest = window.handleSendMithra;

window.handleAcceptMithra = async function(notifId, senderUid, senderName) {
  if (isGuestUser()) {
    showAuthRequiredModal('කල්‍යාණ මිත්‍ර ඇරයුමක් පිළිගැනීමට');
    return;
  }
  if (!senderUid) return;

  try {
    triggerHaptic('success');
    SoundService.play('sadhu');
  } catch (e) {}

  // Mark immediately in local state
  StorageService.recordAcceptedRequest(notifId, senderUid);
  if (StorageService.currentUser) {
    if (!Array.isArray(StorageService.currentUser.mithrayan)) StorageService.currentUser.mithrayan = [];
    if (!StorageService.currentUser.mithrayan.includes(senderUid)) {
      StorageService.currentUser.mithrayan.push(senderUid);
    }
  }

  // Instant re-render of notification list so buttons vanish with 0 latency
  if (window.renderNotificationsList) window.renderNotificationsList();
  updateUserInfoUI();

  try {
    await StorageService.acceptKalyanaMithraRequest(notifId, senderUid, senderName);
    alert(`සාදු! සාදු! ඔබගේ කල්‍යාණ මිතුරු පවුරට ${senderName || 'මෙම කල්‍යාණ මිත්‍රයා'} සාදරයෙන් එක් විය! 🙏🪷`);

    // Re-render notifications dropdown
    if (window.renderNotificationsList) window.renderNotificationsList();

    // Re-render member modal if open
    const memModal = document.getElementById('memberProfileModal');
    if (memModal && !memModal.classList.contains('hidden')) {
      await openMemberProfileModal(senderUid, senderName);
    }

    // Re-render profile friends subtab if active
    if (activeTab === 'profile') {
      renderProfileView();
    }
    if (activeTab === 'friends') {
      renderKmpDirectoryView(true);
    }
    updateUserInfoUI();
  } catch (err) {
    console.error('Failed to accept Kalyana Mithra request:', err);
    alert(err.message || 'ඇරයුම පිළිගැනීමට නොහැකි විය.');
  }
};
window.acceptKalyanaMithraRequest = window.handleAcceptMithra;

window.handleRejectMithra = async function(notifId, senderUid, senderName) {
  // Mark immediately in local state
  StorageService.recordDeclinedRequest(notifId, senderUid);

  // Instant re-render so buttons vanish with 0 latency
  if (window.renderNotificationsList) window.renderNotificationsList();
  updateUserInfoUI();

  try {
    await StorageService.rejectKalyanaMithraRequest(notifId, senderUid);
    alert('ඇරයුම ඉවත් කරන ලදී.');

    // Re-render notifications dropdown
    if (window.renderNotificationsList) window.renderNotificationsList();

    // Re-render member modal if open
    const memModal = document.getElementById('memberProfileModal');
    if (memModal && !memModal.classList.contains('hidden')) {
      await openMemberProfileModal(senderUid);
    }

    // Re-render profile friends subtab if active
    if (activeTab === 'profile') {
      renderProfileView();
    }
    if (activeTab === 'friends') {
      renderKmpDirectoryView(true);
    }
    updateUserInfoUI();
  } catch (err) {
    console.warn('Reject mithra note:', err);
  }
};
window.rejectKalyanaMithraRequest = window.handleRejectMithra;

window.handleRemoveMithra = async function(targetUid) {
  if (!targetUid) return;
  const isConfirm = confirm('මෙම කල්‍යාණ මිතුරු සබඳතාව ඉවත් කිරීමට ඔබට සහතිකද?');
  if (!isConfirm) return;

  try {
    await StorageService.removeKalyanaMithra(targetUid);
    alert('කල්‍යාණ මිතුරු සබඳතාව සාර්ථකව ඉවත් කරන ලදී.');

    // Re-render member modal if open
    const memModal = document.getElementById('memberProfileModal');
    if (memModal && !memModal.classList.contains('hidden')) {
      await openMemberProfileModal(targetUid);
    }

    // Re-render profile friends subtab if active
    if (activeTab === 'profile') {
      renderProfileView();
    }
    if (activeTab === 'friends') {
      renderKmpDirectoryView(true);
    }
    updateUserInfoUI();
  } catch (err) {
    console.error('Remove mithra failed:', err);
    alert('ඉවත් කිරීමට නොහැකි විය: ' + err.message);
  }
};
window.removeKalyanaMithra = window.handleRemoveMithra;

// ============================================================================
// Settings & Policy System Controller
// ============================================================================

window.openSettingsModal = function(initialTab = 'profile') {
  try {
    history.pushState({ type: 'modal', id: 'settingsModal' }, '');
  } catch (e) {}
  const modal = document.getElementById('settingsModal');
  const user = StorageService.currentUser;
  if (!modal) return;

  // Pre-fill profile settings fields
  const firstInput = document.getElementById('setFirstNameInput');
  const lastInput = document.getElementById('setLastNameInput');
  const occInput = document.getElementById('setOccupationInput');
  const bioInput = document.getElementById('setBioInput');

  if (firstInput) firstInput.value = user.firstName || '';
  if (lastInput) lastInput.value = user.lastName || '';
  if (occInput) occInput.value = user.occupation || '';
  if (bioInput) bioInput.value = user.bio || '';

  // Pre-fill Province and District dropdowns
  const { district: setDist, province: setProv, city: setCity } = resolveUserLocationFields(user);
  const setProvSelect = document.getElementById('setProvinceSelect');
  const setCityInp = document.getElementById('setCityInput');
  if (setProvSelect) setProvSelect.value = setProv;
  populateDistrictSelect('set', setDist, setProv);
  if (setCityInp) setCityInp.value = setCity;

  switchSettingsTab(initialTab);
  modal.classList.remove('hidden');
};

window.closeSettingsModal = function() {
  const modal = document.getElementById('settingsModal');
  if (modal) modal.classList.add('hidden');
};

window.switchSettingsTab = function(tabName) {
  ['profile', 'privacy', 'terms', 'about', 'admin'].forEach(t => {
    const btn = document.getElementById(`set-tab-${t}`);
    const panel = document.getElementById(`settingsContent${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (btn) {
      if (t === tabName) btn.classList.add('active');
      else btn.classList.remove('active');
    }
    if (panel) {
      if (t === tabName) panel.classList.remove('hidden');
      else panel.classList.add('hidden');
    }
  });

  if (tabName === 'admin') {
    renderAdminDashboard();
  }
};

window.saveSettingsProfile = async function(e) {
  if (e) e.preventDefault();
  const firstName = document.getElementById('setFirstNameInput')?.value || '';
  const lastName = document.getElementById('setLastNameInput')?.value || '';
  const occupation = document.getElementById('setOccupationInput')?.value || '';
  const province = document.getElementById('setProvinceSelect')?.value || '';
  const district = document.getElementById('setDistrictSelect')?.value || '';
  const city = (document.getElementById('setCityInput')?.value || '').trim();
  const bio = document.getElementById('setBioInput')?.value || '';

  let location = '';
  if (city && district) {
    location = `${city}, ${district}`;
  } else if (district && province) {
    location = `${district}, ${province}`;
  } else if (district) {
    location = district;
  } else if (province) {
    location = province;
  } else if (city) {
    location = city;
  }

  await StorageService.updateProfile({ firstName, lastName, occupation, location, district, province, city, bio });
  updateUserInfoUI();
  if (activeTab === 'profile') renderProfileView();
  renderFeed();
  closeSettingsModal();
  alert("ඔබගේ ප්‍රොෆයිල් තොරතුරු සාර්ථකව යාවත්කාලීන විය! 🙏");
};

window.resetHiddenPostsCache = function() {
  if (confirm("ඔබ මීට පෙර මෙම දුරකථනයෙන් මකා දැමූ (Delete කළ) හෝ සැඟවුණු සියලු සටහන් නැවත ගෙන්වා ගැනීමට අවශ්‍යද?")) {
    StorageService.restoreDeletedPostsLocally();
    currentPostsData = StorageService.getLocalPosts();
    renderFeed();
    if (activeTab === 'profile') renderProfileView();
    closeSettingsModal();
    alert("සියලුම සටහන් සාර්ථකව නැවත සමමුහුර්ත විය! 🙏");
  }
};

// ============================================================================
// Repost / Re-share System Controller
// ============================================================================

let currentRepostTargetId = null;
let currentRepostTargetPost = null;

window.openRepostModal = function(postId) {
  if (isGuestUser()) {
    showAuthRequiredModal('පින්කම් යළි බෙදා ගැනීමට (Repost)');
    return;
  }

  try {
    history.pushState({ type: 'modal', id: 'repostModal' }, '');
  } catch (e) {}
  currentRepostTargetId = postId;
  const modal = document.getElementById('repostModal');
  const previewBox = document.getElementById('repostPreviewBox');
  const commentInput = document.getElementById('repostCommentInput');
  if (!modal) return;

  let post = currentPostsData.find(p => p.id === postId);
  if (!post) {
    const allPosts = StorageService.getLocalPosts() || [];
    post = allPosts.find(p => p.id === postId);
  }
  if (!post && StorageService._cachedPosts) {
    post = StorageService._cachedPosts.find(p => p.id === postId);
  }
  if (!post) {
    alert("පින්කම සොයාගත නොහැකි විය.");
    return;
  }
  currentRepostTargetPost = post;

  // If this post was already a repost, quote the original merit
  const orig = post.originalPost || post;
  const origImg = orig.image || (orig.images && orig.images[0]) || null;

  const origAuthorName = StorageService.resolveAuthorName(orig) || orig.author || 'කල්‍යාණ මිත්‍ර';
  if (previewBox) {
    previewBox.innerHTML = `
      <div class="quoted-merit-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="quoted-avatar">${Security.escapeHTML(origAuthorName.charAt(0) || 'ක')}</div>
          <div>
            <div style="font-weight: 700; font-size: 0.82rem; color: #78350f;">${Security.escapeHTML(origAuthorName)}</div>
            <div style="font-size: 0.68rem; color: #94a3b8;">${Security.escapeHTML(formatRelativeTimeSinhala(orig.timestamp, orig.date || 'මෑතකදී'))} ${orig.location ? '• ' + Security.escapeHTML(orig.location) : ''}</div>
          </div>
        </div>
        <span class="post-badge category">${Security.escapeHTML(orig.category || 'පින්කම')}</span>
      </div>
      <h4 class="quoted-merit-title">${Security.escapeHTML(orig.title)}</h4>
      <p class="quoted-merit-desc">${Security.escapeHTML(orig.description || '')}</p>
      ${origImg ? `
        <div class="quoted-merit-image">
          <img src="${Security.sanitizeUrl(origImg)}" alt="${Security.escapeHTML(orig.title)}" loading="lazy">
        </div>
      ` : ''}
    `;
  }

  if (commentInput) {
    commentInput.value = '';
  }

  modal.classList.remove('hidden');
};

window.closeRepostModal = function() {
  const modal = document.getElementById('repostModal');
  if (modal) modal.classList.add('hidden');
  currentRepostTargetId = null;
  currentRepostTargetPost = null;
};

window.addRepostChip = function(text) {
  const commentInput = document.getElementById('repostCommentInput');
  if (!commentInput) return;
  if (commentInput.value.trim().length > 0) {
    commentInput.value = commentInput.value.trim() + ' ' + text;
  } else {
    commentInput.value = text;
  }
};

function createFastThumbnail(dataUrl, maxDim = 420, quality = 0.55) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
    return Promise.resolve(dataUrl);
  }
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/webp', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch (e) {
      resolve(dataUrl);
    }
  });
}

window.submitRepost = async function() {
  if (!currentRepostTargetId) return;
  const commentInput = document.getElementById('repostCommentInput');
  const comment = commentInput ? commentInput.value.trim() : '';

  const btn = document.getElementById('btnConfirmRepost');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Repost වෙමින් පවතී...</span>`;
  }

  try {
    let postToPass = currentRepostTargetPost;
    if (postToPass) {
      const orig = postToPass.originalPost || postToPass;
      const rawImg = orig.image || (orig.images && orig.images[0]);
      if (rawImg && typeof rawImg === 'string' && rawImg.startsWith('data:image')) {
        const thumb = await createFastThumbnail(rawImg, 420, 0.55);
        postToPass = {
          ...postToPass,
          image: thumb,
          images: [thumb],
          originalPost: postToPass.originalPost ? {
            ...postToPass.originalPost,
            image: thumb,
            images: [thumb]
          } : undefined
        };
      }
    }

    await StorageService.repostPost(currentRepostTargetId, comment, postToPass);
    SoundService.playRepost();
    triggerHaptic([20, 40, 20]);

    const repostBtnEl = document.getElementById(`reposts-btn-${currentRepostTargetId}`);
    const repostStatEl = document.getElementById(`stat-reposts-${currentRepostTargetId}`);
    if (repostBtnEl) repostBtnEl.innerText = parseInt(repostBtnEl.innerText || '0', 10) + 1;
    if (repostStatEl) repostStatEl.innerText = parseInt(repostStatEl.innerText || '0', 10) + 1;

    closeRepostModal();
    switchTab('feed');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    alert("Repost කිරීමේදී දෝෂයක්: " + (err.message || 'නැවත උත්සාහ කරන්න.'));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-repeat"></i> <span>පවුරට Repost කරන්න</span>`;
    }
  }
};

// ============================================================================
// Master Admin Control Panel & Feature Logic (silvadilan9@gmail.com)
// ============================================================================

function renderGlobalAnnouncementUI(announcement) {
  const banner = document.getElementById('globalAnnouncementBanner');
  if (!banner) return;
  const text = announcement?.text || announcement?.message || '';
  if (announcement && announcement.active && text.trim()) {
    banner.innerHTML = `
      <div class="global-announcement-content">
        <i class="fa-solid fa-bullhorn" style="font-size: 0.95rem; color: #b45309; animation: pulse 2s infinite;"></i>
        <div class="global-announcement-marquee">
          <span>${Security.escapeHTML(text)}</span>
        </div>
      </div>
    `;
    banner.classList.remove('hidden');
    banner.style.display = 'block';
  } else {
    banner.classList.add('hidden');
    banner.style.display = 'none';
  }
}

function renderDailyVerseUI(verse) {
  if (!verse) return;
  const paliEl = document.getElementById('dailyDhammaPali');
  const sinhalaEl = document.getElementById('dailyDhammaSinhala');
  if (paliEl && verse.pali) {
    paliEl.innerText = `"${verse.pali}"`;
  }
  if (sinhalaEl && verse.sinhala) {
    sinhalaEl.innerText = verse.sinhala;
  }
}

function renderPoyaUI(poya) {
  if (!poya) return;
  const mEl = document.getElementById('poyaMonthBadge');
  const dEl = document.getElementById('poyaDayBadge');
  const tEl = document.getElementById('poyaEventTitle');
  const descEl = document.getElementById('poyaEventDesc');
  if (mEl && poya.month) mEl.innerText = poya.month;
  if (dEl && poya.day) dEl.innerText = poya.day;
  if (tEl && poya.title) tEl.innerText = poya.title;
  if (descEl && poya.desc) descEl.innerText = poya.desc;
}

window.renderAdminDashboard = async function() {
  if (!StorageService.isMasterAdmin()) return;

  // 1. Stats calculation
  const totalPosts = currentPostsData.length;
  const totalSadhu = currentPostsData.reduce((acc, p) => acc + (p.sadhuCount || 0), 0);
  const totalNeeds = currentPostsData.filter(p => p.type === 'need').length;
  const totalOfficial = currentPostsData.filter(p => p.isOfficial).length;

  const statPosts = document.getElementById('adminStatPosts');
  const statSadhu = document.getElementById('adminStatSadhu');
  const statNeeds = document.getElementById('adminStatNeeds');
  const statOfficial = document.getElementById('adminStatOfficial');

  if (statPosts) statPosts.innerText = totalPosts;
  if (statSadhu) statSadhu.innerText = totalSadhu;
  if (statNeeds) statNeeds.innerText = totalNeeds;
  if (statOfficial) statOfficial.innerText = totalOfficial;

  // 2. Pre-fill Announcement Form
  const announce = StorageService.getAdminAnnouncement();
  const announceInput = document.getElementById('adminAnnounceInput');
  const announceActive = document.getElementById('adminAnnounceActive');
  if (announceInput && !announceInput.dataset.userEditing) {
    announceInput.value = announce.text || announce.message || '';
  }
  if (announceActive) {
    announceActive.checked = !!announce.active;
  }

  // 3. Pre-fill Daily Verse Form
  const verse = StorageService.getDailyDhammaVerse();
  const versePali = document.getElementById('adminVersePaliInput');
  const verseSinhala = document.getElementById('adminVerseSinhalaInput');
  if (verse && versePali && !versePali.dataset.userEditing) {
    versePali.value = verse.pali || '';
  }
  if (verse && verseSinhala && !verseSinhala.dataset.userEditing) {
    verseSinhala.value = verse.sinhala || '';
  }

  // 3b. Pre-fill Poya Calendar Form
  const poya = StorageService.getPoyaEvent();
  const poyaM = document.getElementById('adminPoyaMonthInput');
  const poyaD = document.getElementById('adminPoyaDayInput');
  const poyaT = document.getElementById('adminPoyaTitleInput');
  const poyaDesc = document.getElementById('adminPoyaDescInput');
  if (poya && poyaM && !poyaM.dataset.userEditing) poyaM.value = poya.month || '';
  if (poya && poyaD && !poyaD.dataset.userEditing) poyaD.value = poya.day || '';
  if (poya && poyaT && !poyaT.dataset.userEditing) poyaT.value = poya.title || '';
  if (poya && poyaDesc && !poyaDesc.dataset.userEditing) poyaDesc.value = poya.desc || '';

  // 3c. Populate Charity Needs Verification List
  const charityList = document.getElementById('adminCharityNeedsList');
  if (charityList) {
    const needs = currentPostsData.filter(p => p.type === 'need');
    if (needs.length === 0) {
      charityList.innerHTML = `<p style="font-size: 0.74rem; color: #94a3b8; text-align: center; padding: 10px;">සත්කාර ඉල්ලීම් තවම පළ කර නොමැත.</p>`;
    } else {
      charityList.innerHTML = needs.map(n => {
        const isVer = !!n.isVerifiedNeed;
        return `
          <div class="admin-charity-item ${isVer ? 'is-verified' : ''}">
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <strong style="font-size: 0.82rem; color: #065f46; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px;">${Security.escapeHTML(n.title)}</strong>
                ${isVer ? '<span class="verified-need-badge"><i class="fa-solid fa-circle-check"></i> සත්‍යාපිතයි</span>' : '<span style="font-size: 0.62rem; color: #d97706; background: #fffbeb; padding: 1px 6px; border-radius: 4px; font-weight: 700;">අසත්‍යාපිතයි</span>'}
              </div>
              <div style="font-size: 0.68rem; color: #64748b; margin-top: 2px;">
                <span>${Security.escapeHTML(StorageService.resolveAuthorName(n) || n.author || 'කල්‍යාණ මිත්‍ර')}</span> • <span>📞 ${Security.escapeHTML(n.contact || 'නැත')}</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
              <button class="post-verify-btn ${isVer ? 'verified' : ''}" onclick="toggleVerifyNeedPrompt('${n.id}')" title="${isVer ? 'සත්‍යාපනය ඉවත් කරන්න' : 'සත්කාරය සත්‍යාපනය කරන්න'}">
                <i class="fa-solid fa-circle-check"></i> ${isVer ? 'සත්‍යාපිතයි' : 'Verify'}
              </button>
              <button class="btn-mod-delete" onclick="deletePostPrompt('${n.id}')" title="මකා දමන්න">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // 3d. Pre-fill Banned Words Form
  const banned = StorageService.getBannedWords();
  const bannedInput = document.getElementById('adminBannedWordsInput');
  const bannedActive = document.getElementById('adminBannedWordsActive');
  if (bannedInput && !bannedInput.dataset.userEditing) {
    bannedInput.value = (banned.words || []).join(', ');
  }
  if (bannedActive) {
    bannedActive.checked = !!banned.active;
  }

  // 4. Populate Moderation List (recent posts)
  const modList = document.getElementById('adminModerationList');
  if (modList) {
    if (currentPostsData.length === 0) {
      modList.innerHTML = `<p style="font-size: 0.74rem; color: #94a3b8; text-align: center; padding: 12px;">පින්කම් සටහන් කිසිවක් නැත.</p>`;
    } else {
      modList.innerHTML = currentPostsData.slice(0, 20).map(p => {
        const isOfficial = !!p.isOfficial;
        const isPinned = !!p.isPinned;
        return `
          <div class="admin-mod-item" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 10px; border-bottom: 1px solid #f1f5f9; background: ${isOfficial ? 'rgba(254, 243, 199, 0.35)' : '#ffffff'}; border-radius: 8px; margin-bottom: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <strong style="font-size: 0.82rem; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">${Security.escapeHTML(p.title || 'මාතෘකාවක් නැත')}</strong>
                ${isOfficial ? '<span style="font-size: 0.62rem; font-weight: 700; background: #fef3c7; color: #92400e; padding: 1px 6px; border-radius: 6px;"><i class="fa-solid fa-crown"></i> නිල</span>' : ''}
                ${isPinned ? '<span style="font-size: 0.62rem; font-weight: 700; background: #e0f2fe; color: #0369a1; padding: 1px 6px; border-radius: 6px;"><i class="fa-solid fa-thumbtack"></i> Pinned</span>' : ''}
                <span style="font-size: 0.65rem; color: #64748b;">(${Security.escapeHTML(p.category || 'පින්කම')})</span>
              </div>
              <div style="font-size: 0.68rem; color: #94a3b8; margin-top: 2px;">
                <span>${isOfficial ? 'අපේ පිං පොත (නිල)' : Security.escapeHTML(StorageService.resolveAuthorName(p) || p.author || 'නොදන්නා')}</span> • <span>${Security.escapeHTML(p.date || 'දැන්')}</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
              <button class="post-pin-btn ${isPinned ? 'pinned' : ''}" onclick="togglePinPrompt('${p.id}')" title="${isPinned ? 'Pin ඉවත් කරන්න' : 'මුදුනටම Pin කරන්න'}" style="padding: 4px 8px; font-size: 0.68rem;">
                <i class="fa-solid fa-thumbtack"></i> ${isPinned ? 'Pinned' : 'Pin'}
              </button>
              <button class="btn-mod-delete" onclick="deletePostPrompt('${p.id}')" title="මකා දමන්න" style="padding: 4px 8px; font-size: 0.68rem; background: #fee2e2; border: 1px solid #fca5a5; color: #dc2626; border-radius: 6px; cursor: pointer; font-weight: 700;">
                <i class="fa-solid fa-trash-can"></i> මකන්න
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
  }
};

window.saveGlobalAnnouncement = async function(e) {
  if (e) e.preventDefault();
  if (!StorageService.isMasterAdmin()) {
    alert("පරිපාලක (Master Admin) අවසරය නොමැත.");
    return;
  }

  const text = (document.getElementById('adminAnnounceInput')?.value || '').trim();
  const active = !!document.getElementById('adminAnnounceActive')?.checked;

  try {
    await StorageService.saveAdminAnnouncement({ text, active });
    alert("විශේෂ නිවේදන තොරතුරු සාර්ථකව සුරකින ලදී! 📢");
  } catch (err) {
    alert("නිවේදනය සුරැකීමේදී දෝෂයක්: " + err.message);
  }
};

window.saveDhammaVerse = async function(e) {
  if (e) e.preventDefault();
  if (!StorageService.isMasterAdmin()) {
    alert("පරිපාලක (Master Admin) අවසරය නොමැත.");
    return;
  }

  const pali = (document.getElementById('adminVersePaliInput')?.value || '').trim();
  const sinhala = (document.getElementById('adminVerseSinhalaInput')?.value || '').trim();

  try {
    await StorageService.saveDailyDhammaVerse({ pali, sinhala });
    alert("දවසේ ධර්ම පදය සාර්ථකව යාවත්කාලීන විය! 🌸");
  } catch (err) {
    alert("ධර්ම පදය සුරැකීමේදී දෝෂයක්: " + err.message);
  }
};

window.togglePinPrompt = async function(postId) {
  if (!StorageService.isMasterAdmin()) {
    alert("පරිපාලක (Master Admin) අවසරය නොමැත.");
    return;
  }

  try {
    await StorageService.togglePinPost(postId);
    renderFeed();
    renderAdminDashboard();
  } catch (err) {
    alert("Pin තත්වය වෙනස් කිරීමේදී දෝෂයක්: " + err.message);
  }
};

window.toggleSimulateMasterAdmin = function() {
  console.info('[Security] Developer simulation is permanently disabled in production release.');
};

window.savePoyaCalendar = async function(e) {
  if (e) e.preventDefault();
  if (!StorageService.isMasterAdmin()) {
    alert("පරිපාලක (Master Admin) අවසරය නොමැත.");
    return;
  }

  const month = (document.getElementById('adminPoyaMonthInput')?.value || '').trim();
  const day = (document.getElementById('adminPoyaDayInput')?.value || '').trim();
  const title = (document.getElementById('adminPoyaTitleInput')?.value || '').trim();
  const desc = (document.getElementById('adminPoyaDescInput')?.value || '').trim();

  try {
    await StorageService.savePoyaEvent({ month, day, title, desc });
    alert("පුණ්‍ය දින දර්ශනය සාර්ථකව යාවත්කාලීන විය! 🌕");
  } catch (err) {
    alert("දෝෂයක්: " + err.message);
  }
};

window.saveBannedWordsConfig = async function(e) {
  if (e) e.preventDefault();
  if (!StorageService.isMasterAdmin()) {
    alert("පරිපාලක (Master Admin) අවසරය නොමැත.");
    return;
  }

  const rawWords = (document.getElementById('adminBannedWordsInput')?.value || '').trim();
  const active = !!document.getElementById('adminBannedWordsActive')?.checked;

  try {
    await StorageService.saveBannedWords({ words: rawWords, active });
    alert("තහනම් සහ Spam වචන පෙරහන සාර්ථකව සුරකින ලදී! 🛡️");
  } catch (err) {
    alert("දෝෂයක්: " + err.message);
  }
};

window.toggleVerifyNeedPrompt = async function(postId) {
  if (!StorageService.isMasterAdmin()) {
    alert("පරිපාලක (Master Admin) අවසරය නොමැත.");
    return;
  }

  try {
    const newStatus = await StorageService.toggleVerifyNeed(postId);
    renderFeed();
    renderAdminDashboard();
    alert(newStatus ? "සත්කාර ඉල්ලීම සාර්ථකව සත්‍යාපනය (Verified) කරන ලදී! ✅" : "සත්කාර ඉල්ලීමේ සත්‍යාපනය ඉවත් කරන ලදී.");
  } catch (err) {
    alert("දෝෂයක්: " + err.message);
  }
};




// ============================================================================
// Daily Merit Checklist & Spiritual Challenges System (පෞද්ගලික පිං පොත)
// ============================================================================

const DAILY_CHECKLIST_ITEMS = [
  { icon: 'fa-hands-praying', title: 'නිත්‍ය සීලය සමාදන් වීම (පන්සිල්)', category: 'සීලමය', hint: 'දවස ආරම්භයේදී තෙරුවන් වැඳ පන්සිල් සමාදන් වීම' },
  { icon: 'fa-fan', title: 'බුද්ධ පූජාව (මල්, පහන්, සුවඳ දුම් හෝ පැන්)', category: 'සීලමය', hint: 'බුදුරජාණන් වහන්සේ උදෙසා ගෞරවයෙන් පූජාවක් තැබීම' },
  { icon: 'fa-dove', title: 'තිරිසන් සතුන්ට ආහාර / පැන් ලබා දීම', category: 'දානමය', hint: 'කුරුල්ලන්ට, සුනඛයන්ට හෝ තිරිසන් සතෙකුට කරුණාවෙන් ආහාර දීම' },
  { icon: 'fa-person-cane', title: 'දෙමාපියන් / වැඩිහිටියන්ට සැලකීම & ගරු කිරීම', category: 'සීලමය', hint: 'දෙමාපියන්ට හෝ වැඩිහිටියෙකුට වචනයෙන් හෝ ක්‍රියාවෙන් උපස්ථාන කිරීම' },
  { icon: 'fa-spa', title: 'මෛත්‍රී භාවනාව / සිත සන්සුන් කිරීම (විනාඩි 15)', category: 'භාවනාමය', hint: 'සියලු සත්වයෝ නිදුක් වෙත්වායි මෙත් සිත පැතිරවීම' },
  { icon: 'fa-book-open-reader', title: 'දහම් කරුණක් කියවීම හෝ පිරිත් ශ්‍රවණය', category: 'භාවනාමය', hint: 'ධර්ම දේශනාවක්, සූත්‍රයක් හෝ පිරිතක් ශ්‍රවණය කර මනස පහදවා ගැනීම' },
  { icon: 'fa-hand-holding-heart', title: 'යමෙකුට පිහිට වීම / සත්කාරයක් කිරීම', category: 'සමාජ සත්කාර', hint: 'අසරණ කෙනෙකුට උපකාරයක් හෝ කරුණාවන්ත වචනයක් පැවසීම' }
];

const SPIRITUAL_CHALLENGES = [
  {
    id: 'metta_21',
    title: 'දින 21ක මෛත්‍රී භාවනා අධිෂ්ඨානය',
    goalDays: 21,
    icon: 'fa-spa',
    badgeText: '🌟 මෛත්‍රී පාරමී',
    badgeClass: 'purple',
    desc: 'දිනපතා අවම වශයෙන් විනාඩි 15ක් සිත සමාධිගත කර මෙත් වඩන්න.'
  },
  {
    id: 'truth_7',
    title: 'දින 7ක සත්‍යවාදී බව (මුසාවාදයෙන් වැළකීම)',
    goalDays: 7,
    icon: 'fa-gem',
    badgeText: '💎 සච්ච පාරමී',
    badgeClass: 'blue',
    desc: 'දින 7ක් පුරා කිසිදු බොරුවක් නොකියා සත්‍යවාදී වචන පමණක් කතා කරන්න.'
  },
  {
    id: 'animal_14',
    title: 'දින 14ක අභයදාන / සත්ව කරුණාව',
    goalDays: 14,
    icon: 'fa-dove',
    badgeText: '🐾 අභයදාන පාරමී',
    badgeClass: 'emerald',
    desc: 'දින 14ක් නොකඩවා අහිංසක සතුන්ට, පක්ෂීන්ට ආහාර හෝ ජලය පරිත්‍යාග කරන්න.'
  },
  {
    id: 'pooja_30',
    title: 'දින 30ක අඛණ්ඩ බුද්ධ වන්දනාව',
    goalDays: 30,
    icon: 'fa-dharmachakra',
    badgeText: '🪷 සද්ධා පාරමී',
    badgeClass: 'gold',
    desc: 'දින 30ක් අඛණ්ඩව උදෑසන හෝ සවස මල්, පහන්, පැන් පූජා කර තෙරුවන් වඳින්න.'
  }
];

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

window.renderDailyChecklist = function() {
  const container = document.getElementById('dailyChecklistContainer');
  if (!container) return;

  const todayKey = getTodayKey();
  const dateBadge = document.getElementById('dailyChecklistDateBadge');
  if (dateBadge) {
    const d = new Date();
    dateBadge.innerText = `📅 ${d.getFullYear()} ${d.toLocaleString('si-LK', { month: 'short' })} ${d.getDate()}`;
  }

  let saved = [];
  try {
    const raw = localStorage.getItem(`pinPotha_checklist_${todayKey}`);
    saved = raw ? JSON.parse(raw) : [];
  } catch (e) {
    saved = [];
  }

  const checkedCount = saved.filter(Boolean).length;
  const total = DAILY_CHECKLIST_ITEMS.length;
  const pct = Math.round((checkedCount / total) * 100);

  const progText = document.getElementById('checklistProgressText');
  const progBar = document.getElementById('checklistProgressBar');
  if (progText) progText.innerText = `${checkedCount} / ${total} සම්පූර්ණයි (${pct}%)`;
  if (progBar) progBar.style.width = `${pct}%`;

  container.innerHTML = DAILY_CHECKLIST_ITEMS.map((item, idx) => {
    const isChecked = !!saved[idx];
    return `
      <div class="checklist-item-card ${isChecked ? 'checked' : ''}" onclick="toggleChecklistItem(${idx})">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="checklist-checkbox-box">
            ${isChecked ? '<i class="fa-solid fa-check"></i>' : ''}
          </div>
          <div>
            <div class="checklist-title" style="font-size: 0.84rem; font-weight: 700; color: #1e293b;">
              <i class="fa-solid ${item.icon}" style="color: #d97706; margin-right: 6px;"></i>
              ${item.title}
            </div>
            <div style="font-size: 0.7rem; color: #64748b; margin-top: 2px;">
              ${item.hint}
            </div>
          </div>
        </div>
        <span style="font-size: 0.68rem; font-weight: 700; color: #b45309; background: #fef3c7; padding: 2px 8px; border-radius: 999px;">
          ${item.category}
        </span>
      </div>
    `;
  }).join('');
};

window.toggleChecklistItem = function(index) {
  const todayKey = getTodayKey();
  let saved = [];
  try {
    const raw = localStorage.getItem(`pinPotha_checklist_${todayKey}`);
    saved = raw ? JSON.parse(raw) : [];
  } catch (e) {
    saved = [];
  }

  saved[index] = !saved[index];
  localStorage.setItem(`pinPotha_checklist_${todayKey}`, JSON.stringify(saved));
  
  if (saved[index]) {
    SoundService.playClick();
    triggerHaptic(18);
  } else {
    triggerHaptic(10);
  }

  renderDailyChecklist();
};

window.resetTodayChecklist = function() {
  if (confirm("අද දවසේ Checklist එක නැවත මුල සිට සකස් කිරීමට අවශ්‍ය බව තහවුරු කරන්න?")) {
    const todayKey = getTodayKey();
    localStorage.removeItem(`pinPotha_checklist_${todayKey}`);
    triggerHaptic(20);
    renderDailyChecklist();
  }
};

window.autoLogDailyChecklist = async function() {
  const todayKey = getTodayKey();
  let saved = [];
  try {
    const raw = localStorage.getItem(`pinPotha_checklist_${todayKey}`);
    saved = raw ? JSON.parse(raw) : [];
  } catch (e) {
    saved = [];
  }

  const completedIndices = saved.map((val, idx) => val ? idx : null).filter(i => i !== null);
  if (completedIndices.length === 0) {
    alert("කරුණාකර අද දවසේ ඔබ සිදුකළ පින්කම් අවම වශයෙන් එකක් හෝ තෝරා (Check කර) Auto-Log කරන්න.");
    return;
  }

  const completedItems = completedIndices.map(i => DAILY_CHECKLIST_ITEMS[i]);
  const btn = document.getElementById('btnAutoLogChecklist');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Auto-Log වෙමින් පවතී...`;
  }

  try {
    const d = new Date();
    const dateFormatted = `${d.getFullYear()} ${d.toLocaleString('si-LK', { month: 'long' })} ${d.getDate()}`;
    const desc = `🌸 අද දින (${dateFormatted}) මම සම්පූර්ණ කළ දෛනික කුසල්:\n\n` + 
      completedItems.map(item => `✅ ${item.title}`).join('\n') + 
      `\n\n🙏 මෙම උතුම් කුසල් මගේ සසර දුක් නිවීම පිණිසත්, සියලු සත්වයන්ගේ සුවපත්භාවය පිණිසත් හේතු වේවා!`;

    await StorageService.createPost({
      type: 'merit',
      title: `🌸 දෛනික කුසල් සටහන (${dateFormatted})`,
      category: 'සීලමය',
      visibility: 'private',
      description: desc,
      image: null,
      images: []
    });

    SoundService.playSadhu();
    triggerHaptic([25, 50, 25]);
    alert("🎉 සාදු! සාදු! අද දවසේ සිදුකළ පින්කම් එකතුව ඔබගේ පෞද්ගලික පිං පොතට සාර්ථකව ඇතුළත් විය!");
    
    // Refresh private view
    setProfileSubTab('private');
  } catch (err) {
    alert("දෝෂයකි: " + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-book-bookmark"></i> <span>මගේ පිං පොතට Auto-Log කරන්න</span>`;
    }
  }
};

// Spiritual Challenges Controller
window.renderSpiritualChallenges = function() {
  const container = document.getElementById('spiritualChallengesContainer');
  if (!container) return;

  let activeChallenges = {};
  try {
    const raw = localStorage.getItem('pinPotha_active_challenges');
    activeChallenges = raw ? JSON.parse(raw) : {};
  } catch (e) {
    activeChallenges = {};
  }

  const todayKey = getTodayKey();

  container.innerHTML = SPIRITUAL_CHALLENGES.map(ch => {
    const state = activeChallenges[ch.id] || { started: false, streak: 0, lastCheckIn: null, completed: false };
    const pct = Math.min(100, Math.round((state.streak / ch.goalDays) * 100));
    const isCheckedInToday = state.lastCheckIn === todayKey;

    return `
      <div class="challenge-card ${state.completed ? 'completed' : (state.started ? 'active' : '')}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 38px; height: 38px; border-radius: 10px; background: ${state.completed ? '#dcfce7' : '#f3e8ff'}; color: ${state.completed ? '#15803d' : '#7e22ce'}; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;">
              <i class="fa-solid ${ch.icon}"></i>
            </div>
            <div>
              <h4 style="margin: 0; font-size: 0.88rem; font-weight: 700; color: #1e293b;">${ch.title}</h4>
              <p style="margin: 3px 0 0 0; font-size: 0.72rem; color: #64748b;">${ch.desc}</p>
            </div>
          </div>
          <span style="font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: #f1f5f9; color: #475569; white-space: nowrap;">
            ${ch.badgeText}
          </span>
        </div>

        ${state.started ? `
          <div style="margin-top: 4px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.72rem; font-weight: 700; color: #475569; margin-bottom: 4px;">
              <span>ප්‍රගතිය (Daily Streak)</span>
              <span>${state.streak} / ${ch.goalDays} දින (${pct}%)</span>
            </div>
            <div style="width: 100%; height: 7px; background: #e2e8f0; border-radius: 999px; overflow: hidden;">
              <div style="width: ${pct}%; height: 100%; background: ${state.completed ? '#10b981' : 'linear-gradient(90deg, #8b5cf6, #ec4899)'}; border-radius: 999px; transition: width 0.3s ease;"></div>
            </div>
          </div>
        ` : ''}

        <div style="display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin-top: 2px;">
          ${!state.started ? `
            <button type="button" onclick="startSpiritualChallenge('${ch.id}')" class="btn btn-primary" style="padding: 6px 14px; font-size: 0.75rem; border-radius: 8px; background: #7c3aed; border-color: #7c3aed;">
              <i class="fa-solid fa-play"></i> අධිෂ්ඨානය අරඹන්න
            </button>
          ` : (state.completed ? `
            <span style="font-size: 0.78rem; font-weight: 700; color: #15803d; display: inline-flex; align-items: center; gap: 5px;">
              <i class="fa-solid fa-circle-check"></i> අධිෂ්ඨානය සම්පූර්ණයි! 🎉
            </span>
          ` : `
            <button type="button" onclick="checkInSpiritualChallenge('${ch.id}')" class="btn btn-primary" ${isCheckedInToday ? 'disabled' : ''} style="padding: 6px 14px; font-size: 0.75rem; border-radius: 8px; ${isCheckedInToday ? 'background: #94a3b8; border-color: #94a3b8; opacity: 0.8;' : 'background: #059669; border-color: #059669;'}">
              <i class="fa-solid ${isCheckedInToday ? 'fa-check-double' : 'fa-circle-check'}"></i> 
              <span>${isCheckedInToday ? 'අද දින Check-in සම්පූර්ණයි' : 'අද දවස සම්පූර්ණ කළා'}</span>
            </button>
          `)}
        </div>
      </div>
    `;
  }).join('');
};

window.startSpiritualChallenge = function(challengeId) {
  let active = {};
  try {
    active = JSON.parse(localStorage.getItem('pinPotha_active_challenges') || '{}');
  } catch (e) {}

  active[challengeId] = {
    started: true,
    streak: 0,
    lastCheckIn: null,
    completed: false,
    startedAt: Date.now()
  };

  localStorage.setItem('pinPotha_active_challenges', JSON.stringify(active));
  SoundService.playShare();
  triggerHaptic(25);
  renderSpiritualChallenges();
};

window.checkInSpiritualChallenge = async function(challengeId) {
  let active = {};
  try {
    active = JSON.parse(localStorage.getItem('pinPotha_active_challenges') || '{}');
  } catch (e) {}

  const chMeta = SPIRITUAL_CHALLENGES.find(c => c.id === challengeId);
  if (!chMeta) return;

  const state = active[challengeId] || { started: true, streak: 0, lastCheckIn: null, completed: false };
  const todayKey = getTodayKey();

  if (state.lastCheckIn === todayKey) {
    alert("ඔබ අද දින සඳහා දැනටමත් Check-in සම්පූර්ණ කර ඇත. හෙට දවසේද අඛණ්ඩව කරගෙන යන්න!");
    return;
  }

  state.streak = (state.streak || 0) + 1;
  state.lastCheckIn = todayKey;

  // Check if goal reached!
  if (state.streak >= chMeta.goalDays) {
    state.completed = true;
    
    // Save earned badge
    let earnedBadges = [];
    try {
      earnedBadges = JSON.parse(localStorage.getItem('pinPotha_earned_badges') || '[]');
    } catch (e) {}
    if (!earnedBadges.includes(chMeta.id)) {
      earnedBadges.push(chMeta.id);
      localStorage.setItem('pinPotha_earned_badges', JSON.stringify(earnedBadges));
    }

    SoundService.playPublish();
    triggerHaptic([30, 60, 30, 60, 40]);
    alert(`🎉 සාදු! සාදු! ඔබ "${chMeta.title}" සාර්ථකව සම්පූර්ණ කළා!\n\nඔබගේ Profile එකට විශේෂ "${chMeta.badgeText}" ලාංඡනය හිමි විය! 🌟`);

    // Auto-create celebratory merit post
    try {
      await StorageService.createPost({
        type: 'merit',
        title: `🏆 පුණ්‍ය අධිෂ්ඨානය සම්පූර්ණ කිරීම: ${chMeta.title}`,
        category: 'භාවනාමය',
        visibility: 'public',
        description: `අද දින මම "${chMeta.title}" අඛණ්ඩව දින ${chMeta.goalDays}ක් පුරා සම්පූර්ණ කළෙමි! ඒ වෙනුවෙන් ලැබූ "${chMeta.badgeText}" ලාංඡනය දැක ඔබත් සතුටු සිතින් අනුමෝදන් වෙත්වා! 🙏`,
        image: null,
        images: []
      });
    } catch (e) {}
  } else {
    SoundService.playSadhu();
    triggerHaptic(20);
    alert(`සාදු! අද දින සාර්ථකව සම්පූර්ණ කළා! ඔබ දැන් දින ${state.streak}/${chMeta.goalDays}ක් ඉදිරියට පැමිණ ඇත. තවත් දින ${chMeta.goalDays - state.streak}යි! 🌟`);
  }

  active[challengeId] = state;
  localStorage.setItem('pinPotha_active_challenges', JSON.stringify(active));
  renderSpiritualChallenges();
  updateUserStats();
};

/* ==========================================================================
   Progressive Web App (PWA) Engine & Lifecycle Management
   ========================================================================== */
let deferredPwaPrompt = null;
let newWorkerWaiting = null;

function initPWAEngine() {
  // Check standalone mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       window.navigator.standalone === true;

  // iOS Safari detection
  const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()) && !window.MSStream;

  // Purge any stale caches from previous builds
  const ACTIVE_BUILD = 'v107';
  if (localStorage.getItem('pinPotha_active_build') !== ACTIVE_BUILD) {
    localStorage.setItem('pinPotha_active_build', ACTIVE_BUILD);
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          if (name !== 'pin-potha-cache-' + ACTIVE_BUILD) {
            caches.delete(name);
          }
        });
      });
    }
  }

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js?v=107', { updateViaCache: 'none' })
        .then((registration) => {
          // Immediately check for service worker updates
          try { registration.update(); } catch (e) {}

          // Also check for updates when window becomes visible
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              try { registration.update(); } catch (e) {}
            }
          });

          // Track updates
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (!installingWorker) return;

            installingWorker.addEventListener('statechange', () => {
              if ((installingWorker.state === 'installed' || installingWorker.state === 'activated') && navigator.serviceWorker.controller) {
                // New update is available!
                newWorkerWaiting = installingWorker;
                showPwaUpdateToast();
              }
            });
          });
        })
        .catch((error) => {
          console.warn('[PWA] Service Worker registration failed:', error);
        });
    });

    // Log when new service worker takes over (no auto-reload loop)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[PWA] Service Worker controller updated');
    });
  }

  // Handle Chrome / Android PWA Install Event
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;

    // Show header install button
    const headerBtn = document.getElementById('headerInstallBtn');
    if (headerBtn) {
      headerBtn.classList.remove('hidden');
    }

    // Auto-display floating install prompt after 3.5 seconds if not dismissed
    const isDismissed = sessionStorage.getItem('pinPotha_pwa_dismissed') === 'true';
    if (!isStandalone && !isDismissed) {
      setTimeout(() => {
        showPWAInstallBanner();
      }, 3500);
    }
  });

  // iOS Safari setup: Show install button in header if not already installed
  if (isIos && !isStandalone) {
    const headerBtn = document.getElementById('headerInstallBtn');
    if (headerBtn) {
      headerBtn.classList.remove('hidden');
    }

    const isDismissed = sessionStorage.getItem('pinPotha_pwa_dismissed') === 'true';
    if (!isDismissed) {
      setTimeout(() => {
        showPWAInstallBanner();
      }, 4000);
    }
  }

  // App installed listener
  window.addEventListener('appinstalled', () => {
    hidePWAInstallBanner();
    const headerBtn = document.getElementById('headerInstallBtn');
    if (headerBtn) headerBtn.classList.add('hidden');
    deferredPwaPrompt = null;
    triggerHaptic([40, 80, 40]);
    console.log('[PWA] Pin Potha installed successfully!');
  });
}

// Window-accessible functions
window.triggerPWAInstall = async function () {
  triggerHaptic(20);
  SoundService?.playClick?.();

  if (deferredPwaPrompt) {
    deferredPwaPrompt.prompt();
    const { outcome } = await deferredPwaPrompt.userChoice;
    if (outcome === 'accepted') {
      hidePWAInstallBanner();
    }
    deferredPwaPrompt = null;
    return;
  }

  // If iOS Safari
  const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()) && !window.MSStream;
  if (isIos) {
    hidePWAInstallBanner();
    const modal = document.getElementById('pwaIosModal');
    if (modal) modal.classList.remove('hidden');
    return;
  }

  // If standalone / already installed
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isStandalone) {
    alert('ඔබ දැනටමත් "පිං පොත" App එක ඔබගේ දුරකථනයේ හෝ පරිගණකයේ ස්ථාපනය කරගෙන ඇත. සාදු! 🙏');
  } else {
    alert('ඔබගේ බ්‍රවුසරයේ ඉහළ ලිපින තීරුවේ (Address Bar) ඇති "Install" ලාංඡනයෙන් හෝ බ්‍රවුසර් මෙනුවේ "Install / Add to Home screen" තෝරා App එක පහසුවෙන්ම දමාගත හැක. 🙏');
  }
};

window.showPWAInstallBanner = function () {
  const banner = document.getElementById('pwaInstallBanner');
  if (banner) {
    banner.classList.remove('hidden');
    requestAnimationFrame(() => {
      banner.classList.add('visible');
    });
  }
};

window.hidePWAInstallBanner = function () {
  const banner = document.getElementById('pwaInstallBanner');
  if (banner) {
    banner.classList.remove('visible');
    setTimeout(() => {
      banner.classList.add('hidden');
    }, 400);
  }
};

window.dismissPWAInstallBanner = function () {
  triggerHaptic(15);
  sessionStorage.setItem('pinPotha_pwa_dismissed', 'true');
  hidePWAInstallBanner();
};

window.closePwaIosModal = function () {
  triggerHaptic(15);
  const modal = document.getElementById('pwaIosModal');
  if (modal) modal.classList.add('hidden');
};

window.closePwaIosModalOnBackdrop = function (e) {
  if (e && e.target && e.target.id === 'pwaIosModal') {
    closePwaIosModal();
  }
};

window.showPwaUpdateToast = function () {
  const toast = document.getElementById('pwaUpdateToast');
  if (toast) {
    toast.classList.remove('hidden');
    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });
  }
};

window.dismissPwaUpdateToast = function () {
  triggerHaptic(15);
  const toast = document.getElementById('pwaUpdateToast');
  if (toast) {
    toast.classList.remove('visible');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 250);
  }
};

window.applyPwaUpdate = function () {
  triggerHaptic(30);
  SoundService?.playClick?.();
  const toast = document.getElementById('pwaUpdateToast');
  if (toast) {
    toast.classList.remove('visible');
    toast.classList.add('hidden');
  }
  if (newWorkerWaiting) {
    try {
      newWorkerWaiting.postMessage({ type: 'SKIP_WAITING' });
    } catch (e) {}
  }
  setTimeout(() => {
    window.location.reload();
  }, 150);
};

// ============================================================================
// Smart Sticky Header (Mobile-Only Facebook-Standard Auto-Hide on Scroll Down, Show on Scroll Up)
// ============================================================================
function initSmartHeaderScroll() {
  const header = document.querySelector('.app-header');
  if (!header) return;

  let lastScrollY = window.pageYOffset || window.scrollY || 0;
  let ticking = false;
  const scrollThreshold = 10; // Minimum 10px delta to prevent any micro-jitter
  const topBuffer = 50; // Near top of page, always show header

  const onScroll = () => {
    // Strictly disable on desktop (768px+) to prevent any layout shifts
    if (window.innerWidth > 768) {
      if (header.classList.contains('header-hidden')) {
        header.classList.remove('header-hidden');
      }
      return;
    }

    if (!ticking) {
      window.requestAnimationFrame(() => {
        const currentScrollY = window.pageYOffset || window.scrollY || 0;
        const maxScrollY = document.documentElement.scrollHeight - window.innerHeight;

        // Ignore bounce/rubber-banding at the edges (iOS & Android Chrome)
        if (currentScrollY < 0 || currentScrollY > maxScrollY) {
          ticking = false;
          return;
        }

        const scrollDiff = currentScrollY - lastScrollY;

        // 1. If at/near top of page -> Always reveal header
        if (currentScrollY <= topBuffer) {
          header.classList.remove('header-hidden');
        }
        // 2. If scrolling DOWN past threshold and well past header -> Hide header
        else if (scrollDiff > scrollThreshold && currentScrollY > 75) {
          const notifDropdown = document.getElementById('notificationsDropdown');
          const isNotifOpen = notifDropdown && notifDropdown.style.display !== 'none';
          const isModalOpen = document.body.classList.contains('modal-open');

          if (!isNotifOpen && !isModalOpen) {
            header.classList.add('header-hidden');
          }
        }
        // 3. If scrolling UP past threshold -> Reveal header instantly!
        else if (scrollDiff < -scrollThreshold) {
          header.classList.remove('header-hidden');
        }

        lastScrollY = currentScrollY;
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
}

// ============================================================================
// Lock Mobile Bottom Navigation Bar to Visual Viewport (Prevents Sinking on Scroll)
// ============================================================================
function initMobileBottomBarLock() {
  const bar = document.getElementById('mobileBottomBar');
  if (!bar) return;

  let scheduled = false;
  const updatePosition = () => {
    if (window.innerWidth > 768) return;
    if (!scheduled) {
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        if (window.visualViewport) {
          const vv = window.visualViewport;
          const layoutHeight = document.documentElement.clientHeight || window.innerHeight;
          const offset = Math.max(0, layoutHeight - (vv.height + vv.offsetTop));
          bar.style.bottom = `${offset}px`;
        } else {
          bar.style.bottom = '0px';
        }
      });
    }
  };

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updatePosition, { passive: true });
    window.visualViewport.addEventListener('scroll', updatePosition, { passive: true });
  }
  window.addEventListener('scroll', updatePosition, { passive: true });
  window.addEventListener('resize', updatePosition, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(updatePosition, 100));
  updatePosition();
}

export function toggleAranyaTab() {
  triggerHaptic(12);
  if (activeTab === 'aranya') {
    switchTab('feed');
  } else {
    switchTab('aranya');
  }
}
window.toggleAranyaTab = toggleAranyaTab;

// ============================================================================
// Native Mobile App Slide Drawer Menu Controller
// ============================================================================
export function openMobileMenuDrawer() {
  triggerHaptic(12);
  const overlay = document.getElementById('mobileDrawerOverlay');
  const drawer = document.getElementById('mobileDrawer');
  if (!drawer) return;

  updateUserInfoUI();

  overlay?.classList.remove('hidden');
  drawer.classList.remove('hidden');

  requestAnimationFrame(() => {
    overlay?.classList.add('open');
    drawer.classList.add('open');
    document.body.classList.add('drawer-open');
  });
}
window.openMobileMenuDrawer = openMobileMenuDrawer;

export function closeMobileMenuDrawer() {
  triggerHaptic(8);
  const overlay = document.getElementById('mobileDrawerOverlay');
  const drawer = document.getElementById('mobileDrawer');
  if (!drawer) return;

  overlay?.classList.remove('open');
  drawer.classList.remove('open');
  document.body.classList.remove('drawer-open');

  setTimeout(() => {
    overlay?.classList.add('hidden');
    drawer.classList.add('hidden');
  }, 300);
}
window.closeMobileMenuDrawer = closeMobileMenuDrawer;

export function toggleMobileMenuDrawer() {
  const drawer = document.getElementById('mobileDrawer');
  if (drawer && drawer.classList.contains('open')) {
    closeMobileMenuDrawer();
  } else {
    openMobileMenuDrawer();
  }
}
window.toggleMobileMenuDrawer = toggleMobileMenuDrawer;

// Keyboard Escape listener to dismiss drawer & modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const drawer = document.getElementById('mobileDrawer');
    if (drawer && drawer.classList.contains('open')) {
      closeMobileMenuDrawer();
    }
    const nameModal = document.getElementById('quickNameEditModal');
    if (nameModal && !nameModal.classList.contains('hidden')) {
      closeQuickNameEditModal();
    }
  }
});

// ============================================================================
// Quick Inline Name Edit Modal Controller
// ============================================================================
export function openInlineNameEditModal() {
  triggerHaptic(10);
  const user = StorageService.currentUser;
  const input = document.getElementById('quickNameInput');
  if (input) {
    input.value = user?.name || '';
  }
  const modal = document.getElementById('quickNameEditModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    setTimeout(() => {
      input?.focus();
      input?.select();
    }, 100);
  }
}
window.openInlineNameEditModal = openInlineNameEditModal;

export function closeQuickNameEditModal() {
  triggerHaptic(8);
  const modal = document.getElementById('quickNameEditModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}
window.closeQuickNameEditModal = closeQuickNameEditModal;

export async function saveQuickNameEdit() {
  const input = document.getElementById('quickNameInput');
  const newName = (input?.value || '').trim();
  if (!newName) {
    showToast("කරුණාකර වලංගු නමක් ඇතුළත් කරන්න.", "warning");
    input?.focus();
    return;
  }
  if (newName.length < 2) {
    showToast("නම සඳහා අවම වශයෙන් අකුරු 2ක් වත් තිබිය යුතුය.", "warning");
    input?.focus();
    return;
  }

  const saveBtn = document.getElementById('btnSaveQuickName');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> සුරකිමින්...';
  }

  try {
    const parts = newName.split(' ');
    const firstName = parts[0] || newName;
    const lastName = parts.slice(1).join(' ') || '';

    await StorageService.updateUserProfile({
      name: newName,
      firstName: firstName,
      lastName: lastName
    });

    // Update UI across header, drawer, and profile
    updateUserInfoUI();
    loadProfilePage();
    
    closeQuickNameEditModal();
    showToast("ඔබගේ නම සාර්ථකව යාවත්කාලීන විය! 🙏", "success");
    triggerHaptic(15);
  } catch (err) {
    console.error("Error updating name:", err);
    showToast("නම යාවත්කාලීන කිරීමේදී දෝෂයක් සිදුවිය: " + (err.message || ''), "error");
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> සුරකින්න';
    }
  }
}
window.saveQuickNameEdit = saveQuickNameEdit;

// =========================================================================
// Sidebar Daily Dhamma Verse & Poya Calendar Admin Modals
// =========================================================================
window.openDhammaVerseEditModal = function() {
  if (!StorageService.isMasterAdmin() && !StorageService.isSubAdmin(StorageService.currentUser)) {
    alert("මෙම පහසුකම භාවිතා කළ හැක්කේ පරිපාලකයින්ට පමණි.");
    return;
  }
  const verse = StorageService.getDailyDhammaVerse();
  const paliInput = document.getElementById('modalVersePaliInput');
  const sinhalaInput = document.getElementById('modalVerseSinhalaInput');
  if (paliInput) paliInput.value = (verse && verse.pali) ? verse.pali : '';
  if (sinhalaInput) sinhalaInput.value = (verse && verse.sinhala) ? verse.sinhala : '';
  const modal = document.getElementById('dhammaVerseModal');
  if (modal) modal.classList.remove('hidden');
};

window.closeDhammaVerseEditModal = function() {
  const modal = document.getElementById('dhammaVerseModal');
  if (modal) modal.classList.add('hidden');
};

window.handleSaveDhammaVerseModal = async function(e) {
  if (e) e.preventDefault();
  const pali = (document.getElementById('modalVersePaliInput')?.value || '').trim();
  const sinhala = (document.getElementById('modalVerseSinhalaInput')?.value || '').trim();
  if (!pali || !sinhala) {
    alert("කරුණාකර ගාථාව සහ සිංහල තේරුම යන දෙකම ඇතුළත් කරන්න.");
    return;
  }
  const btn = document.getElementById('btnSaveVerseSubmit');
  const origHtml = btn ? btn.innerHTML : '';
  try {
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> සුරකිමින්...'; }
    await StorageService.saveDailyDhammaVerse(pali, sinhala);
    SoundService.playPublish();
    triggerHaptic([30, 60, 30]);
    alert("🎉 සාදු! දවසේ ධම්ම පදය සාර්ථකව යාවත්කාලීන විය!");
    closeDhammaVerseEditModal();
  } catch (err) {
    alert("දෝෂයකි: " + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = origHtml; }
  }
};

window.openPoyaCalendarEditModal = function() {
  if (!StorageService.isMasterAdmin() && !StorageService.isSubAdmin(StorageService.currentUser)) {
    alert("මෙම පහසුකම භාවිතා කළ හැක්කේ පරිපාලකයින්ට පමණි.");
    return;
  }
  const poya = StorageService.getPoyaEvent();
  const mInput = document.getElementById('modalPoyaMonthInput');
  const dInput = document.getElementById('modalPoyaDayInput');
  const tInput = document.getElementById('modalPoyaTitleInput');
  const descInput = document.getElementById('modalPoyaDescInput');
  if (mInput) mInput.value = (poya && poya.month) ? poya.month : '';
  if (dInput) dInput.value = (poya && poya.day) ? poya.day : '';
  if (tInput) tInput.value = (poya && poya.title) ? poya.title : '';
  if (descInput) descInput.value = (poya && poya.desc) ? poya.desc : '';
  const modal = document.getElementById('poyaCalendarModal');
  if (modal) modal.classList.remove('hidden');
};

window.closePoyaCalendarEditModal = function() {
  const modal = document.getElementById('poyaCalendarModal');
  if (modal) modal.classList.add('hidden');
};

window.handleSavePoyaCalendarModal = async function(e) {
  if (e) e.preventDefault();
  const month = (document.getElementById('modalPoyaMonthInput')?.value || '').trim();
  const day = (document.getElementById('modalPoyaDayInput')?.value || '').trim();
  const title = (document.getElementById('modalPoyaTitleInput')?.value || '').trim();
  const desc = (document.getElementById('modalPoyaDescInput')?.value || '').trim();
  if (!month || !day || !title) {
    alert("කරුණාකර මාසය, දිනය සහ පොහොය නම ඇතුළත් කරන්න.");
    return;
  }
  const btn = document.getElementById('btnSavePoyaSubmit');
  const origHtml = btn ? btn.innerHTML : '';
  try {
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> සුරකිමින්...'; }
    await StorageService.savePoyaEvent({ month, day, title, desc });
    SoundService.playPublish();
    triggerHaptic([30, 60, 30]);
    alert("🎉 සාදු! පුණ්‍ය දින දර්ශනය සාර්ථකව යාවත්කාලීන විය!");
    closePoyaCalendarEditModal();
  } catch (err) {
    alert("දෝෂයකි: " + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = origHtml; }
  }
};

/* ==========================================================================
   Sri Lanka Aranya Senasana Directory Controller
   ========================================================================== */
let allAranyaSenasana = [];
let currentAranyaDistrict = 'සියලුම';
let currentAranyaSearch = '';

window.renderAranyaDirectoryView = async function() {
  const grid = document.getElementById('aranyaGrid');
  const countEl = document.getElementById('aranyaResultsCount');

  if (grid) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #059669;">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.8rem; margin-bottom: 10px;"></i>
        <p style="font-weight: 600; font-size: 0.9rem;">පූජනීය ආරණ්‍ය සේනාසන නාමාවලිය පූරණය වෙමින්...</p>
      </div>
    `;
  }

  try {
    allAranyaSenasana = await StorageService.getAranyaSenasanaList();
  } catch (err) {
    console.error('[Aranya] Failed to load list:', err);
    allAranyaSenasana = [];
  }

  // Render Districts Bar if not rendered or update counts
  renderAranyaDistrictsBar();

  // Filter & Render Cards
  filterAndRenderAranyaCards();
};

function renderAranyaDistrictsBar() {
  const bar = document.getElementById('aranyaDistrictsBar');
  if (!bar) return;

  const districts = [
    'සියලුම', 'කුරුණෑගල', 'ගාල්ල', 'කළුතර', 'ගම්පහ', 'මහනුවර', 'මාතලේ',
    'අනුරාධපුරය', 'පොළොන්නරුව', 'හම්බන්තොට', 'බදුල්ල', 'රත්නපුරය', 'අම්පාර', 'මාතර'
  ];

  bar.innerHTML = districts.map(d => {
    let count = 0;
    if (d === 'සියලුම') {
      count = allAranyaSenasana.length;
    } else {
      count = allAranyaSenasana.filter(a => (a.district || '').includes(d)).length;
    }

    const isActive = currentAranyaDistrict === d;
    return `
      <button type="button" 
        class="aranya-district-chip ${isActive ? 'active' : ''}" 
        onclick="setAranyaDistrictFilter('${d}')">
        <span>${d}</span>
        <span style="font-size: 0.68rem; opacity: 0.85; margin-left: 3px;">(${count})</span>
      </button>
    `;
  }).join('');
}

window.setAranyaDistrictFilter = function(district) {
  triggerHaptic(10);
  currentAranyaDistrict = district;
  renderAranyaDistrictsBar();
  filterAndRenderAranyaCards();
};

window.filterAranyaDirectory = function() {
  const input = document.getElementById('aranyaSearchInput');
  const clearBtn = document.getElementById('aranyaSearchClearBtn');
  currentAranyaSearch = (input?.value || '').trim().toLowerCase();

  if (clearBtn) {
    if (currentAranyaSearch) clearBtn.classList.remove('hidden');
    else clearBtn.classList.add('hidden');
  }

  filterAndRenderAranyaCards();
};

window.clearAranyaSearch = function() {
  const input = document.getElementById('aranyaSearchInput');
  const clearBtn = document.getElementById('aranyaSearchClearBtn');
  if (input) input.value = '';
  if (clearBtn) clearBtn.classList.add('hidden');
  currentAranyaSearch = '';
  filterAndRenderAranyaCards();
};

window.resetAranyaFilters = function() {
  currentAranyaDistrict = 'සියලුම';
  currentAranyaSearch = '';
  const input = document.getElementById('aranyaSearchInput');
  const clearBtn = document.getElementById('aranyaSearchClearBtn');
  if (input) input.value = '';
  if (clearBtn) clearBtn.classList.add('hidden');
  renderAranyaDistrictsBar();
  filterAndRenderAranyaCards();
};

function filterAndRenderAranyaCards() {
  const grid = document.getElementById('aranyaGrid');
  const emptyState = document.getElementById('aranyaEmptyState');
  const countEl = document.getElementById('aranyaResultsCount');
  if (!grid) return;

  let filtered = [...allAranyaSenasana];

  // District filter
  if (currentAranyaDistrict !== 'සියලුම') {
    filtered = filtered.filter(a => (a.district || '').includes(currentAranyaDistrict));
  }

  // Search query filter
  if (currentAranyaSearch) {
    const q = currentAranyaSearch;
    filtered = filtered.filter(a => {
      const name = (a.name || '').toLowerCase();
      const nameEn = (a.nameEn || '').toLowerCase();
      const town = (a.town || '').toLowerCase();
      const district = (a.district || '').toLowerCase();
      const tradition = (a.tradition || '').toLowerCase();
      const desc = (a.description || '').toLowerCase();
      const services = (a.services || []).join(' ').toLowerCase();
      return name.includes(q) || nameEn.includes(q) || town.includes(q) || district.includes(q) || tradition.includes(q) || desc.includes(q) || services.includes(q);
    });
  }

  // Update counter
  if (countEl) {
    countEl.innerText = `සෙනසුන් ${filtered.length} ක් හමුවිය`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  grid.innerHTML = filtered.map(item => {
    const primaryPhone = item.phones && item.phones[0] ? item.phones[0] : '';
    const secondaryPhone = item.phones && item.phones[1] ? item.phones[1] : '';
    const cleanPhoneForTel = primaryPhone.replace(/[^0-9]/g, '');
    const cleanSecPhoneForTel = secondaryPhone.replace(/[^0-9]/g, '');
    const waClean = (item.whatsapp || primaryPhone).replace(/[^0-9]/g, '').replace(/^0/, '94');

    const servicesHtml = (item.services || []).map(s => `
      <span class="aranya-service-pill">${Security.escapeHTML(s)}</span>
    `).join('');

    return `
      <div class="aranya-card" id="card_${item.id}">
        <div class="aranya-card-top">
          <span class="aranya-tradition-tag">
            <i class="fa-solid fa-dharmachakra"></i>
            <span>${Security.escapeHTML(item.tradition || 'ආරණ්‍ය සම්ප්‍රදාය')}</span>
          </span>
          <span class="aranya-district-tag">
            <i class="fa-solid fa-location-dot"></i>
            <span>${Security.escapeHTML(item.district || 'දිස්ත්‍රික්කය')}</span>
          </span>
        </div>

        <h3 class="aranya-title">${Security.escapeHTML(item.name)}</h3>
        ${item.nameEn ? `<div class="aranya-subtitle">${Security.escapeHTML(item.nameEn)}</div>` : ''}

        <div class="aranya-location">
          <i class="fa-solid fa-map-pin"></i>
          <span>${Security.escapeHTML(item.town || '')}</span>
        </div>

        <p class="aranya-desc">${Security.escapeHTML(item.description || '')}</p>

        ${item.callingHours ? `
          <div class="aranya-calling-hours">
            <i class="fa-regular fa-clock"></i>
            <span><strong>ඇමතුම් වේලාව:</strong> ${Security.escapeHTML(item.callingHours)}</span>
          </div>
        ` : ''}

        <div class="aranya-contact-person">
          <i class="fa-solid fa-user-tie" style="color: #64748b;"></i>
          <span>${Security.escapeHTML(item.contactPerson || 'දායක සභාව / කාර්යාලය')}</span>
        </div>

        ${servicesHtml ? `<div class="aranya-services-list">${servicesHtml}</div>` : ''}

        <div class="aranya-action-bar">
          ${primaryPhone ? `
            <a href="tel:${cleanPhoneForTel}" class="aranya-action-btn btn-call" title="දුරකථන ඇමතුමක් ලබාගන්න">
              <i class="fa-solid fa-phone"></i>
              <span>${primaryPhone}</span>
            </a>
          ` : ''}

          ${secondaryPhone ? `
            <a href="tel:${cleanSecPhoneForTel}" class="aranya-action-btn btn-call-sub" title="දෙවන අංකය අමතන්න">
              <i class="fa-solid fa-phone-volume"></i>
              <span>${secondaryPhone}</span>
            </a>
          ` : ''}

          ${item.whatsapp ? `
            <a href="https://wa.me/${waClean}" target="_blank" rel="noopener" class="aranya-action-btn btn-wa" title="WhatsApp පණිවිඩයක් යොමු කරන්න">
              <i class="fa-brands fa-whatsapp"></i>
              <span>WhatsApp</span>
            </a>
          ` : ''}

          ${item.mapUrl ? `
            <a href="${item.mapUrl}" target="_blank" rel="noopener" class="aranya-action-btn btn-map" title="Google Maps මඟින් යන මඟ බලන්න">
              <i class="fa-solid fa-diamond-turn-right"></i>
              <span>Maps</span>
            </a>
          ` : ''}

          ${primaryPhone ? `
            <button type="button" class="aranya-action-btn btn-copy" onclick="copyAranyaPhone('${primaryPhone}', this)" title="අංකය Copy කරගන්න">
              <i class="fa-regular fa-copy"></i>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

window.copyAranyaPhone = function(phone, btn) {
  triggerHaptic(15);
  if (!navigator.clipboard) {
    alert("දුරකථන අංකය: " + phone);
    return;
  }
  navigator.clipboard.writeText(phone).then(() => {
    if (btn) {
      const origHtml = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check" style="color: #059669;"></i>';
      setTimeout(() => { btn.innerHTML = origHtml; }, 1800);
    }
  }).catch(() => {
    alert("දුරකථන අංකය: " + phone);
  });
};

/* Suggest Monastery Modal Logic */
window.openSuggestAranyaModal = function() {
  triggerHaptic(12);
  const modal = document.getElementById('suggestAranyaModal');
  if (modal) modal.classList.remove('hidden');
};

window.closeSuggestAranyaModal = function() {
  const modal = document.getElementById('suggestAranyaModal');
  if (modal) modal.classList.add('hidden');
};

window.closeSuggestAranyaModalOnBackdrop = function(e) {
  if (e.target && e.target.id === 'suggestAranyaModal') {
    closeSuggestAranyaModal();
  }
};

window.submitAranyaSuggestion = async function(e) {
  if (e) e.preventDefault();
  const name = (document.getElementById('suggAranyaName')?.value || '').trim();
  const district = (document.getElementById('suggAranyaDistrict')?.value || '').trim();
  const town = (document.getElementById('suggAranyaTown')?.value || '').trim();
  const phone = (document.getElementById('suggAranyaPhone')?.value || '').trim();
  const whatsapp = (document.getElementById('suggAranyaWa')?.value || '').trim();
  const callingHours = (document.getElementById('suggAranyaHours')?.value || '').trim();
  const notes = (document.getElementById('suggAranyaNotes')?.value || '').trim();

  if (!name || !district || !town || !phone) {
    alert("කරුණාකර ආරණ්‍යයේ නම, දිස්ත්‍රික්කය, නගරය සහ දුරකථන අංකය ඇතුළත් කරන්න.");
    return;
  }

  const btn = document.getElementById('btnSubmitAranyaSugg');
  const origHtml = btn ? btn.innerHTML : '';

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> යොමු කරමින්...';
    }

    await StorageService.suggestAranyaSenasana({
      name,
      district,
      town,
      phone,
      whatsapp,
      callingHours,
      notes
    });

    SoundService.playPublish();
    triggerHaptic([30, 60, 30]);
    alert("සාදු! ඔබගේ යෝජනාව සාර්ථකව ලැබුණි. පරිපාලක මණ්ඩලය විසින් සත්‍යාපනය කිරීමෙන් පසු එය ප්‍රධාන නාමාවලියට ඇතුළත් කරනු ඇත. 🙏🌿");

    const form = document.getElementById('suggestAranyaForm');
    if (form) form.reset();
    closeSuggestAranyaModal();
  } catch (err) {
    alert("දෝෂයක් සිදු විය: " + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origHtml;
    }
  }
};
