const firebaseConfig = {
    apiKey: "AIzaSyAmbzRxqYFti6IEksy2WunKCVa_v8Gg0F0",
    authDomain: "market-digital-3d10e.firebaseapp.com",
    projectId: "market-digital-3d10e",
    storageBucket: "market-digital-3d10e.firebasestorage.app",
    messagingSenderId: "368580098929",
    appId: "1:368580098929:web:7e005211ceb83b3b9794d0",
    measurementId: "G-Q985QSMDDT"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let isLoginMode = true;
let currentChatId = null;

// --- 1. ระบบ Authentication ---
function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    document.getElementById('authSubtitle').innerText = isLoginMode ? "เข้าสู่ระบบเพื่อเข้าสู่ตลาดนักศึกษา" : "สร้างบัญชีใหม่เพื่อเริ่มช้อป";
    document.getElementById('btnAuth').innerText = isLoginMode ? "เข้าสู่ระบบ" : "สมัครสมาชิก";
    document.getElementById('btnToggle').innerText = isLoginMode ? "สมัครสมาชิก" : "เข้าสู่ระบบ";
}

async function handleAuth() {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    try {
        if (isLoginMode) await auth.signInWithEmailAndPassword(email, pass);
        else await auth.createUserWithEmailAndPassword(email, pass);
    } catch (e) { alert(e.message); }
}

auth.onAuthStateChanged(user => {
    document.getElementById('authView').style.display = user ? 'none' : 'flex';
    document.getElementById('appView').style.display = user ? 'block' : 'none';
    if (user) loadProducts();
});

function logout() { auth.signOut(); }

// --- 2. Marketplace & Filtering ---
async function savePost() {
    const post = {
        title: document.getElementById('pTitle').value,
        cat: document.getElementById('pCat').value,
        price: Number(document.getElementById('pPrice').value),
        desc: document.getElementById('pDesc').value,
        owner: auth.currentUser.email,
        time: firebase.firestore.FieldValue.serverTimestamp()
    };
    await db.collection("market_posts").add(post);
    closeModal('postModal');
}

function loadProducts(filter = 'ทั้งหมด') {
    db.collection("market_posts").orderBy("time", "desc").onSnapshot(snap => {
        const grid = document.getElementById('productGrid');
        grid.innerHTML = '';
        snap.forEach(doc => {
            const data = doc.data();
            if (filter !== 'ทั้งหมด' && data.cat !== filter) return;
            
            grid.innerHTML += `
                <div class="card">
                    <small style="color:#666">${data.cat}</small>
                    <h3>${data.title}</h3>
                    <p class="price-tag">฿${data.price.toLocaleString()}</p>
                    <button class="btn-primary" onclick="openChat('${doc.id}', '${data.title}')">💬 สอบถามแชท</button>
                </div>
            `;
        });
    });
}

function filterCat(cat) {
    document.querySelectorAll('#catMenu li').forEach(li => li.classList.remove('active'));
    event.target.classList.add('active');
    loadProducts(cat);
}

// --- 3. ระบบแชท ---
function openChat(id, title) {
    currentChatId = id;
    document.getElementById('chatBox').style.display = 'flex';
    document.getElementById('chatTitle').innerText = title;
    db.collection("market_posts").doc(id).collection("messages").orderBy("time")
    .onSnapshot(snap => {
        const box = document.getElementById('chatMsgs');
        box.innerHTML = '';
        snap.forEach(m => {
            const d = m.data();
            box.innerHTML += `<div><b>${d.user.split('@')[0]}:</b> ${d.text}</div>`;
        });
        box.scrollTop = box.scrollHeight;
    });
}

async function sendMsg() {
    const text = document.getElementById('msgInput').value;
    if (!text) return;
    await db.collection("market_posts").doc(currentChatId).collection("messages").add({
        text, user: auth.currentUser.email, time: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('msgInput').value = '';
}

// Helpers
function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function closeChat() { document.getElementById('chatBox').style.display = 'none'; }
