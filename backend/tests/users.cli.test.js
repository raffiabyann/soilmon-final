// The two commands against a fake client that answers only the queries they are allowed to make.
// An unexpected query throws, so a command that reached for another table would fail here.
// That the SQL itself works is tested in users.integration.test.js.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { BCRYPT_COST, verifyPassword } from "../src/auth/passwords.js";
import { parseCreateArgs, parseSetPasswordArgs, runUserCreate, runUserSetPassword } from "../src/users/cli.js";
import { UserCommandError } from "../src/users/manage.js";

const PASSWORD = "correct horse battery";

function fakeClient({ users = [], nodes = ["node-01", "node-02"], failOn = null } = {}) {
  const queries = [];
  const written = { users: [], userNodes: [], updates: [] };
  return {
    queries,
    written,
    async query(text, params = []) {
      const sql = text.replace(/\s+/g, " ").trim();
      queries.push({ sql, params });
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") return { rows: [] };
      if (failOn?.test(sql)) throw new Error("boom");
      if (sql.startsWith("SELECT id, role FROM users")) {
        return { rows: users.filter((u) => u.email === params[0]) };
      }
      if (sql.startsWith("SELECT code FROM nodes")) {
        return { rows: nodes.filter((c) => params[0].includes(c)).map((code) => ({ code })) };
      }
      if (sql.startsWith("INSERT INTO users")) {
        if (users.some((u) => u.email === params[0])) return { rows: [] };
        written.users.push({ email: params[0], passwordHash: params[1], role: params[2] });
        return { rows: [{ id: "42" }] };
      }
      if (sql.startsWith("INSERT INTO user_nodes")) {
        written.userNodes.push({ userId: params[0], nodes: params[1] });
        return { rows: [] };
      }
      if (sql.startsWith("UPDATE users SET password_hash")) {
        const user = users.find((u) => u.email === params[0]);
        if (!user) return { rows: [] };
        written.updates.push({ email: params[0], passwordHash: params[1] });
        return { rows: [{ id: user.id, role: user.role }] };
      }
      throw new Error(`unexpected query: ${sql}`);
    },
  };
}

// Plays the terminal: each prompt takes the next answer.
function typing(...answers) {
  const questions = [];
  const queue = [...answers];
  const readPassword = async (question) => {
    questions.push(question);
    if (queue.length === 0) throw new Error("prompted more often than expected");
    return queue.shift();
  };
  return { readPassword, questions };
}

function run(fn, args) {
  const lines = [];
  return { done: fn({ ...args, log: (line) => lines.push(line) }), lines };
}

const EXISTING = [{ id: "7", email: "admin@soilmon.local", role: "admin" }];

