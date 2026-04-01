import { Calendar, CheckCircle, Clock } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { TransactionDetail } from '../types';
import { formatDateTime } from '@/utils/formatDate';

export const Timeline = ({ timeline }: { timeline: TransactionDetail['timeline'] }) => (
  <SectionCard title="Transaction Timeline" icon={Calendar} iconColorClass="bg-[#0F172A] text-gray-300">
    <div className="space-y-6">
      {timeline.map((event, idx) => (
        <div key={idx} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              event.done ? 'bg-green-500/20 text-green-500' : 'bg-gray-700 text-gray-500'
            }`}>
              {event.done ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
            </div>
            {idx < timeline.length - 1 && (
              <div className={`w-0.5 h-12 ${event.done ? 'bg-green-500/30' : 'bg-gray-700'}`} />
            )}
          </div>
          <div className="flex-1 pb-6">
            <div className="flex items-center justify-between mb-1">
              <p className="text-white font-medium">{event.status}</p>
              <p className="text-gray-400 text-sm">{formatDateTime(event.date)}</p>
            </div>
            {event.note && (
              <p className="text-red-400 text-sm mt-2 bg-red-500/10 p-3 rounded-lg">{event.note}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  </SectionCard>
);