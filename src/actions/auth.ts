"use server";

import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import bcrypt from "bcryptjs";

import type { User, Session } from ".prisma/client"; 
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { cache } from "react";

/* -------------------
  Session Token Logic
------------------- */
export async function generateSessionToken(): Promise<string> {
	const bytes = new Uint8Array(20);
	crypto.getRandomValues(bytes);
	return encodeBase32LowerCaseNoPadding(bytes);
}

export async function createSession(token: string, userId: number): Promise<Session> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const session: Session = {
		id: sessionId,
		userId,
		expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
	};
	await prisma.session.create({ data: session });
	return session;
}

export async function validateSessionToken(token: string): Promise<SessionValidationResult> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const result = await prisma.session.findUnique({
		where: { id: sessionId },
		include: { user: true },
	});

	if (!result) {
		return { session: null, user: null };
	}

	const { user, ...session } = result;

	if (Date.now() >= session.expiresAt.getTime()) {
		await prisma.session.delete({ where: { id: sessionId } });
		return { session: null, user: null };
	}

	if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
		session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
		await prisma.session.update({
			where: { id: session.id },
			data: { expiresAt: session.expiresAt },
		});
	}

	// Return only necessary user fields (exclude passwordHash)
	const safeUser = {
		id: user.id,
		email: user.email,
		// Add more fields if needed, but exclude passwordHash
	};

	return { session, user: safeUser };
}

export async function invalidateSession(sessionId: string): Promise<void> {
	await prisma.session.delete({ where: { id: sessionId } });
}

export type SessionValidationResult =
	| { session: Session; user: Omit<User, "passwordHash"> }
	| { session: null; user: null };

/* -------------------
  Cookie Logic
------------------- */
export async function setSessionTokenCookie(token: string, expiresAt: Date): Promise<void> {
	const cookieStore = await cookies();
	cookieStore.set("session", token, {
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		expires: expiresAt,
		path: "/",
	});
}

export async function deleteSessionTokenCookie(): Promise<void> {
	const cookieStore = await cookies();
	cookieStore.set("session", "", {
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		maxAge: 0,
		path: "/",
	});
}

export const getCurrentSession = cache(async (): Promise<SessionValidationResult> => {
	const cookieStore = await cookies();
	const token = cookieStore.get("session")?.value ?? null;
	if (!token) return { session: null, user: null };
	return validateSessionToken(token);
});

/* -------------------
  Auth Logic
------------------- */
const SALT_ROUNDS = 10;

export const hashPassword = async (password: string) => {
	return bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (password: string, hash: string) => {
	return bcrypt.compare(password, hash);
};

export const registerUser = async (email: string, password: string) => {
	const passwordHash = await hashPassword(password);
	try {
		const user = await prisma.user.create({
			data: { email, passwordHash },
		});

		const safeUser = {
			id: user.id,
			email: user.email,
			// add more safe fields as needed
		};

		return { user: safeUser, error: null };
	} catch {
		return { user: null, error: "Failed to register user" };
	}
};

export const loginUser = async (email: string, password: string) => {
	const user = await prisma.user.findUnique({ where: { email } });

	if (!user) {
		return { user: null, error: "User not found" };
	}

	const passwordValid = await verifyPassword(password, user.passwordHash);
	if (!passwordValid) {
		return { user: null, error: "Invalid password" };
	}

	const token = await generateSessionToken();
	const session = await createSession(token, user.id);
	await setSessionTokenCookie(token, session.expiresAt);

	const safeUser = {
		id: user.id,
		email: user.email,
		// add more safe fields as needed
	};

	return { user: safeUser, error: null };
};

export const logoutUser = async () => {
	const session = await getCurrentSession();
	if (session.session?.id) {
		await invalidateSession(session.session.id);
	}
	await deleteSessionTokenCookie();
};
