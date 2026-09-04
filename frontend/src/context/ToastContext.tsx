import React, { createContext, useContext, useCallback, useState, useRef } from "react";
import { View, Text } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import { makeStyles, useTheme } from "@/src/theme";

type ToastType = "success" | "error" | "info";

interface ToastState {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastState | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, type: ToastType = "success") => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, type });
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const bg =
    toast?.type === "error" ? colors.error : toast?.type === "info" ? colors.blue : colors.success;
  const icon =
    toast?.type === "error" ? "alert-circle" : toast?.type === "info" ? "information" : "check-circle";

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <Animated.View
          entering={FadeInDown.springify().damping(18)}
          exiting={FadeOutDown.duration(180)}
          pointerEvents="none"
          style={[styles.toast, { backgroundColor: bg, bottom: insets.bottom + 96 }]}
          testID="app-toast"
        >
          <MaterialDesignIcons name={icon as any} size={18} color={colors.onDark} />
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const useStyles = makeStyles((t) => ({
  toast: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
    borderRadius: t.radius.pill,
    maxWidth: "90%",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  toastText: {
    color: t.colors.onDark,
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 1,
  },
}));
