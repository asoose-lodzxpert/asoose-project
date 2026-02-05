export const FilterSelect = ({ label, value, onChange, options }: any) => (
  <div className="w-full md:w-40 shrink-0">
    <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-yellow-500 cursor-pointer"
    >
      <option>All {label}</option>
      {options.map((opt: string) => (
        <option key={opt} value={opt}>
          {opt.charAt(0).toUpperCase() + opt.slice(1).toLowerCase()}
        </option>
      ))}
    </select>
  </div>
);
