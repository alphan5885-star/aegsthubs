import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/login")({
  beforeLoad: async ({ context }) => context,
});
