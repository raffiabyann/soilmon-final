import { Router } from "express";
import { ApiError } from "../middleware/errors.js";
import { validateLoginInput } from "../auth/validate.js";
import { verifyAgainstDummy, verifyPassword } from "../auth/passwords.js";
import { TOKEN_TTL_SECONDS, signAccessToken } from "../auth/tokens.js";

// One error for an unknown email and a wrong password, so the response does not tell which
// email addresses have accounts.
function invalidCredentials() {
  return new ApiError(401, "invalid_credentials", "Email or password is incorrect.");
}

export function createAuthRouter({ authStore, jwtSecret }) {
  const router = Router();

  router.post("/auth/login", async (req, res) => {
    const { value, errors } = validateLoginInput(req.body);
    if (errors.length > 0) {
      throw new ApiError(422, "validation_failed", "The request is not a valid login.", errors);
    }
    if (!authStore) {
      throw new ApiError(503, "database_unavailable", "The database is not available.");
    }
    if (!jwtSecret) {
      throw new ApiError(503, "auth_unavailable", "Authentication is not configured.");
    }

    const user = await authStore.findUserByEmail(value.email);
    if (!user) {
      // Same bcrypt work as a real check, so timing does not reveal that the email is unknown.
      await verifyAgainstDummy(value.password);
      throw invalidCredentials();
    }
    if (!(await verifyPassword(value.password, user.passwordHash))) {
      throw invalidCredentials();
    }

    res.json({
      data: {
        accessToken: signAccessToken(user, jwtSecret),
        tokenType: "Bearer",
        expiresIn: TOKEN_TTL_SECONDS,
        user: { id: user.id, email: user.email, role: user.role },
      },
    });
  });

  return router;
}
