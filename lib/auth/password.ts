import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const keyLength = 64;
const cost = 32768;
const blockSize = 8;
const parallelization = 1;

function derive(password: string, salt: Buffer, length: number, N: number, r: number, p: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, length, { N, r, p, maxmem: 64 * 1024 * 1024 }, (error, result) => error ? reject(error) : resolve(result));
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = await derive(password, salt, keyLength, cost, blockSize, parallelization);
  return `scrypt$v=1$N=${cost},r=${blockSize},p=${parallelization}$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyPassword(passwordHash: string, password: string) {
  const [algorithm, version, parameters, saltValue, hashValue] = passwordHash.split("$");
  if (algorithm !== "scrypt" || version !== "v=1" || !parameters || !saltValue || !hashValue) return false;
  const parsed = Object.fromEntries(parameters.split(",").map((entry) => entry.split("=")));
  const N = Number(parsed.N);
  const r = Number(parsed.r);
  const p = Number(parsed.p);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p) || N < 16384 || r < 8 || p < 1) return false;
  const expected = Buffer.from(hashValue, "base64url");
  const actual = await derive(password, Buffer.from(saltValue, "base64url"), expected.length, N, r, p);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function validatePassword(password: string) {
  if (password.length < 12) return "Use at least 12 characters.";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return "Include uppercase, lowercase and a number.";
  }
  return null;
}
