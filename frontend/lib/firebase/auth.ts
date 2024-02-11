import { getAuth } from "firebase/auth";

import initializeFirebase from "@/lib/firebase/app";

initializeFirebase();
export default getAuth();
