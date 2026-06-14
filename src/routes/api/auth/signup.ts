import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/signup")({
  beforeLoad: async ({ context }) => context,
});
