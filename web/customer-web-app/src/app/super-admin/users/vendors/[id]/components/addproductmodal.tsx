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

interface AddProductModalProps {
  isOpen: boolean;
  storeId: string;
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
        <span className="absolute left-2.5 top-2 text-slate-500 text-xs"></span>
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
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Options ({group.options.length})
              </label>
              <span className="text-[10px] text-slate-600 font-medium">
                name extra price
              </span>
            </div>
            {group.options.map((opt) => (
              <OptionRow
                key={opt.id}
                option={opt}
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
              className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-slate-700 hover:border-yellow-500/40 hover:bg-yellow-500/5 rounded-lg text-xs font-semibold text-slate-500 hover:text-yellow-400 transition-all"
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

export default function AddProductModal({
  isOpen,
  storeId,
  storeName,
  onClose,
  onSuccess,
}: AddProductModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState<"details" | "modifiers">(
    "details",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    stock: "0",
    categoryId: "",
  });

  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setForm({
        name: "",
        description: "",
        price: "",
        stock: "0",
        categoryId: "",
      });
      setImageFile(null);
      setImagePreview(null);
      setImageError(null);
      setErrors({});
      setModifierGroups([]);
      setActiveSection("details");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setIsCategoriesLoading(true);
    setCategoriesError(null);
    getSession().then((session) => {
      const token = (session as any)?.accessToken;
      fetch(`${BACKEND_URL}/super-admin/vendors/categories`, {
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
      })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((data) => {
          const list: Category[] = Array.isArray(data)
            ? data
            : (data?.data ?? []);
          setCategories(list);
          if (list.length === 0) setCategoriesError("No categories found.");
        })
        .catch(() => {
          setCategories([]);
          setCategoriesError(
            "Failed to load categories. Please close and re-open.",
          );
        })
        .finally(() => setIsCategoriesLoading(false));
    });
  }, [isOpen]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name])
      setErrors((prev) => {
        const n = { ...prev };
        delete n[name];
        return n;
      });
  };

  const handleFileChange = useCallback((file: File | null) => {
    setImageError(null);
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }
    const err = validateFile(file);
    if (err) {
      setImageError(err);
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      handleFileChange(e.dataTransfer.files?.[0] ?? null);
    },
    [handleFileChange],
  );

  const addGroup = () => setModifierGroups((prev) => [...prev, newGroup()]);
  const removeGroup = (id: string) =>
    setModifierGroups((prev) => prev.filter((g) => g.id !== id));
  const updateGroup = (id: string, field: keyof ModifierGroup, value: any) =>
    setModifierGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, [field]: value } : g)),
    );
  const addOption = (groupId: string) =>
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
  const updateOption = (
    groupId: string,
    optionId: string,
    field: "name" | "price",
    value: string,
  ) =>
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
  const removeOption = (groupId: string, optionId: string) =>
    setModifierGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, options: g.options.filter((o) => o.id !== optionId) }
          : g,
      ),
    );

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Product name is required.";
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0)
      newErrors.price = "Enter a valid price ( 0).";
    if (!form.categoryId) newErrors.categoryId = "Select a category.";
    if (
      form.stock !== "" &&
      (isNaN(Number(form.stock)) || Number(form.stock) < 0)
    )
      newErrors.stock = "Stock must be a non-negative number.";
    for (let i = 0; i < modifierGroups.length; i++) {
      const g = modifierGroups[i];
      if (!g.name.trim())
        newErrors[`group_${g.id}_name`] = `Group ${i + 1}: name is required.`;
      const min = Number(g.minSelect);
      const max = Number(g.maxSelect);
      if (isNaN(min) || min < 0)
        newErrors[`group_${g.id}_min`] = `Group ${i + 1}: min must be  0.`;
      if (isNaN(max) || max < 1)
        newErrors[`group_${g.id}_max`] = `Group ${i + 1}: max must be  1.`;
      if (!isNaN(min) && !isNaN(max) && min > max)
        newErrors[`group_${g.id}_range`] =
          `Group ${i + 1}: min cannot exceed max.`;
      for (let j = 0; j < g.options.length; j++) {
        if (!g.options[j].name.trim())
          newErrors[`group_${g.id}_opt_${j}`] =
            `Group ${i + 1}, option ${j + 1}: name required.`;
      }
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).some((k) => k.startsWith("group_")))
      setActiveSection("modifiers");
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const session = await getSession();
      const token = (session as any)?.accessToken;
      const formData = new FormData();
      formData.append("name", form.name.trim());
      if (form.description.trim())
        formData.append("description", form.description.trim());
      formData.append("price", String(Number(form.price)));
      formData.append("stock", String(Number(form.stock) || 0));
      formData.append("categoryId", form.categoryId);
      if (imageFile) formData.append("image", imageFile);
      if (modifierGroups.length > 0) {
        const serialized = modifierGroups.map((g) => ({
          name: g.name.trim(),
          minSelect: Number(g.minSelect) || 0,
          maxSelect: Number(g.maxSelect) || 1,
          modifiers: g.options
            .filter((o) => o.name.trim())
            .map((o) => ({ name: o.name.trim(), price: Number(o.price) || 0 })),
        }));
        formData.append("modifierGroups", JSON.stringify(serialized));
      }
      const res = await fetch(
        `${BACKEND_URL}/super-admin/vendors/${storeId}/products`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token || ""}`,
          },
          body: formData,
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = Array.isArray(err.message)
          ? err.message.join(", ")
          : err.message || "Failed to create product";
        throw new Error(msg);
      }
      const totalModifiers = modifierGroups.reduce(
        (sum, g) => sum + g.options.filter((o) => o.name.trim()).length,
        0,
      );
      const modifierSummary =
        modifierGroups.length > 0
          ? ` with ${modifierGroups.length} modifier group(s) (${totalModifiers} options)`
          : "";
      Swal.fire({
        icon: "success",
        title: "Product Added!",
        text: `"${form.name.trim()}" has been added to ${storeName || "the store"}${modifierSummary}.`,
        background: "#1E293B",
        color: "#fff",
        confirmButtonColor: "#eab308",
        timer: 3000,
        showConfirmButton: false,
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Failed to Add Product",
        text: error.message,
        background: "#1E293B",
        color: "#fff",
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const hasModifierErrors = Object.keys(errors).some((k) =>
    k.startsWith("group_"),
  );
  const hasDetailErrors = Object.keys(errors).some(
    (k) => !k.startsWith("group_"),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1E293B] border border-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-800 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-yellow-500" />
              Add Product
            </h2>
            {storeName && (
              <p className="text-xs text-gray-500 mt-0.5">to {storeName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSection("details")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all border-b-2 ${activeSection === "details" ? "border-yellow-500 text-yellow-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}
          >
            <Package className="w-4 h-4" />
            Product Details
            {hasDetailErrors && (
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            )}
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
          <div
            className={`p-5 space-y-5 ${activeSection !== "details" ? "hidden" : ""}`}
          >
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
                    JPEG, PNG, WebP, GIF Max {MAX_FILE_SIZE_MB} MB
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">
                  Price () <span className="text-red-500">*</span>
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

          <div
            className={`p-5 space-y-4 ${activeSection !== "modifiers" ? "hidden" : ""}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Modifier Groups
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Add customization options like size, toppings, or add-ons that
                  customers can select when ordering.
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
                  No modifier groups yet
                </p>
                <p className="text-xs text-slate-600 max-w-xs">
                  Add groups like "Size", "Extras", or "Toppings" with options
                  customers can choose from.
                </p>
                <button
                  type="button"
                  onClick={addGroup}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-sm font-semibold rounded-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add First Group
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
                <Loader2 className="w-4 h-4 animate-spin" /> Adding...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Add Product
                {modifierGroups.length > 0 && (
                  <span className="text-xs opacity-75">
                    + {modifierGroups.length} group
                    {modifierGroups.length !== 1 ? "s" : ""}
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
