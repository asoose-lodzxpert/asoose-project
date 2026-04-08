"use client";

import React, { useState } from "react";
import { SignupStep3Data, OpenHour } from "@/types/vendor-signup";
import { DAYS } from "@/constants/vendor-signup";
import { Store, Image, MapPin, Clock, Plus, Trash2, Camera } from "lucide-react";
import LocationInput from "@/components/LocationInput";

interface Step3Props {
  data: SignupStep3Data;
  onChange: (keyOrObj: keyof SignupStep3Data | Partial<SignupStep3Data>, val?: any) => void;
}

export default function Step3({ data, onChange }: Step3Props) {
  const [activeDay, setActiveDay] = useState<string>(DAYS[0]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, uriKey: keyof SignupStep3Data, nameKey: keyof SignupStep3Data, fileKey: keyof SignupStep3Data) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      onChange({
        [uriKey]: reader.result as string,
        [nameKey]: file.name,
        [fileKey]: file
      });
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  const updateHours = (day: string, field: keyof OpenHour, val: any) => {
    const newHours = { ...data.openHours };
    const currentDay = { ...(newHours[day] || { open: "08:00", close: "18:00", closed: false, is24Hours: false }) };
    
    if (field === 'closed') {
        currentDay.closed = val;
        if (val) {
            currentDay.is24Hours = false;
            currentDay.open = "";
            currentDay.close = "";
        } else {
            // Restore defaults if unclosing
            currentDay.open = currentDay.open || "08:00";
            currentDay.close = currentDay.close || "18:00";
        }
    } else if (field === 'is24Hours') {
        currentDay.is24Hours = val;
        if (val) {
            currentDay.closed = false;
            currentDay.open = "00:00";
            currentDay.close = "23:59";
        } else {
            // Restore defaults if leaving 24h
            currentDay.open = "08:00";
            currentDay.close = "18:00";
        }
    } else {
        currentDay[field] = val;
        currentDay.closed = false;
        currentDay.is24Hours = false;
    }
    
    newHours[day] = currentDay;
    onChange("openHours", newHours);
  };

  const handleRemoveImage = (uriKey: keyof SignupStep3Data, nameKey: keyof SignupStep3Data, fileKey: keyof SignupStep3Data) => {
    onChange({
        [uriKey]: "",
        [nameKey]: "",
        [fileKey]: null
    });
  };

  const inputCls = "w-full px-4 py-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all text-sm";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h2 className="text-2xl font-black tracking-tight">Store Setup</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">Tell us about your physical or online storefront</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Store Name & Description */}
        <div className="space-y-4">
           <div className="space-y-2">
             <label className="text-sm font-bold flex items-center gap-2">
               <Store size={16} className="text-yellow-500" />
               Store Name
             </label>
             <input
               type="text"
               value={data.storeName}
               onChange={(e) => onChange("storeName", e.target.value)}
               placeholder="How customers will see your business"
               className={inputCls}
             />
           </div>
           <div className="space-y-2">
             <label className="text-sm font-bold flex items-center gap-2">
               <Store size={16} className="text-yellow-500" />
               Store Description
             </label>
             <textarea
               value={data.storeDescription}
               onChange={(e) => onChange("storeDescription", e.target.value)}
               placeholder="Briefly describe what you sell or provide..."
               rows={3}
               className={inputCls}
             />
           </div>
        </div>

        {/* Logo & Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-4">
              <label className="text-sm font-bold flex items-center gap-2">
                <Camera size={16} className="text-yellow-500" />
                Store Logo
              </label>
              <div className="relative group">
                <div 
                  onClick={() => !data.storeLogoUri && document.getElementById('logo-upload')?.click()}
                  className="relative aspect-square w-32 mx-auto rounded-full bg-gray-100 dark:bg-white/5 border-2 border-dashed border-gray-200 dark:border-white/10 flex items-center justify-center overflow-hidden group cursor-pointer hover:border-yellow-500/50 transition-all"
                >
                  {data.storeLogoUri ? (
                    <img src={data.storeLogoUri} className="w-full h-full object-cover" alt="Logo" />
                  ) : (
                    <Plus size={32} className="text-gray-400 group-hover:text-yellow-500 transition-colors" />
                  )}
                  {!data.storeLogoUri && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Camera size={24} className="text-white" />
                    </div>
                  )}
                </div>
                {data.storeLogoUri && (
                  <button 
                    onClick={() => handleRemoveImage("storeLogoUri", "storeLogoName", "storeLogoFile" as any)}
                    className="absolute -top-1 right-1/2 translate-x-12 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all z-10"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <input 
                id="logo-upload" 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={(e) => handleImageChange(e, "storeLogoUri", "storeLogoName", "storeLogoFile" as any)}
              />
           </div>

           <div className="space-y-4">
              <label className="text-sm font-bold flex items-center gap-2">
                <Image size={16} className="text-yellow-500" />
                Store Banner
              </label>
              <div className="relative group">
                <div 
                  onClick={() => !data.storeBannerUri && document.getElementById('banner-upload')?.click()}
                  className="relative aspect-[3/1] w-full rounded-2xl bg-gray-100 dark:bg-white/5 border-2 border-dashed border-gray-200 dark:border-white/10 flex items-center justify-center overflow-hidden cursor-pointer hover:border-yellow-500/50 transition-all"
                >
                  {data.storeBannerUri ? (
                    <img src={data.storeBannerUri} className="w-full h-full object-cover" alt="Banner" />
                  ) : (
                    <Plus size={32} className="text-gray-400 group-hover:text-yellow-500 transition-colors" />
                  )}
                  {!data.storeBannerUri && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Camera size={24} className="text-white" />
                    </div>
                  )}
                </div>
                {data.storeBannerUri && (
                  <button 
                    onClick={() => handleRemoveImage("storeBannerUri", "storeBannerName", "storeBannerFile" as any)}
                    className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-xl shadow-lg hover:bg-red-600 transition-all z-10"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <input 
                id="banner-upload" 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={(e) => handleImageChange(e, "storeBannerUri", "storeBannerName", "storeBannerFile" as any)}
              />
           </div>
        </div>

        {/* Location Picker */}
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-white/10">
           <LocationInput 
              value={data.address || ""}
              onChange={(address, details) => {
                if (details && details.lat !== undefined && details.lng !== undefined) {
                  onChange("location", { lat: details.lat, lng: details.lng });
                  onChange("address", address);
                } else {
                  onChange("address", address);
                }
              }}
              label="Business Location"
              required
           />
        </div>

        {/* Operating Hours */}
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-white/10">
          <label className="text-sm font-bold flex items-center gap-2">
            <Clock size={16} className="text-yellow-500" />
            Operating Hours
          </label>
          
          <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
            {DAYS.map(day => (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${activeDay === day ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20" : "bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10"}`}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>

          <div className="p-6 bg-gray-50 dark:bg-black/20 rounded-2xl border border-gray-200 dark:border-white/10 space-y-4">
             <div className="flex items-center justify-between">
                <span className="text-sm font-bold capitalize">{activeDay}</span>
                <div className="flex items-center gap-4">
                   <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={data.openHours[activeDay]?.closed} 
                        onChange={(e) => updateHours(activeDay, 'closed', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                      />
                      <span className="text-xs font-medium">Closed</span>
                   </label>
                   <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={data.openHours[activeDay]?.is24Hours} 
                        onChange={(e) => updateHours(activeDay, 'is24Hours', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                      />
                      <span className="text-xs font-medium">24 Hours</span>
                   </label>
                </div>
             </div>

             {!data.openHours[activeDay]?.closed && !data.openHours[activeDay]?.is24Hours && (
               <div className="flex items-center gap-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex-1 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-500">Opening Time</span>
                    <input 
                      type="time" 
                      value={data.openHours[activeDay]?.open || "08:00"} 
                      onChange={(e) => updateHours(activeDay, 'open', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-500">Closing Time</span>
                    <input 
                      type="time" 
                      value={data.openHours[activeDay]?.close || "18:00"} 
                      onChange={(e) => updateHours(activeDay, 'close', e.target.value)}
                      className={inputCls}
                    />
                  </div>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
