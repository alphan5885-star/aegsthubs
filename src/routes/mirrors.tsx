import { createFileRoute } from "@tanstack/react-router";
import Protected from "@/lib/Protected";
import Mirrors from "@/pages/Mirrors";

export const Route = createFileRoute("/mirrors")({
  component: () => (
    <Protected>
      <Mirrors />
    </Protected>
  ),
});
