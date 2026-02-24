"use client";

import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { toast } from "react-toastify";
import { Loader2, Trash2, ExternalLink, Edit2, X } from "lucide-react";
import Image from "next/image";
import { getSession } from "next-auth/react";
import Swal from "sweetalert2";

import ImageUpload from "@/app/main/components/ImageUpload";
import { fetcher } from "../hooks/useSuperAdminFetch";

const BACKEND_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1"
).replace(/\/$/, "");

// 1. Define strict interfaces for type safety
type BannerType = "PROMO" | "AD" | "INFO";

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  buttonText: string;
  link: string;
  image: string;
  type: BannerType;
  priority: number;
  isActive: boolean;
}

const BUCKET_NAME =
  process.env.NEXT_PUBLIC_STORAGE_BUCKET || "marketplace_assets";
if (!process.env.NEXT_PUBLIC_STORAGE_BUCKET) {
  console.warn(
    "[Banners] NEXT_PUBLIC_STORAGE_BUCKET not set — using fallback 'marketplace_assets'",
  );
}

// 2. Form Schema
const bannerSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().min(1, "Subtitle is required"),
  buttonText: z.string().min(1, "Button text is required"),
  // Accepts both relative paths ("/main/store") and absolute URLs
  link: z.string().min(1, "Link is required"),
  type: z.enum(["PROMO", "AD", "INFO"]),
  priority: z.number().int().min(0).max(100),
  image: z.string().min(1, "Banner image is required"),
  isActive: z.boolean(),
});

type BannerFormValues = z.infer<typeof bannerSchema>;

/**
 * Helper to handle mutations (POST/PATCH/DELETE) with NextAuth session logic.
 * Pass `arg.path` to override the SWR key URL (needed for PATCH/DELETE with :id).
 */
