# 🪷 පිං පොත | කල්‍යාණ මිත්‍ර පුණ්‍ය ජාලය

සැදැහැවතුන් සඳහා නිර්මාණය කරන ලද, ආරක්ෂිත සහ නවීන බෞද්ධ පුණ්‍ය සටහන් ජාලය (Social Merit Network).

---

## 📁 ගොනු ව්‍යුහය (File Architecture)

```text
පි/
├── index.html              # ප්‍රධාන HTML5 ව්‍යුහය (Semantic & Clean)
├── firestore.rules         # Hacker-proof Server-side Security Rules
├── css/
│   └── styles.css          # Pure CSS3 Design System (Custom Buddhist Theme)
├── js/
│   ├── app.js              # UI Controllers, Tab/Category State & Event Listeners
│   ├── security.js         # Anti-XSS Sanitizer, Strict Schema & Phone Validation
│   ├── storage.js          # Unified Firestore Database & Local Sandbox Layer
│   └── firebase-config.js  # Firebase Project Configuration Keys
└── assets/                 # Icons & Static Assets
```

---

## 🛡️ ක්‍රියාත්මක කර ඇති ආරක්ෂක පියවර (Security Implementations)

1. **Anti-XSS (Cross-Site Scripting) Defense:**
   - [js/security.js](file:///g:/My%20Project/පි/js/security.js) මඟින් පරිශීලකයා ඇතුළත් කරන සියලුම මාතෘකා, විස්තර, අදහස් දැක්වීම් HTML Entity Encoding මඟින් පිරිසිදු කර (Sanitize) render කරනු ලැබේ. කිසිදු Script injection එකක් ක්‍රියාත්මක කළ නොහැක.
2. **Strict Schema & Whitelist Validation:**
   - අවසර ලත් වර්ගීකරණයන් (`දානමය`, `සීලමය`, `භාවනාමය`, `සමාජ සත්කාර`) සහ අකුරු සීමාවන් සත්‍යාපනය කෙරේ.
3. **Anti-Spam Rate Limiting:**
   - Bots මඟින් පෝස්ට් ගංවතුරක් (Spam flood) එවීම වැළැක්වීමට Client-side cooldown පාලනයක් ඇත.
4. **Hacker-proof Database Rules:**
   - [firestore.rules](file:///g:/My%20Project/පි/firestore.rules) මඟින් අනුන්ගේ පෝස්ට් වෙනස් කිරීම හෝ මැකීම Server මට්ටමින්ම සම්පූර්ණයෙන්ම වළක්වා ඇත.

---

## 🔥 Firebase Cloud සජීවීව සම්බන්ධ කරන ආකාරය

1. [Firebase Console](https://console.firebase.google.com) වෙත පිවිස නොමිලේ අලුත් Project එකක් සාදන්න.
2. **Build > Cloud Firestore** වෙත ගොස් Database එක Create කරන්න.
3. **Build > Authentication** වෙත ගොස් **Google** හෝ **Email/Password** Sign-In සක්‍රීය කරන්න.
4. **Project Settings > General** වෙත ගොස් **Web App (</>)** එකක් සාදා එහි ලැබෙන keys ටික [js/firebase-config.js](file:///g:/My%20Project/පි/js/firebase-config.js) හි ඇති `firebaseConfig` තුළට Paste කරන්න.
5. [firestore.rules](file:///g:/My%20Project/පි/firestore.rules) හි ඇති කේතය Firebase Console හි **Firestore > Rules** තුළට Paste කර Publish කරන්න.

> **සටහන:** Firebase Keys ඇතුළත් කරන තුරුත්, පද්ධතිය **Secure Local Sandbox Mode** එකකින් ස්වයංක්‍රීයව කිසිදු බිඳවැටීමකින් තොරව ක්‍රියාත්මක වේ.