describe("runUserCreate", () => {
  test("creates a viewer with its nodes, lowercase email and a bcrypt hash at cost 12", async () => {
    const client = fakeClient();
    const { readPassword, questions } = typing(PASSWORD, PASSWORD);
    const args = parseCreateArgs(["--email", "New.Viewer@SoilMon.Local", "--role", "viewer", "--node", "node-01"]);
    const { done, lines } = run(runUserCreate, { args, client, readPassword });
    await done;

    assert.equal(client.written.users.length, 1);
    const [user] = client.written.users;
    assert.equal(user.email, "new.viewer@soilmon.local");
    assert.equal(user.role, "viewer");
    assert.match(user.passwordHash, new RegExp(`^\\$2[aby]\\$${BCRYPT_COST}\\$`));
    assert.equal(await verifyPassword(PASSWORD, user.passwordHash), true);
    assert.deepEqual(client.written.userNodes, [{ userId: "42", nodes: ["node-01"] }]);
    assert.deepEqual(questions, ["New password: ", "Repeat password: "]);
    assert.deepEqual(client.queries.filter((q) => ["BEGIN", "COMMIT"].includes(q.sql)).map((q) => q.sql), ["BEGIN", "COMMIT"]);
    assert.deepEqual(lines, ["Created viewer new.viewer@soilmon.local (node-01)."]);
  });

  test("an admin gets no node rows", async () => {
    const client = fakeClient();
    const { readPassword } = typing(PASSWORD, PASSWORD);
    const args = parseCreateArgs(["--email", "boss@soilmon.local", "--role", "admin"]);
    const { done, lines } = run(runUserCreate, { args, client, readPassword });
    await done;
    assert.equal(client.written.users[0].role, "admin");
    assert.deepEqual(client.written.userNodes, []);
    assert.deepEqual(lines, ["Created admin boss@soilmon.local (every node)."]);
  });

  test("a viewer without nodes is created with a warning", async () => {
    const client = fakeClient();
    const { readPassword } = typing(PASSWORD, PASSWORD);
    const args = parseCreateArgs(["--email", "idle@soilmon.local", "--role", "viewer"]);
    const { done, lines } = run(runUserCreate, { args, client, readPassword });
    await done;
    assert.match(lines[0], /^Warning: this viewer has no nodes/);
    assert.equal(client.written.users.length, 1);
  });

  test("the password is never printed", async () => {
    const client = fakeClient();
    const { readPassword } = typing(PASSWORD, PASSWORD);
    const args = parseCreateArgs(["--email", "quiet@soilmon.local", "--role", "admin"]);
    const { done, lines } = run(runUserCreate, { args, client, readPassword });
    await done;
    assert.ok(!lines.join("\n").includes(PASSWORD));
    assert.ok(!JSON.stringify(client.queries).includes(PASSWORD));
  });

  test("an email that exists is refused before any prompt", async () => {
    const client = fakeClient({ users: EXISTING });
    const { readPassword, questions } = typing();
    const args = parseCreateArgs(["--email", "Admin@soilmon.local", "--role", "admin"]);
    await assert.rejects(run(runUserCreate, { args, client, readPassword }).done, /already exists.*user:set-password/);
    assert.deepEqual(questions, []);
    assert.deepEqual(client.written.users, []);
  });

  test("an unknown node is refused before any prompt, and nothing is written", async () => {
    const client = fakeClient();
    const { readPassword, questions } = typing();
    const args = parseCreateArgs(["--email", "v@soilmon.local", "--role", "viewer", "--node", "node-01", "--node", "node-99"]);
    await assert.rejects(run(runUserCreate, { args, client, readPassword }).done, /Unknown node\(s\): node-99/);
    assert.deepEqual(questions, []);
    assert.ok(!client.queries.some((q) => q.sql === "BEGIN"));
  });

  test("a password under 12 characters is refused and nothing is written", async () => {
    const client = fakeClient();
    const { readPassword } = typing("only-11-chr");
    const args = parseCreateArgs(["--email", "v@soilmon.local", "--role", "admin"]);
    await assert.rejects(run(runUserCreate, { args, client, readPassword }).done, /at least 12 characters/);
    assert.ok(!client.queries.some((q) => q.sql === "BEGIN"));
  });

  test("exactly 12 characters is accepted", async () => {
    const client = fakeClient();
    const { readPassword } = typing("twelve-chars", "twelve-chars");
    const args = parseCreateArgs(["--email", "v@soilmon.local", "--role", "admin"]);
    await run(runUserCreate, { args, client, readPassword }).done;
    assert.equal(client.written.users.length, 1);
  });

  test("a password over 72 bytes is refused, not truncated", async () => {
    const client = fakeClient();
    const long = "a".repeat(73);
    const { readPassword } = typing(long);
    const args = parseCreateArgs(["--email", "v@soilmon.local", "--role", "admin"]);
    await assert.rejects(run(runUserCreate, { args, client, readPassword }).done, /at most 72 bytes/);
    assert.deepEqual(client.written.users, []);
  });

  test("two different entries are refused", async () => {
    const client = fakeClient();
    const { readPassword } = typing(PASSWORD, `${PASSWORD}!`);
    const args = parseCreateArgs(["--email", "v@soilmon.local", "--role", "admin"]);
    await assert.rejects(run(runUserCreate, { args, client, readPassword }).done, /do not match/);
    assert.deepEqual(client.written.users, []);
  });

  test("a failure while writing rolls the transaction back", async () => {
    const client = fakeClient({ failOn: /^INSERT INTO user_nodes/ });
    const { readPassword } = typing(PASSWORD, PASSWORD);
    const args = parseCreateArgs(["--email", "v@soilmon.local", "--role", "viewer", "--node", "node-01"]);
    await assert.rejects(run(runUserCreate, { args, client, readPassword }).done, /boom/);
    const control = client.queries.map((q) => q.sql).filter((s) => ["BEGIN", "COMMIT", "ROLLBACK"].includes(s));
    assert.deepEqual(control, ["BEGIN", "ROLLBACK"]);
  });

  test("a cancelled prompt writes nothing", async () => {
    const client = fakeClient();
    const readPassword = async () => {
      throw new UserCommandError("Cancelled.");
    };
    const args = parseCreateArgs(["--email", "v@soilmon.local", "--role", "admin"]);
    await assert.rejects(run(runUserCreate, { args, client, readPassword }).done, /Cancelled/);
    assert.ok(!client.queries.some((q) => q.sql === "BEGIN"));
  });
});

