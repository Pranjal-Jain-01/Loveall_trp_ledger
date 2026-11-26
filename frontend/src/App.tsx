import { BrowserRouter, Routes, Route } from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import DonorVerifyPage from './pages/DonorVerifyPage';
import DonorTracePage from './pages/DonorTracePage';
import StaffLoginPage from './pages/StaffLoginPage';
import RoleWorkspacePage from './pages/RoleWorkspacePage';
import FundPoolsPage from './pages/FundPoolsPage';
import DisbursementsPage from './pages/DisbursementsPage';
import ProgrammesPage from './pages/ProgrammesPage';
import AgreementsPage from './pages/AgreementsPage';
import StaffManagementPage from './pages/StaffManagementPage';
import ComplianceLogsPage from './pages/ComplianceLogsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public — Donor flow */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/donor/verify" element={<DonorVerifyPage />} />
        <Route path="/donor/trace/:token" element={<DonorTracePage />} />

        {/* Protected — Staff flow */}
        <Route path="/staff/login" element={<StaffLoginPage />} />
        <Route path="/staff/workspaces" element={<RoleWorkspacePage />} />
        <Route path="/staff/fund-pools" element={<FundPoolsPage />} />
        <Route path="/staff/disbursements" element={<DisbursementsPage />} />
        <Route path="/staff/programmes" element={<ProgrammesPage />} />
        <Route path="/staff/agreements" element={<AgreementsPage />} />
        <Route path="/staff/users" element={<StaffManagementPage />} />
        <Route path="/staff/compliance" element={<ComplianceLogsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
