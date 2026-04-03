import React from 'react';
import AdminPanel from './AdminPanel';

const ServiceAdminPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-mesh text-slate-900">
      <section className="pb-16">
        <AdminPanel />
      </section>
    </div>
  );
};

export default ServiceAdminPage;
