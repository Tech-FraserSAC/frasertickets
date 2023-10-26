import { useFirebaseAuth } from "@/components/FirebaseAuthContext"
import Layout from "@/components/Layout"
import Navbar from "@/components/landing/Navbar"
import Hero from "@/components/landing/Hero"

export default function Home() {
  const { user, loaded } = useFirebaseAuth()

  return (
    <Layout name="Home">
      <Navbar />
      <Hero />
    </Layout>
  )
}
