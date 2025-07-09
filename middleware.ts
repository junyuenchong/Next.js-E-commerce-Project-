// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest): NextResponse {
	try {
		// Handle session cookie renewal on GET requests
		if (request.method === "GET") {
			const response = NextResponse.next();
			const token = request.cookies.get("session")?.value ?? null;

			if (token !== null) {
				// Only extend cookie expiration on GET requests since we can be sure
				// a new session wasn't set when handling the request.
				response.cookies.set({
					name: "session",
					value: token,
					path: "/",
					maxAge: 60 * 60 * 24 * 30, // 30 days
					sameSite: "lax",
					httpOnly: true,
					secure: process.env.NODE_ENV === "production",
				});
			}

			return response;
		}

		/** CSRF Protection */
		const originHeader = request.headers.get("origin");
		const hostHeader = request.headers.get("host");

		if (!originHeader || !hostHeader) {
			return new NextResponse("Forbidden: Missing headers", { status: 403 });
		}

		let origin: URL;
		try {
			origin = new URL(originHeader);
		} catch (error) {
			console.error("Invalid origin header:", originHeader);
			return new NextResponse("Forbidden: Invalid origin", { status: 403 });
		}

		if (origin.host !== hostHeader) {
			console.warn(`CSRF Check Failed: origin=${origin.host}, host=${hostHeader}`);
			return new NextResponse("Forbidden: Origin mismatch", { status: 403 });
		}

		return NextResponse.next();
	} catch (err) {
		console.error("Middleware Error:", err);
		return new NextResponse("Internal Server Error", { status: 500 });
	}
}
