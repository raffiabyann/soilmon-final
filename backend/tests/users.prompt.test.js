import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { assertInteractive, promptHidden } from "../src/users/prompt.js";
import { UserCommandError } from "../src/users/manage.js";

// A terminal stand-in: raw mode and pause/resume are recorded, and keys are sent with type().
function fakeTerminal({ isTTY = true } = {}) {
  const input = new EventEmitter();
  Object.assign(input, {
    isTTY,
    rawMode: false,
    paused: true,
    setRawMode(on) {
      this.rawMode = on;
    },
    setEncoding() {},
    resume() {
      this.paused = false;
    },
    pause() {
      this.paused = true;
    },
    type(text) {
      this.emit("data", text);
    },
  });
  const written = [];
  const output = { write: (text) => written.push(text) };
  return { input, output, written };
}

describe("promptHidden", () => {
  test("returns what was typed and never writes it to the output", async () => {
    const { input, output, written } = fakeTerminal();
    const result = promptHidden("Password: ", { input, output });
    assert.equal(input.rawMode, true);
    input.type("hunter");
    input.type("two-");
    input.type("secret\r");
    assert.equal(await result, "huntertwo-secret");
    assert.equal(written.join(""), "Password: \n");
    assert.equal(input.rawMode, false);
    assert.equal(input.paused, true);
    assert.equal(input.listenerCount("data"), 0);
  });

  test("backspace removes the last character, in both the DEL and BS forms", async () => {
    const { input, output } = fakeTerminal();
    const result = promptHidden("", { input, output });
    input.type("abcd\u007f\u007f");
    input.type("\bX\n");
    assert.equal(await result, "aX");
  });

  test("a paste that contains the newline is read up to the newline", async () => {
    const { input, output } = fakeTerminal();
    const result = promptHidden("", { input, output });
    input.type("pasted-password\r\nleftover");
    assert.equal(await result, "pasted-password");
  });

  test("arrow keys and other control characters are not part of the password", async () => {
    const { input, output } = fakeTerminal();
    const result = promptHidden("", { input, output });
    input.type("ab");
    input.type("\u001b[A");
    input.type("c\u0000\t\r");
    assert.equal(await result, "abc");
  });

  test("characters outside ASCII are kept", async () => {
    const { input, output } = fakeTerminal();
    const result = promptHidden("", { input, output });
    input.type("kata sandi é😀\r");
    assert.equal(await result, "kata sandi é😀");
  });

  test("Ctrl-C and Ctrl-D cancel, and the terminal is restored", async () => {
    for (const key of ["\u0003", "\u0004"]) {
      const { input, output } = fakeTerminal();
      const result = promptHidden("", { input, output });
      input.type(`abc${key}`);
      await assert.rejects(result, (err) => err instanceof UserCommandError && /Cancelled/.test(err.message));
      assert.equal(input.rawMode, false);
      assert.equal(input.listenerCount("data"), 0);
    }
  });

  test("without a terminal it refuses instead of reading a pipe", async () => {
    const { input, output } = fakeTerminal({ isTTY: false });
    await assert.rejects(promptHidden("", { input, output }), /terminal is required/);
    assert.equal(input.rawMode, false);
    assert.throws(() => assertInteractive(input), UserCommandError);
    assert.doesNotThrow(() => assertInteractive(fakeTerminal().input));
  });
});
