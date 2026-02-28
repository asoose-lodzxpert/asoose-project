"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Loader2,
  Package,
  DollarSign,
  Tag,
  FileText,
  Hash,
  ImagePlus,
  Trash2,
  AlertCircle,
  Plus,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Settings2,
  Check,
  Pencil,
} from "lucide-react";
import { getSession } from "next-auth/react";
import Swal from "sweetalert2";

interface Category {
  id: string;
  name: string;
}

interface ModifierOption {
  id: string;
  name: string;
  price: string;
}

interface ModifierGroup {
  id: string;
  name: string;
  minSelect: string;
  maxSelect: string;
  options: ModifierOption[];
  collapsed: boolean;
}

export interface EditableProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock?: number;
  image?: string;
  category: string;
  categoryId?: string;
  status: string;
}

interface EditProductModalProps {
  isOpen: boolean;
  product: EditableProduct | null;
  storeName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const BACKEND_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1"
).replace(/\/$/, "");

const MAX_FILE_SIZE_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type))
    return "Only JPEG, PNG, WebP, or GIF images are allowed.";
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024)
    return `Image must be under ${MAX_FILE_SIZE_MB} MB.`;
  return null;
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function newGroup(): ModifierGroup {
  return {
    id: uid(),
    name: "",
    minSelect: "0",
    maxSelect: "1",
    options: [{ id: uid(), name: "", price: "0" }],
    collapsed: false,
  };
}