describe("runUserSetPassword", () => {
  test("changes only the hash of that user, and says old tokens live on", async () => {
    const client = fakeClient({ users: EXISTING });
    const { readPassword, questions } = typing(PASSWORD, PASSWORD);
    const args = parseSetPasswordArgs(["--email", "ADMIN@soilmon.local"]);
    const { done, lines } = run(runUserSetPassword, { args, client, readPassword });
    await done;

    assert.equal(client.written.updates.length, 1);
    const [update] = client.written.updates;
    assert.equal(update.email, "admin@soilmon.local");
    assert.match(update.passwordHash, new RegExp(`^\\$2[aby]\\$${BCRYPT_COST}\\$`));
    assert.equal(await verifyPassword(PASSWORD, update.passwordHash), true);
    assert.deepEqual(client.written.users, []);
    assert.deepEqual(client.written.userNodes, []);
    assert.deepEqual(questions, ["New password: ", "Repeat password: "]);
    assert.equal(lines[0], "Password changed for admin admin@soilmon.local.");
    assert.match(lines[1], /token issued before this change stays valid/);
    assert.ok(!lines.join("\n").includes(PASSWORD));
  });

  test("an unknown email is refused before any prompt", async () => {
    const client = fakeClient({ users: EXISTING });
    const { readPassword, questions } = typing();
    const args = parseSetPasswordArgs(["--email", "nobody@soilmon.local"]);
    await assert.rejects(run(runUserSetPassword, { args, client, readPassword }).done, /No user with email nobody@soilmon.local/);
    assert.deepEqual(questions, []);
    assert.deepEqual(client.written.updates, []);
  });

  test("the same password rules apply", async () => {
    for (const [answers, pattern] of [
      [["short"], /at least 12 characters/],
      [["a".repeat(73)], /at most 72 bytes/],
      [[PASSWORD, "different password"], /do not match/],
    ]) {
      const client = fakeClient({ users: EXISTING });
      const { readPassword } = typing(...answers);
      const args = parseSetPasswordArgs(["--email", "admin@soilmon.local"]);
      await assert.rejects(run(runUserSetPassword, { args, client, readPassword }).done, pattern);
      assert.deepEqual(client.written.updates, []);
    }
  });

  test("a failure while writing rolls back", async () => {
    const client = fakeClient({ users: EXISTING, failOn: /^UPDATE users/ });
    const { readPassword } = typing(PASSWORD, PASSWORD);
    const args = parseSetPasswordArgs(["--email", "admin@soilmon.local"]);
    await assert.rejects(run(runUserSetPassword, { args, client, readPassword }).done, /boom/);
    const control = client.queries.map((q) => q.sql).filter((s) => ["BEGIN", "COMMIT", "ROLLBACK"].includes(s));
    assert.deepEqual(control, ["BEGIN", "ROLLBACK"]);
  });
});

describe("what the commands may touch", () => {
  test("neither command queries device_credentials, telemetry_records or node_config", async () => {
    const create = fakeClient();
    await run(runUserCreate, {
      args: parseCreateArgs(["--email", "x@soilmon.local", "--role", "viewer", "--node", "node-01"]),
      client: create,
      readPassword: typing(PASSWORD, PASSWORD).readPassword,
    }).done;
    const set = fakeClient({ users: EXISTING });
    await run(runUserSetPassword, {
      args: parseSetPasswordArgs(["--email", "admin@soilmon.local"]),
      client: set,
      readPassword: typing(PASSWORD, PASSWORD).readPassword,
    }).done;

    for (const { sql } of [...create.queries, ...set.queries]) {
      assert.doesNotMatch(sql, /device_credentials|telemetry_records|node_config/i, sql);
    }
  });
});
