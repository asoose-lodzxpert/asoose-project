"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  Banknote,
  TrendingUp,
  Percent,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Swal from "sweetalert2";
import useSWR from "swr";
import { fetcher } from "@/app/super-admin/hooks/useSuperAdminFetch";

// --- Components ---
import SkeletonLoader from "./components/skeletonLoader";
import RevenueCard from "./components/revenuecard";
import BusinessInfoCard from "./components/businesscard";
import PerformanceChart from "./components/performancechart";
import OrderHistoryTab from "./components/orderhistorytab";
import ReviewsTab from "./components/reviewstab";
import ActivityLogTab from "./components/activitylogtab";
import VendorHeader from "./components/vendorheader";
import HealthScoreCard from "./components/healthcard";
import ProductsTabContent from "./components/productstabcontent";
import PayoutsTabContent from "./components/payoutstabcontent";
import DocumentsTab from "@/app/super-admin/component/documentstab";
import AddProductModal from "./components/addproductmodal";
import { Currency } from "@/app/main/components/Currency";

// --- Types ---
interface Product {
  id: string;
  name: string;
  price: number;
  status: string;
  image?: string;
  category: string;
  stock?: number;
}

interface ActivityLog {
  id: string;
  action: string;
  details?: string;
  user: string;
  timestamp: string;
}

interface PerformanceData {
  date: string;
  revenue: number;
}

interface VendorDocument {
  id: string;
  name: string;
  url: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  rejectionReason?: string;
  uploadedDate: string;
  type?: string;
  createdAt?: string;
}

interface VendorReview {
  id: string;
  user: string;
  rating: number;
  comment: string;
  date: string;
  orderId: string;
}

interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Paged<T> {
  data: T[];
  meta: PageMeta;
}

interface VendorDetails {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  image?: string;
  status: string;
  verification: string;
  totalRevenue: number;
  unpaidBalance: number;
  totalOrders: number;
  orders: any[];
  reviews: any[];
  address?: string;
  commissionRate: number;
  vendorDocuments: VendorDocument[];
  createdAt: string;
  updatedAt: string;
}

type PayoutsResponse = { history: any[] } | any[];

const validateEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function Pagination({
  meta,
  page,
  onPageChange,
}: {
  meta: PageMeta;
  page: number;
  onPageChange: (p: number) => void;
}) {
  if (meta.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4 border-t border-gray-800 mt-4">
      <span className="text-xs text-gray-500">
        {(page - 1) * meta.limit + 1}–{Math.min(page * meta.limit, meta.total)}{" "}
        of {meta.total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
          .filter(
            (p) => p === 1 || p === meta.totalPages || Math.abs(p - page) <= 1,
          )
          .reduce<(number | string)[]>((acc, p, i, arr) => {
            if (i > 0 && (p as number) - (arr[i - 1] as number) > 1)
              acc.push("…");
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) =>
            p === "…" ? (
              <span key={`e${i}`} className="px-1 text-gray-600 text-sm">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                  p === page
                    ? "bg-yellow-500 text-black"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {p}
              </button>
            ),
          )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= meta.totalPages}
          className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

const TabLoader = () => (
  <div className="flex flex-col items-center justify-center h-64 space-y-4">
    <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
    <p className="text-gray-500 text-sm font-medium">Loading tab data...</p>
  </div>
);

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slugOrId = params?.id as string;

  // --- UI State ---
  const [activeTab, setActiveTab] = useState("Order History");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);

  // Per-tab pagination
  const [docsPage, setDocsPage] = useState(1);
  const [payoutsPage, setPayoutsPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const [reviewsPage, setReviewsPage] = useState(1);

  const [formData, setFormData] = useState({
    storeName: "",
    ownerName: "",
    phone: "",
    email: "",
    address: "",
    commissionRate: 20,
  });

  // 1. Main Vendor Profile
  const {
    data: vendor,
    error,
    isLoading: isVendorLoading,
    mutate: mutateVendor,
  } = useSWR<VendorDetails>(
    slugOrId ? `/super-admin/vendors/${slugOrId}` : null,
    fetcher,
    {
      onSuccess: (data) => {
        if (!isEditing) {
          setFormData({
            storeName: data.name,
            ownerName: data.ownerName || "",
            phone: data.phone || "",
            address: data.address || "",
            email: data.email,
            commissionRate: data.commissionRate ?? 20,
          });
        }
      },
    },
  );

  // 2. Performance Charts
  const { data: performanceData } = useSWR<PerformanceData[]>(
    vendor?.id ? `/super-admin/vendors/${vendor.id}/performance?days=30` : null,
    fetcher,
  );

  // 3. Tab Specific Data
  const {
    data: products,
    mutate: mutateProducts,
    isLoading: isProductsLoading,
  } = useSWR<Product[]>(
    vendor?.id && activeTab === "Products"
      ? `/super-admin/vendors/${vendor.id}/products`
      : null,
    fetcher,
  );

  const {
    data: documentsData,
    mutate: mutateDocuments,
    isLoading: isDocumentsLoading,
  } = useSWR<Paged<VendorDocument>>(
    vendor?.id && activeTab === "Documents"
      ? `/super-admin/vendors/${vendor.id}/documents?page=${docsPage}&limit=10`
      : null,
    fetcher,
  );

  const {
    data: payoutsData,
    mutate: mutatePayouts,
    isLoading: isPayoutsLoading,
  } = useSWR<Paged<any>>(
    vendor?.id && activeTab === "Payouts"
      ? `/super-admin/vendors/${vendor.id}/payouts?page=${payoutsPage}&limit=10`
      : null,
    fetcher,
  );

  const payoutsHistory = payoutsData?.data || [];

  const { data: activityData, isLoading: isActivityLoading } = useSWR<
    Paged<ActivityLog>
  >(
    vendor?.id && activeTab === "Activity Log"
      ? `/super-admin/vendors/${vendor.id}/activity?page=${activityPage}&limit=10`
      : null,
    fetcher,
  );

  const { data: reviewsData, isLoading: isReviewsLoading } = useSWR<
    Paged<VendorReview>
  >(
    vendor?.id && activeTab === "Reviews"
      ? `/super-admin/vendors/${vendor.id}/reviews?page=${reviewsPage}&limit=10`
      : null,
    fetcher,
  );

  // ===========================================================================
  //  HANDLERS
  // ===========================================================================

  const handleSave = async () => {
    if (!validateEmail(formData.email)) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Email",
        background: "#1E293B",
        color: "#fff",
      });
      return;
    }

    setIsSaving(true);
    try {
      await fetcher(`/super-admin/vendors/${vendor?.id}`, {
        method: "PATCH",
        body: JSON.stringify(formData),
      });

      mutateVendor();
      setIsEditing(false);
      Swal.fire({
        icon: "success",
        title: "Updated!",
        timer: 1500,
        showConfirmButton: false,
        background: "#1E293B",
        color: "#fff",
      });
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.message || "Could not save changes.",
        background: "#1E293B",
        color: "#fff",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleProductBan = async (productId: string, currentStatus: string) => {
    const newStatus =
      currentStatus === "BANNED" || currentStatus === "DISABLED"
        ? "ACTIVE"
        : "DISABLED";

    if (products) {
      mutateProducts(
        products.map((p) =>
          p.id === productId ? { ...p, status: newStatus } : p,
        ),
        false,
      );
    }

    try {
      await fetcher(`/super-admin/vendors/products/${productId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      Swal.fire({
        icon: "success",
        title: `Product ${newStatus === "ACTIVE" ? "Activated" : "Banned"}`,
        toast: true,
        position: "bottom-end",
        timer: 1500,
        showConfirmButton: false,
        background: "#1E293B",
        color: "#fff",
      });
      mutateProducts();
    } catch {
      mutateProducts();
      Swal.fire({
        icon: "error",
        title: "Action Failed",
        toast: true,
        position: "top-end",
        background: "#1E293B",
        color: "#fff",
      });
    }
  };

  const handleVerifyDocument = async (
    docId: string,
    status: "VERIFIED" | "REJECTED",
    rejectionReason?: string,
  ) => {
    try {
      await fetcher(`/super-admin/verification/documents/${docId}`, {
        method: "PATCH",
        body: JSON.stringify({ status, rejectionReason }),
      });

      Swal.fire({
        title: status === "VERIFIED" ? "Verified" : "Rejected",
        icon: status === "VERIFIED" ? "success" : "warning",
        toast: true,
        position: "top-end",
        timer: 2000,
        showConfirmButton: false,
        background: "#1E293B",
        color: "#fff",
      });
      mutateDocuments();
      mutateVendor();
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "Could not update document",
        icon: "error",
      });
    }
  };

  const handleProcessPayout = async () => {
    if (!vendor?.unpaidBalance || vendor.unpaidBalance <= 0) return;

    const result = await Swal.fire({
      title: "Confirm Payout",
      text: `Process payout to vendor?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Pay",
      confirmButtonColor: "#10b981",
      background: "#1E293B",
      color: "#fff",
    });

    if (result.isConfirmed) {
      try {
        await fetcher(`/super-admin/vendors/${vendor.id}/payouts`, {
          method: "POST",
          body: JSON.stringify({ amount: vendor.unpaidBalance }),
        });

        mutatePayouts();
        mutateVendor();
        Swal.fire({
          title: "Paid!",
          icon: "success",
          background: "#1E293B",
          color: "#fff",
        });
      } catch {
        Swal.fire({
          title: "Error",
          text: "Payout failed",
          icon: "error",
          background: "#1E293B",
          color: "#fff",
        });
      }
    }
  };

  const handleMessageVendor = async () => {
    const { value: text } = await Swal.fire({
      title: "Message Vendor",
      input: "textarea",
      inputLabel: `Send an email to ${vendor?.name}`,
      inputPlaceholder: "Type your message here...",
      showCancelButton: true,
      confirmButtonText: "Send Email",
      confirmButtonColor: "#3b82f6",
      cancelButtonColor: "#ef4444",
      background: "#1E293B",
      color: "#fff",
      showLoaderOnConfirm: true,
      preConfirm: async (message) => {
        if (!message)
          return Swal.showValidationMessage("Message cannot be empty");
        try {
          return await fetcher(`/super-admin/vendors/${vendor?.id}/message`, {
            method: "POST",
            body: JSON.stringify({ message }),
          });
        } catch (error: any) {
          Swal.showValidationMessage(`Request failed: ${error.message}`);
        }
      },
      allowOutsideClick: () => !Swal.isLoading(),
    });

    if (text) {
      Swal.fire({
        title: "Sent!",
        text: "The vendor has been emailed.",
        icon: "success",
        background: "#1E293B",
        color: "#fff",
        timer: 2000,
        showConfirmButton: false,
      });
    }
  };

  // ===========================================================================
  //  RENDER
  // ===========================================================================

  if (isVendorLoading) return <SkeletonLoader />;
  if (error || !vendor)
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-gray-400">
        Vendor not found
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-20">
      {/* FIX: Passed down explicitly to ensure header is flexible
       */}
      <VendorHeader
        name={vendor.name}
        status={vendor.status}
        isEditing={isEditing}
        isSaving={isSaving}
        onEdit={() => setIsEditing(true)}
        onSave={handleSave}
        onBack={() => router.back()}
        onMessage={handleMessageVendor}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* FIX: Added min-w-0 to prevent flex/grid overflow issues on mobile
          Mobile Order: Metrics first (order-1), Info second (order-2)
        */}

        {/* Left Column (Info) */}
        <div className="space-y-6 order-2 lg:order-1 min-w-0">
          <HealthScoreCard totalOrders={vendor.totalOrders} />

          {/* Commission Rate Card */}
          <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Percent className="w-4 h-4" /> Commission Rate
              </h3>
            </div>
            {isEditing ? (
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={formData.commissionRate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      commissionRate: Number(e.target.value),
                    }))
                  }
                  className="w-24 bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-yellow-500 transition-colors"
                />
                <span className="text-gray-400 text-sm">%</span>
              </div>
            ) : (
              <p className="text-2xl font-bold text-yellow-500">
                {vendor.commissionRate ?? 20}%
              </p>
            )}
          </div>

          <BusinessInfoCard
            vendor={vendor}
            formData={formData}
            isEditing={isEditing}
            onFormChange={(data) =>
              setFormData((prev) => ({ ...prev, ...data }))
            }
          />
        </div>

        {/* Right Column (Metrics & Charts) */}
        <div className="lg:col-span-2 space-y-6 order-1 lg:order-2 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <RevenueCard
              title="Total Revenue"
              amount={vendor.totalRevenue}
              change={0}
              icon={Banknote}
              color="green"
              onClick={() => setActiveTab("Order History")}
            />
            <RevenueCard
              title="Unpaid Balance"
              amount={vendor.totalRevenue}
              icon={TrendingUp}
              color="yellow"
              onClick={() => setActiveTab("Payouts")}
            />
          </div>
          <PerformanceChart data={performanceData || []} />
        </div>
      </div>

      {/* Tabs Container */}
      <div className="mt-8 w-full bg-[#1E293B] border-t border-gray-800 rounded-t-xl overflow-hidden min-h-[500px]">
        {/* FIX: Enhanced scrollbar handling for mobile touch scrolling
         */}
        <div className="flex border-b border-gray-800 overflow-x-auto px-4 md:px-6 hide-scrollbar">
          {[
            "Order History",
            "Products",
            "Payouts",
            "Documents",
            "Reviews",
            "Activity Log",
          ].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 md:px-6 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-all shrink-0 ${
                activeTab === tab
                  ? "text-yellow-500 border-yellow-500 bg-[#0F172A]/50"
                  : "text-gray-400 border-transparent hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        <div className="p-4 md:p-6 overflow-x-hidden">
          {activeTab === "Order History" && (
            <OrderHistoryTab orders={vendor.orders || []} />
          )}

          {activeTab === "Products" && (
            <ProductsTabContent
              products={products || []}
              onToggleBan={toggleProductBan}
              isLoading={isProductsLoading}
              onAddProduct={() => setIsAddProductOpen(true)}
            />
          )}

          {activeTab === "Payouts" &&
            (isPayoutsLoading ? (
              <TabLoader />
            ) : (
              <>
                <PayoutsTabContent
                  unpaidBalance={vendor.unpaidBalance}
                  payouts={payoutsHistory}
                  onProcessPayout={handleProcessPayout}
                />
                {payoutsData?.meta && (
                  <Pagination
                    meta={payoutsData.meta}
                    page={payoutsPage}
                    onPageChange={setPayoutsPage}
                  />
                )}
              </>
            ))}

          {activeTab === "Documents" &&
            (isDocumentsLoading ? (
              <TabLoader />
            ) : (
              <>
                <DocumentsTab
                  documents={(
                    documentsData?.data ||
                    vendor?.vendorDocuments ||
                    []
                  ).map((doc) => ({
                    id: doc.id,
                    url: doc.url,
                    status: doc.status,
                    rejectionReason: doc.rejectionReason,
                    type: doc.type || doc.name || "Document",
                    createdAt:
                      doc.createdAt ||
                      doc.uploadedDate ||
                      new Date().toISOString(),
                  }))}
                  onVerify={(id) => handleVerifyDocument(id, "VERIFIED")}
                  onReject={(id, reason) =>
                    handleVerifyDocument(id, "REJECTED", reason)
                  }
                  showUploadButton={true}
                />
                {documentsData?.meta && (
                  <Pagination
                    meta={documentsData.meta}
                    page={docsPage}
                    onPageChange={setDocsPage}
                  />
                )}
              </>
            ))}

          {activeTab === "Reviews" &&
            (isReviewsLoading ? (
              <TabLoader />
            ) : (
              <>
                <ReviewsTab reviews={reviewsData?.data || []} />
                {reviewsData?.meta && (
                  <Pagination
                    meta={reviewsData.meta}
                    page={reviewsPage}
                    onPageChange={setReviewsPage}
                  />
                )}
              </>
            ))}

          {activeTab === "Activity Log" &&
            (isActivityLoading ? (
              <TabLoader />
            ) : (
              <>
                <ActivityLogTab logs={activityData?.data || []} />
                {activityData?.meta && (
                  <Pagination
                    meta={activityData.meta}
                    page={activityPage}
                    onPageChange={setActivityPage}
                  />
                )}
              </>
            ))}
        </div>
      </div>

      <AddProductModal
        isOpen={isAddProductOpen}
        storeId={vendor?.id || ""}
        storeName={vendor?.name}
        onClose={() => setIsAddProductOpen(false)}
        onSuccess={() => {
          setIsAddProductOpen(false);
          mutateProducts();
        }}
      />
    </div>
  );
}