async function mutationFetcher(
  url: string,
  { arg }: { arg: { method: string; body?: any; path?: string } },
) {
  const session = await getSession();
  const token = (session as any)?.accessToken;

  if (!token) throw new Error("Authentication required");

  const finalPath = arg.path ?? url;

  const res = await fetch(`${BACKEND_URL}${finalPath}`, {
    method: arg.method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: arg.body ? JSON.stringify(arg.body) : undefined,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Request failed");
  }

  return res.status === 204 ? null : res.json();
}

export default function BannerManagement() {
  const [editingId, setEditingId] = useState<string | null>(null);

  // 3. Explicitly typed useSWR
  const {
    data: banners,
    mutate: refreshBanners,
    isLoading: loadingList,
  } = useSWR<Banner[]>("/super-admin/banners", fetcher);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<BannerFormValues>({
    resolver: zodResolver(bannerSchema),
    defaultValues: {
      buttonText: "Order Now",
      link: "/main/store",
      type: "PROMO",
      priority: 0,
      isActive: true,
    },
  });

  const { trigger: mutationTrigger, isMutating } = useSWRMutation(
    "/super-admin/banners",
    mutationFetcher,
  );

  const onSubmit: SubmitHandler<BannerFormValues> = async (data) => {
    try {
      if (editingId) {
        await mutationTrigger({
          method: "PATCH",
          path: `/super-admin/banners/${editingId}`,
          body: data,
        } as any);
        toast.success("Banner updated successfully!");
      } else {
        await mutationTrigger({ method: "POST", body: data } as any);
        toast.success("Banner created successfully!");
      }
      handleCancelEdit();
      refreshBanners();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleEdit = (banner: Banner) => {
    setEditingId(banner.id);
    reset({
      title: banner.title,
      subtitle: banner.subtitle,
      buttonText: banner.buttonText,
      link: banner.link,
      type: banner.type,
      priority: banner.priority,
      image: banner.image,
      isActive: banner.isActive,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    reset({
      title: "",
      subtitle: "",
      buttonText: "Order Now",
      link: "/main/store",
      type: "PROMO",
      priority: 0,
      image: "",
      isActive: true,
    });
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This banner will be permanently removed.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EAB308", // yellow-500
      cancelButtonColor: "#1E293B", // Slate-800
      confirmButtonText: "Yes, delete it!",
      background: "#0F172A", // App dark background
      color: "#fff",
      customClass: {
        popup: "rounded-xl border border-gray-800",
      },
    });

    if (result.isConfirmed) {
      try {
        await fetcher(`/super-admin/banners/${id}`, { method: "DELETE" });
        toast.success("Banner deleted");
        refreshBanners();
      } catch (err: any) {
        toast.error(err.message || "Delete failed");
      }
    }
  };

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
      {/* Form Section */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            {editingId ? "Edit Banner" : "Create Banner"}
          </h1>
          {editingId && (
            <button
              onClick={handleCancelEdit}
              className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
            >
              <X size={14} /> Cancel Edit
            </button>
          )}
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6 bg-[#1E293B] p-6 rounded-xl border border-gray-800"
        >
          <ImageUpload
            bucket={BUCKET_NAME}
            label="Banner Image *"
            value={watch("image")}
            onUpload={(url) => setValue("image", url, { shouldValidate: true })}
          />
          {errors.image && (
            <p className="text-red-500 text-xs mt-1">{errors.image.message}</p>
          )}

          <div className="space-y-4">
            <input
              {...register("title")}
              placeholder="Title"
              className="w-full p-2.5 bg-[#0F172A] border border-gray-700 rounded-lg outline-none focus:border-yellow-500 text-white"
            />
            {errors.title && (
              <p className="text-red-500 text-xs mt-1">
                {errors.title.message}
              </p>
            )}

            <input
              {...register("subtitle")}
              placeholder="Subtitle"
              className="w-full p-2.5 bg-[#0F172A] border border-gray-700 rounded-lg outline-none focus:border-yellow-500 text-white"
            />
            {errors.subtitle && (
              <p className="text-red-500 text-xs mt-1">
                {errors.subtitle.message}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <select
                {...register("type")}
                className="p-2.5 bg-[#0F172A] border border-gray-700 rounded-lg text-white"
              >
                <option value="PROMO">Promotion</option>
                <option value="AD">Ad</option>
                <option value="INFO">Info</option>
              </select>
              <div>
                <input
                  type="number"
                  {...register("priority", { valueAsNumber: true })}
                  placeholder="Priority (0-100)"
                  className="w-full p-2.5 bg-[#0F172A] border border-gray-700 rounded-lg text-white"
                />
                {errors.priority && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.priority.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  {...register("buttonText")}
                  placeholder="Button Text"
                  className="w-full p-2.5 bg-[#0F172A] border border-gray-700 rounded-lg text-white"
                />
                {errors.buttonText && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.buttonText.message}
                  </p>
                )}
              </div>
              <div>
                <input
                  {...register("link")}
                  placeholder="Link URL"
                  className="w-full p-2.5 bg-[#0F172A] border border-gray-700 rounded-lg text-white"
                />
                {errors.link && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.link.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register("isActive")}
                id="isActive"
                className="w-4 h-4 accent-yellow-500"
              />
              <label
                htmlFor="isActive"
                className="text-sm text-gray-300 cursor-pointer"
              >
                Active and visible to customers
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isMutating}
            className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-700 text-black py-3 rounded-lg font-bold transition-all flex justify-center"
          >
            {isMutating ? (
              <Loader2 className="animate-spin" />
            ) : editingId ? (
              "Update Banner"
            ) : (
              "Create Banner"
            )}
          </button>
        </form>
      </div>

      {/* List Section */}
      <div>
        <h2 className="text-2xl font-bold mb-6">All Banners</h2>
        <div className="space-y-4 overflow-y-auto max-h-[700px] pr-2 custom-scrollbar">
          {loadingList ? (
            <div className="flex justify-center p-12">
              <Loader2 className="animate-spin text-yellow-500" />
            </div>
          ) : banners?.length === 0 ? (
            <div className="text-center p-12 text-gray-500 border border-dashed border-gray-800 rounded-xl">
              No banners found.
            </div>
          ) : (
            banners?.map((banner) => (
              <div
                key={banner.id}
                className={`bg-[#1E293B] border ${editingId === banner.id ? "border-yellow-500" : "border-gray-800"} rounded-xl overflow-hidden flex gap-4 p-3 group transition-all`}
              >
                <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-[#0F172A]">
                  {/* rendering guard from previous fix */}
                  {banner.image ? (
                    <Image
                      src={banner.image}
                      alt={banner.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 text-[10px] font-bold uppercase">
                      No Image
                    </div>
                  )}
                  {!banner.isActive && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                        Inactive
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <h3 className="font-bold text-sm text-white">
                    {banner.title}
                  </h3>
                  <p className="text-xs text-gray-400 line-clamp-1">
                    {banner.subtitle}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${banner.type === "PROMO" ? "bg-orange-500/20 text-orange-500" : "bg-indigo-500/20 text-indigo-500"}`}
                    >
                      {banner.type}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      Priority: {banner.priority}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(banner)}
                    className="p-2 hover:bg-white/5 rounded-lg text-blue-400 transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                  <a
                    href={banner.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-white/5 rounded-lg text-gray-400 transition-colors"
                    title="Visit Link"
                  >
                    <ExternalLink size={16} />
                  </a>
                  <button
                    onClick={() => handleDelete(banner.id)}
                    className="p-2 hover:bg-red-500/10 rounded-lg text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}