function OptionRow({
  option,
  onUpdate,
  onRemove,
  canRemove,
}: {
  option: ModifierOption;
  onUpdate: (id: string, field: "name" | "price", value: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <GripVertical className="w-3.5 h-3.5 text-slate-600 shrink-0" />
      <input
        type="text"
        value={option.name}
        onChange={(e) => onUpdate(option.id, "name", e.target.value)}
        placeholder="Option name (e.g. Extra Cheese)"
        className="flex-1 bg-slate-900/70 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-yellow-500/50"
      />
      <div className="relative w-28 shrink-0">
        <span className="absolute left-2.5 top-2 text-slate-500 text-xs">
          ₦
        </span>
        <input
          type="number"
          value={option.price}
          onChange={(e) => onUpdate(option.id, "price", e.target.value)}
          placeholder="0"
          min="0"
          step="0.01"
          className="w-full bg-slate-900/70 border border-slate-700/50 rounded-lg pl-6 pr-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-yellow-500/50"
        />
      </div>
      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(option.id)}
          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function ModifierGroupCard({
  group,
  index,
  onUpdate,
  onRemoveGroup,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
}: {
  group: ModifierGroup;
  index: number;
  onUpdate: (id: string, field: keyof ModifierGroup, value: any) => void;
  onRemoveGroup: (id: string) => void;
  onAddOption: (groupId: string) => void;
  onUpdateOption: (
    groupId: string,
    optionId: string,
    field: "name" | "price",
    value: string,
  ) => void;
  onRemoveOption: (groupId: string, optionId: string) => void;
}) {
  return (
    <div className="border border-slate-700/60 rounded-xl overflow-hidden bg-slate-800/40">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-800/60 border-b border-slate-700/40">
        <span className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 text-[10px] font-bold flex items-center justify-center shrink-0">
          {index + 1}
        </span>
        <input
          type="text"
          value={group.name}
          onChange={(e) => onUpdate(group.id, "name", e.target.value)}
          placeholder="Group name (e.g. Size, Add-ons, Toppings)"
          className="flex-1 bg-transparent text-sm font-semibold text-white placeholder:text-slate-500 focus:outline-none border-b border-transparent focus:border-yellow-500/40 pb-0.5 transition-colors"
        />
        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            onClick={() => onUpdate(group.id, "collapsed", !group.collapsed)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
          >
            {group.collapsed ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onRemoveGroup(group.id)}
            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {!group.collapsed && (
        <div className="p-3 space-y-3">
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Min Required
              </label>
              <input
                type="number"
                value={group.minSelect}
                onChange={(e) =>
                  onUpdate(group.id, "minSelect", e.target.value)
                }
                min="0"
                className="w-full bg-slate-900/70 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500/50"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Max Allowed
              </label>
              <input
                type="number"
                value={group.maxSelect}
                onChange={(e) =>
                  onUpdate(group.id, "maxSelect", e.target.value)
                }
                min="1"
                className="w-full bg-slate-900/70 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500/50"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Options
            </label>
            {group.options.map((o) => (
              <OptionRow
                key={o.id}
                option={o}
                onUpdate={(optId, field, val) =>
                  onUpdateOption(group.id, optId, field, val)
                }
                onRemove={(optId) => onRemoveOption(group.id, optId)}
                canRemove={group.options.length > 1}
              />
            ))}
            <button
              type="button"
              onClick={() => onAddOption(group.id)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-yellow-400 transition-colors mt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Option
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM = {
  name: "",
  description: "",
  price: "",
  stock: "",
  categoryId: "",
};

export default function EditProductModal({
  isOpen,
  product,
  storeName,
  onClose,
  onSuccess,
}: EditProductModalProps) {
  const [activeSection, setActiveSection] = useState<"details" | "modifiers">(
    "details",
  );
  const [form, setForm] = useState(EMPTY_FORM);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-populate form when product changes
  useEffect(() => {
    if (isOpen && product) {
      setForm({
        name: product.name ?? "",
        description: product.description ?? "",
        price: product.price != null ? String(product.price) : "",
        stock: product.stock != null ? String(product.stock) : "",
        categoryId: product.categoryId ?? "",
      });
      setImageFile(null);
      setImagePreview(product.image ?? null);
      setImageError(null);
      setErrors({});
      setModifierGroups([]);
      setActiveSection("details");
    }
    if (!isOpen) {
      setForm(EMPTY_FORM);
      setImageFile(null);
      setImagePreview(null);
      setModifierGroups([]);
      setErrors({});
    }
  }, [isOpen, product]);

  // Fetch categories on open
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      setIsCategoriesLoading(true);
      setCategoriesError(null);
      try {
        const session = await getSession();
        const res = await fetch(
          `${BACKEND_URL}/super-admin/vendors/categories`,
          {
            headers: {
              Authorization: `Bearer ${(session as any)?.accessToken ?? ""}`,
            },
          },
        );
        if (!res.ok) throw new Error("Failed to load categories");
        const data = await res.json();
        if (!cancelled)
          setCategories(Array.isArray(data) ? data : (data.categories ?? []));
      } catch (e: any) {
        if (!cancelled) setCategoriesError(e.message);
      } finally {
        if (!cancelled) setIsCategoriesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      const { name, value } = e.target;
      setForm((prev) => ({ ...prev, [name]: value }));
      setErrors((prev) => ({ ...prev, [name]: "" }));
    },
    [],
  );

  const handleFileChange = useCallback((file: File | null) => {
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      setImageError(null);
      return;
    }
    const err = validateFile(file);
    if (err) {
      setImageError(err);
      return;
    }
    setImageError(null);
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleFileChange(e.dataTransfer.files?.[0] ?? null);
    },
    [handleFileChange],
  );

  // Modifier helpers
  const addGroup = useCallback(() => {
    setModifierGroups((prev) => [...prev, newGroup()]);
    setActiveSection("modifiers");
  }, []);

  const updateGroup = useCallback(
    (id: string, field: keyof ModifierGroup, value: any) => {
      setModifierGroups((prev) =>
        prev.map((g) => (g.id === id ? { ...g, [field]: value } : g)),
      );
    },
    [],
  );

  const removeGroup = useCallback((id: string) => {
    setModifierGroups((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const addOption = useCallback((groupId: string) => {
    setModifierGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              options: [...g.options, { id: uid(), name: "", price: "0" }],
            }
          : g,
      ),
    );
  }, []);

  const updateOption = useCallback(
    (
      groupId: string,
      optionId: string,
      field: "name" | "price",
      value: string,
    ) => {
      setModifierGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? {
                ...g,
                options: g.options.map((o) =>
                  o.id === optionId ? { ...o, [field]: value } : o,
                ),
              }
            : g,
        ),
      );
    },
    [],
  );

  const removeOption = useCallback((groupId: string, optionId: string) => {
    setModifierGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, options: g.options.filter((o) => o.id !== optionId) }
          : g,
      ),
    );
  }, []);

  const hasModifierErrors = Object.keys(errors).some((k) =>
    k.startsWith("group_"),
  );

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Product name is required.";
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0)
      newErrors.price = "Price must be a non-negative number.";
    if (!form.categoryId) newErrors.categoryId = "Category is required.";
    if (form.stock && (isNaN(Number(form.stock)) || Number(form.stock) < 0))
      newErrors.stock = "Stock must be a non-negative number.";

    // Validate modifier groups
    modifierGroups.forEach((g, i) => {
      if (!g.name.trim())
        newErrors[`group_${i}_name`] = `Group ${i + 1}: Name is required.`;
      g.options.forEach((o, j) => {
        if (!o.name.trim())
          newErrors[`group_${i}_opt_${j}`] =
            `Group ${i + 1}, Option ${j + 1}: Name is required.`;
      });
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!product) return;
    if (!validate()) {
      if (hasModifierErrors) setActiveSection("modifiers");
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await getSession();
      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("description", form.description.trim());
      fd.append("price", form.price);
      fd.append("stock", form.stock || "0");
      fd.append("categoryId", form.categoryId);
      if (imageFile) fd.append("image", imageFile);
      if (modifierGroups.length > 0) {
        fd.append(
          "modifierGroups",
          JSON.stringify(
            modifierGroups.map((g) => ({
              name: g.name,
              minSelect: Number(g.minSelect) || 0,
              maxSelect: Number(g.maxSelect) || 1,
              modifiers: g.options.map((o) => ({
                name: o.name,
                price: Number(o.price) || 0,
              })),
            })),
          ),
        );
      }

      const res = await fetch(
        `${BACKEND_URL}/super-admin/vendors/products/${product.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${(session as any)?.accessToken ?? ""}`,
          },
          body: fd,
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update product");
      }

      await Swal.fire({
        icon: "success",
        title: "Product Updated",
        text: `"${form.name.trim()}" has been updated successfully.`,
        background: "#1E293B",
        color: "#fff",
        confirmButtonColor: "#EAB308",
        timer: 2000,
        showConfirmButton: false,
      });

      onSuccess();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: err.message || "Something went wrong.",
        background: "#1E293B",
        color: "#fff",
        confirmButtonColor: "#EAB308",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#1E293B] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] border border-gray-700/50">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Pencil className="w-4 h-4 text-yellow-400" />
              Edit Product
            </h2>
            {storeName && (
              <p className="text-xs text-gray-400 mt-0.5">{storeName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSection("details")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all border-b-2 ${activeSection === "details" ? "border-yellow-500 text-yellow-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}
          >
            <Package className="w-4 h-4" />
            Details
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("modifiers")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all border-b-2 ${activeSection === "modifiers" ? "border-yellow-500 text-yellow-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}
          >
            <Settings2 className="w-4 h-4" />
            Modifiers
            {modifierGroups.length > 0 && !hasModifierErrors && (
              <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px] font-bold rounded-full">
                {modifierGroups.length}
              </span>
            )}
            {hasModifierErrors && (
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            )}
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto flex-1"
          encType="multipart/form-data"
        >
          {/* Details section */}
          <div
            className={`p-5 space-y-5 ${activeSection !== "details" ? "hidden" : ""}`}
          >
            {/* Image */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1.5">
                <ImagePlus className="w-3.5 h-3.5" /> Product Image
              </label>
              {imagePreview ? (
                <div className="relative group w-full h-40 rounded-lg overflow-hidden border border-gray-700 bg-[#0F172A]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                      className="p-2 bg-red-500 rounded-full text-white hover:bg-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${imageError ? "border-red-500/50 bg-red-500/5" : "border-gray-700 bg-[#0F172A] hover:border-yellow-500/50 hover:bg-yellow-500/5"}`}
                >
                  <ImagePlus className="w-6 h-6 text-gray-600 mb-1.5" />
                  <p className="text-sm text-gray-500 font-medium">
                    Click or drag &amp; drop to upload
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    JPEG, PNG, WebP, GIF · Max {MAX_FILE_SIZE_MB} MB
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_TYPES.join(",")}
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />
              {imageError && (
                <p className="flex items-center gap-1.5 text-xs text-red-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {imageError}
                </p>
              )}
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase">
                Product Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Package className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Margherita Pizza"
                  className={`w-full bg-[#0F172A] border rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none placeholder:text-gray-600 transition-colors ${errors.name ? "border-red-500" : "border-gray-700 focus:border-yellow-500"}`}
                />
              </div>
              {errors.name && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.name}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> Description{" "}
                <span className="text-gray-600 font-normal normal-case ml-1">
                  (optional)
                </span>
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Short product description..."
                rows={2}
                className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500 placeholder:text-gray-600 resize-none transition-colors"
              />
            </div>

            {/* Price & Stock */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">
                  Price (₦) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                  <input
                    type="number"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className={`w-full bg-[#0F172A] border rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none placeholder:text-gray-600 transition-colors ${errors.price ? "border-red-500" : "border-gray-700 focus:border-yellow-500"}`}
                  />
                </div>
                {errors.price && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.price}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5" /> Stock / Qty
                </label>
                <input
                  type="number"
                  name="stock"
                  value={form.stock}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  className={`w-full bg-[#0F172A] border rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none placeholder:text-gray-600 transition-colors ${errors.stock ? "border-red-500" : "border-gray-700 focus:border-yellow-500"}`}
                />
                {errors.stock && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.stock}
                  </p>
                )}
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> Category{" "}
                <span className="text-red-500">*</span>
              </label>
              <select
                name="categoryId"
                value={form.categoryId}
                onChange={handleChange}
                className={`w-full bg-[#0F172A] border rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none appearance-none cursor-pointer transition-colors ${errors.categoryId ? "border-red-500" : "border-gray-700 focus:border-yellow-500"}`}
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.categoryId}
                </p>
              )}
              {isCategoriesLoading && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading
                  categories...
                </p>
              )}
              {!isCategoriesLoading && categoriesError && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {categoriesError}
                </p>
              )}
            </div>

            {/* Go to modifiers shortcut */}
            <button
              type="button"
              onClick={() => setActiveSection("modifiers")}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/60 border border-slate-700/50 hover:border-yellow-500/30 hover:bg-yellow-500/5 rounded-xl text-sm text-slate-400 hover:text-yellow-400 transition-all"
            >
              <span className="flex items-center gap-2 font-semibold">
                <Settings2 className="w-4 h-4" />
                Modifier Groups
                {modifierGroups.length > 0 ? (
                  <span className="ml-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px] font-bold rounded-full">
                    {modifierGroups.length} group
                    {modifierGroups.length !== 1 ? "s" : ""}
                  </span>
                ) : (
                  <span className="text-slate-600 font-normal text-xs ml-1">
                    (none)
                  </span>
                )}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Modifiers section */}
          <div
            className={`p-5 space-y-4 ${activeSection !== "modifiers" ? "hidden" : ""}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Modifier Groups
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Replace customization options for this product. Saving will
                  overwrite existing modifier groups.
                </p>
              </div>
              <button
                type="button"
                onClick={addGroup}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Group
              </button>
            </div>
            {hasModifierErrors && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="text-xs text-red-300 space-y-0.5">
                  {Object.entries(errors)
                    .filter(([k]) => k.startsWith("group_"))
                    .map(([k, v]) => (
                      <p key={k}>{v}</p>
                    ))}
                </div>
              </div>
            )}
            {modifierGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                  <Settings2 className="w-6 h-6 text-slate-600" />
                </div>
                <p className="text-sm text-slate-500 font-medium">
                  No modifier groups added
                </p>
                <p className="text-xs text-slate-600 max-w-xs">
                  Add new groups to replace the existing ones, or leave empty to
                  keep them unchanged.
                </p>
                <button
                  type="button"
                  onClick={addGroup}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-sm font-semibold rounded-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Group
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {modifierGroups.map((group, i) => (
                  <ModifierGroupCard
                    key={group.id}
                    group={group}
                    index={i}
                    onUpdate={updateGroup}
                    onRemoveGroup={removeGroup}
                    onAddOption={addOption}
                    onUpdateOption={updateOption}
                    onRemoveOption={removeOption}
                  />
                ))}
                <button
                  type="button"
                  onClick={addGroup}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-700 hover:border-yellow-500/40 hover:bg-yellow-500/5 rounded-xl text-sm font-semibold text-slate-500 hover:text-yellow-400 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Another Group
                </button>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-800 shrink-0 flex gap-3 bg-[#1E293B]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-2.5 border border-gray-600 rounded-lg text-gray-300 font-medium hover:bg-gray-800 transition-colors text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSubmitting}
            className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors text-sm flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
