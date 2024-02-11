import { serialize } from "cookie";
import { NextFetchEvent, NextResponse, URLPattern } from "next/server";
import type { NextRequest } from "next/server";

// Gets the path segments from an entire path
const PATTERNS = [
    [
        new URLPattern({ pathname: "/__/auth/:path" }),
        // @ts-ignore
        ({ pathname }) => pathname.groups,
    ],
];

// Runs path extractors on url
const params = (url: string) => {
    const input = url.split("?")[0];
    let result: { [key: string]: any } = {};

    for (const [pattern, handler] of PATTERNS) {
        // @ts-ignore
        const patternResult = pattern.exec(input);
        if (patternResult !== null && "pathname" in patternResult) {
            // @ts-ignore
            result = handler(patternResult);
            break;
        }
    }
    return result;
};

export async function middleware(request: NextRequest, event: NextFetchEvent) {
    if (request.nextUrl.pathname.startsWith("/auth")) {
        try {
            const formData = await request.formData();
            const credential = formData.get("credential")?.toString() ?? "";

            // Create a new response object
            const baseUrl = request.url.substring(0, request.url.indexOf(new URL(request.url).pathname));
            const response = NextResponse.redirect(`${baseUrl}/login`, 302);

            // Set the cookie in the response header
            response.cookies.set("credential", credential, {
                httpOnly: false,
                maxAge: 60, // 1 minute
                path: "/login",
                sameSite: "strict",
            });

            // Return the response
            return response;
        } catch (e) {
            console.error(e);

            const baseUrl = request.url.substring(0, request.url.indexOf(new URL(request.url).pathname));
            const response = NextResponse.redirect(`${baseUrl}/login`, 302);

            return response;
        }
    } else if (request.nextUrl.pathname.startsWith("/__/auth")) {
        // Serve firebase auth helpers as static HTML/JS/CSS instead of just regular files
        const { path } = params(request.url);
        const baseUrl = request.url.substring(0, request.url.indexOf(new URL(request.url).pathname));

        const data = await (await fetch(new URL(`auth_helpers/${path}`, baseUrl))).text();
        const response = new NextResponse(data);
        response.headers.set(
            "Content-Type",
            (path.includes(".js") ? "text/javascript;" : "text/html;") + " charset=utf-8",
        );

        return response;
    }
}

export const config = {
    matcher: ["/auth/redirect", "/__/auth/:path*"],
};
