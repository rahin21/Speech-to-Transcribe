// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDbMu7CFSb1U_xiSc0bScSqvG40kChF5gM",
  authDomain: "transcription-d9c70.firebaseapp.com",
  projectId: "transcription-d9c70",
  storageBucket: "transcription-d9c70.appspot.com",
  messagingSenderId: "650121212359",
  appId: "1:650121212359:web:7741b9d6da4a2830f629e2",
  measurementId: "G-WL4V7V6YXY"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);