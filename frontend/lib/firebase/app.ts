import { initializeApp, getApps } from "firebase/app"
import config from "./config"

export default function initializeFirebase() {
    if (getApps().length === 0) {
        try {
            initializeApp(config)
        } catch (error: any) {
            console.error("Firebase initialization error:", error.stack)
        }
    }
}