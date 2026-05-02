import { createFileRoute } from "@tanstack/react-router";
import Checkout from "@/pages/Checkout";
import { Protected } from "@/lib/Protected";

export const Route = createFileRoute("/checkout")({
  component: () => (
    <Protected roles={["buyer", "vendor", "admin"]}>
      <Checkout />
    </Protected>
  ),
});
