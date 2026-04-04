import Swal from "sweetalert2";

const themeColors = {
  background: "#1E293B", // Slate-800
  color: "#F8FAFC", // Slate-50
  confirmButton: "#EAB308", // Yellow-500
  cancelButton: "#EF4444", // Red-500
};

export const AppAlert = {
  error: (title: string, text: string) =>
    Swal.fire({
      icon: "error",
      title,
      text,
      background: themeColors.background,
      color: themeColors.color,
      confirmButtonColor: themeColors.confirmButton,
    }),

  success: (title: string) =>
    Swal.fire({
      icon: "success",
      title,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 1500,
      background: themeColors.background,
      color: themeColors.color,
    }),

  successModal: (title: string, text: string) =>
    Swal.fire({
      icon: "success",
      title,
      text,
      confirmButtonColor: themeColors.confirmButton,
      background: themeColors.background,
      color: themeColors.color,
    }),

  confirm: async (
    title: string,
    text: string,
    confirmText: string,
    isDestructive = false,
  ) => {
    return Swal.fire({
      title,
      text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: isDestructive ? themeColors.cancelButton : "#10B981",
      cancelButtonColor: "#64748B",
      confirmButtonText: confirmText,
      background: themeColors.background,
      color: themeColors.color,
    });
  },

  input: async (title: string, placeholder: string) => {
    return Swal.fire({
      title,
      input: "textarea",
      inputPlaceholder: placeholder,
      showCancelButton: true,
      confirmButtonText: "Send",
      confirmButtonColor: themeColors.confirmButton,
      background: themeColors.background,
      color: themeColors.color,
      customClass: {
        input: "bg-gray-700 text-white border-gray-600 focus:ring-yellow-500",
      },
    });
  },
};
