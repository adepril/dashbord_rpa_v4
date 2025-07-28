'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Dashboard from '../../components/Dashboard';


export default function DashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  return (
    <main >
      <Dashboard />
    </main>
  );
}
