import { createFileRoute } from "@tanstack/react-router";
import Help from "@/pages/Help";
import { Protected } from "@/lib/Protected";

export const Route = createFileRoute("/help")({
  component: () => (
    <Protected roles={["buyer", "vendor", "admin"]}>
      <Help />
    </Protected>
  ),
});
