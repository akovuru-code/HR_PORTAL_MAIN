import { Outlet, useLocation } from "react-router-dom";
import EmpLayout from "./emp/EmpLayout";
import DashboardLayout from "../Layouts/DashboardLayout";

const Layout = () => {
  const location = useLocation();
  // If the route starts with /employee, wrap in EmpLayout
  if (location.pathname.startsWith("/employee")) {
    return (
      <EmpLayout>
        <Outlet />
      </EmpLayout>
    );
  }

else{
  return (
  <DashboardLayout>
  <Outlet />
  </DashboardLayout>
);
}

  // Default: just render Outlet
  return <Outlet />;
};

export default Layout;