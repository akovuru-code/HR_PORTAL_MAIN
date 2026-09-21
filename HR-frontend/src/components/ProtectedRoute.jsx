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

export default function ProtectedRoute({ allowedRoles, allowedAccountTypes, allowedAdminRoles, permission, anyPermissions, children }) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    const accountType = user.accountType || ((user.role || '').toLowerCase() === 'admin' ? 'admin' : user.role);
    if (allowedAccountTypes && !allowedAccountTypes.includes(accountType)) return <Navigate to="/unauthorized" replace />;
    if (allowedAdminRoles) {
        const adminRole = String(user.adminRole || user.admin_role || '').toLowerCase();
        const isAllowedAdmin = accountType === 'root_admin' || (accountType === 'admin' && allowedAdminRoles.includes(adminRole));
        if (!isAllowedAdmin) return <Navigate to="/unauthorized" replace />;
    }
    if (permission && accountType !== 'root_admin' && !(user.permissions || []).includes(permission)) return <Navigate to="/unauthorized" replace />;
    if (anyPermissions && accountType !== 'root_admin' && !anyPermissions.some(item => (user.permissions || []).includes(item))) return <Navigate to="/unauthorized" replace />;
    if (!allowedRoles) return children;
    const userRole = (user.role || "").toUpperCase();
    const allowed = allowedRoles.map(r => r.toUpperCase());
    if (!allowed.includes(userRole)) return <Navigate to="/unauthorized" replace />;
    return children;
}
