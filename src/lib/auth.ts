import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";

// Storage setup for users (similar to runtime-store.ts pattern)
const STORAGE_ROOT = path.join(process.cwd(), "storage");
const USERS_DIR = path.join(STORAGE_ROOT, "users");
const USERS_INDEX_FILE = path.join(USERS_DIR, "index.json");

interface UserData {
  id: string;
  email: string;
  name: string;
  hashedPasswordBase64: string;
  saltBase64: string;
  createdAt: number;
}

interface UserIndex {
  [email: string]: string; // email -> userId
}

// Ensure directory exists
if (!fs.existsSync(USERS_DIR)) {
  fs.mkdirSync(USERS_DIR, { recursive: true });
}
if (!fs.existsSync(USERS_INDEX_FILE)) {
  fs.writeFileSync(USERS_INDEX_FILE, JSON.stringify({}), "utf8");
}

function getUserFilePath(userId: string) {
  return path.join(USERS_DIR, userId, "user.json");
}

/* ------------------------------------------------------------------ */
/*  User Storage & Management                                         */
/* ------------------------------------------------------------------ */

export function getUserIndex(): UserIndex {
  try {
    const raw = fs.readFileSync(USERS_INDEX_FILE, "utf8");
    return JSON.parse(raw) as UserIndex;
  } catch {
    return {};
  }
}

function saveUserIndex(index: UserIndex) {
  fs.writeFileSync(USERS_INDEX_FILE, JSON.stringify(index, null, 2), "utf8");
}

export function findUserByEmail(email: string): UserData | null {
  const index = getUserIndex();
  const userId = index[email.toLowerCase()];
  if (!userId) return null;

  try {
    const raw = fs.readFileSync(getUserFilePath(userId), "utf8");
    return JSON.parse(raw) as UserData;
  } catch {
    return null;
  }
}

export function findUserById(userId: string): UserData | null {
  try {
    const raw = fs.readFileSync(getUserFilePath(userId), "utf8");
    return JSON.parse(raw) as UserData;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Password Hashing (Web Crypto / subtle crypto pattern via node)    */
/* ------------------------------------------------------------------ */

// We use scrypt for secure password hashing
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16);
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve({
        hash: derivedKey.toString("base64"),
        salt: salt.toString("base64"),
      });
    });
  });
}

export async function verifyPassword(password: string, hashBase64: string, saltBase64: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const salt = Buffer.from(saltBase64, "base64");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(derivedKey.toString("base64") === hashBase64);
    });
  });
}

/* ------------------------------------------------------------------ */
/*  JWT & Cookies                                                     */
/* ------------------------------------------------------------------ */

// In production, this should be an environment variable
// Since this is a local/demo setup, we generate a stable key or use a fallback
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || "omniclip-super-secret-local-key-32-chars-long";
const encodedSecret = new TextEncoder().encode(JWT_SECRET_KEY);

const COOKIE_NAME = "omniclip_session";
const SESSION_DURATION_SECS = 24 * 60 * 60 * 7; // 7 days

export async function createSessionCookie(userId: string, email: string) {
  const token = await new SignJWT({ userId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedSecret);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function verifySessionCookie(): Promise<{ userId: string; email: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, encodedSecret);
    if (!payload.userId || typeof payload.userId !== "string") {
      return null;
    }
    return {
      userId: payload.userId,
      email: payload.email as string,
    };
  } catch {
    // JWT expired or invalid
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Create User                                                       */
/* ------------------------------------------------------------------ */

export async function createUser(email: string, passwordPlain: string, name: string): Promise<UserData> {
  const normalizedEmail = email.toLowerCase().trim();
  
  if (findUserByEmail(normalizedEmail)) {
    throw new Error("Email sudah terdaftar");
  }

  const { hash, salt } = await hashPassword(passwordPlain);
  const userId = uuidv4();

  const user: UserData = {
    id: userId,
    email: normalizedEmail,
    name: name.trim(),
    hashedPasswordBase64: hash,
    saltBase64: salt,
    createdAt: Date.now(),
  };

  const userDir = path.join(USERS_DIR, userId);
  fs.mkdirSync(userDir, { recursive: true });
  fs.writeFileSync(getUserFilePath(userId), JSON.stringify(user, null, 2), "utf8");

  const index = getUserIndex();
  index[normalizedEmail] = userId;
  saveUserIndex(index);

  return user;
}
