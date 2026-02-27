"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Car,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Info,
  CreditCard,
  Bike,
  Shield,
  Hash,
  Palette,
  Calendar,
} from "lucide-react";
import Swal from "sweetalert2";
import { getSession } from "next-auth/react";

// ─── Constants ───────────────────────────────────────────────────────────────
const VEHICLE_TYPES = ["MOTORCYCLE", "BICYCLE", "CAR", "VAN", "TRUCK"] as const;

const TABS = [
  { id: "personal", label: "Personal Info", icon: User },
  { id: "vehicle", label: "Vehicle Info", icon: Car },
  { id: "banking", label: "Bank Details", icon: CreditCard },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Field Components ─────────────────────────────────────────────────────────
function FormField({
  label,
  required,
  optional,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
        {label}
        {required && <span className="text-red-400">*</span>}
        {optional && (
          <span className="text-slate-500 font-normal normal-case tracking-normal">
            (optional)
          </span>
        )}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

function TextInput({
  icon: Icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: React.ElementType;
}) {
  return (
    <div className="relative group">
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-yellow-500 to-orange-500 rounded-l-lg opacity-0 group-focus-within:opacity-100 transition-opacity" />
      {Icon && (
        <Icon className="absolute left-3.5 top-3 w-4 h-4 text-slate-500 group-focus-within:text-yellow-400 transition-colors pointer-events-none" />
      )}
      <input
        {...props}
        className={`w-full bg-slate-800/60 border border-slate-600/50 rounded-lg ${Icon ? "pl-11" : "pl-4"} pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20 transition-all ${props.className ?? ""}`}
      />
    </div>
  );
}

function SelectInput({
  icon: Icon,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  icon?: React.ElementType;
}) {
  return (
    <div className="relative group">
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-yellow-500 to-orange-500 rounded-l-lg opacity-0 group-focus-within:opacity-100 transition-opacity" />
      {Icon && (
        <Icon className="absolute left-3.5 top-3 w-4 h-4 text-slate-500 group-focus-within:text-yellow-400 transition-colors pointer-events-none" />
      )}
      <select
        {...props}
        className={`w-full bg-slate-800/60 border border-slate-600/50 rounded-lg ${Icon ? "pl-11" : "pl-4"} pr-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20 appearance-none cursor-pointer transition-all`}
      >
        {children}
      </select>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CreateRiderPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("personal");
  const [isLoading, setIsLoading] = useState(false);

  // Personal
  const [personal, setPersonal] = useState({
    name: "",
    email: "",
    phone: "",
    countryCode: "+234",
    role: "RIDER", // RIDER = delivery rider, DRIVER = ride-hailing driver
  });

  // Vehicle
  const [vehicle, setVehicle] = useState({
    vehicleType: "MOTORCYCLE",
    vehicleBrand: "",
    vehicleModel: "",
    plateNumber: "",
    vehicleColor: "",
    vehicleYear: "",
  });

  // Banking
  const [banking, setBanking] = useState({
    bankName: "",
    bankCode: "",
    accountNumber: "",
    accountName: "",
  });

  const handlePersonal = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setPersonal((p) => ({ ...p, [name]: value }));
  };

  const handleVehicle = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setVehicle((p) => ({ ...p, [name]: value }));
  };

  const handleBanking = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBanking((p) => ({ ...p, [name]: value }));
  };

  const validate = () => {
    if (
      !personal.name.trim() ||
      !personal.email.trim() ||
      !personal.phone.trim()
    ) {
      Swal.fire({
        icon: "warning",
        title: "Required Fields",
        text: "Name, Email, and Phone are required.",
        background: "#0F172A",
        color: "#fff",
        confirmButtonColor: "#eab308",
      });
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personal.email.trim())) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Email",
        text: "Please enter a valid email address.",
        background: "#0F172A",
        color: "#fff",
        confirmButtonColor: "#eab308",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const session = await getSession();
      const token = (session as any)?.accessToken;
      const API_URL = (
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      ).replace(/\/$/, "");

      // Generate a secure temporary password — the rider will reset via OTP on first login
      const tempPassword =
        "Asoose@" + Math.random().toString(36).slice(2, 10).toUpperCase();

      const payload: Record<string, any> = {
        name: personal.name.trim(),
        email: personal.email.trim(),
        phone: personal.phone.trim(),
        countryCode: personal.countryCode,
        role: personal.role,
        password: tempPassword,
        // Vehicle
        vehicleType: vehicle.vehicleType || undefined,
        vehicleBrand: vehicle.vehicleBrand.trim() || undefined,
        vehicleModel: vehicle.vehicleModel.trim() || undefined,
        plateNumber: vehicle.plateNumber.trim() || undefined,
        vehicleColor: vehicle.vehicleColor.trim() || undefined,
        vehicleYear: vehicle.vehicleYear
          ? parseInt(vehicle.vehicleYear)
          : undefined,
        // Banking
        bankName: banking.bankName.trim() || undefined,
        bankCode: banking.bankCode.trim() || undefined,
        accountNumber: banking.accountNumber.trim() || undefined,
        accountName: banking.accountName.trim() || undefined,
      };

      // Clean undefined keys
      Object.keys(payload).forEach(
        (k) => payload[k] === undefined && delete payload[k],
      );

      const res = await fetch(`${API_URL}/auth/rider/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(
          Array.isArray(err.message)
            ? err.message.join(", ")
            : err.message || "Failed to create rider",
        );
      }

      const roleLabel = personal.role === "DRIVER" ? "Driver" : "Rider";
      await Swal.fire({
        icon: "success",
        title: `${roleLabel} Created!`,
        html: `<p><strong>${personal.name}</strong> has been registered.</p><p style="font-size:13px;color:#94a3b8;margin-top:8px">Login credentials sent to <strong>${personal.email}</strong></p>`,
        background: "#0F172A",
        color: "#fff",
        confirmButtonColor: "#eab308",
      });

      const destination =
        personal.role === "DRIVER"
          ? "/super-admin/users/drivers"
          : "/super-admin/users/riders";
      router.push(destination);
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Creation Failed",
        text: err.message,
        background: "#0F172A",
        color: "#fff",
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const tabIndex = TABS.findIndex((t) => t.id === activeTab);

  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-8 pb-24">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* ── Header ── */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Add Rider / Driver
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Register a new delivery rider or ride-hailing driver
            </p>
          </div>
        </div>

        {/* ── Info Banner ── */}
        <div className="flex gap-3 items-start bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <Info className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-200 leading-relaxed">
            The rider will receive login credentials by email. Document uploads
            (license, insurance, etc.) are completed by the rider through the{" "}
            <strong>Rider App</strong>. You can manage documents from the rider
            detail page after creation.
          </p>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/50">
          {TABS.map((tab, i) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isPast = i < tabIndex;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20"
                    : isPast
                      ? "text-yellow-400 hover:bg-slate-700/50"
                      : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                }`}
              >
                {isPast ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit}>
          <div className="bg-gradient-to-br from-slate-900 via-slate-800/80 to-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden">
            {/* ─── Tab 1: Personal Info ─── */}
            {activeTab === "personal" && (
              <div className="p-6 space-y-5">
                {/* Role Toggle */}
                <FormField label="Role" required>
                  <div className="flex gap-2">
                    {[
                      { value: "RIDER", label: "Delivery Rider", icon: Bike },
                      { value: "DRIVER", label: "Ride Driver", icon: Car },
                    ].map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setPersonal((p) => ({ ...p, role: value }))
                        }
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border text-sm font-semibold transition-all ${
                          personal.role === value
                            ? "bg-yellow-500 text-black border-yellow-500"
                            : "border-slate-600/50 text-slate-400 hover:border-slate-500 hover:text-white bg-slate-800/40"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </FormField>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField label="Full Name" required>
                    <TextInput
                      icon={User}
                      type="text"
                      name="name"
                      value={personal.name}
                      onChange={handlePersonal}
                      placeholder="e.g. Chidi Okafor"
                      required
                    />
                  </FormField>

                  <FormField label="Email Address" required>
                    <TextInput
                      icon={Mail}
                      type="email"
                      name="email"
                      value={personal.email}
                      onChange={handlePersonal}
                      placeholder="rider@email.com"
                      required
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField label="Country Code" required>
                    <SelectInput
                      icon={Phone}
                      name="countryCode"
                      value={personal.countryCode}
                      onChange={handlePersonal}
                    >
                      {[
                        "+234 (Nigeria)",
                        "+1 (USA)",
                        "+44 (UK)",
                        "+233 (Ghana)",
                        "+254 (Kenya)",
                      ].map((opt) => (
                        <option
                          key={opt}
                          value={opt.split(" ")[0]}
                          className="bg-slate-900"
                        >
                          {opt}
                        </option>
                      ))}
                    </SelectInput>
                  </FormField>

                  <FormField label="Phone Number" required>
                    <TextInput
                      icon={Phone}
                      type="tel"
                      name="phone"
                      value={personal.phone}
                      onChange={handlePersonal}
                      placeholder="08012345678"
                      required
                    />
                  </FormField>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveTab("vehicle")}
                    className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold rounded-lg transition-all"
                  >
                    Next: Vehicle Info →
                  </button>
                </div>
              </div>
            )}

            {/* ─── Tab 2: Vehicle Info ─── */}
            {activeTab === "vehicle" && (
              <div className="p-6 space-y-5">
                <FormField label="Vehicle Type" required>
                  <SelectInput
                    icon={Car}
                    name="vehicleType"
                    value={vehicle.vehicleType}
                    onChange={handleVehicle}
                  >
                    {VEHICLE_TYPES.map((t) => (
                      <option key={t} value={t} className="bg-slate-900">
                        {t.charAt(0) + t.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </SelectInput>
                </FormField>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField label="Brand" optional>
                    <TextInput
                      icon={Car}
                      type="text"
                      name="vehicleBrand"
                      value={vehicle.vehicleBrand}
                      onChange={handleVehicle}
                      placeholder="e.g. Honda"
                    />
                  </FormField>

                  <FormField label="Model" optional>
                    <TextInput
                      icon={Car}
                      type="text"
                      name="vehicleModel"
                      value={vehicle.vehicleModel}
                      onChange={handleVehicle}
                      placeholder="e.g. CBR 500"
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField label="Plate Number" optional>
                    <TextInput
                      icon={Hash}
                      type="text"
                      name="plateNumber"
                      value={vehicle.plateNumber}
                      onChange={handleVehicle}
                      placeholder="e.g. ABC-123XY"
                    />
                  </FormField>

                  <FormField label="Color" optional>
                    <TextInput
                      icon={Palette}
                      type="text"
                      name="vehicleColor"
                      value={vehicle.vehicleColor}
                      onChange={handleVehicle}
                      placeholder="e.g. Red"
                    />
                  </FormField>
                </div>

                <FormField label="Year" optional>
                  <TextInput
                    icon={Calendar}
                    type="number"
                    name="vehicleYear"
                    value={vehicle.vehicleYear}
                    onChange={handleVehicle}
                    placeholder="e.g. 2022"
                    min={1990}
                    max={new Date().getFullYear() + 1}
                  />
                </FormField>

                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-sm text-slate-400">
                  <Shield className="w-4 h-4 inline mr-2 text-yellow-400" />
                  Document uploads (license, insurance, registration) are done
                  by the rider via the{" "}
                  <strong className="text-white">Rider App</strong>. You can
                  review them in the rider's detail page.
                </div>

                <div className="pt-2 flex justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab("personal")}
                    className="px-6 py-2.5 text-slate-300 hover:text-white hover:bg-slate-700/50 text-sm font-semibold rounded-lg transition-all"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("banking")}
                    className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold rounded-lg transition-all"
                  >
                    Next: Bank Details →
                  </button>
                </div>
              </div>
            )}

            {/* ─── Tab 3: Bank Details ─── */}
            {activeTab === "banking" && (
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField label="Bank Name" optional>
                    <TextInput
                      icon={CreditCard}
                      type="text"
                      name="bankName"
                      value={banking.bankName}
                      onChange={handleBanking}
                      placeholder="e.g. Access Bank"
                    />
                  </FormField>

                  <FormField
                    label="Bank Code"
                    optional
                    hint="3-digit CBN bank code"
                  >
                    <TextInput
                      icon={Hash}
                      type="text"
                      name="bankCode"
                      value={banking.bankCode}
                      onChange={handleBanking}
                      placeholder="e.g. 044"
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField label="Account Number" optional>
                    <TextInput
                      icon={CreditCard}
                      type="text"
                      name="accountNumber"
                      value={banking.accountNumber}
                      onChange={handleBanking}
                      placeholder="10-digit account number"
                      maxLength={10}
                    />
                  </FormField>

                  <FormField label="Account Name" optional>
                    <TextInput
                      icon={User}
                      type="text"
                      name="accountName"
                      value={banking.accountName}
                      onChange={handleBanking}
                      placeholder="e.g. Chidi Okafor"
                    />
                  </FormField>
                </div>

                {/* Summary Preview */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-3 mt-2">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                    Summary
                  </h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    {[
                      { label: "Name", value: personal.name },
                      { label: "Role", value: personal.role },
                      { label: "Email", value: personal.email },
                      {
                        label: "Phone",
                        value: `${personal.countryCode} ${personal.phone}`,
                      },
                      { label: "Vehicle", value: vehicle.vehicleType },
                      { label: "Plate", value: vehicle.plateNumber || "—" },
                      { label: "Bank", value: banking.bankName || "—" },
                      { label: "Account", value: banking.accountNumber || "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex gap-2">
                        <span className="text-slate-500 shrink-0 w-16">
                          {label}
                        </span>
                        <span className="text-white font-medium truncate">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab("vehicle")}
                    className="px-6 py-2.5 text-slate-300 hover:text-white hover:bg-slate-700/50 text-sm font-semibold rounded-lg transition-all"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-8 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold text-sm rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-yellow-500/20"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Create {personal.role === "DRIVER" ? "Driver" : "Rider"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
