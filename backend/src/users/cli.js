import { ADMIN, ROLES, VIEWER } from "../auth/roles.js";
import { hashPassword } from "../auth/passwords.js";
import { isValidNodeCode } from "../telemetry/validate.js";
import {
  UserCommandError,
  checkPassword,
  findMissingNodes,
  findUser,
  insertUser,
  normalizeEmail,
  updatePassword,
} from "./manage.js";

export const CREATE_USAGE = `Usage: npm run user:create -- --email <email> --role <admin|viewer> [--node <code> ...]
  A viewer reads only the nodes given with --node (repeat the flag). An admin reads every node.
  The password is asked for in the terminal.`;

export const SET_PASSWORD_USAGE = `Usage: npm run user:set-password -- --email <email>
  The new password is asked for in the terminal. Role and nodes stay as they are.`;

// kinds: "one" takes a single value, "many" may repeat. Both --flag value and --flag=value work.
function parseFlags(argv, kinds, usage) {
  const found = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") return { help: true };
    const eq = arg.indexOf("=");
    const flag = arg.startsWith("--") ? arg.slice(2, eq === -1 ? undefined : eq) : null;
    if (flag === "password") {
      throw new UserCommandError("Passwords are never taken from arguments. You will be asked for it.");
    }
    if (flag === null || !(flag in kinds)) {
      throw new UserCommandError(`Unknown argument "${arg}".\n${usage}`);
    }
    let value;
    if (eq !== -1) value = arg.slice(eq + 1);
    else {
      value = argv[i + 1];
      i += 1;
    }
    if (value === undefined || value === "" || value.startsWith("--")) {
      throw new UserCommandError(`--${flag} needs a value.\n${usage}`);
    }
    if (kinds[flag] === "many") (found[flag] ??= []).push(value);
    else if (flag in found) throw new UserCommandError(`--${flag} was given more than once.`);
    else found[flag] = value;
  }
  return found;
}

// Returns { help: true } or { email, role, nodes }.
export function parseCreateArgs(argv) {
  const found = parseFlags(argv, { email: "one", role: "one", node: "many" }, CREATE_USAGE);
  if (found.help) return found;
  if (found.email === undefined) throw new UserCommandError(`--email is required.\n${CREATE_USAGE}`);
  if (found.role === undefined) throw new UserCommandError(`--role is required.\n${CREATE_USAGE}`);

  const email = normalizeEmail(found.email);
  if (!ROLES.includes(found.role)) {
    throw new UserCommandError(`--role must be one of: ${ROLES.join(", ")}.`);
  }
  const nodes = [...new Set(found.node ?? [])];
  for (const code of nodes) {
    if (!isValidNodeCode(code)) throw new UserCommandError(`"${code}" is not a valid node code.`);
  }
  // An admin reads every node already; a node list would suggest a limit that does not exist.
  if (found.role === ADMIN && nodes.length > 0) {
    throw new UserCommandError("--node applies to viewers only. An admin reads every node.");
  }
  return { email, role: found.role, nodes };
}

// Returns { help: true } or { email }.
export function parseSetPasswordArgs(argv) {
  const found = parseFlags(argv, { email: "one" }, SET_PASSWORD_USAGE);
  if (found.help) return found;
  if (found.email === undefined) {
    throw new UserCommandError(`--email is required.\n${SET_PASSWORD_USAGE}`);
  }
  return { email: normalizeEmail(found.email) };
}

// Asks twice so that a typo does not lock the account out.
async function askNewPassword(readPassword) {
  const password = await readPassword("New password: ");
  checkPassword(password);
  if ((await readPassword("Repeat password: ")) !== password) {
    throw new UserCommandError("The two passwords do not match.");
  }
  return password;
}

async function inTransaction(client, work) {
  await client.query("BEGIN");
  try {
    const result = await work();
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  }
}

// Checks run before the prompt so that nobody types a password for a command that cannot work.
export async function runUserCreate({ args, client, readPassword, log }) {
  if (await findUser(client, args.email)) {
    throw new UserCommandError(
      `${args.email} already exists. Use npm run user:set-password to change its password.`,
    );
  }
  const missing = await findMissingNodes(client, args.nodes);
  if (missing.length > 0) {
    throw new UserCommandError(`Unknown node(s): ${missing.join(", ")}. Nothing was created.`);
  }
  if (args.role === VIEWER && args.nodes.length === 0) {
    log("Warning: this viewer has no nodes yet and will see nothing. Nodes are given with --node.");
  }

  const password = await askNewPassword(readPassword);
  const passwordHash = await hashPassword(password);
  const id = await inTransaction(client, () =>
    insertUser(client, { email: args.email, passwordHash, role: args.role, nodes: args.nodes }),
  );
  if (id === null) throw new UserCommandError(`${args.email} already exists. Nothing was changed.`);

  const access = args.role === ADMIN ? "every node" : args.nodes.join(", ") || "no nodes";
  log(`Created ${args.role} ${args.email} (${access}).`);
}

export async function runUserSetPassword({ args, client, readPassword, log }) {
  if (!(await findUser(client, args.email))) {
    throw new UserCommandError(`No user with email ${args.email}.`);
  }

  const password = await askNewPassword(readPassword);
  const passwordHash = await hashPassword(password);
  const updated = await inTransaction(client, () =>
    updatePassword(client, { email: args.email, passwordHash }),
  );
  if (updated === null) throw new UserCommandError(`No user with email ${args.email}.`);

  log(`Password changed for ${updated.role} ${args.email}.`);
  // Access tokens are stateless and last one hour; the old password only stops working at login.
  log("A token issued before this change stays valid until it expires (up to 1 hour).");
}
