import { createFileRoute } from "@tanstack/react-router";
import Notifications from "@/pages/Notifications";
import { Protected } from "@/lib/Protected";

export const Route = createFileRoute("/notifications")({
  component: () => (
    <Protected roles={["buyer", "vendor", "admin"]}>
      <Notifications />
    </Protected>
  ),
});
