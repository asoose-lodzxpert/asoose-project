import { MapPin, Star,Mail,Phone } from "lucide-react";
const BusinessInfoCard = ({ vendor, formData, isEditing, onFormChange }: any) => (
  <div className="lg:col-span-1 bg-[#1E293B] border border-gray-800 rounded-2xl p-6 h-fit">
    <h2 className="text-lg font-bold text-gray-200 mb-6 pb-4 border-b border-gray-800">
      Business Information
    </h2>
    <div className="flex flex-col items-center mb-6">
      <div className="w-24 h-24 rounded-full border-4 border-gray-700 overflow-hidden mb-4 relative">
        <img src={vendor.image} alt={vendor.name} className="w-full h-full object-cover" />
        {vendor.onlineStatus === 'Online' && (
          <div className="absolute bottom-2 right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-[#1E293B]">
            <div className="w-full h-full bg-green-500 rounded-full animate-ping opacity-75"></div>
          </div>
        )}
      </div>
      {isEditing ? (
        <input 
          type="text" 
          value={formData.name} 
          onChange={(e) => onFormChange({...formData, name: e.target.value})} 
          className="bg-[#0F172A] border border-gray-700 text-white text-center font-bold rounded p-2 w-full transition-all focus:border-yellow-500 focus:outline-none"
        />
      ) : (
        <h3 className="text-xl font-bold text-white">{vendor.name}</h3>
      )}
      <p className="text-sm text-gray-400 font-mono mt-1">{vendor.id}</p>
      
      {/* Star Rating */}
      <div className="mt-4 flex items-center gap-2">
        <div className="flex text-yellow-500">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className={`w-4 h-4 ${i < Math.floor(vendor.rating) ? 'fill-yellow-500' : 'text-gray-600'}`} />
          ))}
        </div>
        <span className="text-white font-bold text-lg">{vendor.rating}</span>
        <span className="text-gray-400 text-sm">({vendor.reviews} reviews)</span>
      </div>
    </div>
    
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-gray-300">
        <Mail className="w-4 h-4 text-gray-500 shrink-0" />
        <span className="text-sm">{vendor.email}</span>
      </div>
      <div className="flex items-center gap-3 text-gray-300">
        <Phone className="w-4 h-4 text-gray-500 shrink-0" />
        {isEditing ? (
          <input 
            value={formData.phone} 
            onChange={(e) => onFormChange({...formData, phone: e.target.value})} 
            className="bg-[#0F172A] border border-gray-700 text-white text-sm rounded p-2 w-full transition-all focus:border-yellow-500 focus:outline-none"
          />
        ) : (
          <span className="text-sm">{vendor.phone}</span>
        )}
      </div>
      <div className="flex items-center gap-3 text-gray-300">
        <MapPin className="w-4 h-4 text-gray-500 shrink-0" />
        {isEditing ? (
          <input 
            value={formData.address} 
            onChange={(e) => onFormChange({...formData, address: e.target.value})} 
            className="bg-[#0F172A] border border-gray-700 text-white text-sm rounded p-2 w-full transition-all focus:border-yellow-500 focus:outline-none"
          />
        ) : (
          <span className="text-sm">{vendor.address}</span>
        )}
      </div>
    </div>
  </div>
);

export default BusinessInfoCard