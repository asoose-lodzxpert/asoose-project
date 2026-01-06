import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import ConfirmDialog from "./ConfirmDialog";

type ConfirmOptions = {
  title?: string;
  message?: string;
  icon?: string;
  variant?: "default" | "warning" | "danger";
  confirmLabel?: string;
  cancelLabel?: string;
};

type ConfirmContextType = {
  showConfirm: (opts?: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({});
  const resolverRef = useRef<(v: boolean) => void | null>(null);

  const showConfirm = useCallback((opts: ConfirmOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOptions(opts);
      setVisible(true);
    });
  }, []);

  const handleCancel = useCallback(() => {
    setVisible(false);
    if (resolverRef.current) resolverRef.current(false);
    resolverRef.current = null;
  }, []);

  const handleConfirm = useCallback(() => {
    setVisible(false);
    if (resolverRef.current) resolverRef.current(true);
    resolverRef.current = null;
  }, []);

  return (
    <ConfirmContext.Provider value={{ showConfirm }}>
      {children}
      <ConfirmDialog
        visible={visible}
        title={options.title}
        message={options.message}
        icon={options.icon}
        variant={options.variant as any}
        confirmLabel={options.confirmLabel}
        cancelLabel={options.cancelLabel}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx.showConfirm;
}

export default ConfirmProvider;
