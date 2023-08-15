import Image from 'next/image'
import router from 'next/router'
import { Montserrat, Roboto } from 'next/font/google'
import { useFirebaseAuth } from '@/components/FirebaseAuthContext'
import { GoogleAuthProvider, browserLocalPersistence, getRedirectResult, onAuthStateChanged, setPersistence, signInWithRedirect, signOut } from 'firebase/auth'
import auth from '@/lib/firebase/auth'

import GoogleSignIn from '@/assets/btn_google_dark_normal_ios.svg'
import { useEffect } from 'react'

const montserrat = Montserrat({ subsets: ['latin'] })
const roboto = Roboto({ subsets: ['latin'], weight: ['500'] })

export default function Home() {
  const user = useFirebaseAuth()

  const authProvider = new GoogleAuthProvider()
  authProvider.setCustomParameters({
    // Currently commented out because of new (stupid) Google admin rule
    // login_hint: "000000@pdsb.net",
    // hd: "pdsb.net", // Only allows users part of pdsb.net organization
  })

  const logIn = () => {
    // Prompt user to log in
    setPersistence(auth, browserLocalPersistence).then(() => {
      return signInWithRedirect(auth, authProvider)
    })
  }

  const sendRequestToBackend = async () => {
    const token = await user?.getIdToken()

    const res = await fetch("http://localhost:3001/events", {
      method: "GET",
      mode: "cors",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })

    console.log(res.status)
    console.log(await res.json())
  }

  const logOut = () => {
    signOut(auth)
  }

  // Check whether a new login occured, if so, try to create a user object in DB
  useEffect(() => {
    (async () => {
      const redirectRes = await getRedirectResult(auth)

      if (redirectRes) {
        const token = await redirectRes?.user.getIdToken()

        try {
          // Try registering them if they're weren't already
          await fetch("http://localhost:3001/users/add", {
            method: "POST",
            mode: "cors",
            headers: {
              "Authorization": `Bearer ${token}`
            }
          })

          router.push("/")
        } catch (e) {
          alert("Sorry, something went wrong when signing you in.")
          console.error(e)

          // Sign them out so they can sign in again
          await signOut(auth)
        }
      }
    })()
  }, [])

  return (
    <main className={`${montserrat.className}`}>
      <h1 className='text-2xl'>FraserTickets</h1>

      {user ? (
        <>
          <p className='text-xl font-semibold'>
            Signed in as {user.email}
          </p>

          <button onClick={sendRequestToBackend}>
            Send request
          </button>

          <br />

          <button onClick={logOut}>
            Log out
          </button>
        </>
      ) : (
        <button onClick={logIn} className='flex flex-row items-center bg-[#4285F4] h-[40px] pr-[8px] m-4 rounded-sm'>
          <Image src={GoogleSignIn} alt="google sign in" className='ml-[-3px]' />
          <span className='ml-[8px] text-white text-[14px] w-max' style={roboto.style}>Sign in with Google</span>
        </button>
      )}
    </main>
  )
}
