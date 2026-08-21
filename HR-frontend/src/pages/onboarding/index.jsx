import { Route } from "react-router-dom";
import EmpPersonalDetails from "./EmpPersonalDetails";
import OnboardDocs from "./OnboardDocs";
import ProfileWork from "./ProfileWork";
import WorkClient from "./WorkClient";
import Education from "./Education";
import Skills from "./Skills";
import Documents from "./Documents";
import Invoices from "./Invoices";

// Shared onboarding routes for both admin and employee
export default (
  <>
    <Route path="EmpPersonalDetails" element={<EmpPersonalDetails />} />
    <Route path="OnboardDocs" element={<OnboardDocs />} />
    <Route path="ProfileWork" element={<ProfileWork />} />
    <Route path="WorkClient" element={<WorkClient />} />
    <Route path="Education" element={<Education />} />
    <Route path="Skills" element={<Skills />} />
    <Route path="Documents" element={<Documents />} />
    <Route path="Invoices" element={<Invoices />} />
  </>
);