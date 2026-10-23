/* Firebase setup and admin sign-in shared by tracker.html and shop.html. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { slugify } from './helpers.js';

export * from './helpers.js';

const firebaseConfig = {
  apiKey: "AIzaSyAKWEE1hTCYi2OJIu728l3OTW4f8WKbmOY",
  authDomain: "portfolio-fbb02.firebaseapp.com",
  projectId: "portfolio-fbb02",
  storageBucket: "portfolio-fbb02.firebasestorage.app",
  messagingSenderId: "261396568216",
  appId: "1:261396568216:web:8ad49c7dee49d2567218ed"
};
export const ADMIN_EMAIL = 'joshuarstacy@gmail.com';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(()=>{});
export const db = getFirestore(app);
export const $ = id => document.getElementById(id);

/* Wires the sign-in box. Expects #gate, #app, #who, #email, #signin, #signout, #gateMsg. */
export function gate({onIn, onOut}){
  const provider = new GoogleAuthProvider();
  let started = false;
  $('gate').hidden = true;   // stays hidden until Firebase has checked for a saved sign-in
  $('signin').addEventListener('click', ()=>{
    $('gateMsg').textContent = '';
    signInWithPopup(auth, provider).catch(ex=>{
      $('gateMsg').textContent = 'Sign-in failed (' + (ex.code || 'error') + ').';
    });
  });
  $('signout').addEventListener('click', e=>{ e.preventDefault(); signOut(auth); });
  onAuthStateChanged(auth, user=>{
    if(!user){
      started = false;
      if(onOut) onOut();
      $('app').hidden = true; $('who').hidden = true; $('gate').hidden = false;
      return;
    }
    if(user.email !== ADMIN_EMAIL){
      $('gateMsg').textContent = user.email + ' is not authorized here.';
      signOut(auth);
      return;
    }
    $('gate').hidden = true; $('app').hidden = false; $('who').hidden = false;
    $('email').textContent = user.email;
    if(!started){ started = true; onIn(user); }
  });
}

/* Every logged view of the booking page: [{at: ms, src}] */
export async function loadViewRows(){
  const snap = await getDocs(query(collection(db, 'visits'), where('page', '==', 'friday13')));
  return snap.docs.map(d=>{
    const x = d.data();
    return {at: x.at && x.at.toMillis ? x.at.toMillis() : 0, src: x.src || ''};
  });
}

/* Reserve a unique tag for a shop: beeline, beeline-2, beeline-3 ... Returns the tag. */
export async function claimTag(base, shopId, note){
  const root = slugify(base) || 'shop';
  let tag = root, n = 1;
  for(;;){
    const snap = await getDoc(doc(db, 'tags', tag));
    if(!snap.exists()) break;
    n++;
    tag = root.slice(0, 26).replace(/-+$/, '') + '-' + n;
  }
  await setDoc(doc(db, 'tags', tag), {shopId, note, createdAt: serverTimestamp()});
  return tag;
}
