/**
 * ============================================================================
 * පිං පොත | Executive Admin Dashboard Logic (js/admin.js)
 * ============================================================================
 * Author: NexiaProLanka
 * Master Admin: Malith Dushantha Haputhanthri (silvadilan9@gmail.com)
 * ============================================================================
 */

import { firebaseConfig, isFirebaseConfigured, COLLECTIONS } from './firebase-config.js?v=22';
import { Security } from './security.js?v=48';

const MASTER_ADMIN_EMAIL = "silvadilan9@gmail.com";
const MASTER_ADMIN_EMAILS = [
    "silvadilan9@gmail.com",
    "creativeparadise25@gmail.com"
];

function checkIsMasterAdmin(emailOrUser) {
    if (!emailOrUser) return false;
    if (typeof emailOrUser === 'string') {
        const clean = emailOrUser.trim().toLowerCase();
        return MASTER_ADMIN_EMAILS.some(adm => adm.toLowerCase() === clean);
    }
    const email = (emailOrUser.email || '').trim().toLowerCase();
    const uid = emailOrUser.uid || '';
    return MASTER_ADMIN_EMAILS.some(adm => adm.toLowerCase() === email) ||
           uid === 'user_malith' ||
           uid === 'o2pWiAX7SXTHiMfSiphI8Ln5HAM2';
}

let app = null;
let db = null;
let auth = null;
let currentAdminUser = null;
let isMasterAdmin = false;
let isSubAdmin = false;

let allUsersList = [];
let allPostsList = [];
let growthChartInstance = null;
let currentChartDays = 14;

// Default banned keywords list for automated moderation scanning
const DEFAULT_BANNED_WORDS = [
    'කැසිනෝ', 'සූදු', 'දේශපාලන', 'ජන්දෙ', 'ඡන්දය', 'කුණුහරුප', 'වංචා',
    'casino', 'betting', 'porn', 'scam', 'crypto', 'loan'
];
let activeBannedWords = [...DEFAULT_BANNED_WORDS];

// ============================================================================
// 1. INITIALIZATION & GATEKEEPER SECURITY
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Admin] Booting Executive Admin Portal...');
    await initAdminPortal();
});

async function initAdminPortal() {
    if (!isFirebaseConfigured()) {
        showAccessDenied('Firebase configuration is missing or invalid.');
        return;
    }

    try {
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js');
        const { getFirestore, collection, doc, getDoc, getDocs, updateDoc, deleteDoc, setDoc, addDoc, onSnapshot, query, orderBy, limit } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js');

        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // Expose modules to window for actions
        window._db = db;
        window._auth = auth;
        window._doc = doc;
        window._updateDoc = updateDoc;
        window._deleteDoc = deleteDoc;
        window._setDoc = setDoc;
        window._addDoc = addDoc;
        window._collection = collection;

        // Monitor Auth State
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                showLoginGatekeeper();
                return;
            }

            // Verify Admin Roles
            const email = (user.email || '').trim().toLowerCase();
            isMasterAdmin = checkIsMasterAdmin(user);

            let userDocRole = 'member';
            let isUserBanned = false;

            try {
                const userSnap = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));
                if (userSnap.exists()) {
                    const uData = userSnap.data();
                    userDocRole = uData.role || 'member';
                    isUserBanned = !!uData.isBanned;
                }
            } catch (err) {
                console.warn('[Admin] User doc read note:', err);
            }

            if (isUserBanned) {
                showAccessDenied('මෙම ගිණුම පරිපාලනය විසින් අවහිර (Ban) කර ඇත.');
                return;
            }

            isSubAdmin = (userDocRole === 'admin');

            if (!isMasterAdmin && !isSubAdmin) {
                showAccessDenied(`ඔබ ඇතුළු වූ ගිණුමට (${user.email}) පරිපාලක බලතල නොමැත. කරුණාකර ප්‍රධාන පරිපාලක (Master Admin) ගිණුමෙන් පිවිසෙන්න.`);
                return;
            }

            currentAdminUser = user;
            unlockDashboard(user);
        });

    } catch (err) {
        console.error('[Admin] Portal initialization failure:', err);
        showAccessDenied('පරිපාලක පද්ධතිය ආරම්භ කිරීමේදී දෝෂයක් ඇතිවිය: ' + err.message);
    }
}

function showLoginGatekeeper() {
    const overlay = document.getElementById('gatekeeperOverlay');
    const loginBox = document.getElementById('gatekeeperLoginBox');
    const deniedBox = document.getElementById('gatekeeperDeniedBox');
    if (overlay) overlay.style.display = 'flex';
    if (loginBox) loginBox.style.display = 'block';
    if (deniedBox) deniedBox.style.display = 'none';
}

function showAccessDenied(message) {
    const overlay = document.getElementById('gatekeeperOverlay');
    const loginBox = document.getElementById('gatekeeperLoginBox');
    const deniedBox = document.getElementById('gatekeeperDeniedBox');
    const msgEl = document.getElementById('gatekeeperDeniedMsg');
    if (overlay) overlay.style.display = 'flex';
    if (loginBox) loginBox.style.display = 'none';
    if (deniedBox) deniedBox.style.display = 'block';
    if (msgEl) msgEl.innerText = message || 'අනවසර ප්‍රවේශයකි (403 Forbidden).';
}

