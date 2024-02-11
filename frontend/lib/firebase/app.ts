import config from "@/lib/firebase/config";
import { getApps, initializeApp } from "firebase/app";

export default function initializeFirebase() {
    if (getApps().length === 0) {
        try {
            initializeApp(config);
        } catch (error: any) {
            console.error("Firebase initialization error:", error.stack);
        }
    }
}
