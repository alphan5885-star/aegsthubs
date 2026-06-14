import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import VendorDashboard from "@/pages/VendorDashboard";
import { Protected } from "@/lib/Protected";

function VendorRoutePage() {
  const { pathname } = useLocation();

  // Dynamically allow "buyer" roles only for the application page, keeping other vendor paths locked
  const allowedRoles =
    pathname === "/vendor/bond"
      ? (["buyer", "vendor", "admin"] as Array<"buyer" | "vendor" | "admin">)
      : (["vendor", "admin"] as Array<"buyer" | "vendor" | "admin">);

  return (
    <Protected roles={allowedRoles}>
      {pathname === "/vendor" ? <VendorDashboard /> : <Outlet />}
    </Protected>
  );
}

export const Route = createFileRoute("/vendor")({
  component: VendorRoutePage,
});
