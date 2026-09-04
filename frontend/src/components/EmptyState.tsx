import { View, Text, Pressable } from "react-native";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import { makeStyles, useTheme } from "@/src/theme";

interface Props {
  icon: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon, title, message, actionLabel, onAction }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.wrap} testID="empty-state">
      <View style={styles.iconWrap}>
        <MaterialDesignIcons name={icon as any} size={38} color={colors.brand} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} style={styles.action} testID="empty-action">
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { alignItems: "center", justifyContent: "center", paddingVertical: t.spacing["3xl"], paddingHorizontal: t.spacing.xl, gap: t.spacing.sm },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(46,191,175,0.1)",
    borderWidth: 1,
    borderColor: "rgba(46,191,175,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: t.spacing.sm,
  },
  title: { color: t.colors.text, fontSize: 17, fontWeight: "800", textAlign: "center" },
  message: { color: t.colors.muted, fontSize: 13, textAlign: "center", lineHeight: 19 },
  action: {
    marginTop: t.spacing.md,
    backgroundColor: t.colors.brand,
    paddingHorizontal: t.spacing.xl,
    height: 46,
    borderRadius: t.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { color: t.colors.onBrand, fontSize: 14, fontWeight: "800" },
}));
