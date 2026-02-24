"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User, Lock, Save, Loader2, Key } from "lucide-react";
import { toast } from "react-toastify";
import { getSession } from "next-auth/react";

import { fetcher } from "../hooks/useSuperAdminFetch";
import AdminProfileSkeleton from "./skeleton";

interface AdminProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  role: string;
  createdAt: string;
}

// --- Validation Schemas ---
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .regex(
      /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/,
      "Invalid phone format",
    )
    .optional()
    .or(z.literal("")),
  // Removed avatar_url from validation requirements for update
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Please enter your current password"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[a-z]/, "Must contain at least one lowercase letter")
      .regex(/[0-9]/, "Must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must differ from current password",
    path: ["newPassword"],
  });

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

export default function AdminProfilePage() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // Fetch Profile
  const {
    data: profile,
    mutate,
    isLoading,
    error,
  } = useSWR<AdminProfile>("/users/profile", fetcher);

  // Forms Initialization
  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", phone: "" },
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  // Sync data when loaded
  useEffect(() => {
    if (profile) {
      profileForm.reset({
        name: profile.name || "",
        phone: profile.phone || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const onUpdateProfile = async (values: ProfileValues) => {
    setIsUpdating(true);
    try {
      const session = await getSession();
      const token = (session as any)?.accessToken;

      if (!token) {
        throw new Error("No active session. Please login again.");
      }

      const res = await fetch(`${API_URL}/users/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update profile");
      }

      await mutate();
      toast.success("Profile updated successfully");
    } catch (error: any) {
      console.error("Profile update error:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsUpdating(false);
    }
  };

  const onUpdatePassword = async (values: PasswordValues) => {
    setIsChangingPassword(true);
    try {
      const session = await getSession();
      const token = (session as any)?.accessToken;

      if (!token) {
        throw new Error("No active session. Please login again.");
      }

      const res = await fetch(`${API_URL}/users/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
          confirmPassword: values.confirmPassword,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update password");
      }

      toast.success("Password changed successfully");
      passwordForm.reset();
    } catch (error: any) {
      console.error("Password update error:", error);
      toast.error(error.message || "Failed to update password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return <AdminProfileSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="text-red-500 text-xl font-bold">
          Failed to load profile
        </div>
        <p className="text-gray-400 text-sm">{error.message}</p>
        <button
          onClick={() => mutate()}
          className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-2xl hover:bg-yellow-400"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-gray-400">No profile data available</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-black text-white tracking-tight">
          Account Settings
        </h1>
        <p className="text-gray-400 text-sm">
          Manage your administrative profile and security credentials.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT: Identity Card */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          <div className="bg-[#1E293B] border border-gray-800 rounded-3xl p-8 text-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500" />

            {/* Replaced Upload with Static Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 bg-[#0F172A] rounded-full flex items-center justify-center border-4 border-[#1E293B] shadow-xl">
                <User className="w-12 h-12 text-yellow-500" />
              </div>
            </div>

            <h2 className="text-xl font-black text-white">{profile.name}</h2>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-6">
              {profile.email}
            </p>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-4 py-3 bg-[#0F172A] rounded-2xl border border-gray-800">
                <span className="text-[10px] font-black text-gray-500 uppercase">
                  Role
                </span>
                <span className="text-[10px] font-black text-yellow-500 uppercase bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
                  {profile.role?.replace("ADMIN_", "") || "SUPER ADMIN"}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-[#0F172A] rounded-2xl border border-gray-800">
                <span className="text-[10px] font-black text-gray-500 uppercase">
                  Member Since
                </span>
                <span className="text-xs font-bold text-white">
                  {profile.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Edit Forms */}
        <div className="lg:col-span-8 space-y-6">
          {/* Profile Details Form */}
          <section className="bg-[#1E293B] border border-gray-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-gray-800 flex items-center gap-3 bg-white/5">
              <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400">
                <User size={18} />
              </div>
              <h3 className="font-black text-white text-sm">
                Personal Information
              </h3>
            </div>

            <form
              onSubmit={profileForm.handleSubmit(onUpdateProfile)}
              className="p-8 space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Full Name
                  </label>
                  <input
                    {...profileForm.register("name")}
                    className="w-full bg-[#0F172A] border border-gray-700 rounded-2xl p-4 text-white text-sm focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all"
                    placeholder="Enter your full name"
                  />
                  {profileForm.formState.errors.name && (
                    <p className="text-red-500 text-[10px] font-bold ml-1">
                      {profileForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Phone Number
                  </label>
                  <input
                    {...profileForm.register("phone")}
                    className="w-full bg-[#0F172A] border border-gray-700 rounded-2xl p-4 text-white text-sm focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all"
                    placeholder="+234 801 234 5678"
                  />
                  {profileForm.formState.errors.phone && (
                    <p className="text-red-500 text-[10px] font-bold ml-1">
                      {profileForm.formState.errors.phone.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isUpdating || !profileForm.formState.isDirty}
                  className="flex items-center gap-2 px-8 py-4 bg-yellow-500 text-black font-black text-sm rounded-2xl hover:bg-yellow-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}
                  {isUpdating ? "Updating..." : "Update Profile"}
                </button>
              </div>
            </form>
          </section>

          {/* Change Password Form */}
          <section className="bg-[#1E293B] border border-gray-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-gray-800 flex items-center gap-3 bg-white/5">
              <div className="p-2 bg-red-500/20 rounded-xl text-red-400">
                <Lock size={18} />
              </div>
              <h3 className="font-black text-white text-sm">
                Security Credentials
              </h3>
            </div>

            <form
              onSubmit={passwordForm.handleSubmit(onUpdatePassword)}
              className="p-8 space-y-6"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Current Password
                </label>
                <input
                  type="password"
                  {...passwordForm.register("currentPassword")}
                  className="w-full bg-[#0F172A] border border-gray-700 rounded-2xl p-4 text-white text-sm focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                  placeholder="Enter your current password"
                />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-red-500 text-[10px] font-bold ml-1">
                    {passwordForm.formState.errors.currentPassword.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    {...passwordForm.register("newPassword")}
                    className="w-full bg-[#0F172A] border border-gray-700 rounded-2xl p-4 text-white text-sm focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                    placeholder="Enter new password"
                  />
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-red-500 text-[10px] font-bold ml-1">
                      {passwordForm.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    {...passwordForm.register("confirmPassword")}
                    className="w-full bg-[#0F172A] border border-gray-700 rounded-2xl p-4 text-white text-sm focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                    placeholder="Confirm new password"
                  />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-red-500 text-[10px] font-bold ml-1">
                      {passwordForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-[#0F172A] border border-gray-800 rounded-2xl p-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Password Requirements:
                </p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• At least 8 characters long</li>
                  <li>• Contains uppercase and lowercase letters</li>
                  <li>• Contains at least one number</li>
                  <li>• Contains at least one special character</li>
                </ul>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={
                    isChangingPassword || !passwordForm.formState.isDirty
                  }
                  className="flex items-center gap-2 px-8 py-4 bg-[#0F172A] text-white font-black text-sm rounded-2xl border border-gray-700 hover:bg-gray-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isChangingPassword ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Key size={18} />
                  )}
                  {isChangingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
