import auth from "../firebase/auth";

/**
 * @description Gets an auth token safely. Always makes sure to use very fresh tokens for admin routes,
 * since their admin status is stored in the token itself and should always be up-to-date.
 * An example case where just using the cached token could go wrong is if a user has 
 * been given or had their admin privileges revoked. In this case, the user would
 * still have the same permissions as they did before, until the token expires 
 * (max. 1 hour).
 * 
 * @param fresh whether the token should have been minted in the past 5 minutes or not (mainly for admin routes)
 */
export default async function getTokenSafely(fresh?: boolean) {
    const log_id = Math.round(Math.random() * 100000)

    console.time(`auth ready (req id ${log_id})`)
    await auth.authStateReady()
    console.timeEnd(`auth ready (req id ${log_id})`)

    const user = auth.currentUser
    if (user === null) {
        throw "User is not signed in"
    }

    let token: string
    console.time(`token ready (req id ${log_id})`)
    // Refresh token for admin routes if more than 5 minutes old
    const tokenDecoded = await user.getIdTokenResult()
    const tokenAge = Date.now() - new Date(tokenDecoded.issuedAtTime).getTime();
    if (!!fresh && tokenAge > 5 * 60 * 1000) {
        token = await user.getIdToken(true)
    } else {
        token = tokenDecoded.token
    }
    console.timeEnd(`token ready (req id ${log_id})`)

    return token
}