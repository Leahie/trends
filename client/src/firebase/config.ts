import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../../firebaseConfig.json";

//initialize firebase
const app = initializeApp(firebaseConfig)

//export services
export const auth = getAuth(app)
export const db = getFirestore(app)
