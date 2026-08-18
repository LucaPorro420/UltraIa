import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { Colors, Fonts } from '@/constants/theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <Text style={styles.logo}>UltraIa</Text>
        <Text style={styles.subtitle}>Inicia sesión para gestionar tus publicaciones</Text>

        <TextInput
          style={styles.input}
          placeholder="Email o usuario"
          placeholderTextColor={Colors.dark.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor={Colors.dark.textSecondary}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={[styles.button, busy && styles.buttonDisabled]} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
        </Pressable>

        <Link href="/(auth)/register" style={styles.link}>
          ¿No tienes cuenta? <Text style={styles.linkStrong}>Regístrate</Text>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.dark.background, justifyContent: 'center', padding: 24 },
  card: { gap: 12 },
  logo: { color: Colors.dark.primary, fontSize: 34, fontFamily: Fonts.sans, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: Colors.dark.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 8 },
  input: {
    backgroundColor: Colors.dark.backgroundElement,
    borderColor: Colors.dark.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.dark.text,
    fontSize: 15,
  },
  button: { backgroundColor: Colors.dark.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  error: { color: Colors.dark.danger, fontSize: 13 },
  link: { color: Colors.dark.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 8 },
  linkStrong: { color: Colors.dark.primary, fontWeight: '600' },
});
