const firebaseConfig = {
    apiKey: "AIzaSyAmbzRxqYFti6IEksy2WunKCVa_v8Gg0F0",
    authDomain: "market-digital-3d10e.firebaseapp.com",
    projectId: "market-digital-3d10e",
    storageBucket: "market-digital-3d10e.firebasestorage.app",
    messagingSenderId: "368580098929",
    appId: "1:368580098929:web:7e005211ceb83b3b9794d0",
    measurementId: "G-Q985QSMDDT"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

let isLoginMode = true;
let currentChatId = null;

// --- Authentication Logic ---
function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    document.getElementById('authSubtitle').innerText = isLoginMode ? "เข้าสู่ระบบเพื่อเข้าสู่ตลาดนักศึกษา" : "สร้างบัญชีใหม่เพื่อเริ่มใช้งาน";
    document.getElementById('btnAuth').innerText = isLoginMode ? "เข้าสู่ระบบ" : "สมัครสมาชิก";
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

// --- Image Preview Logic ---
function previewImg(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = () => {
            const img = document.getElementById('imgPre');
            img.src = reader.result;
            img.style.display = 'block';
            document.getElementById('uploadLabel').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

// --- Marketplace Logic ---
async function savePost() {
    const file = document.getElementById('pImage').files[0];
    const btn = document.getElementById('btnSave');
    if (!file) return alert("กรุณาเลือกรูปภาพสินค้า");

    btn.disabled = true;
    btn.innerText = "กำลังอัปโหลด...";

    try {
        const fileRef = storage.ref(`products/${Date.now()}_${file.name}`);
        const uploadTask = await fileRef.put(file);
        const imgUrl = await uploadTask.ref.getDownloadURL();

        await db.collection("market_posts").add({
            title: document.getElementById('pTitle').value,
            cat: document.getElementById('pCat').value,
            price: Number(document.getElementById('pPrice').value),
            desc: document.getElementById('pDesc').value,
            img: imgUrl,
            owner: auth.currentUser.email,
            time: firebase.firestore.FieldValue.serverTimestamp()
        });

        closeModal('postModal');
        alert("ลงประกาศสำเร็จ!");
    } catch (e) { alert(e.message); } finally {
        btn.disabled = false;
        btn.innerText = "ยืนยันโพสต์";
    }
}

function loadProducts(filter = 'ทั้งหมด') {
    db.collection("market_posts").orderBy("time", "desc").onSnapshot(snap => {
        const grid = document.getElementById('productGrid');
        grid.innerHTML = '';
        snap.forEach(doc => {
            const p = doc.data();
            if (filter !== 'ทั้งหมด' && p.cat !== filter) return;
            
            grid.innerHTML += `
                <div class="card">
                    <img src="${p.img}" class="card-img">
                    <small style="color:#666">${p.cat}</small>
                    <h3 style="margin:5px 0;">${p.title}</h3>
                    <p class="price-tag">฿${p.price.toLocaleString()}</p>
                    <button class="btn-primary" onclick="openChat('${doc.id}', '${p.title}')">💬 ติดต่อผู้ขาย</button>
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

// --- Chat Logic ---
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
            const isMe = d.user === auth.currentUser.email;
            box.innerHTML += `
                <div style="align-self: ${isMe ? 'flex-end' : 'flex-start'}; 
                            background: ${isMe ? 'var(--primary)' : '#eee'}; 
                            color: ${isMe ? 'white' : 'black'};
                            padding: 8px 12px; border-radius: 12px; max-width: 80%; font-size: 0.9rem;">
                    ${d.text}
                </div>`;
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
