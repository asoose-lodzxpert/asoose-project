import { Edit2, MapPin, LogOut } from 'lucide-react';

interface ProfileHeaderProps {
  profile: any;
  greeting: string;
  defaultAddr: any;
  orderCount: number;
  onEditProfile: () => void;
  onLogout: () => void;
}

export const ProfileHeader = ({ 
  profile, greeting, defaultAddr, orderCount, onEditProfile, onLogout 
}: ProfileHeaderProps) => (
  <div className="bg-white dark:bg-[#0a0a0a] pt-12 pb-10 px-6">
    <div className="max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-8">
        <div className="flex items-start gap-6">
          <div className="relative">
            <div className="w-20 h-20 bg-gray-100 dark:bg-zinc-900 rounded-full flex items-center justify-center text-2xl font-semibold text-gray-900 dark:text-white overflow-hidden">
            {profile.avatarUrl ? (
    <img 
      src={profile.avatarUrl} 
      alt="Profile" 
      className="w-full h-full object-cover" 
    />
  ) : (
    profile.name?.charAt(0) || 'U'
  )}
            </div>
            <button 
              onClick={onEditProfile} 
              className="absolute -bottom-1 -right-1 p-1.5 bg-gray-900 dark:bg-white text-white dark:text-black rounded-full hover:scale-105 transition-transform"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          </div>

          <div className="pt-1">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{profile.name}</h1>
            <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">{profile.email}</p>
            {defaultAddr && (
              <div className="flex items-center gap-1.5 mt-3 text-sm text-gray-600 dark:text-zinc-400">
                <MapPin className="w-3.5 h-3.5" />
                <span>{defaultAddr.street}, {defaultAddr.city}</span>
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={onLogout} 
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
          aria-label="Sign out"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-8 mt-8 pt-6 border-t border-gray-100 dark:border-zinc-900">
        <div>
          <span className="text-lg font-semibold text-gray-900 dark:text-white">{orderCount}</span>
          <span className="text-xs text-gray-500 dark:text-zinc-500 ml-1.5">orders</span>
        </div>
        <div className="w-px h-4 bg-gray-200 dark:bg-zinc-800" />
        <div>
          <span className="text-lg font-semibold text-gray-900 dark:text-white">{new Date(profile.createdAt || Date.now()).getFullYear()}</span>
          <span className="text-xs text-gray-500 dark:text-zinc-500 ml-1.5">joined</span>
        </div>
      </div>
    </div>
  </div>
);