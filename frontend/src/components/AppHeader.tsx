import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import { makeStyles, useTheme } from "@/src/theme";

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  dot?: boolean;
}

export default function AppHeader({ title, subtitle, onBack, right, dot }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <BlurView intensity={30} tint="dark" style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <View style={styles.left}>
          {onBack && (
            <Pressable onPress={onBack} style={styles.backBtn} testID="header-back">
              <MaterialDesignIcons name="chevron-left" size={28} color={colors.text} />
            </Pressable>
          )}
          <View style={{ flexShrink: 1 }}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {dot && <View style={styles.dot} />}
            </View>
            {!!subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        {right}
      </View>
    </BlurView>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: {
    borderBottomWidth: 1,
    borderBottomColor: t.colors.divider,
    backgroundColor: "rgba(11,17,32,0.7)",
  },
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
  },
  left: { flexDirection: "row", alignItems: "center", flexShrink: 1, gap: 2 },
  backBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: t.spacing.sm },
  title: { color: t.colors.text, fontSize: 19, fontWeight: "800" },
  subtitle: { color: t.colors.muted, fontSize: 12, marginTop: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.colors.success },
}));
