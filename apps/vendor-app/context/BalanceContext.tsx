import React, { createContext, useContext, useState, useCallback } from "react";

interface BalanceContextType {
  balance: number;
  refetchBalance: () => Promise<void>;
  setBalance: (balance: number) => void;
  isLoading: boolean;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export function BalanceProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const refetchBalance = useCallback(async () => {
    setIsLoading(true);
    try {
      const { fetchStoreBalance } = await import("@/services/profile.service");
      const data = await fetchStoreBalance();
      setBalance(data?.amount ?? 0);
    } catch (error) {
      console.error("Failed to refetch balance:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <BalanceContext.Provider
      value={{ balance, refetchBalance, setBalance, isLoading }}
    >
      {children}
    </BalanceContext.Provider>
  );
}

export function useBalance() {
  const context = useContext(BalanceContext);
  if (!context) {
    throw new Error("useBalance must be used within BalanceProvider");
  }
  return context;
}