function unlockDashboard(user) {
    const overlay = document.getElementById('gatekeeperOverlay');
    if (overlay) overlay.style.display = 'none';

    // Update Header
    const nameEl = document.getElementById('headerUserName');
    const subRoleEl = document.getElementById('headerUserSubRole');
    const badgeEl = document.getElementById('headerRoleBadge');
    const avatarEl = document.getElementById('headerUserAvatar');

    const adminName = isMasterAdmin ? 'මලිත් දුෂාන්ත හපුතන්ත්‍රි' : (user.displayName || 'Sub-Admin');
    if (nameEl) nameEl.innerText = adminName;
    if (subRoleEl) subRoleEl.innerText = isMasterAdmin ? '👑 Master Admin (NexiaProLanka)' : '🛡️ Sub-Admin / Moderator';
    if (badgeEl) badgeEl.innerText = isMasterAdmin ? 'Master Admin' : 'Sub-Admin';

    if (avatarEl) {
        if (user.photoURL) {
            avatarEl.innerHTML = `<img src="${user.photoURL}" alt="${adminName}">`;
        } else {
            avatarEl.innerText = isMasterAdmin ? '👑' : '🛡️';
        }
    }

    // Toggle Master-Admin-only controls
    const masterTabs = document.querySelectorAll('.master-only-tab');
    masterTabs.forEach(el => {
        el.style.display = isMasterAdmin ? 'inline-flex' : 'none';
    });

    // Start Live Subscriptions
    subscribeToUsers();
    subscribeToPosts();
    subscribeToSettings();
    loadAuditLogs();
}

window.triggerAdminGoogleSignIn = async function() {
    try {
        const { signInWithPopup, GoogleAuthProvider } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js');
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(auth, provider);
    } catch (err) {
        console.error('[Admin] Google sign-in failed:', err);
        alert('පිවිසීමේදී දෝෂයක් ඇතිවිය: ' + (err.message || 'නැවත උත්සාහ කරන්න.'));
    }
};

window.adminSignOut = async function() {
    if (confirm('ඔබට පරිපාලක පුවරුවෙන් නික්මීමට අවශ්‍යද?')) {
        try {
            const { signOut } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js');
            await signOut(auth);
            window.location.reload();
        } catch (err) {
            console.error('[Admin] Sign out error:', err);
        }
    }
};

// ============================================================================
// 2. REAL-TIME DATA SUBSCRIPTIONS
// ============================================================================

function subscribeToUsers() {
    const { collection, onSnapshot } = window;
    import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js').then(({ collection, onSnapshot }) => {
        onSnapshot(collection(db, COLLECTIONS.USERS), (snapshot) => {
            const users = [];
            snapshot.forEach(docSnap => {
                users.push({
                    uid: docSnap.id,
                    ...docSnap.data()
                });
            });

            allUsersList = users;
            updateUserMetrics(users);
            renderUsersTable(users);
            renderGrowthChart(users);

            const tabBadge = document.getElementById('tabBadgeUsers');
            if (tabBadge) tabBadge.innerText = users.length;
        }, (err) => {
            console.warn('[Admin] Users subscription warning:', err);
        });
    });
}

function subscribeToPosts() {
    import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js').then(({ collection, onSnapshot, query, orderBy }) => {
        const q = query(collection(db, COLLECTIONS.POSTS), orderBy("timestamp", "desc"));
        onSnapshot(q, (snapshot) => {
            const posts = [];
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (data.isDeleted !== true) {
                    posts.push({
                        id: docSnap.id,
                        ...data
                    });
                }
            });

            allPostsList = posts;
            updatePostMetrics(posts);
            renderModerationFeed(posts);

            const tabBadge = document.getElementById('tabBadgeMod');
            if (tabBadge) tabBadge.innerText = posts.length;
        }, (err) => {
            console.warn('[Admin] Posts subscription warning:', err);
        });
    });
}

function subscribeToSettings() {
    import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js').then(({ doc, onSnapshot }) => {
        onSnapshot(doc(db, COLLECTIONS.SETTINGS, 'global_announcement'), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                const textEl = document.getElementById('settingAnnounceText');
                const activeEl = document.getElementById('settingAnnounceActive');
                if (textEl && !textEl.dataset.editing) textEl.value = data.text || data.message || '';
                if (activeEl) activeEl.checked = !!data.active;
            }
        });

        onSnapshot(doc(db, COLLECTIONS.SETTINGS, 'banned_words'), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (Array.isArray(data.words)) {
                    activeBannedWords = data.words;
                    const inputEl = document.getElementById('settingBannedWordsInput');
                    if (inputEl && !inputEl.dataset.editing) inputEl.value = data.words.join(', ');
                }
            }
        });
    });
}

// ============================================================================
// 3. METRICS & COUNTERS
// ============================================================================

function updateUserMetrics(users) {
    const totalUsersEl = document.getElementById('metricTotalUsers');
    const totalAdminsEl = document.getElementById('metricTotalAdmins');
    const bannedUsersEl = document.getElementById('metricBannedUsers');

    const total = users.length;
    let adminsCount = 0;
    let bannedCount = 0;

    users.forEach(u => {
        const isMaster = checkIsMasterAdmin(u.email);
        if (isMaster || u.role === 'admin' || u.role === 'master_admin') adminsCount++;
        if (u.isBanned) bannedCount++;
    });

    if (totalUsersEl) totalUsersEl.innerText = total.toLocaleString();
    if (totalAdminsEl) totalAdminsEl.innerText = adminsCount;
    if (bannedUsersEl) bannedUsersEl.innerText = bannedCount;
}

function updatePostMetrics(posts) {
    const totalPostsEl = document.getElementById('metricTotalPosts');
    const totalSadhuEl = document.getElementById('metricTotalSadhu');

    const totalPosts = posts.length;
    const totalSadhu = posts.reduce((acc, p) => acc + (p.sadhuCount || 0), 0);

    if (totalPostsEl) totalPostsEl.innerText = totalPosts.toLocaleString();
    if (totalSadhuEl) totalSadhuEl.innerText = totalSadhu.toLocaleString();
}

