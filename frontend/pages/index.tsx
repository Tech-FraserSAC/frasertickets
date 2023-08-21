import { useFirebaseAuth } from "@/components/FirebaseAuthContext"

export default function Home() {
  const { user, loaded } = useFirebaseAuth()

  if (loaded) user?.getIdToken(true).then(console.log)
  return (
    <></>
  )
}
