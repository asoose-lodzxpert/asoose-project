"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronLeft,
    Loader2,
    Package,
    MapPin,
    User,
    Phone,
    Info,
    Box,
    CheckCircle2,
} from "lucide-react";
import { AppAlert } from "../../users/customers/[id]/alerts";
import { fetcher } from "../../hooks/useSuperAdminFetch";
import { LocationInput } from "@/components/shared/LocationInput";

// ─── Constants ───────────────────────────────────────────────
const WEIGHT_MAX_KG = 999;
const VALUE_MAX_NGN = 10_000_000;

export default function CreateAdminDeliveryPage() {
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [senderName, setSenderName] = useState("");
    const [senderPhone, setSenderPhone] = useState("");
    const [recipientName, setRecipientName] = useState("");
    const [recipientPhone, setRecipientPhone] = useState("");

    const [pickupInputValue, setPickupInputValue] = useState("");
    const [pickup, setPickup] = useState<{ lat: number; lng: number; address: string } | null>(null);
    const [dropoffInputValue, setDropoffInputValue] = useState("");
    const [dropoff, setDropoff] = useState<{ lat: number; lng: number; address: string } | null>(null);

    const [packageDetails, setPackageDetails] = useState("");
    const [weightKg, setWeightKg] = useState<string>("");
    const [declaredValue, setDeclaredValue] = useState<string>("");

    const [isFragile, setIsFragile] = useState(false);
    const [isPerishable, setIsPerishable] = useState(false);
    const [containsLiquid, setContainsLiquid] = useState(false);

    // Validate & Submit
    const handleCreateDelivery = async () => {
        if (!pickup || !dropoff) {
            AppAlert.error("Missing Locations", "Please provide both pickup and dropoff locations.");
            return;
        }
        if (!senderName || !senderPhone || !recipientName || !recipientPhone) {
            AppAlert.error("Missing Contacts", "Please provide sender and recipient details.");
            return;
        }
        if (!packageDetails) {
            AppAlert.error("Missing Details", "Please provide package details/instructions.");
            return;
        }
        if (!weightKg || isNaN(Number(weightKg)) || Number(weightKg) <= 0) {
            AppAlert.error("Invalid Weight", "Please provide a valid weight.");
            return;
        }

        const payload = {
            pickupLocation: pickup,
            dropoffLocation: dropoff,
            recipientName,
            recipientPhone,
            senderName,
            senderPhone,
            packageDetails,
            weightKg: Number(weightKg),
            declaredValue: declaredValue ? Number(declaredValue) : 0,
            isFragile,
            isPerishable,
            containsLiquid,
        };

        const confirm = await AppAlert.confirm(
            "Create Shipment",
            "Are you sure you want to create this delivery on behalf of the customer?",
            "Create"
        );

        if (!confirm.isConfirmed) return;

        setIsLoading(true);
        try {
            await fetcher("/super-admin/deliveries", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
                retries: 0,
            });

            await AppAlert.success("Shipment created successfully!");
            router.push("/super-admin/deliveries");
        } catch (err: any) {
            AppAlert.error("Error", err.message || "Failed to create delivery");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen transition-colors duration-500 pb-32">
            <main className="max-w-4xl mx-auto px-6 pt-10">
                <header className="mb-10 flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold">New Admin Shipment</h1>
                        <p className="text-gray-500">Create a delivery on behalf of a user</p>
                    </div>
                </header>

                <div className="space-y-10">
                    {/* Sender & Recipient Section */}
                    <section className="bg-gray-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <User size={20} className="text-yellow-500" /> Contacts
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Sender (Customer)</h4>
                                <DetailInput
                                    label="Sender Name"
                                    icon={User}
                                    placeholder="Full name"
                                    value={senderName}
                                    onChange={setSenderName}
                                />
                                <DetailInput
                                    label="Sender Phone"
                                    icon={Phone}
                                    placeholder="e.g. 08012345678"
                                    value={senderPhone}
                                    onChange={setSenderPhone}
                                />
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Recipient</h4>
                                <DetailInput
                                    label="Recipient Name"
                                    icon={User}
                                    placeholder="Full name"
                                    value={recipientName}
                                    onChange={setRecipientName}
                                />
                                <DetailInput
                                    label="Recipient Phone"
                                    icon={Phone}
                                    placeholder="e.g. 08012345678"
                                    value={recipientPhone}
                                    onChange={setRecipientPhone}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Locations Section */}
                    <section className="bg-gray-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <MapPin size={20} className="text-yellow-500" /> Locations
                        </h3>

                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-2 block uppercase">Pickup Location</label>
                                <LocationInput
                                    value={pickupInputValue}
                                    onValueChange={(val) => {
                                        setPickupInputValue(val);
                                        if (val === "") setPickup(null);
                                    }}
                                    placeholder="Search pickup address..."
                                    onLocationSelect={(loc, address) => {
                                        setPickup({ ...loc, address });
                                        setPickupInputValue(address);
                                    }}
                                />
                                {pickup && (
                                    <p className="text-sm mt-2 flex items-start gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/10 p-2 rounded-lg">
                                        <CheckCircle2 className="w-4 h-4 mt-0.5" />
                                        {pickup.address}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-2 block uppercase">Dropoff Location</label>
                                <LocationInput
                                    value={dropoffInputValue}
                                    onValueChange={(val) => {
                                        setDropoffInputValue(val);
                                        if (val === "") setDropoff(null);
                                    }}
                                    placeholder="Search dropoff address..."
                                    onLocationSelect={(loc, address) => {
                                        setDropoff({ ...loc, address });
                                        setDropoffInputValue(address);
                                    }}
                                />
                                {dropoff && (
                                    <p className="text-sm mt-2 flex items-start gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/10 p-2 rounded-lg">
                                        <CheckCircle2 className="w-4 h-4 mt-0.5" />
                                        {dropoff.address}
                                    </p>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Package Details Section */}
                    <section className="bg-gray-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <Package size={20} className="text-yellow-500" /> Package Details
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-400 mb-1.5 block">Weight (kg)</label>
                                <input
                                    type="number"
                                    placeholder="e.g. 2.5"
                                    value={weightKg}
                                    onChange={(e) => setWeightKg(e.target.value)}
                                    className="w-full p-3 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-yellow-500 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-400 mb-1.5 block">Declared Value (₦)</label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={declaredValue}
                                    onChange={(e) => setDeclaredValue(e.target.value)}
                                    className="w-full p-3 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-yellow-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3 mb-6">
                            {[
                                { id: "isFragile", label: "Fragile", checked: isFragile, set: setIsFragile },
                                { id: "isPerishable", label: "Perishable", checked: isPerishable, set: setIsPerishable },
                                { id: "containsLiquid", label: "Liquid", checked: containsLiquid, set: setContainsLiquid },
                            ].map((attr) => (
                                <label
                                    key={attr.id}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer transition-all text-xs font-semibold select-none ${attr.checked
                                        ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 text-yellow-700 dark:text-yellow-500"
                                        : "bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={attr.checked}
                                        onChange={(e) => attr.set(e.target.checked)}
                                    />
                                    <div
                                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${attr.checked ? "bg-yellow-500 border-yellow-500" : "border-gray-300"
                                            }`}
                                    >
                                        {attr.checked && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                    </div>
                                    {attr.label}
                                </label>
                            ))}
                        </div>

                        <div>
                            <label className="text-[10px] uppercase font-bold text-gray-400 mb-1.5 block">Instructions / Details</label>
                            <textarea
                                value={packageDetails}
                                onChange={(e) => setPackageDetails(e.target.value)}
                                placeholder="Package contents or delivery instructions..."
                                className="w-full p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-yellow-500 outline-none h-24 resize-none transition-colors"
                            />
                        </div>
                    </section>

                    {/* Submit Button */}
                    <button
                        onClick={handleCreateDelivery}
                        disabled={isLoading}
                        className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-black font-black rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Box className="w-5 h-5" />}
                        {isLoading ? "Creating..." : "Create Shipment"}
                    </button>
                </div>
            </main>
        </div>
    );
}

// ─── Simple Input Component ──────────────────────────────────
function DetailInput({
    label,
    icon: Icon,
    placeholder,
    value,
    onChange,
}: {
    label: string;
    icon: any;
    placeholder: string;
    value: string;
    onChange: (val: string) => void;
}) {
    return (
        <div className="border-b border-zinc-200 dark:border-zinc-700 pb-2 focus-within:border-yellow-500 transition-colors">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-2">
                <Icon size={14} className="text-yellow-500/80" /> {label}
            </label>
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-transparent text-sm font-medium outline-none text-zinc-900 dark:text-white placeholder:text-zinc-400"
            />
        </div>
    );
}
