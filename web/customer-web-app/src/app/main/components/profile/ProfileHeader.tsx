import { Edit2, LogOut, Mail, Phone } from "lucide-react";

interface BasicProfile {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
}

interface ProfileHeaderProps {
  profile: BasicProfile;
  greeting: string;
  onEditProfile: () => void;
  onLogout: () => void;
}

export const ProfileHeader = ({
  profile,
  greeting,
  onEditProfile,
  onLogout,
}: ProfileHeaderProps) => {
  const fullName = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(" ");

  return (
  <section className="px-4 pb-4 pt-4 sm:pb-6 sm:pt-6">
    <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[1.75rem] bg-[#181816] px-5 py-6 text-white shadow-[0_24px_70px_-40px_rgba(0,0,0,0.75)] sm:px-8 sm:py-8">
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-yellow-400/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-white/5 blur-2xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4 sm:gap-6">
          <div className="relative shrink-0">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/10 text-xl font-black uppercase text-white shadow-lg sm:h-24 sm:w-24 sm:rounded-3xl sm:text-3xl">
              {profile.avatar ? (
                // Avatar URLs can come from multiple identity providers whose
                // hostnames are not known at build time.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar}
                  alt={`${fullName || "User"} profile`}
                  className="h-full w-full object-cover"
                />
              ) : (
                fullName.charAt(0) || "U"
              )}
            </div>
            <button
              onClick={onEditProfile}
              className="absolute -bottom-1 -right-1 rounded-full border-2 border-[#181816] bg-yellow-400 p-1.5 text-black shadow-md transition hover:scale-105 sm:p-2"
              aria-label="Edit profile"
            >
              <Edit2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
          </div>

          <div className="min-w-0 pt-0.5 sm:pt-1">
            <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-yellow-400 sm:text-xs">
              {greeting}
            </p>
            <h1 className="truncate text-xl font-black tracking-tight sm:text-3xl">
              {fullName || "Asoose customer"}
            </h1>
            <div className="mt-2 space-y-1.5 text-xs font-medium text-white/60 sm:text-sm">
              <p className="flex min-w-0 items-center gap-2">
                <Mail className="h-3.5 w-3.5 shrink-0 text-yellow-400" />
                <span className="truncate">{profile.email}</span>
              </p>
              {profile.phone && (
                <p className="flex min-w-0 items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-yellow-400" />
                  <span className="truncate">{profile.phone}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="shrink-0 rounded-xl border border-white/10 bg-white/5 p-2.5 text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white sm:flex sm:items-center sm:gap-2 sm:px-4"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden text-xs font-bold sm:inline">Sign out</span>
        </button>
      </div>
    </div>
  </section>
  );
};
