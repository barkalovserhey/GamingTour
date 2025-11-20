// === ВСТАВЬ СВОЙ firebaseConfig СЮДА (из файла firebase-config.txt) ===
const firebaseConfig = {
 apiKey: "AIzaSyCTw4hEc73KFbHaMwq2KIySFrEGTnaVGQ8",
  authDomain: "gamingtour-app.firebaseapp.com",
  projectId: "gamingtour-app",
  storageBucket: "gamingtour-app.firebasestorage.app",
  messagingSenderId: "848958204764",
  appId: "1:848958204764:web:dad0da2a1093314e7eef99",
  measurementId: "G-QG9KY4767L"
};
// ============================================================

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Ключи LiqPay (вставь свои из liqpay-keys.txt)
const LIQPAY_PUBLIC_KEY = "sandbox_i43605538655";   // замени на свой
const LIQPAY_PRIVATE_KEY = "sandbox_wRDEL4eGMvbXoELfpYSsme2RZ2NzzPE6a4yUpKEV"; // замени

// ================== АВТОРИЗАЦИЯ ==================
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userEmailSpan = document.getElementById('userEmail');

loginBtn.onclick = () => {
  const email = prompt('Email:');
  const password = prompt('Пароль (минимум 6 символов):');
  auth.signInWithEmailAndPassword(email, password)
    .catch(err => {
      if (err.code === 'auth/user-not-found') {
        auth.createUserWithEmailAndPassword(email, password);
      }
    });
};

logoutBtn.onclick = () => auth.signOut();

auth.onAuthStateChanged(user => {
  if (user) {
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'block';
    userEmailSpan.textContent = user.email;
    loadTournaments();
  } else {
    loginBtn.style.display = 'block';
    logoutBtn.style.display = 'none';
    userEmailSpan.textContent = '';
    document.getElementById('tournamentsList').innerHTML = '';
  }
});

// ================== МОДАЛЬНОЕ ОКНО ==================
const modal = document.getElementById('createModal');
const createBtn = document.getElementById('createBtn');
const closeBtn = document.getElementsByClassName('close')[0];

createBtn.onclick = () => { if (auth.currentUser) modal.style.display = 'block'; };
closeBtn.onclick = () => modal.style.display = 'none';
window.onclick = e => { if (e.target === modal) modal.style.display = 'none'; };

// ================== СОЗДАНИЕ ТУРНИРА ==================
document.getElementById('submitTournament').onclick = () => {
  const name = document.getElementById('tName').value;
  const fee = parseInt(document.getElementById('tFee').value);
  const prize = parseInt(document.getElementById('tPrize').value);
  const game = document.getElementById('tGame').value;

  db.collection('tournaments').add({
    name,
    fee,
    prize,
    game,
    creator: auth.currentUser.email,
    participants: [],
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    alert('Турнир создан!');
    modal.style.display = 'none';
    loadTournaments();
  });
};

// ================== ЗАГРУЗКА ТУРНИРОВ ==================
function loadTournaments() {
  db.collection('tournaments').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
    const list = document.getElementById('tournamentsList');
    list.innerHTML = '';
    snapshot.forEach(doc => {
      const t = doc.data();
      const div = document.createElement('div');
      div.className = 'tournament';
      div.innerHTML = `
        <h3>${t.name}</h3>
        <p>Игра: ${t.game.toUpperCase()}</p>
        <p>Взнос: ${t.fee} грн</p>
        <p>Приз: ${t.prize} грн</p>
        <p>Участников: ${t.participants.length}</p>
        <button onclick="joinTournament('${doc.id}', ${t.fee})">Присоединиться</button>
      `;
      list.appendChild(div);
    });
  });
}

// ================== ПРИСОЕДИНЕНИЕ + ОПЛАТА ==================
window.joinTournament = (id, amount) => {
  if (!auth.currentUser) return alert('Сначала войди!');

  const data = {
    version: 3,
    public_key: LIQPAY_PUBLIC_KEY,
    action: "pay",
    amount: amount,
    currency: "UAH",
    description: "Взнос в турнир GamingTour",
    order_id: id + "_" + Date.now(),
    result_url: window.location.href,
    server_url: "" // можно оставить пустым в тесте
  };

  let str = btoa(JSON.stringify(data));
  let signature = btoa(SHA1(LIQPAY_PRIVATE_KEY + str + LIQPAY_PRIVATE_KEY));

  const form = document.createElement('form');
  form.action = 'https://www.liqpay.ua/api/3/checkout';
  form.method = 'POST';
  form.innerHTML = `
    <input type="hidden" name="data" value="${str}">
    <input type="hidden" name="signature" value="${signature}">
  `;
  document.body.appendChild(form);
  form.submit();
};

// SHA1 для подписи LiqPay (простая реализация)
function SHA1(msg) {
  function rotate_left(n,s) { return (n<<s) | (n>>> (32-s)); }
  function cvt_hex(val) {
    let str = "";
    for (let i = 7; i >= 0; i--) { str += (val>>> (i*4)) & 0x0f.toString(16); }
    return str;
  }
  msg += String.fromCharCode(0x80);
  let l = msg.length/4 + 2;
  let N = Math.ceil(l/16);
  let M = new Array(N);
  for (let i=0; i<N; i++) { M[i] = new Array(16); for (let j=0; j<16; j++) { M[i][j] = (msg.charCodeAt(i*64+j*4)<<24) | (msg.charCodeAt(i*64+j*4+1)<<16) | (msg.charCodeAt(i*64+j*4+2)<<8) | (msg.charCodeAt(i*64+j*4+3)); } }
  M[N-1][14] = ((msg.length-1)*8) / Math.pow(2, 32); M[N-1][14] = Math.floor(M[N-1][14]);
  M[N-1][15] = ((msg.length-1)*8) & 0xffffffff;
  let H0 = 0x67452301, H1 = 0xEFCDAB89, H2 = 0x98BADCFE, H3 = 0x10325476, H4 = 0xC3D2E1F0;
  let W = new Array(80); let a,b,c,d,e;
  for (let i=0; i<N; i++) {
    for (let t=0; t<16; t++) W[t] = M[i][t];
    for (let t=16; t<80; t++) W[t] = rotate_left(W[t-3] ^ W[t-8] ^ W[t-14] ^ W[t-16], 1);
    a = H0; b = H1; c = H2; d = H3; e = H4;
    for (let t=0; t<80; t++) {
      let temp = rotate_left(a,5) + ((t<20)?( (b&c)|(~b&d) ) : (t<40)? (b^c^d) : (t<60)? ((b&c)|(b&d)|(c&d)) : (b^c^d)) + e + W[t] + [0x5a827999,0x6ed9eba1,0x8f1bbcdc,0xca62c1d6][Math.floor(t/20)] | 0;
      e = d; d = c; c = rotate_left(b,30); b = a; a = temp;
    }
    H0 = (H0 + a) | 0; H1 = (H1 + b) | 0; H2 = (H2 + c) | 0; H3 = (H3 + d) | 0; H4 = (H4 + e) | 0;
  }
  return cvt_hex(H0) + cvt_hex(H1) + cvt_hex(H2) + cvt_hex(H3) + cvt_hex(H4);
}