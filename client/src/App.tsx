import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import MainLayout from './components/MainLayout';
import PayslipList from './pages/PayslipList';
import PayslipDetail from './pages/PayslipDetail';
import DeductionSubmit from './pages/DeductionSubmit';
import ApprovalList from './pages/ApprovalList';
import ReportView from './pages/ReportView';
import Dashboard from './pages/Dashboard';
import { UserInfo } from './services/api';

function App() {
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const isAuthenticated = !!user || !!localStorage.getItem('token');

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {isAuthenticated ? (
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="payslip" element={<PayslipList />} />
          <Route path="payslip/:year/:month" element={<PayslipDetail />} />
          <Route path="deduction" element={<DeductionSubmit />} />
          {user?.approvalLevel && user.approvalLevel >= 0 ? (
            <Route path="approval" element={<ApprovalList />} />
          ) : null}
          <Route path="report" element={<ReportView />} />
        </Route>
      ) : (
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}
    </Routes>
  );
}

export default App;
