import { loginAction, signupAction } from "./auth-actions.server";
import { createServerFn } from "@tanstack/react-start";

// Re-export the auth actions
export const loginFn = loginAction;
export const signupFn = signupAction;

export const getUserRoleFn = createServerFn({ method: "POST" })
  .inputValidator((data: { userId: string }) => data)
  .handler(async (ctx) => {
    const { userId } = ctx.data;

    // Import db dynamically to avoid issues
    const { default: db } = await import("../server/db");

    const user = (await db
      .prepare('SELECT role FROM "Kullanicilar" WHERE id = ?')
      .get(userId)) as any;

    if (!user) {
      return { role: null };
    }

    return { role: user.role };
  });
