import React, { useEffect, useState, useRef } from "react";
import TonWeb from "tonweb";
import bip39 from "bip39";

// Настройки TonCenter
const TONCENTER_API = "https://toncenter.com/api/v2/jsonRPC";

// Jetton AMCOIN мастер-адрес
const AMCOIN_MASTER = "EQAfysdj5lEz7LfEjybqSe-TFLdC1bMEW5zOvACn2xCjcIKV";

export default function App() {
  const [theme, setTheme] = useState("light");
  const [mnemonic, setMnemonic] = useState("");
  const [address, setAddress] = useState("—");
  const [tonBalance, setTonBalance] = useState("—");
  const [amcoinBalance, setAmcoinBalance] = useState("—");
  const [log, setLog] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const logRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  function pushLog(...parts) {
    const t = new Date().toLocaleString();
    setLog(prev => [...prev, `[${t}] ${parts.join(" ")}`].slice(-200));
  }

  // Генерация сид-фразы
  async function handleGenerate() {
    const m = bip39.generateMnemonic(128);
    setMnemonic(m);
    pushLog("mnemonic сгенерирован");
  }

  // Деривация адреса mainnet
  async function handleDeriveAddress() {
    if (!mnemonic) return pushLog("Сначала сгенерируйте mnemonic");
    setIsLoading(true);
    try {
      const seed = await bip39.mnemonicToSeed(mnemonic);
      const keyPair = TonWeb.utils.nacl.sign.keyPair.fromSeed(seed.slice(0, 32));
      const tonweb = new TonWeb(new TonWeb.HttpProvider(TONCENTER_API));
      const wallet = new TonWeb.wallet.all.v3(tonweb.provider, { publicKey: keyPair.publicKey });
      const walletAddress = await wallet.getAddress();
      setAddress(walletAddress.toString(true, true, true));
      pushLog("Адрес получен:", walletAddress.toString(true, true, true));
    } catch (e) { pushLog("Ошибка деривации адреса:", e.message); }
    finally { setIsLoading(false); }
  }

  // Получение баланса TON
  async function fetchTonBalance(addr) {
    try {
      const url = `https://toncenter.com/api/v2/getAddressInformation?address=${encodeURIComponent(addr)}`;
      const resp = await fetch(url);
      const data = await resp.json();
      return data.ok && data.result ? data.result.balance || 0 : 0;
    } catch (e) { pushLog("Ошибка получения баланса TON:", e.message); return 0; }
  }

  // Получение баланса AMCOIN (Jetton)
  async function fetchAmcoinBalance(addr) {
    try {
      const tonweb = new TonWeb(new TonWeb.HttpProvider(TONCENTER_API));
      const jettonWalletAddress = await TonWeb.token.jetton.getWalletAddress(AMCOIN_MASTER, addr);
      const balanceData = await TonWeb.token.jetton.getWalletData(tonweb.provider, jettonWalletAddress);
      return balanceData.balance;
    } catch (e) { pushLog("Ошибка получения AMCOIN баланса:", e.message); return 0; }
  }

  async function handleCheckBalances() {
    if (!address || address === "—") return pushLog("Сначала деривируйте адрес");
    setIsLoading(true);
    pushLog("Получение балансов для:", address);
    try {
      const tonBal = await fetchTonBalance(address);
      setTonBalance(`${tonBal} nanoTON`);
      const amBal = await fetchAmcoinBalance(address);
      setAmcoinBalance(amBal);
      pushLog("Баланс TON:", tonBal, "AMCOIN:", amBal);
    } catch (e) { pushLog("Ошибка проверки балансов:", e.message); }
    finally { setIsLoading(false); }
  }

  function handleClear() {
    setMnemonic(""); setAddress("—"); setTonBalance("—"); setAmcoinBalance("—"); pushLog("Очистка полей");
  }

  return (
    <div className="min-h-screen p-6 bg-purple-900 text-white transition-colors">
      <div className="max-w-3xl mx-auto">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">💎 Amcoin Wallet</h1>
          <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="px-3 py-2 rounded-lg border bg-purple-700">Тема</button>
        </header>

        <section className="mb-6 bg-purple-800 p-4 rounded-2xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-2">🔑 Seed</h2>
          <div className="flex gap-2 mb-2">
            <button onClick={handleGenerate} className="rounded-lg bg-purple-600 px-4 py-2">Сгенерировать mnemonic</button>
            <button onClick={handleClear} className="rounded-lg bg-purple-600 px-4 py-2">Очистить</button>
          </div>
          <textarea className="w-full p-3 rounded-lg bg-purple-700 border" rows={2} value={mnemonic} onChange={e => setMnemonic(e.target.value)} />
        </section>

        <section className="mb-6 bg-purple-800 p-4 rounded-2xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-2">📊 Wallet Info</h2>
          <div className="mb-3">Address: <span className="font-mono">{address}</span></div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="rounded-lg p-3 bg-purple-700 text-center">TON: {tonBalance}</div>
            <div className="rounded-lg p-3 bg-purple-700 text-center">AMCOIN: {amcoinBalance}</div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleDeriveAddress} className="flex-1 rounded-lg bg-purple-600 px-4 py-2">Получить адрес</button>
            <button onClick={handleCheckBalances} className="rounded-lg bg-purple-600 px-4 py-2">Проверить балансы</button>
          </div>
        </section>

        <section className="mb-6 bg-purple-800 p-4 rounded-2xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-2">📋 Логи</h2>
          <div ref={logRef} className="max-h-48 overflow-auto rounded-lg bg-purple-700 p-3 font-mono text-xs">
            {log.length === 0 ? <div className="text-gray-300">Логи появятся здесь...</div> : log.map((l,i) => <div key={i}>{l}</div>)}
          </div>
        </section>
      </div>
    </div>
  );
}
