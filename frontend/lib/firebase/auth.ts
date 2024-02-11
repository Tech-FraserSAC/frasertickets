import initializeFirebase from "@/lib/firebase/app";
import { getAuth } from "firebase/auth";

initializeFirebase();
export default getAuth();
