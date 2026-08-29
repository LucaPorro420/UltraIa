/**
 * chat.tsx — Pantalla de chat con streaming para la app móvil.
 * Usa useChat hook para comunicarse con /api/chat del backend.
 */
import { useState, useRef, useEffect } from 'react';
import {
  FlatList,
  TextInput,
  Pressable,
  Text,
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useChat, type ChatMessage } from '@/hooks/useChat';
import { Colors } from '@/constants/theme';
import { Screen } from '@/components/ui';

const MODO_OPTIONS = [
  { id: 'libre', label: 'Libre', icon: 'chatbubble-ellipses' },
  { id: 'plan', label: 'Plan', icon: 'map' },
  { id: 'build', label: 'Build', icon: 'hammer' },
  { id: 'test', label: 'Test', icon: 'checkmark-circle' },
  { id: 'review', label: 'Review', icon: 'eye' },
] as const;

/** Chat con streaming — usa agentId y conversationId hardcodeados para MVP. */
export default function ChatScreen() {
  const [input, setInput] = useState('');
  const [modo, setModo] = useState<string>('libre');
  const flatListRef = useRef<FlatList>(null);

  const { messages, loading, streaming, sendMessage, cancel, clear } = useChat({
    agentId: 'default-agent',
    conversationId: 'default-conv',
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    sendMessage(input.trim(), modo);
    setInput('');
  };

  const renderItem = ({ item }: { item: ChatMessage }) => (
    <View
      style={[
        styles.bubble,
        item.role === 'user' ? styles.userBubble : styles.assistantBubble,
      ]}
    >
      <Text style={styles.bubbleText}>{item.content}</Text>
      {item.role === 'assistant' && streaming && item === messages[messages.length - 1] && (
        <ActivityIndicator size="small" color={Colors.dark.primary} style={styles.typingIndicator} />
      )}
    </View>
  );

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Modo selector */}
        <View style={styles.modoRow}>
          {MODO_OPTIONS.map((m) => (
            <Pressable
              key={m.id}
              style={[styles.modoBtn, modo === m.id && styles.modoBtnActive]}
              onPress={() => setModo(m.id)}
            >
              <Ionicons
                name={m.icon as any}
                size={14}
                color={modo === m.id ? '#fff' : Colors.dark.textSecondary}
              />
              <Text style={[styles.modoLabel, modo === m.id && styles.modoLabelActive]}>
                {m.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderItem}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color={Colors.dark.textSecondary} />
              <Text style={styles.emptyText}>Escribe un mensaje para comenzar</Text>
            </View>
          }
        />

        {/* Input row */}
        <View style={styles.inputRow}>
          {messages.length > 0 && (
            <Pressable style={styles.clearBtn} onPress={clear}>
              <Ionicons name="trash-outline" size={20} color={Colors.dark.textSecondary} />
            </Pressable>
          )}
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Escribe tu mensaje..."
            placeholderTextColor={Colors.dark.textSecondary}
            editable={!loading}
            multiline
            maxLength={4000}
          />
          {loading ? (
            <Pressable style={styles.sendBtn} onPress={cancel}>
              <Ionicons name="stop-circle" size={24} color="#ef4444" />
            </Pressable>
          ) : (
            <Pressable
              style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!input.trim()}
            >
              <Ionicons name="arrow-up-circle" size={24} color={input.trim() ? Colors.dark.primary : Colors.dark.textSecondary} />
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modoRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  modoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.dark.backgroundElement,
  },
  modoBtnActive: {
    backgroundColor: Colors.dark.primary,
  },
  modoLabel: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    fontWeight: '500',
  },
  modoLabelActive: {
    color: '#fff',
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    padding: 12,
    paddingBottom: 8,
  },
  bubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.dark.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.dark.backgroundElement,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    color: Colors.dark.text,
    fontSize: 15,
    lineHeight: 22,
  },
  typingIndicator: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    backgroundColor: Colors.dark.background,
  },
  clearBtn: {
    padding: 8,
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundElement,
    color: Colors.dark.text,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
  },
  sendBtn: {
    padding: 4,
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
    gap: 12,
  },
  emptyText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },
});
