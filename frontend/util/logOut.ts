import { signOut } from "firebase/auth";
import router from "next/router";

import auth from "@/lib/firebase/auth";

export default async function logOut() {
    await router.push("/");
    await signOut(auth);
}
