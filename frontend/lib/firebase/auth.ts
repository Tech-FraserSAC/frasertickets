import initializeFirebase from "./app";
import { getAuth } from "firebase/auth";

initializeFirebase();
export default getAuth();
