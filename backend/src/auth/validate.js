import { PASSWORD_MAX_BYTES } from "./passwords.js";

const LOGIN_FIELDS = new Set(["email", "password"]);
// RFC 5321 limits a forward path to 254 characters. Full address syntax is not checked: an
// address that is not registered simply fails to sign in.
const EMAIL_MAX_LENGTH = 254;

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Returns { value: { email, password }, errors }. The email is lowercased, as it is stored.
export function validateLoginInput(body) {
  if (!isPlainObject(body)) {
    return { value: null, errors: [{ field: "body", message: "must be a JSON object" }] };
  }
  const errors = [];

  for (const key of Object.keys(body)) {
    if (!LOGIN_FIELDS.has(key)) errors.push({ field: key, message: "is not allowed" });
  }

  const { email, password } = body;

  if (email === undefined) {
    errors.push({ field: "email", message: "is required" });
  } else if (
    typeof email !== "string" ||
    email.length > EMAIL_MAX_LENGTH ||
    !/^[^\s@]+@[^\s@]+$/.test(email)
  ) {
    errors.push({ field: "email", message: `must be an email address of at most ${EMAIL_MAX_LENGTH} characters` });
  }

  if (password === undefined) {
    errors.push({ field: "password", message: "is required" });
  } else if (
    typeof password !== "string" ||
    password.length === 0 ||
    Buffer.byteLength(password, "utf8") > PASSWORD_MAX_BYTES
  ) {
    errors.push({ field: "password", message: `must be a non-empty string of at most ${PASSWORD_MAX_BYTES} bytes` });
  }

  if (errors.length > 0) return { value: null, errors };
  return { value: { email: email.toLowerCase(), password }, errors };
}
