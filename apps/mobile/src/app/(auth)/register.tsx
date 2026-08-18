import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { Colors, Fonts } from '@/constants/theme';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await register(email.trim(), password, name.trim() || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.card} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>UltraIa</Text>
        <Text style={styles.subtitle}>Crea tu cuenta para empezar</Text>

        <TextInput
          style={styles.input}
          placeholder="Nombre (opcional)"
          placeholderTextColor={Colors.dark.textSecondary}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.dark.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
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
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Crear cuenta</Text>}
        </Pressable>

        <Link href="/(auth)/login" style={styles.link}>
          ¿Ya tienes cuenta? <Text style={styles.linkStrong}>Inicia sesión</Text>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.dark.background },
  card: { flexGrow: 1, justifyContent: 'center', gap: 12, padding: 24 },
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
