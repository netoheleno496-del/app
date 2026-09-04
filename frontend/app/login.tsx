import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import { useRouter } from "expo-router";

import { makeStyles, useTheme } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/context/ToastContext";

export default function LoginScreen() {
  const styles = useStyles();
  const { colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const toast = useToast();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isRegister = mode === "register";

  const submit = async () => {
    setError("");
    if (isRegister && !name.trim()) return setError("Informe seu nome");
    if (!email.trim()) return setError("Informe seu e-mail");
    if (senha.length < 6) return setError("A senha deve ter ao menos 6 caracteres");
    setLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (isRegister) await signUp(name.trim(), email.trim(), senha);
      else await signIn(email.trim(), senha);
      toast.show(isRegister ? "Conta criada com sucesso" : "Bem-vindo de volta!", "success");
      router.replace("/(tabs)/bancas");
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e?.message || "Não foi possível entrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.hero, { height: height * 0.42 }]}>
        <Image
          source={{
            uri: "https://images.unsplash.com/photo-1614850523011-8f49ffc73908?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
          }}
          style={styles.heroImg}
          contentFit="cover"
        />
        <LinearGradient
          colors={["transparent", "rgba(11,17,32,0.6)", colors.surface]}
          locations={[0, 0.6, 1]}
          style={styles.scrim}
        />
        <View style={[styles.heroContent, { paddingTop: insets.top + 24 }]}>
          <View style={styles.logoWrap}>
            <MaterialDesignIcons name="fish" size={34} color={colors.brand} />
          </View>
          <Text style={styles.brandName}>PEIXE ESPERTO</Text>
          <Text style={styles.brandTag}>Gestão de banca inteligente</Text>
        </View>
      </View>

      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={[styles.formWrap, { paddingBottom: insets.bottom + 24 }]}
        bottomOffset={24}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.toggleRow}>
          <Pressable
            testID="tab-login"
            onPress={() => setMode("login")}
            style={[styles.toggleBtn, !isRegister && styles.toggleActive]}
          >
            <Text style={[styles.toggleText, !isRegister && styles.toggleTextActive]}>Entrar</Text>
          </Pressable>
          <Pressable
            testID="tab-register"
            onPress={() => setMode("register")}
            style={[styles.toggleBtn, isRegister && styles.toggleActive]}
          >
            <Text style={[styles.toggleText, isRegister && styles.toggleTextActive]}>
              Criar conta
            </Text>
          </Pressable>
        </View>

        {isRegister && (
          <Field label="Nome">
            <TextInput
              testID="input-name"
              value={name}
              onChangeText={setName}
              placeholder="Como quer ser chamado"
              placeholderTextColor={colors.faint}
              style={styles.input}
            />
          </Field>
        )}

        <Field label="E-mail">
          <TextInput
            testID="input-email"
            value={email}
            onChangeText={setEmail}
            placeholder="voce@email.com"
            placeholderTextColor={colors.faint}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            style={styles.input}
          />
        </Field>

        <Field label="Senha">
          <View style={styles.passwordRow}>
            <TextInput
              testID="input-password"
              value={senha}
              onChangeText={setSenha}
              placeholder="••••••••"
              placeholderTextColor={colors.faint}
              secureTextEntry={!showSenha}
              style={[styles.input, styles.flex]}
            />
            <Pressable onPress={() => setShowSenha((s) => !s)} style={styles.eyeBtn} testID="toggle-password">
              <MaterialDesignIcons
                name={showSenha ? "eye-off" : "eye"}
                size={20}
                color={colors.muted}
              />
            </Pressable>
          </View>
        </Field>

        {!!error && (
          <View style={styles.errorRow} testID="login-error">
            <MaterialDesignIcons name="alert-circle" size={16} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Pressable
          testID="submit-button"
          onPress={submit}
          disabled={loading}
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}
        >
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            {loading ? (
              <ActivityIndicator color={colors.onDark} />
            ) : (
              <Text style={styles.ctaText}>{isRegister ? "Criar conta" : "Entrar"}</Text>
            )}
          </LinearGradient>
        </Pressable>

        <Text style={styles.footer}>
          Seus dados ficam salvos na nuvem e sincronizam em qualquer celular.
        </Text>
      </KeyboardAwareScrollView>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.surface },
  flex: { flex: 1 },
  hero: { width: "100%" },
  heroImg: { ...StyleSheetAbsolute() },
  scrim: { ...StyleSheetAbsolute() },
  heroContent: { flex: 1, alignItems: "center", justifyContent: "flex-end", paddingBottom: 8 },
  logoWrap: {
    width: 68,
    height: 68,
    borderRadius: t.radius.lg,
    backgroundColor: "rgba(46,191,175,0.12)",
    borderWidth: 1,
    borderColor: "rgba(46,191,175,0.4)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: t.spacing.md,
  },
  brandName: {
    color: t.colors.text,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 2,
  },
  brandTag: { color: t.colors.muted, fontSize: 13, marginTop: 2 },
  formWrap: { paddingHorizontal: t.spacing.xl, paddingTop: t.spacing.lg, gap: t.spacing.lg },
  toggleRow: {
    flexDirection: "row",
    backgroundColor: t.colors.cardAlt,
    borderRadius: t.radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  toggleBtn: { flex: 1, height: 40, borderRadius: t.radius.sm, alignItems: "center", justifyContent: "center" },
  toggleActive: { backgroundColor: t.colors.brand },
  toggleText: { color: t.colors.muted, fontSize: 14, fontWeight: "700" },
  toggleTextActive: { color: t.colors.onBrand },
  field: { gap: t.spacing.sm },
  label: { color: t.colors.muted, fontSize: 12, fontWeight: "600" },
  input: {
    height: 50,
    backgroundColor: t.colors.cardAlt,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.md,
    paddingHorizontal: t.spacing.lg,
    color: t.colors.text,
    fontSize: 15,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: t.colors.cardAlt,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.md,
  },
  eyeBtn: { paddingHorizontal: t.spacing.lg, height: 50, justifyContent: "center" },
  errorRow: { flexDirection: "row", alignItems: "center", gap: t.spacing.sm },
  errorText: { color: t.colors.error, fontSize: 13, flexShrink: 1 },
  cta: { borderRadius: t.radius.md, overflow: "hidden", marginTop: t.spacing.xs },
  ctaGradient: { height: 52, alignItems: "center", justifyContent: "center" },
  ctaText: { color: t.colors.onDark, fontSize: 16, fontWeight: "800" },
  footer: { color: t.colors.dim, fontSize: 12, textAlign: "center", marginTop: t.spacing.sm },
}));

function StyleSheetAbsolute() {
  return { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };
}
