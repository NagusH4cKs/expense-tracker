import React from 'react';
import { ScrollView, Text, View, StyleSheet, Pressable } from 'react-native';

export default function Home() {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.sub}>Personal finance</Text>

      <View style={styles.cards}>
        <Card title="Income" value="₹1,34,764" />
        <Card title="Expenses" value="₹1,37,565" />
        <Card title="Balance" value="−₹2,801" />
      </View>

      <Text style={styles.head}>Recent transactions</Text>
      {[
        ['CAKE N SNA - tea', 'Snacks', '−₹15'],
        ['DILIGENT GOVERNMENT - salary', 'Salary', '+₹1,29,762'],
        ['R P PRAS - laptop', 'Laptop', '−₹67,565'],
        ['UPSTOX SECURITIES', 'Investment', '+₹5,000'],
      ].map((item, index) => (
        <View style={styles.row} key={index}>
          <View>
            <Text style={styles.desc}>{item[0]}</Text>
            <Text style={styles.cat}>{item[1]}</Text>
          </View>
          <Text style={styles.amount}>{item[2]}</Text>
        </View>
      ))}

      <Pressable style={styles.btn}>
        <Text style={styles.btnText}>+ Add transaction</Text>
      </Pressable>
    </ScrollView>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sub}>{title}</Text>
      <Text style={styles.val}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#f6f7fb',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  sub: {
    color: '#777',
    fontSize: 13,
  },
  cards: {
    gap: 12,
    marginVertical: 22,
  },
  card: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e8e8ed',
  },
  val: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 5,
  },
  head: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  row: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  desc: {
    fontWeight: '600',
  },
  cat: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
  },
  amount: {
    fontWeight: '700',
  },
  btn: {
    backgroundColor: '#111',
    padding: 14,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
  },
});