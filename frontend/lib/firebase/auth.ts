import { getAuth } from "firebase/auth"
import initializeFirebase from "./app"

initializeFirebase()
export default getAuth()