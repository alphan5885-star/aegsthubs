import { useI18n } from "@/lib/i18n";
import { Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/authContext";
import Login from "./Login";

export default function Index() {
  const { t } = useI18n();
  const { user, role, loading } = useAuth();

  if (loading) {
    return <Login />;
  }

  if (user && role) {
    const target = role === "admin" ? "/admin" : role === "vendor" ? "/vendor" : "/market";
    return <Navigate to={target} />;
  }

  return <Login />;
}
