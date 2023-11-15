import addUser from '@/lib/backend/user/addUser'
import auth from '@/lib/firebase/auth'
import { User as firebaseUser, onAuthStateChanged, signOut } from 'firebase/auth'
import { ReactNode, createContext, useContext, useEffect, useState } from 'react'

type User = firebaseUser | null
type ContextState = { user: User, loaded: boolean }
type Props = { children?: ReactNode }

const FirebaseAuthContext = createContext<ContextState | undefined>(undefined)

const FirebaseAuthProvider: React.FC<Props> = ({ children }: Props) => {
    const [user, setUser] = useState<User>(null)
    const [loaded, setLoaded] = useState(false)
    const value = { user, loaded }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, newUser => {
            // Only allow people to join with student accounts
            if (newUser !== null && !newUser?.email?.includes("@pdsb.net")) {
                // I was originally going to make the user account delete itself,
                // but that wouldn't work since I don't allow users to delete their own account
                // (DB and auth become out-of-sync, which is a problem). Instead, the add user endpoint should
                // do this for us (it auto-deletes non-pdsb accounts).
                // The catch statement is empty because it's supposed to error out (w/ 401)
                addUser().catch(console.error).finally(() => {
                    signOut(auth).catch(console.error).finally(() => {
                        alert("Sorry, please sign in with your student account (@pdsb.net). You have automatically been logged out.")
                    })
                })
                
                return
            }

            setUser(newUser)
            setLoaded(true)
        })
        return unsubscribe
    }, [])

    return (
        <FirebaseAuthContext.Provider value={value}>
            {children}
        </FirebaseAuthContext.Provider>
    )
}

function useFirebaseAuth() {
    const context = useContext(FirebaseAuthContext)
    if (context === undefined) {
        throw new Error(
            "useFirebaseAuth must be used within a FirebaseAuthProvider"
        )
    }
    return { user: context.user, loaded: context.loaded }
}

export { FirebaseAuthProvider, useFirebaseAuth }
