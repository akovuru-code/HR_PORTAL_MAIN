import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

/*export default function ProtectedRoute({ allowedRoles, children }) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    const userRole = (user.role || "").toUpperCase();
    const allowed = allowedRoles.map(r => r.toUpperCase());
    if (!allowedRoles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
    return children;
}*/

export default function ProtectedRoute({ allowedRoles, children }) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    const userRole = (user.role || "").toUpperCase();
    const allowed = allowedRoles.map(r => r.toUpperCase());
    if (!allowed.includes(userRole)) return <Navigate to="/unauthorized" replace />;
    return children;
}