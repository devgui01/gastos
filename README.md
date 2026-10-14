<div align="center">

# Gastos

### Offline-first expense tracker for mobile

**A React Native app to log daily spending in seconds — no account, no server, no internet required.**

<br/>

[![React Native](https://img.shields.io/badge/React_Native-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/docs/Web/JavaScript)

</div>

---

## Why

Most expense trackers want an account, a sync service and your e-mail. This one does not: it stores everything **on the device**, works offline, and opens straight into the list of expenses.

## Features

- **Add an expense** with description, amount and category
- **8 predefined categories** with colour and icon (food, transport, housing, health, leisure, education, shopping, other)
- **Totals per category** computed live
- **Delete with confirmation** — no accidental loss
- **Local persistence** via `AsyncStorage`, surviving app restarts
- **BRL currency formatting** and `dd/mm/yyyy` dates

## How the state works

Expenses live in React state and are mirrored to `AsyncStorage` on every mutation, so the UI never waits on disk:

```javascript
const persist = async (next) => {
  setExpenses(next);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};
```

On start, the app hydrates from storage and only then renders the list, avoiding a flash of empty state.

## Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.74 |
| Tooling | Expo SDK 51 |
| Storage | `@react-native-async-storage/async-storage` |
| Icons | `@expo/vector-icons` (Ionicons) |
| Language | JavaScript (ES6+) |

## Project structure

```
App.js          # entire app: state, persistence, UI
app.json        # Expo config (name, icons, bundle identifiers)
index.js        # entry point
```

A deliberately **single-file app** — the whole feature set is ~300 lines, and splitting it would add indirection without benefit at this size.

## Running

```bash
npm install
npx expo start
```

Then scan the QR code with the Expo Go app, or press `a` for Android / `i` for iOS.

## Status

Complete and usable. The data layer is intentionally local — a cloud sync would be the next step if multi-device support were needed.

---

<div align="center">
<sub>Built by <a href="https://github.com/devgui01">Guilherme Kauan Marques</a></sub>
</div>
