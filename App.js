import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const STORAGE_KEY = 'gastos:expenses';

const CATEGORIES = [
  { id: 'alimentacao', label: 'Alimentação', color: '#f59e0b', emoji: '🍔' },
  { id: 'transporte', label: 'Transporte', color: '#3b82f6', emoji: '🚗' },
  { id: 'moradia', label: 'Moradia', color: '#8b5cf6', emoji: '🏠' },
  { id: 'saude', label: 'Saúde', color: '#10b981', emoji: '💊' },
  { id: 'lazer', label: 'Lazer', color: '#ec4899', emoji: '🎮' },
  { id: 'educacao', label: 'Educação', color: '#06b6d4', emoji: '📚' },
  { id: 'compras', label: 'Compras', color: '#ef4444', emoji: '🛍️' },
  { id: 'outros', label: 'Outros', color: '#64748b', emoji: '📦' },
];

const formatBRL = (value) =>
  (value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

const todayISO = () => new Date().toISOString().slice(0, 10);

const formatDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('outros');
  const [date, setDate] = useState(todayISO());

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setExpenses(JSON.parse(raw));
      } catch (e) {
        console.warn('Falha ao carregar gastos', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const persist = async (next) => {
    setExpenses(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('Falha ao salvar gastos', e);
    }
  };

  const total = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [expenses]
  );

  const addExpense = () => {
    const value = Number(String(amount).replace(',', '.'));
    if (!description.trim() || !value || value <= 0) {
      Alert.alert('Preencha os dados', 'Informe uma descrição e um valor maior que zero.');
      return;
    }
    const newExpense = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      description: description.trim(),
      amount: value,
      category,
      date,
      createdAt: new Date().toISOString(),
    };
    persist([newExpense, ...expenses]);
    setDescription('');
    setAmount('');
    setCategory('outros');
    setDate(todayISO());
  };

  const confirmDelete = (expense) => {
    Alert.alert(
      'Remover gasto',
      `Remover "${expense.description}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => persist(expenses.filter((e) => e.id !== expense.id)),
        },
      ]
    );
  };

  const categoryOf = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

  const renderExpensive = ({ item }) => {
    const cat = categoryOf(item.category);
    return (
      <View style={styles.card}>
        <View style={[styles.cardEmoji, { backgroundColor: `${cat.color}22` }]}>{cat.emoji}</View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.description}
          </Text>
          <View style={styles.cardMeta}>
            <View style={[styles.pill, { backgroundColor: `${cat.color}22` }]}>
              <Text style={[styles.pillText, { color: cat.color }]}>{cat.label}</Text>
            </View>
            <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.cardAmount}>{formatBRL(item.amount)}</Text>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => confirmDelete(item)}
            accessibilityLabel="Remover gasto"
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Gastos</Text>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatBRL(total)}</Text>
          </View>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Descrição (ex.: Almoço)"
            placeholderTextColor="#94a3b8"
            value={description}
            onChangeText={setDescription}
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.amountInput]}
              placeholder="0,00"
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
            <TextInput
              style={[styles.input, styles.dateInput]}
              placeholder="dd/mm/aaaa"
              placeholderTextColor="#94a3b8"
              value={date}
              onChangeText={setDate}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
            {CATEGORIES.map((c) => {
              const active = c.id === category;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.chip, active && { backgroundColor: c.color, borderColor: c.color }]}
                  onPress={() => setCategory(c.id)}
                >
                  <Text style={[styles.chipText, active && { color: '#fff' }]}>
                    {c.emoji} {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={styles.addBtn} onPress={addExpense} activeOpacity={0.85}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Adicionar gasto</Text>
          </TouchableOpacity>
        </View>

        {loaded && (
          <FlatList
            data={expenses}
            keyExtractor={(item) => item.id}
            renderItem={renderExpensive}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="wallet-outline" size={48} color="#cbd5e1" />
                <Text style={styles.emptyText}>Nenhum gasto ainda.</Text>
                <Text style={styles.emptySub}>Adicione seu primeiro gasto acima.</Text>
              </View>
            }
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f6fb' },
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8 },
  title: { fontSize: 30, fontWeight: '800', color: '#0f172a' },
  totalCard: {
    marginTop: 12,
    borderRadius: 18,
    padding: 18,
    backgroundColor: '#0f172a',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  totalValue: { color: '#fff', fontSize: 26, fontWeight: '800' },
  form: { paddingHorizontal: 20, paddingTop: 18, backgroundColor: '#fff', borderBottomLeftRadius: 28, borderBottomRightRadius: 28, paddingBottom: 14 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  row: { flexDirection: 'row', marginTop: 10, gap: 10 },
  amountInput: { flex: 1 },
  dateInput: { flex: 1 },
  categories: { marginTop: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  chipText: { color: '#334155', fontSize: 13, fontWeight: '600' },
  addBtn: {
    marginTop: 14,
    backgroundColor: '#10b981',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  listContent: { padding: 20, paddingBottom: 40 },
  separator: { height: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardEmoji: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', fontSize: 24 },
  cardBody: { flex: 1, marginLeft: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pillText: { fontSize: 11, fontWeight: '700' },
  cardDate: { fontSize: 12, color: '#94a3b8' },
  cardRight: { alignItems: 'flex-end', marginLeft: 8 },
  cardAmount: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  deleteBtn: { marginTop: 8, padding: 4, borderRadius: 8 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { marginTop: 12, fontSize: 18, fontWeight: '700', color: '#64748b' },
  emptySub: { marginTop: 4, fontSize: 14, color: '#94a3b8' },
});
