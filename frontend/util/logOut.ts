import router from "next/router";

import { signOut } from "firebase/auth";

import auth from "@/lib/firebase/auth";

export default async function logOut() {
    await router.push("/");
    await signOut(auth);
}
