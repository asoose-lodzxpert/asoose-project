'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRideStore } from '@/app/main/ride/store/ride';

export default function RedirectToBook() {
  const router = useRouter();
  const setActiveTab = useRideStore((state: any) => state.setActiveTab);
  const setBookingStage = useRideStore((state: any) => state.setBookingStage);

  useEffect(() => {
    setActiveTab('scheduled');
    setBookingStage('LOCATION');
    router.replace('/main/ride');
  }, [router, setActiveTab, setBookingStage]);

  return null;
}
