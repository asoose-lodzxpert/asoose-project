'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRideStore } from '@/app/main/ride/store/ride';

export default function RedirectToRides() {
  const router = useRouter();
  const setActiveTab = useRideStore((state: any) => state.setActiveTab);

  useEffect(() => {
    setActiveTab('history');
    router.replace('/main/ride');
  }, [router, setActiveTab]);

  return null;
}
