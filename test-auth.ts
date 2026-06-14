import { signupFn, loginFn } from "./src/lib/authFns";

async function run() {
  try {
    console.log("Testing signup...");
    const res = await signupFn({
      data: {
        identifier: "testuser@local.aeigsthub",
        accessCode: "password123",
        role: "buyer",
      }
    });
    console.log("Signup success:", res);

    console.log("Testing login...");
    const loginRes = await loginFn({
      data: {
        identifier: "testuser@local.aeigsthub",
        accessCode: "password123",
      }
    });
    console.log("Login success:", loginRes);

  } catch (e) {
    console.error("Caught error:", e);
  }
}

run();
