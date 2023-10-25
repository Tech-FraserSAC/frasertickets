import { PropsWithChildren, ReactElement, useEffect, useState } from "react";
import { useFirebaseAuth } from "../FirebaseAuthContext";
import { Typography } from "@material-tailwind/react";

export default function AdminRestrictedPage(props: PropsWithChildren) {
    const { user, loaded } = useFirebaseAuth();
    const [authorized, setAuthorized] = useState<boolean | null>(null);


    useEffect(() => {
        if (loaded && user) {
            user.getIdTokenResult(true).then(res => {
                setAuthorized(!!res.claims.admin);
            });
        }
    }, [user, loaded]);

    if (!loaded || authorized == null) {
        return (
            <div className="p-4">
                <Typography variant="h2" className="text-center">Loading...</Typography>
            </div>
        )
    }

    if (loaded && !user) {
        return (
            <div className="flex flex-col items-center">
                <Typography variant="h2" className="text-center">401 Unauthorized</Typography>
                <Typography variant="paragraph" className="text-center lg:w-3/4">You aren&apos;t signed in.</Typography>
            </div>
        )
    }

    if (loaded && !authorized) {
        return (
            <div className="flex flex-col items-center">
                <Typography variant="h2" className="text-center">403 Forbidden</Typography>
                <Typography variant="paragraph" className="text-center lg:w-3/4">Only admins can access this page.</Typography>
            </div>
        )
    }

    return props.children
}