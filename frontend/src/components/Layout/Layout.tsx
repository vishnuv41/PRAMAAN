import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { api } from '../../api/client';

export const Layout: React.FC = () => {
  const [openAlertsCount, setOpenAlertsCount] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchAlertsCount = async () => {
    try {
      const data = await api.listAlerts({ status: 'OPEN' });
      setOpenAlertsCount(data.total || 0);
    } catch (e) {
      console.error('Failed to load alert count', e);
    }
  };

  useEffect(() => {
    fetchAlertsCount();
  }, []);

  const handleGlobalRefresh = async () => {
    setIsRefreshing(true);
    try {
      await api.reEvaluateAlerts();
      await fetchAlertsCount();
      // Dispatch custom event so active pages can refresh their data
      window.dispatchEvent(new Event('sentinel-refresh'));
    } catch (e) {
      console.error('Refresh failed', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      <Sidebar openAlertsCount={openAlertsCount} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onRefresh={handleGlobalRefresh} isRefreshing={isRefreshing} />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
