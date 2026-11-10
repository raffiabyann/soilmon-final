import { UserCommandError } from "./manage.js";

// A password is never taken from an argument or the environment, so it cannot land in shell
// history or in a process listing. A pipe is refused too: the point is a person typing it.
export function assertInteractive(input = process.stdin) {
  if (!input.isTTY) {
    throw new UserCommandError(
      "A terminal is required to type the password. Run this command in an interactive terminal.",
    );
  }
}

// Reads one line from the terminal without echoing it. Enter finishes; Ctrl-C and Ctrl-D cancel.
export function promptHidden(question, { input = process.stdin, output = process.stdout } = {}) {
  return new Promise((resolve, reject) => {
    try {
      assertInteractive(input);
    } catch (err) {
      reject(err);
      return;
    }

    const typed = [];
    output.write(question);
    input.setRawMode(true);
    input.setEncoding("utf8");
    input.resume();

    function finish(error, value) {
      input.removeListener("data", onData);
      input.setRawMode(false);
      input.pause();
      output.write("\n");
      if (error) reject(error);
      else resolve(value);
    }

    function onData(chunk) {
      // Arrow and function keys arrive as one escape sequence; none of it is part of a password.
      if (chunk.startsWith("\u001b")) return;
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") return finish(null, typed.join(""));
        if (ch === "\u0003" || ch === "\u0004") return finish(new UserCommandError("Cancelled."));
        // Windows terminals send \b, others send DEL.
        if (ch === "\u007f" || ch === "\b") typed.pop();
        else if (ch >= " ") typed.push(ch);
      }
    }

    input.on("data", onData);
  });
}
