import { Tabs } from "expo-router";
import { View, Text, Pressable, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { makeStyles, useTheme } from "@/src/theme";

const TAB_META: Record<string, { label: string; icon: string }> = {
  bancas: { label: "Bancas", icon: "wallet" },
  painel: { label: "Painel", icon: "chart-box" },
  apostas: { label: "Apostas", icon: "receipt-text" },
  mais: { label: "Mais", icon: "dots-horizontal" },
};

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const styles = useStyles();
  const { colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const routes = state.routes.filter((r) => TAB_META[r.name]);
  const left = routes.slice(0, 2);
  const right = routes.slice(2);

  const renderItem = (route: (typeof state.routes)[number]) => {
    const index = state.routes.findIndex((r) => r.key === route.key);
    const focused = state.index === index;
    const meta = TAB_META[route.name];
    const onPress = () => {
      Haptics.selectionAsync();
      const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
    };
    return (
      <Pressable key={route.key} onPress={onPress} style={styles.item} testID={`tab-${route.name}`}>
        <MaterialDesignIcons
          name={meta.icon as any}
          size={24}
          color={focused ? colors.brand : colors.dim}
        />
        <Text style={[styles.itemLabel, { color: focused ? colors.brand : colors.dim }]}>
          {meta.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom }]}>
      <BlurView intensity={40} tint="dark" style={styles.blur}>
        <View style={styles.row}>
          <View style={styles.side}>{left.map(renderItem)}</View>
          <View style={styles.fabSlot}>
            <Pressable
              testID="fab-add-bet"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/add-bet");
              }}
              style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.94 }] }]}
            >
              <LinearGradient colors={gradients.primary} style={styles.fabGradient}>
                <MaterialDesignIcons name="plus" size={30} color={colors.onDark} />
              </LinearGradient>
            </Pressable>
          </View>
          <View style={styles.side}>{right.map(renderItem)}</View>
        </View>
      </BlurView>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="bancas" />
      <Tabs.Screen name="painel" />
      <Tabs.Screen name="apostas" />
      <Tabs.Screen name="mais" />
    </Tabs>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Platform.OS === "android" ? t.colors.surfaceElevated : "transparent",
    borderTopWidth: 1,
    borderTopColor: t.colors.divider,
  },
  blur: { width: "100%" },
  row: { flexDirection: "row", alignItems: "center", height: 62 },
  side: { flex: 1, flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  fabSlot: { width: 84, alignItems: "center", justifyContent: "center" },
  item: { alignItems: "center", justifyContent: "center", gap: 3, minWidth: 56 },
  itemLabel: { fontSize: 10, fontWeight: "700" },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginTop: -26,
    shadowColor: t.colors.purple,
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: t.colors.surface,
  },
}));
