'use client';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('./map'), { ssr: false });

interface MapViewProps {
  userPos: [number, number] | null;
  destPos: [number, number] | null;
  tripStatus?: string; // <--- ADDED
  onRouteData?: (distance: number, duration: number) => void;
}

export default function MapView(props: MapViewProps) {
  return <Map {...props} />;
}