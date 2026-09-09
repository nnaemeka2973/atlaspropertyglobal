import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth,
    GoogleAuthProvider,
    OAuthProvider,
    browserLocalPersistence,
    setPersistence
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDqE7Pna_S24rbz_-dmO20bTufnADPRYAU",
    authDomain: "atlasproperty-8f739-6a3bb.firebaseapp.com",
    projectId: "atlasproperty-8f739-6a3bb",
    storageBucket: "atlasproperty-8f739-6a3bb.firebasestorage.app",
    messagingSenderId: "794453200261",
    appId: "1:794453200261:web:0dac2baee6a1569839c8ec"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

await setPersistence(auth, browserLocalPersistence);

const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
    prompt: "select_account"
});

const appleProvider = new OAuthProvider("apple.com");

export {
    auth,
    googleProvider,
    appleProvider
};