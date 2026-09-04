import { useState } from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";
import { makeStyles } from "@/src/theme";
import { casaLogoUrl } from "@/src/lib/casaLogos";

const PALETTE = ["#3B82F6", "#8B5CF6", "#2EBFAF", "#F59E0B", "#EF4444", "#0EA5E9", "#22C55E"];

function initials(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9\s]/g, "").trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 3).toUpperCase();
}

function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export default function CasaLogo({ name, size = 32 }: { name: string; size?: number }) {
  const styles = useStyles();
  const url = casaLogoUrl(name);
  const [failed, setFailed] = useState(false);

  if (url && !failed) {
    return (
      <View style={[styles.tile, { width: size, height: size, borderRadius: size * 0.28 }]}>
        <Image
          source={{ uri: url }}
          style={{ width: size * 0.72, height: size * 0.72 }}
          contentFit="contain"
          transition={150}
          onError={() => setFailed(true)}
        />
      </View>
    );
  }

  const bg = colorFor(name);
  return (
    <View
      style={[
        styles.box,
        { width: size, height: size, borderRadius: size * 0.28, backgroundColor: bg + "22", borderColor: bg + "55" },
      ]}
    >
      <Text style={[styles.text, { color: bg, fontSize: size * 0.34 }]}>{initials(name)}</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  tile: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: t.colors.border,
    overflow: "hidden",
  },
  box: { alignItems: "center", justifyContent: "center", borderWidth: 1 },
  text: { fontWeight: "800", letterSpacing: 0.5 },
}));
