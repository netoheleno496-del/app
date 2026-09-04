import "react-native-reanimated";
import { Stack } from "expo-router";
import { LogBox, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "@/src/context/AuthContext";
import { SelectionProvider } from "@/src/context/SelectionContext";
import { ToastProvider } from "@/src/context/ToastContext";
import { colors } from "@/src/theme";

LogBox.ignoreAllLogs(true);

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15000 } },
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.surface }}>
      <KeyboardProvider>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SelectionProvider>
              <ToastProvider>
                <StatusBar style="light" />
                <View style={{ flex: 1, backgroundColor: colors.surface }}>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: colors.surface },
                    }}
                  >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="login" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="estatisticas" options={{ animation: "slide_from_right" }} />
                    <Stack.Screen
                      name="add-bet"
                      options={{ presentation: "modal", animation: "slide_from_bottom" }}
                    />
                  </Stack>
                </View>
              </ToastProvider>
            </SelectionProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
