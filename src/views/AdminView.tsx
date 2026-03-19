import React from 'react';
import AdminLayout from '../admin/AdminLayout';

interface AdminViewProps {
  userRole: string;
  onNavigate?: (view: string) => void;
}

export default function AdminView({ userRole, onNavigate }: AdminViewProps) {
  const handleExit = () => {
    if (onNavigate) {
      onNavigate('menu');
    } else {
      window.location.reload();
    }
  };

  return <AdminLayout userRole={userRole} onExitAdmin={handleExit} />;
}
