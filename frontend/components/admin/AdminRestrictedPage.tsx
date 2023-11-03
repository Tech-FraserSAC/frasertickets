import { PropsWithChildren, ReactElement, useEffect, useState } from "react";
import { useFirebaseAuth } from "../FirebaseAuthContext";
import { Typography } from "@material-tailwind/react";
import { UnauthorizedComponent } from "@/pages/401";
import { ForbiddenComponent } from "@/pages/403";

export default function AdminRestrictedPage(props: PropsWithChildren) {
    const { user, loaded } = useFirebaseAuth();
    const [authorized, setAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        if (loaded && user) {
            user.getIdTokenResult(true).then(res => {
                setAuthorized(!!res.claims.admin);
            }).catch((err) => {
                console.warn(err)
                setAuthorized(false);
            });
        } else if (loaded && user === null) {
            setAuthorized(false)
        }
    }, [user, loaded]);

    if (!loaded || authorized == null) {
        return (
            <div className="flex flex-col items-center justify-center h-screen w-screen p-4">
                <Typography variant="h2" className="text-center">Loading...</Typography>
            </div>
        )
    } else if (loaded && user === null) {
        return <UnauthorizedComponent />
    } else if (loaded && !authorized) {
        return <ForbiddenComponent />
    }

    return props.children
}