import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { useAuth } from "@/src/context/AuthContext";
import { makeStyles, useTheme } from "@/src/theme";

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const styles = useStyles();
  const { colors } = useTheme();

  useEffect(() => {
    if (loading) return;
    if (user) router.replace("/(tabs)/bancas");
    else router.replace("/login");
  }, [user, loading, router]);

  return (
    <View style={styles.container} testID="splash-screen">
      <Image
        source={require("../assets/images/peixe-logo.jpg")}
        style={styles.logo}
        contentFit="contain"
      />
      <ActivityIndicator color={colors.brand} style={{ marginTop: 24 }} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: 200, height: 200, borderRadius: 24 },
}));
