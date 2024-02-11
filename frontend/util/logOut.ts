import auth from "@/lib/firebase/auth";
import { signOut } from "firebase/auth";
import router from "next/router";

export default async function logOut() {
    await router.push("/");
    await signOut(auth);
}
