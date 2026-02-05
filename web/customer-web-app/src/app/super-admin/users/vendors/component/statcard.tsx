export const StatCard = ({
  title,
  count,
  color,
  icon,
  onClick,
  active,
}: any) => (
  <div
    onClick={onClick}
    className={`bg-[#1E293B] border p-4 rounded-xl flex flex-col justify-between h-full transition-all cursor-pointer hover:bg-gray-800 hover:border-gray-600 ${active ? "border-yellow-500 ring-1 ring-yellow-500" : "border-gray-800"}`}
  >
    <div className="flex justify-between items-start">
      <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">
        {title}
      </span>
      {icon}
    </div>
    <div className={`text-2xl font-black mt-2 ${color}`}>
      {count.toLocaleString()}
    </div>
  </div>
);
