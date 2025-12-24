import { Activity,RefreshCw } from "lucide-react";
interface ActivityLog {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  details: string;
}
const ActivityLogTab = ({ logs }: { logs: ActivityLog[] }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <Activity className="w-5 h-5 text-purple-500" />
        Activity & Audit Trail
      </h3>
      <button className="text-sm text-blue-400 hover:underline flex items-center gap-1">
        <RefreshCw className="w-3 h-3" /> Refresh
      </button>
    </div>
    
    <div className="space-y-3">
      {logs.map((log) => (
        <div key={log.id} className="bg-[#0F172A] border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-all">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500 shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-white">{log.action}</h4>
                  <p className="text-sm text-gray-400 mt-1">{log.details}</p>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">{log.timestamp}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">by {log.user}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default ActivityLogTab