// ============================================================================
// 4. USERS DIRECTORY & ROLE MANAGEMENT
// ============================================================================

function renderUsersTable(usersToRender) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    if (!usersToRender || usersToRender.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">
                    සාමාජිකයින් කිසිවෙකු හමු නොවීය.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = usersToRender.map(u => {
        const email = u.email || 'නැත';
        const isMaster = checkIsMasterAdmin(email);
        const isCurrentAdmin = (u.role === 'admin' || isMaster);
        const isBanned = !!u.isBanned;

        const isSangha = u.isSangha === true || u.role === 'sangha' || (u.authorRole === 'sangha') || (u.name && (u.name.includes('ස්වාමීන් වහන්සේ') || u.name.includes('හිමි') || u.name.includes('තෙරුන්') || u.name.startsWith('පූජ්‍ය ') || u.name.startsWith('පූජ්‍යපාද ')));

        // Role badge
        let roleBadge = `<span class="role-badge role-member"><i class="fa-solid fa-user"></i> Member</span>`;
        if (isMaster) {
            roleBadge = `<span class="role-badge role-master"><i class="fa-solid fa-crown"></i> Master Admin</span>`;
        } else if (isSangha) {
            roleBadge = `<span class="role-badge" style="background: linear-gradient(135deg, #d97706, #92400e); color: #ffffff; border: 1px solid #fde68a; font-weight: 800; padding: 2px 8px; border-radius: 9999px; font-size: 0.7rem; display: inline-flex; align-items: center; gap: 4px;"><i class="fa-solid fa-dharmachakra" style="color:#fde68a;"></i> පූජනීය සංඝ</span>`;
        } else if (u.role === 'admin') {
            roleBadge = `<span class="role-badge role-admin"><i class="fa-solid fa-shield"></i> Sub-Admin</span>`;
        }

        // Status badge
        const statusBadge = isBanned 
            ? `<span class="status-badge status-banned"><i class="fa-solid fa-ban"></i> Banned</span>`
            : `<span class="status-badge status-active"><i class="fa-solid fa-circle-check"></i> Active</span>`;

        // Action buttons
        let actionsHTML = '';

        if (!isMaster) {
            // Master Admin can promote/demote & verify Sangha
            if (isMasterAdmin) {
                // Sangha Verification Toggle Button
                if (isSangha) {
                    actionsHTML += `
                        <button class="btn-table-action" style="background: rgba(239, 68, 68, 0.15); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.35); font-weight: 700;" onclick="toggleAdminSangha('${u.uid}', false)" title="සංඝ තත්ත්වය ඉවත් කරන්න">
                            <i class="fa-solid fa-circle-xmark"></i> සංඝ ඉවත් කරන්න
                        </button>
                    `;
                } else {
                    actionsHTML += `
                        <button class="btn-table-action" style="background: linear-gradient(135deg, rgba(217, 119, 6, 0.25), rgba(180, 83, 9, 0.35)); color: #fde68a; border: 1px solid #f59e0b; font-weight: 700;" onclick="toggleAdminSangha('${u.uid}', true)" title="පූජනීය මහා සංඝරත්නය ලෙස සත්‍යාපනය කරන්න">
                            <i class="fa-solid fa-dharmachakra" style="color: #fbbf24;"></i> සංඝ සත්‍යාපනය
                        </button>
                    `;
                }

                if (u.role === 'admin') {
                    actionsHTML += `
                        <button class="btn-table-action btn-table-demote" onclick="toggleUserRole('${u.uid}', 'member')" title="Admin බලතල ඉවත් කරන්න">
                            <i class="fa-solid fa-user-minus"></i> Remove Admin
                        </button>
                    `;
                } else {
                    actionsHTML += `
                        <button class="btn-table-action btn-table-promote" onclick="toggleUserRole('${u.uid}', 'admin')" title="Sub-Admin ලෙස පත්කරන්න">
                            <i class="fa-solid fa-crown"></i> Make Admin
                        </button>
                    `;
                }
            }

            // Both Master & Admins can Ban/Unban non-admin users
            if (isMasterAdmin || (!isMaster && u.role !== 'admin')) {
                if (isBanned) {
                    actionsHTML += `
                        <button class="btn-table-action btn-table-unban" onclick="toggleUserBan('${u.uid}', false)" title="නැවත සක්‍රීය කරන්න">
                            <i class="fa-solid fa-circle-check"></i> Unban
                        </button>
                    `;
                } else {
                    actionsHTML += `
                        <button class="btn-table-action btn-table-ban" onclick="toggleUserBan('${u.uid}', true)" title="පද්ධතියෙන් නෙරපා හරින්න (Ban)">
                            <i class="fa-solid fa-ban"></i> Ban
                        </button>
                    `;
                }
            }
        } else {
            actionsHTML = `<span style="font-size: 0.72rem; color: var(--gold-light); font-weight: 700;">👑 අධිපති පරිපාලක</span>`;
        }

        const avatarInner = u.photo 
            ? `<img src="${u.photo}" alt="${Security.escapeHTML(u.name || '')}">`
            : (u.name ? Security.escapeHTML(u.name.charAt(0)) : '👤');

        const joinedStr = u.joinedDate || (u.createdAt ? new Date(u.createdAt).toLocaleDateString('si-LK') : '2026 ඔක්තෝබර්');
        const userPostsCount = allPostsList.filter(p => p.uid === u.uid).length;

        return `
            <tr id="user-row-${u.uid}">
                <td>
                    <div class="user-cell">
                        <div class="table-avatar">${avatarInner}</div>
                        <div>
                            <div class="table-user-name">
                                <span>${Security.escapeHTML(u.name || 'කල්‍යාණ මිත්‍ර')}</span>
                                ${isMaster ? '<span title="Master Admin" style="color:#fbbf24;">✓</span>' : ''}
                            </div>
                            <div class="table-user-email">${Security.escapeHTML(email)}</div>
                        </div>
                    </div>
                </td>
                <td>${roleBadge}</td>
                <td>${statusBadge}</td>
                <td><span style="font-size: 0.78rem; color: var(--text-secondary);">${joinedStr}</span></td>
                <td><span style="font-weight: 700; color: #fff;">${userPostsCount}</span></td>
                <td>
                    <div class="actions-cell">
                        ${actionsHTML}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

window.filterUsersTable = function() {
    const searchVal = (document.getElementById('userSearchInput')?.value || '').toLowerCase().trim();
    const roleVal = document.getElementById('userRoleFilter')?.value || 'all';

    const filtered = allUsersList.filter(u => {
        const nameMatch = (u.name || '').toLowerCase().includes(searchVal);
        const emailMatch = (u.email || '').toLowerCase().includes(searchVal);
        const matchesSearch = !searchVal || nameMatch || emailMatch;

        let matchesRole = true;
        const isMaster = checkIsMasterAdmin(u.email);
        const isSangha = u.isSangha === true || u.role === 'sangha' || (u.authorRole === 'sangha') || (u.name && (u.name.includes('ස්වාමීන් වහන්සේ') || u.name.includes('හිමි') || u.name.includes('තෙරුන්') || u.name.startsWith('පූජ්‍ය ') || u.name.startsWith('පූජ්‍යපාද ')));

        if (roleVal === 'master') {
            matchesRole = isMaster;
        } else if (roleVal === 'admin') {
            matchesRole = (u.role === 'admin' || isMaster);
        } else if (roleVal === 'sangha') {
            matchesRole = isSangha;
        } else if (roleVal === 'member') {
            matchesRole = (!isMaster && u.role !== 'admin' && !isSangha);
        } else if (roleVal === 'banned') {
            matchesRole = !!u.isBanned;
        }

        return matchesSearch && matchesRole;
    });

    renderUsersTable(filtered);
};

window.toggleAdminSangha = async function(uid, isSangha) {
    if (!isMasterAdmin) {
        alert('පූජනීය සංඝරත්නය ලෙස සත්‍යාපනය කිරීමේ හෝ ඉවත්කිරීමේ බලය ඇත්තේ Master Admin ට පමණි.');
        return;
    }

    const user = allUsersList.find(u => u.uid === uid);
    if (!user) return;

    const actionText = isSangha ? 'පූජනීය මහා සංඝරත්නය ලෙස සත්‍යාපනය කිරීමට' : 'සංඝ සත්‍යාපන තත්ත්වය ඉවත් කිරීමට';
    if (!confirm(`ඔබට "${user.name}" (${user.email || 'No email'}) ${actionText} අවශ්‍ය බව තහවුරු කරන්නද?`)) {
        return;
    }

    try {
        const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
            isSangha: isSangha,
            role: isSangha ? 'sangha' : (user.role === 'admin' ? 'admin' : 'member'),
            sanghaVerifiedBy: currentAdminUser.email,
            sanghaVerifiedAt: Date.now()
        });

        // Update local memory
        user.isSangha = isSangha;
        if (isSangha && user.role !== 'admin') user.role = 'sangha';
        if (!isSangha && user.role === 'sangha') user.role = 'member';

        // Dispatch celebratory notification to the user/monk
        if (isSangha) {
            try {
                const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
                await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
                    recipientUid: uid,
                    senderUid: currentAdminUser.uid,
                    senderName: 'ප්‍රධාන පරිපාලක (Master Admin)',
                    type: 'system_alert',
                    title: '☸️ ඔබගේ පැතිකඩ පූජනීය සංඝරත්නය ලෙස සත්‍යාපනය කරන ලදී',
                    message: 'ප්‍රධාන පරිපාලක විසින් ඔබ වහන්සේගේ ගිණුම "පූජනීය මහා සංඝරත්නය" ලෙස නිල වශයෙන් සත්‍යාපනය කරන ලදී. සැදැහැවතුන්ට නමස්කාර පූර්වකව ඔබ වහන්සේව අනුගමනය කළ හැක. සාදු! 🙏',
                    timestamp: Date.now(),
                    read: false
                });
            } catch (notifErr) {
                console.warn('[Admin] Sangha Notif dispatch note:', notifErr);
            }
        }

        // Audit Log
        await recordAuditLog(
            `Sangha Verification`,
            `"${user.name}" ${isSangha ? 'පූජනීය සංඝරත්නය ලෙස සත්‍යාපනය කරන ලදී' : 'සංඝ තත්ත්වය ඉවත් කරන ලදී'}.`
        );

        alert(`සාර්ථකයි! "${user.name}" ${isSangha ? 'පූජනීය මහා සංඝරත්නය ලෙස සත්‍යාපනය විය. ☸️🙏' : 'සාමාන්‍ය සාමාජිකයෙකු බවට පත්කෙරිණි.'}`);
        filterUsersTable();
    } catch (err) {
        console.error('[Admin] toggleAdminSangha error:', err);
        alert('සංඝ තත්ත්වය වෙනස් කිරීමේදී දෝෂයක් ඇතිවිය: ' + err.message);
    }
};

window.toggleUserRole = async function(uid, newRole) {
    if (!isMasterAdmin) {
        alert('ඇඩ්මින්වරුන් පත්කිරීමේ හෝ ඉවත්කිරීමේ බලය ඇත්තේ Master Admin ට පමණි.');
        return;
    }

    const user = allUsersList.find(u => u.uid === uid);
    if (!user) return;

    const actionText = newRole === 'admin' ? 'Sub-Admin ලෙස පත් කිරීමට' : 'සාමාන්‍ය සාමාජිකයෙකු බවට පත්කිරීමට';
    if (!confirm(`ඔබට "${user.name}" (${user.email || 'No email'}) ${actionText} අවශ්‍ය බව තහවුරු කරන්නද?`)) {
        return;
    }

    try {
        const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
            role: newRole,
            roleUpdatedBy: currentAdminUser.email,
            roleUpdatedAt: Date.now()
        });

        // Dispatch celebratory notification to the user
        if (newRole === 'admin') {
            try {
                const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
                await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
                    recipientUid: uid,
                    senderUid: currentAdminUser.uid,
                    senderName: 'ප්‍රධාන පරිපාලක (Master Admin)',
                    type: 'system_alert',
                    title: '👑 සුබපැතුම්! ඔබව Admin මඩුල්ලට පත්කරන ලදී',
                    message: 'ප්‍රධාන පරිපාලක විසින් ඔබව "අපේ පිං පොත" Sub-Admin / Moderator වරයෙකු ලෙස පත් කරන ලදී. දැන් ඔබට පරිපාලක පුවරුවට (Admin Portal) පිවිසිය හැක.',
                    timestamp: Date.now(),
                    read: false,
                    link: 'admin.html'
                });
            } catch (notifErr) {
                console.warn('[Admin] Notif dispatch note:', notifErr);
            }
        }

        // Audit Log
        await recordAuditLog(
            `User Role Update`,
            `"${user.name}" ගේ තනතුර ${newRole === 'admin' ? 'Sub-Admin' : 'Member'} ලෙස වෙනස් කරන ලදී.`
        );

        alert(`සාර්ථකයි! "${user.name}" ගේ තනතුර ${newRole === 'admin' ? 'Sub-Admin' : 'සාමාන්‍ය සාමාජික'} ලෙස යාවත්කාලීන විය.`);
    } catch (err) {
        console.error('[Admin] toggleUserRole error:', err);
        alert('තනතුර වෙනස් කිරීමේදී දෝෂයක් ඇතිවිය: ' + err.message);
    }
};

window.toggleUserBan = async function(uid, shouldBan) {
    const user = allUsersList.find(u => u.uid === uid);
    if (!user) return;

    if (user.email && checkIsMasterAdmin(user.email)) {
        alert('Master Admin ව Ban කළ නොහැක.');
        return;
    }

    let reason = '';
    if (shouldBan) {
        reason = prompt(`"${user.name}" පද්ධතියෙන් නෙරපා හැරීමට (Ban කිරීමට) හේතුව සඳහන් කරන්න:`, 'ප්‍රජා නීති උල්ලංඝනය කිරීම (Community Guideline Violation)');
        if (!reason) return;
    } else {
        if (!confirm(`ඔබට "${user.name}" නැවත සක්‍රීය (Unban) කිරීමට අවශ්‍යද?`)) return;
    }

    try {
        const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
            isBanned: shouldBan,
            bannedReason: shouldBan ? reason : null,
            bannedAt: shouldBan ? Date.now() : null,
            bannedBy: currentAdminUser.email
        });

        // Audit Log
        await recordAuditLog(
            shouldBan ? 'User Banned' : 'User Unbanned',
            `"${user.name}" (${user.email || 'No email'}) ${shouldBan ? 'නෙරපා හරින ලදී (Ban). හේතුව: ' + reason : 'නැවත සක්‍රීය කරන ලදී (Unban).'}`
        );

        alert(`සාර්ථකයි! "${user.name}" ගිණුම ${shouldBan ? 'නෙරපා හරින ලදී (Ban)' : 'නැවත සක්‍රීය කරන ලදී (Active)'}.`);
    } catch (err) {
        console.error('[Admin] toggleUserBan error:', err);
        alert('Ban කිරීමේදී දෝෂයක් ඇතිවිය: ' + err.message);
    }
};

// ============================================================================
// 5. CONTENT MODERATION & FLAGGED WORDS SCANNING
// ============================================================================

function renderModerationFeed(postsToRender) {
    const container = document.getElementById('moderationFeedGrid');
    if (!container) return;

    if (!postsToRender || postsToRender.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 40px;">
                <i class="fa-solid fa-circle-check" style="font-size: 2rem; color: #10b981; margin-bottom: 8px;"></i>
                <p>පරීක්ෂා කිරීමට සටහන් නොමැත.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = postsToRender.map(post => {
        const title = post.title || 'පින්කමක්';
        const desc = post.description || '';
        const author = post.author || 'කල්‍යාණ මිත්‍ර';
        const dateStr = post.date || (post.timestamp ? new Date(post.timestamp).toLocaleString('si-LK') : 'අද');
        const img = post.image || (post.images && post.images[0]) || null;
        const isOfficial = Boolean(post.isOfficial || post.authorRole === 'official' || post.author === 'අපේ පිං පොත' || post.author === 'අපේ පින් පොත');

        // Scan for restricted keywords
        const combinedText = `${title} ${desc}`.toLowerCase();
        const foundBadWords = activeBannedWords.filter(w => combinedText.includes(w.toLowerCase()));
        const hasWarning = foundBadWords.length > 0;

        return `
            <div class="mod-card ${hasWarning ? 'has-warning' : ''}" id="mod-card-${post.id}" style="${isOfficial ? 'border: 1px solid var(--gold-light); background: rgba(245, 158, 11, 0.05);' : ''}">
                <div class="mod-card-header">
                    <div class="mod-author-info">
                        <div class="table-avatar" style="width: 32px; height: 32px; font-size: 0.8rem; ${isOfficial ? 'background: linear-gradient(135deg, #d97706, #b45309); color: #fff;' : ''}">
                            ${isOfficial ? '<i class="fa-solid fa-dharmachakra"></i>' : author.charAt(0)}
                        </div>
                        <div>
                            <div class="mod-author-name" style="display: flex; align-items: center; gap: 6px;">
                                <span>${Security.escapeHTML(isOfficial ? 'අපේ පිං පොත' : author)}</span>
                                ${isOfficial ? '<span style="font-size: 0.65rem; background: var(--gold-light); color: #78350f; padding: 1px 6px; border-radius: 4px; font-weight: 700;"><i class="fa-solid fa-bullhorn"></i> නිල නිවේදනය</span>' : ''}
                            </div>
                            <div class="mod-meta-date">📅 ${Security.escapeHTML(dateStr)} • ${Security.escapeHTML(post.category || 'සාමාන්‍ය')}</div>
                        </div>
                    </div>
                    <span style="font-size: 0.72rem; color: var(--gold-light); font-weight: 700;">
                        🙏 ${post.sadhuCount || 0}
                    </span>
                </div>

                ${hasWarning ? `
                    <div class="mod-flag-alert">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <span>සැක සහිත වචන හමුවිය: <strong>${foundBadWords.join(', ')}</strong></span>
                    </div>
                ` : ''}

                <div class="mod-title">${Security.escapeHTML(title)}</div>

                ${desc ? `
                    <div class="mod-desc-snippet">${Security.escapeHTML(desc)}</div>
                ` : ''}

                ${img ? `
                    <img src="${img}" class="mod-img-preview" alt="Post Attachment" loading="lazy">
                ` : ''}

                <div class="mod-card-actions" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
                    <div style="display: flex; gap: 6px;">
                        <a href="index.html?post=${encodeURIComponent(post.id)}" target="_blank" class="btn-table-action" style="text-decoration:none;">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i> බලන්න
                        </a>
                        <button class="btn-table-action" onclick="toggleOfficialPostByAdmin('${post.id}', ${isOfficial})" style="background: ${isOfficial ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.06)'}; color: ${isOfficial ? 'var(--gold-light)' : 'var(--text-secondary)'}; border: 1px solid ${isOfficial ? 'var(--gold-light)' : 'rgba(255,255,255,0.1)'};" title="${isOfficial ? 'නිල නිවේදන තත්වය ඉවත් කරන්න' : 'නිල නිවේදනයක් කරන්න'}">
                            <i class="fa-solid fa-bullhorn"></i> ${isOfficial ? 'Official (ඉවත් කරන්න)' : 'Official කරන්න'}
                        </button>
                    </div>

                    <div style="display: flex; gap: 6px;">
                        <button class="btn-table-action btn-table-ban" onclick="deletePostByAdmin('${post.id}', '${post.uid}')" title="මෙම සටහන ඉවත් කරන්න">
                            <i class="fa-solid fa-trash"></i> ඉවත් කරන්න
                        </button>
                        ${post.uid ? `
                            <button class="btn-table-action btn-table-ban" onclick="toggleUserBan('${post.uid}', true)" title="කර්තෘ Ban කරන්න">
                                <i class="fa-solid fa-user-slash"></i> Ban Author
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

window.toggleOfficialPostByAdmin = async function(postId, currentStatus) {
    if (!isMasterAdmin) {
        alert('මෙම ක්‍රියාව සඳහා Master Admin බලතල අවශ්‍යයි.');
        return;
    }
    const targetStatus = !currentStatus;
    const msg = targetStatus ? 
        'මෙම සටහන "අපේ පිං පොත නිල නිවේදනයක්" (Official Announcement) බවට පත් කිරීමට ඔබට අවශ්‍යද?' : 
        'මෙම සටහනේ නිල නිවේදන තත්වය ඉවත් කිරීමට ඔබට අවශ්‍යද?';
    if (!confirm(msg)) return;

    try {
        const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const updatePayload = {
            isOfficial: targetStatus,
            editedAt: Date.now()
        };
        if (targetStatus) {
            updatePayload.author = 'අපේ පිං පොත';
            updatePayload.authorRole = 'official';
            updatePayload.authorPhoto = null;
        }
        await updateDoc(doc(db, COLLECTIONS.POSTS, postId), updatePayload);
        await recordAuditLog(targetStatus ? 'Marked Post Official' : 'Unmarked Post Official', `Post ID ${postId} status changed to ${targetStatus}`);
        alert('සාර්ථකව යාවත්කාලීන විය!');
    } catch (err) {
        alert('දෝෂයකි: ' + err.message);
    }
};

window.publishOfficialFeedPost = async function(e) {
    if (e) e.preventDefault();
    if (!isMasterAdmin) {
        alert('මෙම ක්‍රියාව සඳහා Master Admin බලතල අවශ්‍යයි.');
        return;
    }
    const title = (document.getElementById('officialPostTitle')?.value || '').trim() || 'පිං පොත නිල නිවේදනය';
    const desc = (document.getElementById('officialPostDesc')?.value || '').trim();
    const imgUrl = (document.getElementById('officialPostImage')?.value || '').trim();
    const isPinned = Boolean(document.getElementById('officialPostPinned')?.checked);

    if (!desc) {
        alert('කරුණාකර නිවේදන විස්තරය ඇතුළත් කරන්න.');
        return;
    }

    const btn = document.getElementById('officialPostSubmitBtn');
    const origText = btn ? btn.innerHTML : '';
    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> පළ කරමින්...';
        }
        const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const payload = {
            uid: currentAdminUser.uid,
            author: 'අපේ පිං පොත',
            authorRole: 'official',
            authorPhoto: null,
            authorEmail: currentAdminUser.email,
            type: 'general',
            visibility: 'public',
            title: title,
            category: 'සාමාන්‍ය',
            location: '',
            contact: '',
            description: desc,
            image: imgUrl || null,
            images: imgUrl ? [imgUrl] : [],
            videoUrl: null,
            videoId: null,
            videoType: null,
            isShorts: false,
            videoThumbnail: null,
            isOfficial: true,
            isPinned: isPinned,
            timestamp: Date.now(),
            date: "දැන්",
            sadhuCount: 0,
            sadhuUsers: [],
            comments: [],
            shareCount: 0,
            repostCount: 0,
            serverCreatedAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, COLLECTIONS.POSTS), payload);
        await recordAuditLog('Published Official Post', `Official Post "${title}" (ID: ${docRef.id}) published to merit wall`);

        alert('📢 නිල නිවේදනය සාර්ථකව පවුරට පළ කරන ලදී!');
        document.getElementById('officialPostForm')?.reset();
    } catch (err) {
        alert('දෝෂයකි: ' + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origText;
        }
    }
};

window.filterModerationFeed = function() {
    const searchVal = (document.getElementById('modSearchInput')?.value || '').toLowerCase().trim();
    const filtered = allPostsList.filter(p => {
        const text = `${p.title || ''} ${p.description || ''} ${p.author || ''}`.toLowerCase();
        return !searchVal || text.includes(searchVal);
    });
    renderModerationFeed(filtered);
};

window.deletePostByAdmin = async function(postId, authorUid) {
    if (!confirm('ඔබට මෙම සටහන පද්ධතියෙන් සම්පූර්ණයෙන්ම ඉවත් කිරීමට අවශ්‍ය බව තහවුරු කරන්නද?')) {
        return;
    }

    try {
        const { doc, updateDoc, arrayUnion, setDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        
        // 1. Mark as deleted in merit_posts collection (or deleteDoc)
        await updateDoc(doc(db, COLLECTIONS.POSTS, postId), {
            isDeleted: true,
            deletedAt: Date.now(),
            deletedBy: currentAdminUser.email
        });

        // 2. Sync to cloud deleted_posts array in admin_settings
        await setDoc(doc(db, COLLECTIONS.SETTINGS, 'deleted_posts'), {
            ids: arrayUnion(postId),
            updatedAt: Date.now()
        }, { merge: true });

        // Audit Log
        await recordAuditLog(
            'Post Deleted',
            `පරිපාලක විසින් සටහන (ID: ${postId}) ඉවත් කරන ලදී.`
        );

        alert('සටහන සාර්ථකව ඉවත් කරන ලදී!');
    } catch (err) {
        console.error('[Admin] deletePostByAdmin error:', err);
        alert('සටහන ඉවත් කිරීමේදී දෝෂයක් ඇතිවිය: ' + err.message);
    }
};

// ============================================================================
// 6. GROWTH ANALYTICS CHART (CHART.JS)
// ============================================================================

function renderGrowthChart(users) {
    const canvas = document.getElementById('growthChartCanvas');
    if (!canvas || typeof Chart === 'undefined') return;

    // Generate date buckets for the last N days
    const days = currentChartDays || 14;
    const labels = [];
    const userCounts = [];
    const postCounts = [];

    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const dayStr = `${d.getMonth() + 1}/${d.getDate()}`;
        labels.push(dayStr);

        // Start and end of day timestamp
        const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).getTime();
        const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).getTime();

        // Count users joined on this day
        const usersToday = users.filter(u => {
            const uTime = u.createdAt || u.updatedAt || 0;
            return uTime >= startOfDay && uTime <= endOfDay;
        }).length;
        userCounts.push(usersToday);

        // Count posts on this day
        const postsToday = allPostsList.filter(p => {
            const pTime = p.timestamp || 0;
            return pTime >= startOfDay && pTime <= endOfDay;
        }).length;
        postCounts.push(postsToday);
    }

    if (growthChartInstance) {
        growthChartInstance.destroy();
    }

    const ctx = canvas.getContext('2d');
    const goldGradient = ctx.createLinearGradient(0, 0, 0, 300);
    goldGradient.addColorStop(0, 'rgba(245, 158, 11, 0.45)');
    goldGradient.addColorStop(1, 'rgba(245, 158, 11, 0.02)');

    const tealGradient = ctx.createLinearGradient(0, 0, 0, 300);
    tealGradient.addColorStop(0, 'rgba(13, 148, 136, 0.35)');
    tealGradient.addColorStop(1, 'rgba(13, 148, 136, 0.02)');

    growthChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'නව සාමාජිකයින් (New Signups)',
                    data: userCounts,
                    borderColor: '#fbbf24',
                    backgroundColor: goldGradient,
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.35,
                    pointBackgroundColor: '#f59e0b',
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: 'පින්කම් සටහන් (New Merits)',
                    data: postCounts,
                    borderColor: '#2dd4bf',
                    backgroundColor: tealGradient,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.35,
                    pointBackgroundColor: '#0d9488',
                    pointRadius: 3,
                    pointHoverRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#cbd5e1',
                        font: { family: "'Inter', sans-serif", size: 12 }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#fbbf24',
                    bodyColor: '#f8fafc',
                    borderColor: 'rgba(245, 158, 11, 0.3)',
                    borderWidth: 1,
                    padding: 10
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { color: '#94a3b8', font: { size: 11 } }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { 
                        color: '#94a3b8', 
                        font: { size: 11 },
                        stepSize: 1
                    }
                }
            }
        }
    });
}

window.setChartRange = function(days) {
    currentChartDays = days;
    const btns = document.querySelectorAll('.chart-filter-btn');
    btns.forEach(b => {
        b.classList.remove('active');
        if (b.innerText.includes(days.toString())) b.classList.add('active');
    });
    renderGrowthChart(allUsersList);
};

// ============================================================================
// 7. SYSTEM SETTINGS & AUDIT LOGGING
// ============================================================================

window.saveGlobalAnnouncement = async function() {
    if (!isMasterAdmin) {
        alert('පද්ධති නිවේදන වෙනස් කිරීමේ බලය ඇත්තේ Master Admin ට පමණි.');
        return;
    }

    const text = document.getElementById('settingAnnounceText')?.value || '';
    const active = !!document.getElementById('settingAnnounceActive')?.checked;

    try {
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        await setDoc(doc(db, COLLECTIONS.SETTINGS, 'global_announcement'), {
            text: text.trim(),
            active: active,
            updatedAt: Date.now(),
            updatedBy: currentAdminUser.email
        }, { merge: true });

        await recordAuditLog('Announcement Updated', `පද්ධති නිවේදනය යාවත්කාලීන කරන ලදී: "${text.substring(0, 50)}..." (Active: ${active})`);
        alert('නිවේදනය සාර්ථකව සුරකින ලදී!');
    } catch (err) {
        alert('දෝෂයක් ඇතිවිය: ' + err.message);
    }
};

window.saveBannedKeywords = async function() {
    if (!isMasterAdmin) {
        alert('තහනම් වචන වෙනස් කිරීමේ බලය ඇත්තේ Master Admin ට පමණි.');
        return;
    }

    const raw = document.getElementById('settingBannedWordsInput')?.value || '';
    const words = raw.split(',').map(w => w.trim()).filter(w => w.length > 0);

    try {
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        await setDoc(doc(db, COLLECTIONS.SETTINGS, 'banned_words'), {
            words: words,
            updatedAt: Date.now(),
            updatedBy: currentAdminUser.email
        }, { merge: true });

        activeBannedWords = words;
        await recordAuditLog('Banned Words Updated', `තහනම් වචන ලැයිස්තුව (${words.length} words) යාවත්කාලීන කරන ලදී.`);
        alert('තහනම් වචන නාමාවලිය සාර්ථකව සුරකින ලදී!');
        renderModerationFeed(allPostsList);
    } catch (err) {
        alert('දෝෂයක් ඇතිවිය: ' + err.message);
    }
};

async function recordAuditLog(action, details) {
    if (!db || !currentAdminUser) return;
    try {
        const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        await addDoc(collection(db, 'admin_audit_logs'), {
            action: action,
            details: details,
            actorName: isMasterAdmin ? 'මලිත් දුෂාන්ත හපුතන්ත්‍රි' : (currentAdminUser.displayName || 'Sub-Admin'),
            actorEmail: currentAdminUser.email,
            isMaster: isMasterAdmin,
            timestamp: Date.now()
        });
    } catch (err) {
        console.warn('[Admin] Audit log recording note:', err);
    }
}

window.loadAuditLogs = async function() {
    const container = document.getElementById('auditListContainer');
    if (!container || !db) return;

    try {
        const { collection, query, orderBy, limit, getDocs } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const q = query(collection(db, 'admin_audit_logs'), orderBy('timestamp', 'desc'), limit(30));
        const snap = await getDocs(q);

        if (snap.empty) {
            container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px;">ක්‍රියාකාරකම් සටහන් තවම නොමැත.</div>`;
            return;
        }

        const logs = [];
        snap.forEach(d => logs.push(d.data()));

        container.innerHTML = logs.map(l => {
            const timeStr = l.timestamp ? new Date(l.timestamp).toLocaleString('si-LK') : 'මෑතකදී';
            return `
                <div class="audit-item">
                    <div>
                        <div class="audit-actor">${Security.escapeHTML(l.actorName || 'Admin')} <span style="font-size:0.7rem; color:var(--text-muted);">(${l.action || 'Action'})</span></div>
                        <div class="audit-action-text">${Security.escapeHTML(l.details || '')}</div>
                    </div>
                    <div class="audit-time">🕒 ${Security.escapeHTML(timeStr)}</div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.warn('[Admin] loadAuditLogs error:', err);
    }
};

// ============================================================================
// 8. TAB NAVIGATION
// ============================================================================

window.switchAdminTab = function(tabId) {
    const sections = {
        'overview': document.getElementById('sectionOverview'),
        'users': document.getElementById('sectionUsers'),
        'moderation': document.getElementById('sectionModeration'),
        'settings': document.getElementById('sectionSettings'),
        'audit': document.getElementById('sectionAudit')
    };

    const buttons = document.querySelectorAll('.nav-pill-btn');

    Object.keys(sections).forEach((key, idx) => {
        if (sections[key]) {
            if (key === tabId) {
                sections[key].classList.add('active');
            } else {
                sections[key].classList.remove('active');
            }
        }
    });

    buttons.forEach(b => {
        b.classList.remove('active');
        if (b.getAttribute('onclick')?.includes(tabId)) {
            b.classList.add('active');
        }
    });

    if (tabId === 'overview') {
        setTimeout(() => renderGrowthChart(allUsersList), 100);
    }
};
