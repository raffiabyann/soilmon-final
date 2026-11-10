import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { parseCreateArgs, parseSetPasswordArgs } from "../src/users/cli.js";
import { UserCommandError } from "../src/users/manage.js";

function rejects(fn, pattern) {
  assert.throws(fn, (err) => err instanceof UserCommandError && pattern.test(err.message));
}

describe("parseCreateArgs", () => {
  test("a viewer with two nodes; the email is lowercased and repeated nodes are merged", () => {
    const args = parseCreateArgs([
      "--email", "Viewer@SoilMon.Local", "--role", "viewer", "--node", "node-01", "--node", "node-02", "--node", "node-01",
    ]);
    assert.deepEqual(args, { email: "viewer@soilmon.local", role: "viewer", nodes: ["node-01", "node-02"] });
  });

  test("--flag=value works", () => {
    const args = parseCreateArgs(["--email=a@b.co", "--role=admin"]);
    assert.deepEqual(args, { email: "a@b.co", role: "admin", nodes: [] });
  });

  test("a viewer may be created without nodes", () => {
    assert.deepEqual(parseCreateArgs(["--email", "a@b.co", "--role", "viewer"]).nodes, []);
  });

  test("--help is passed through", () => {
    assert.deepEqual(parseCreateArgs(["--help"]), { help: true });
  });

  test("missing --email or --role", () => {
    rejects(() => parseCreateArgs(["--role", "admin"]), /--email is required/);
    rejects(() => parseCreateArgs(["--email", "a@b.co"]), /--role is required/);
  });

  test("a role outside admin and viewer", () => {
    rejects(() => parseCreateArgs(["--email", "a@b.co", "--role", "owner"]), /--role must be one of: admin, viewer/);
  });

  test("an email that is not an email", () => {
    rejects(() => parseCreateArgs(["--email", "not-an-email", "--role", "admin"]), /--email must be an email/);
  });

  test("an admin with --node", () => {
    rejects(
      () => parseCreateArgs(["--email", "a@b.co", "--role", "admin", "--node", "node-01"]),
      /--node applies to viewers only/,
    );
  });

  test("an invalid node code", () => {
    rejects(
      () => parseCreateArgs(["--email", "a@b.co", "--role", "viewer", "--node", "node 01"]),
      /not a valid node code/,
    );
  });

  test("--password is refused with an explanation", () => {
    rejects(
      () => parseCreateArgs(["--email", "a@b.co", "--role", "admin", "--password", "secret-password-1"]),
      /never taken from arguments/,
    );
    rejects(() => parseCreateArgs(["--email", "a@b.co", "--role", "admin", "--password=x"]), /never taken from arguments/);
  });

  test("unknown arguments, missing values and repeated single flags", () => {
    rejects(() => parseCreateArgs(["--email", "a@b.co", "--role", "admin", "--force"]), /Unknown argument "--force"/);
    rejects(() => parseCreateArgs(["stray"]), /Unknown argument "stray"/);
    rejects(() => parseCreateArgs(["--email", "--role", "admin"]), /--email needs a value/);
    rejects(() => parseCreateArgs(["--email"]), /--email needs a value/);
    rejects(() => parseCreateArgs(["--email", "a@b.co", "--email", "c@d.co", "--role", "admin"]), /more than once/);
  });
});

describe("parseSetPasswordArgs", () => {
  test("returns the lowercased email", () => {
    assert.deepEqual(parseSetPasswordArgs(["--email", "Admin@SoilMon.Local"]), { email: "admin@soilmon.local" });
  });

  test("--email is required, and other flags are refused", () => {
    rejects(() => parseSetPasswordArgs([]), /--email is required/);
    rejects(() => parseSetPasswordArgs(["--email", "a@b.co", "--role", "admin"]), /Unknown argument "--role"/);
    rejects(() => parseSetPasswordArgs(["--email", "a@b.co", "--password", "x"]), /never taken from arguments/);
  });

  test("--help is passed through", () => {
    assert.deepEqual(parseSetPasswordArgs(["-h"]), { help: true });
  });
});
