import React from 'react';
import { Clock } from 'lucide-react';
import { TransactionDetail } from './data';


export default function TransactionTimeline({ timeline }: { timeline: TransactionDetail['timeline'] }) {
  return (
    <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <Clock className="w-5 h-5 text-gray-400" /> Processing Timeline
      </h3>
      <div className="space-y-6 relative border-l border-gray-700 ml-2 pl-6">
        {timeline.map((log, i) => (
          <div key={i} className="relative">
            <div className={`absolute -left-[29px] top-1 w-3 h-3 rounded-full border-2 border-[#1E293B] ${
              i === timeline.length - 1 ? 'bg-green-500' : 'bg-gray-600'
            }`}></div>
            <p className="text-sm font-bold text-white">{log.status}</p>
            <p className="text-xs text-gray-500 mb-1">{log.time}</p>
            <p className="text-xs text-gray-400">{log.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}