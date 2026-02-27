import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Download, 
  CheckCircle2, 
  Clock, 
  User, 
  Calendar, 
  ChevronRight, 
  Archive, 
  TrendingUp,
  X,
  MessageSquare,
  Info,
  ChevronDown,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { cn, CommissionItem, AddOn, Order, QueueStatus, STATUS_COLORS } from './types';

// --- CONFIGURATION ---
// ⚠️ PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE ⚠️
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyAMZZSeYs-RqSNOBzMBrsKPNcumlWb7IZ07kkY9GibRZj3JjjTAz7BOhzYHqG2uoQ/exec"; 

// --- Constants ---
const COMMISSION_TYPES = [
  { id: 'mini-chibi', name: 'Mini Chibi (Full Body)', basePrice: 180 },
  { id: 'chibi', name: 'Chibi', options: [
    { label: 'Head', price: 100 },
    { label: 'Bust Up', price: 125 },
    { label: 'Fullbody', price: 200 }
  ]},
  { id: 'rough-icon', name: 'Rough Icon', basePrice: 100 },
  { id: 'little-type', name: 'The Little Type', basePrice: 50, hasFullBodyOption: true },
  { id: 'dumdui', name: 'DumDui', basePrice: 150 },
  { id: 'emote', name: 'Emote', noMultiplier: true, options: [
    { label: '1 รูป', price: 250 },
    { label: '5 รูป', price: 1225 },
    { label: '10 รูป', price: 2400 }
  ]},
  { id: 'ych-yeh', name: 'YCH Yeh!', basePrice: 100 },
  { id: 'reactive-gif', name: 'Reactive GIF', basePrice: 500, noMultiplier: true },
  { id: 'logo-typo', name: 'Logo / Typo', basePrice: 1000, hasAiOption: true },
  { id: 'video-pv', name: 'Video / PV', isCustom: true },
];

export default function App() {
  // --- State ---
  const [clientName, setClientName] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [contactType, setContactType] = useState('Facebook');
  const [deadline, setDeadline] = useState('');
  const [selectedItems, setSelectedItems] = useState<CommissionItem[]>([]);
  const [multiplier, setMultiplier] = useState(1); // 1, 1.5, 2
  const [addOns, setAddOns] = useState<AddOn>({ propSmall: 0, propLarge: 0, customDesignPrice: 0 });
  
  const [queue, setQueue] = useState<Order[]>([]);
  const [archive, setArchive] = useState<Order[]>([]);
  
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const receiptRef = useRef<HTMLDivElement>(null);

  // --- API Functions ---
  const loadDataFromSheet = async () => {
    if (!GOOGLE_SCRIPT_URL) return;
    setIsLoading(true);
    try {
      const res = await window.fetch(GOOGLE_SCRIPT_URL);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (data.queue) setQueue(data.queue);
      if (data.archive) setArchive(data.archive);
    } catch (error) {
      console.error("Error fetching data:", error);
      // We don't alert here to avoid annoying the user if it's a temporary network issue
    } finally {
      setIsLoading(false);
    }
  };

  const syncAction = async (action: string, payload: any) => {
    if (!GOOGLE_SCRIPT_URL) return;
    setIsSyncing(true);
    try {
      // Using text/plain to avoid CORS preflight (OPTIONS) which Google Apps Script doesn't support
      await window.fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action, ...payload })
      });
    } catch (error) {
      console.error("Error syncing data:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  // --- Persistence ---
  useEffect(() => {
    loadDataFromSheet();
  }, []);

  // --- Logic ---
  const calculateTotal = () => {
    let total = 0;
    selectedItems.forEach(item => {
      let itemPrice = item.basePrice;
      if (item.isFullBody) itemPrice *= 2;
      if (item.hasAiFile) itemPrice += 300;
      if (item.customPrice) itemPrice = item.customPrice;

      if (item.noMultiplier) {
        total += itemPrice;
      } else {
        total += itemPrice * multiplier;
      }
    });

    total += (addOns.propSmall * 10) + (addOns.propLarge * 20) + addOns.customDesignPrice;
    return total;
  };

  const addItem = (typeId: string) => {
    const type = COMMISSION_TYPES.find(t => t.id === typeId);
    if (!type) return;

    const newItem: CommissionItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: type.name,
      basePrice: type.basePrice || 0,
      noMultiplier: type.noMultiplier || false,
    };

    if (type.options) {
      newItem.subType = type.options[0].label;
      newItem.basePrice = type.options[0].price;
    }

    setSelectedItems([...selectedItems, newItem]);
  };

  const removeItem = (id: string) => {
    setSelectedItems(selectedItems.filter(item => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<CommissionItem>) => {
    setSelectedItems(selectedItems.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleCreateReceipt = () => {
    if (!clientName) {
      alert('กรุณาใส่ชื่อลูกค้า');
      return;
    }
    if (selectedItems.length === 0) {
      alert('กรุณาเลือกรายการงาน');
      return;
    }

    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 9),
      clientName,
      clientContact,
      contactType,
      items: [...selectedItems],
      multiplier,
      addOns: { ...addOns },
      totalPrice: calculateTotal(),
      date: new Date().toLocaleDateString('th-TH'),
      deadline: deadline,
      status: QueueStatus.AWAITING_DEPOSIT,
    };

    // 1. Optimistic UI Update
    setQueue([newOrder, ...queue]);
    
    // 2. Sync to Google Sheets
    syncAction('create', { order: newOrder });
    
    // 3. Show Receipt
    setCurrentOrder(newOrder);
    setShowReceipt(true);

    // 4. Reset Form
    setClientName('');
    setClientContact('');
    setContactType('Facebook');
    setDeadline('');
    setSelectedItems([]);
    setMultiplier(1);
    setAddOns({ propSmall: 0, propLarge: 0, customDesignPrice: 0 });
  };

  const updateQueueStatus = (id: string, status: QueueStatus) => {
    const order = queue.find(q => q.id === id);
    if (order) {
      const updatedOrder = { ...order, status };
      setQueue(queue.map(q => q.id === id ? updatedOrder : q));
      syncAction('update', { order: updatedOrder });
    }
  };

  const updateQueueDeadline = (id: string, newDeadline: string) => {
    const order = queue.find(q => q.id === id);
    if (order) {
      const updatedOrder = { ...order, deadline: newDeadline };
      setQueue(queue.map(q => q.id === id ? updatedOrder : q));
      syncAction('update', { order: updatedOrder });
    }
  };

  const moveToArchive = (id: string) => {
    const order = queue.find(q => q.id === id);
    if (order) {
      const archivedOrder = { ...order, status: QueueStatus.FINISHED };
      setArchive([archivedOrder, ...archive]);
      setQueue(queue.filter(q => q.id !== id));
      syncAction('archive', { id, order: archivedOrder });
    }
  };

  const deleteFromQueue = (id: string) => {
    if (confirm('ยืนยันการลบคิว?')) {
      setQueue(queue.filter(q => q.id !== id));
      syncAction('delete_queue', { id });
    }
  };

  const deleteFromArchive = (id: string) => {
    if (confirm('ยืนยันการลบประวัติ?')) {
      setArchive(archive.filter(a => a.id !== id));
      syncAction('delete_archive', { id });
    }
  };

  const saveAsImage = async () => {
    if (receiptRef.current) {
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: null,
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = `receipt-${currentOrder?.clientName || 'order'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const getMonthlyRevenue = () => {
    const revenue: Record<string, number> = {};
    archive.forEach(order => {
      const month = order.date.split('/')[1];
      const year = order.date.split('/')[2];
      const key = `${month}/${year}`;
      revenue[key] = (revenue[key] || 0) + order.totalPrice;
    });
    return revenue;
  };

  const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

  return (
    <div className="min-h-screen bg-[var(--color-bakery-bg)] text-[var(--color-bakery-text)] p-4 md:p-8 font-sans selection:bg-[var(--color-bakery-accent)] selection:text-white">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* --- Header Section --- */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-8 py-8 border-b border-[var(--color-bakery-border)]">
          <div className="space-y-2 text-center md:text-left">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-[var(--color-bakery-accent)]">
              COMMISSION MANAGER
            </h1>
            <p className="text-[var(--color-bakery-text)]/60 font-light tracking-widest uppercase text-xs">Professional Art Workflow System</p>
          </div>
          <div className="flex items-center gap-4">
            {isSyncing && (
              <span className="text-xs text-[var(--color-bakery-accent)] flex items-center gap-2 animate-pulse">
                <RefreshCw size={14} className="animate-spin" /> Syncing...
              </span>
            )}
            {!GOOGLE_SCRIPT_URL && (
              <div className="px-4 py-2 bg-red-100 text-red-600 rounded-xl text-xs font-bold border border-red-200 flex items-center gap-2">
                <Info size={16} /> Please Configure Google Sheets URL
              </div>
            )}
            <button 
              onClick={loadDataFromSheet}
              disabled={isLoading}
              className="px-4 py-2 bg-white border border-[var(--color-bakery-border)] rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-[var(--color-bakery-bg)] transition-colors shadow-sm disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} 
              Refresh Data
            </button>
          </div>
        </header>

        {/* --- Main Dashboard --- */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Selection Panel */}
          <section className="lg:col-span-8 space-y-8">
            <div className="bg-white shadow-sm border border-[var(--color-bakery-border)] rounded-3xl p-6 md:p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8 space-y-4 min-w-0">
                  <label className="text-xs font-bold uppercase tracking-widest text-[var(--color-bakery-text)]/60 flex items-center gap-2">
                    <User size={14} /> ชื่อลูกค้า
                  </label>
                  <input 
                    type="text" 
                    placeholder="ระบุชื่อลูกค้า..."
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-[var(--color-bakery-bg)] border border-[var(--color-bakery-border)] rounded-2xl px-4 py-3 focus:outline-none focus:border-[var(--color-bakery-accent)] transition-colors text-lg"
                  />
                </div>
                <div className="md:col-span-4 space-y-4 min-w-0">
                  <label className="text-xs font-bold uppercase tracking-widest text-[var(--color-bakery-text)]/60 flex items-center gap-2">
                    <Calendar size={14} /> กำหนดส่ง (Deadline)
                  </label>
                  <input 
                    type="date" 
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-[var(--color-bakery-bg)] border border-[var(--color-bakery-border)] rounded-2xl px-4 py-3 focus:outline-none focus:border-[var(--color-bakery-accent)] transition-colors text-sm"
                  />
                </div>
                <div className="md:col-span-12 space-y-4 min-w-0">
                  <label className="text-xs font-bold uppercase tracking-widest text-[var(--color-bakery-text)]/60 flex items-center gap-2">
                    <MessageSquare size={14} /> ช่องทางติดต่อ
                  </label>
                  <div className="flex gap-2">
                    <select 
                      value={contactType}
                      onChange={(e) => setContactType(e.target.value)}
                      className="bg-[var(--color-bakery-bg)] border border-[var(--color-bakery-border)] rounded-2xl px-3 py-3 focus:outline-none focus:border-[var(--color-bakery-accent)] transition-colors text-sm"
                    >
                      <option value="Facebook">Facebook</option>
                      <option value="X/Twitter">X/Twitter</option>
                      <option value="Discord">Discord</option>
                      <option value="VGen">VGen</option>
                      <option value="Other">Other</option>
                    </select>
                    <input 
                      type="text" 
                      placeholder="Username / Link..."
                      value={clientContact}
                      onChange={(e) => setClientContact(e.target.value)}
                      className="flex-1 bg-[var(--color-bakery-bg)] border border-[var(--color-bakery-border)] rounded-2xl px-4 py-3 focus:outline-none focus:border-[var(--color-bakery-accent)] transition-colors text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-4">
                <label className="text-xs font-bold uppercase tracking-widest text-[var(--color-bakery-text)]/60 flex items-center gap-2">
                  <Plus size={14} /> เลือกประเภทงาน
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {COMMISSION_TYPES.map(type => (
                    <button
                      key={type.id}
                      onClick={() => addItem(type.id)}
                      className="group relative bg-[var(--color-bakery-bg)] border border-[var(--color-bakery-border)] hover:border-[var(--color-bakery-accent)] rounded-2xl p-4 text-left transition-all hover:-translate-y-1 active:scale-95"
                    >
                      <span className="block text-sm font-medium mb-1">{type.name}</span>
                      <span className="text-[10px] text-[var(--color-bakery-text)]/50 uppercase tracking-tighter">
                        {type.isCustom ? 'Custom Price' : `Starting ฿${type.basePrice || type.options?.[0].price}`}
                      </span>
                      <Plus size={16} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-bakery-accent)]" />
                    </button>
                  ))}
                </div>
              </div>

              {selectedItems.length > 0 && (
                <div className="space-y-4 pt-8 border-t border-[var(--color-bakery-border)]">
                  <label className="text-xs font-bold uppercase tracking-widest text-[var(--color-bakery-text)]/60">รายการที่เลือก</label>
                  <div className="space-y-3">
                    <AnimatePresence>
                      {selectedItems.map((item) => (
                        <motion.div 
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[var(--color-bakery-bg)] border border-[var(--color-bakery-border)] rounded-2xl p-4"
                        >
                          <div className="flex-1 space-y-2">
                            <h4 className="font-semibold">{item.name}</h4>
                            <div className="flex flex-wrap gap-2">
                              {/* Sub-options for Chibi/Emote */}
                              {COMMISSION_TYPES.find(t => t.name === item.name)?.options && (
                                <select 
                                  value={item.subType}
                                  onChange={(e) => {
                                    const opt = COMMISSION_TYPES.find(t => t.name === item.name)?.options?.find(o => o.label === e.target.value);
                                    if (opt) updateItem(item.id, { subType: opt.label, basePrice: opt.price });
                                  }}
                                  className="bg-white border border-[var(--color-bakery-border)] rounded-lg px-2 py-1 text-xs focus:outline-none"
                                >
                                  {COMMISSION_TYPES.find(t => t.name === item.name)?.options?.map(o => (
                                    <option key={o.label} value={o.label}>{o.label} - ฿{o.price}</option>
                                  ))}
                                </select>
                              )}

                              {/* Full Body Option for Little Type */}
                              {COMMISSION_TYPES.find(t => t.name === item.name)?.hasFullBodyOption && (
                                <label className="flex items-center gap-2 text-xs cursor-pointer bg-white border border-[var(--color-bakery-border)] px-2 py-1 rounded-lg">
                                  <input 
                                    type="checkbox" 
                                    checked={item.isFullBody}
                                    onChange={(e) => updateItem(item.id, { isFullBody: e.target.checked })}
                                    className="accent-[var(--color-bakery-accent)]"
                                  />
                                  Full Body (x2)
                                </label>
                              )}

                              {/* Ai File Option for Logo */}
                              {COMMISSION_TYPES.find(t => t.name === item.name)?.hasAiOption && (
                                <label className="flex items-center gap-2 text-xs cursor-pointer bg-white border border-[var(--color-bakery-border)] px-2 py-1 rounded-lg">
                                  <input 
                                    type="checkbox" 
                                    checked={item.hasAiFile}
                                    onChange={(e) => updateItem(item.id, { hasAiFile: e.target.checked })}
                                    className="accent-[var(--color-bakery-accent)]"
                                  />
                                  ไฟล์ Ai (+฿300)
                                </label>
                              )}

                              {/* Custom Price for Video */}
                              {COMMISSION_TYPES.find(t => t.name === item.name)?.isCustom && (
                                <input 
                                  type="number"
                                  placeholder="ระบุราคา..."
                                  value={item.customPrice || ''}
                                  onChange={(e) => updateItem(item.id, { customPrice: Number(e.target.value) })}
                                  className="bg-white border border-[var(--color-bakery-border)] rounded-lg px-2 py-1 text-xs w-24 focus:outline-none"
                                />
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-mono text-lg font-bold text-[var(--color-bakery-accent)]">฿{
                              (item.customPrice || item.basePrice) * (item.isFullBody ? 2 : 1) + (item.hasAiFile ? 300 : 0)
                            }</span>
                            <button 
                              onClick={() => removeItem(item.id)}
                              className="p-2 hover:bg-red-50 text-[var(--color-bakery-text)]/40 hover:text-red-500 rounded-xl transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>

            {/* Add-ons & Multipliers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white shadow-sm border border-[var(--color-bakery-border)] rounded-3xl p-8 space-y-6">
                <label className="text-xs font-bold uppercase tracking-widest text-[var(--color-bakery-text)]/60 flex items-center gap-2">
                  <TrendingUp size={14} /> ตัวคูณ (Multipliers)
                </label>
                <div className="flex gap-2">
                  {[
                    { label: 'ปกติ', val: 1 },
                    { label: 'แจก (x1.5)', val: 1.5 },
                    { label: 'เชิงพาณิชย์ (x2)', val: 2 }
                  ].map(m => (
                    <button
                      key={m.val}
                      onClick={() => setMultiplier(m.val)}
                      className={cn(
                        "flex-1 py-3 rounded-2xl border transition-all text-sm font-medium",
                        multiplier === m.val 
                          ? "bg-[var(--color-bakery-accent)] text-white border-[var(--color-bakery-accent)]" 
                          : "bg-[var(--color-bakery-bg)] border-[var(--color-bakery-border)] hover:border-[var(--color-bakery-accent)]/50"
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[var(--color-bakery-text)]/40 italic">*ห้ามคูณกับ Emote และ Reactive GIF</p>
              </div>

              <div className="bg-white shadow-sm border border-[var(--color-bakery-border)] rounded-3xl p-8 space-y-6">
                <label className="text-xs font-bold uppercase tracking-widest text-[var(--color-bakery-text)]/60 flex items-center gap-2">
                  <Plus size={14} /> ส่วนเสริม (Add-ons)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-[10px] text-[var(--color-bakery-text)]/60 uppercase font-bold">Prop เล็ก (+10)</span>
                    <input 
                      type="number" 
                      min="0"
                      value={addOns.propSmall}
                      onChange={(e) => setAddOns({ ...addOns, propSmall: Number(e.target.value) })}
                      className="w-full bg-[var(--color-bakery-bg)] border border-[var(--color-bakery-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-bakery-accent)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] text-[var(--color-bakery-text)]/60 uppercase font-bold">Prop ใหญ่ (+20)</span>
                    <input 
                      type="number" 
                      min="0"
                      value={addOns.propLarge}
                      onChange={(e) => setAddOns({ ...addOns, propLarge: Number(e.target.value) })}
                      className="w-full bg-[var(--color-bakery-bg)] border border-[var(--color-bakery-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-bakery-accent)]"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] text-[var(--color-bakery-text)]/60 uppercase font-bold">Custom Design (50-100)</span>
                  <input 
                    type="number" 
                    placeholder="ระบุราคา..."
                    value={addOns.customDesignPrice || ''}
                    onChange={(e) => setAddOns({ ...addOns, customDesignPrice: Number(e.target.value) })}
                    className="w-full bg-[var(--color-bakery-bg)] border border-[var(--color-bakery-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-bakery-accent)]"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Right: Price Summary (Sticky) */}
          <aside className="lg:col-span-4 lg:sticky lg:top-8 space-y-6">
            <div className="bg-white rounded-3xl p-8 space-y-8 shadow-sm border border-[var(--color-bakery-border)]">
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-bakery-text)]/40">Price Summary</h3>
                <div className="flex items-baseline justify-between">
                  <span className="text-4xl font-bold tracking-tighter text-[var(--color-bakery-accent)]">฿{calculateTotal().toLocaleString()}</span>
                  <span className="text-sm font-medium opacity-60">Total Net</span>
                </div>
              </div>

              <div className="space-y-4 border-t border-[var(--color-bakery-border)] pt-6">
                <div className="flex justify-between text-sm">
                  <span className="opacity-60">มัดจำ (50%)</span>
                  <span className="font-bold">฿{(calculateTotal() / 2).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-60">ส่วนที่เหลือ (50%)</span>
                  <span className="font-bold">฿{(calculateTotal() / 2).toLocaleString()}</span>
                </div>
              </div>

              <button 
                onClick={handleCreateReceipt}
                className="w-full bg-[var(--color-bakery-accent)] text-white py-4 rounded-2xl font-bold text-lg hover:bg-[var(--color-bakery-accent-hover)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 shadow-md"
              >
                สร้างใบเสร็จ <ChevronRight size={20} />
              </button>
            </div>

            <div className="bg-white shadow-sm border border-[var(--color-bakery-border)] rounded-3xl p-6 flex items-start gap-4">
              <Info className="text-[var(--color-bakery-accent)] shrink-0" size={20} />
              <p className="text-xs text-[var(--color-bakery-text)]/60 leading-relaxed">
                ระบบจะบันทึกคิวงานลงใน LocalStorage อัตโนมัติเมื่อกดยืนยันใบเสร็จ ข้อมูลจะไม่หายเมื่อรีเฟรชหน้าจอ
              </p>
            </div>
          </aside>
        </main>

        {/* --- Queue Management --- */}
        <section className="space-y-8 pt-12 border-t border-[var(--color-bakery-border)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-3xl font-bold tracking-tight text-[var(--color-bakery-accent)]">คิวงานปัจจุบัน</h2>
              <p className="text-[var(--color-bakery-text)]/60 text-sm">จัดการสถานะและ Deadline ของลูกค้า</p>
            </div>
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-[var(--color-bakery-border)] shadow-sm">
              <Clock size={16} className="text-[var(--color-bakery-accent)]" />
              <span className="text-sm font-medium">{queue.length} งานในคิว</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-[var(--color-bakery-border)] bg-white shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-bakery-border)] text-[10px] uppercase tracking-widest text-[var(--color-bakery-text)]/60 bg-[var(--color-bakery-bg)]">
                  <th className="px-6 py-4 font-bold">ลูกค้า</th>
                  <th className="px-6 py-4 font-bold">ช่องทางติดต่อ</th>
                  <th className="px-6 py-4 font-bold">รายละเอียดงาน</th>
                  <th className="px-6 py-4 font-bold">Deadline</th>
                  <th className="px-6 py-4 font-bold">สถานะ</th>
                  <th className="px-6 py-4 font-bold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-bakery-border)]">
                {queue.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[var(--color-bakery-text)]/40 italic">ยังไม่มีคิวงานในขณะนี้</td>
                  </tr>
                ) : (
                  queue.map((order) => (
                    <tr key={order.id} className="hover:bg-[var(--color-bakery-bg)] transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold">{order.clientName}</div>
                        <div className="text-[10px] text-[var(--color-bakery-text)]/50">{order.date}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2 py-0.5 bg-[var(--color-bakery-bg)] border border-[var(--color-bakery-border)] rounded text-[10px] font-bold uppercase text-[var(--color-bakery-text)]/60">{order.contactType}</span>
                          <span className="text-[var(--color-bakery-text)]/80 truncate max-w-[120px]">{order.clientContact}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs truncate text-sm text-[var(--color-bakery-text)]/80">
                          {order.items.map(i => `${i.name}${i.subType ? ` (${i.subType})` : ''}`).join(', ')}
                        </div>
                        <div className="text-xs font-mono text-[var(--color-bakery-accent)] font-bold">฿{order.totalPrice.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="date" 
                          value={order.deadline}
                          onChange={(e) => updateQueueDeadline(order.id, e.target.value)}
                          className="bg-[var(--color-bakery-bg)] border border-[var(--color-bakery-border)] rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[var(--color-bakery-accent)]"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative inline-block">
                          <select 
                            value={order.status}
                            onChange={(e) => updateQueueStatus(order.id, e.target.value as QueueStatus)}
                            className={cn(
                              "appearance-none pl-4 pr-8 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider border focus:outline-none cursor-pointer transition-all shadow-sm",
                              STATUS_COLORS[order.status]
                            )}
                          >
                            {Object.values(QueueStatus).map(s => (
                              <option key={s} value={s} className="bg-white text-[var(--color-bakery-text)]">{s}</option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {order.status === QueueStatus.FINISHED && (
                            <button 
                              onClick={() => moveToArchive(order.id)}
                              className="p-2 bg-[#F0FFF0] text-[#556B2F] hover:bg-[#8FBC8F] hover:text-white rounded-lg transition-colors border border-[#8FBC8F]"
                              title="ย้ายไปคลังงานเสร็จ"
                            >
                              <Archive size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => deleteFromQueue(order.id)}
                            className="p-2 bg-[#FFE4E1] text-[#CD5C5C] hover:bg-[#CD5C5C] hover:text-white rounded-lg transition-colors border border-[#FFB6C1]"
                            title="ลบคิว"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* --- Archive & Revenue --- */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-12 border-t border-[var(--color-bakery-border)]">
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-1">
              <h2 className="text-3xl font-bold tracking-tight text-[var(--color-bakery-accent)]">คลังงานที่เสร็จแล้ว</h2>
              <p className="text-[var(--color-bakery-text)]/60 text-sm">ประวัติการทำงานทั้งหมด</p>
            </div>
            <div className="overflow-x-auto rounded-3xl border border-[var(--color-bakery-border)] bg-white shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-bakery-border)] text-[10px] uppercase tracking-widest text-[var(--color-bakery-text)]/60 bg-[var(--color-bakery-bg)]">
                    <th className="px-6 py-4 font-bold">ลูกค้า</th>
                    <th className="px-6 py-4 font-bold">ราคา</th>
                    <th className="px-6 py-4 font-bold">วันที่เสร็จ</th>
                    <th className="px-6 py-4 font-bold text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-bakery-border)]">
                  {archive.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-[var(--color-bakery-text)]/40 italic">ยังไม่มีประวัติงาน</td>
                    </tr>
                  ) : (
                    archive.map((order) => (
                      <tr key={order.id} className="hover:bg-[var(--color-bakery-bg)] transition-colors">
                        <td className="px-6 py-4 font-medium">{order.clientName}</td>
                        <td className="px-6 py-4 font-mono text-sm font-bold text-[var(--color-bakery-accent)]">฿{order.totalPrice.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-[var(--color-bakery-text)]/60">{order.date}</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => deleteFromArchive(order.id)}
                            className="p-2 text-[var(--color-bakery-text)]/40 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-1">
              <h2 className="text-3xl font-bold tracking-tight text-[var(--color-bakery-accent)]">สรุปรายรับ</h2>
              <p className="text-[var(--color-bakery-text)]/60 text-sm">แยกตามเดือนที่งานเสร็จ</p>
            </div>
            <div className="bg-white shadow-sm border border-[var(--color-bakery-border)] rounded-3xl p-6 space-y-4">
              {Object.keys(getMonthlyRevenue()).length === 0 ? (
                <p className="text-center text-[var(--color-bakery-text)]/40 py-8 italic">ยังไม่มีข้อมูลรายรับ</p>
              ) : (
                Object.entries(getMonthlyRevenue()).map(([key, amount]) => {
                  const [m, y] = key.split('/');
                  return (
                    <div key={key} className="flex items-center justify-between p-4 bg-[var(--color-bakery-bg)] rounded-2xl border border-[var(--color-bakery-border)]">
                      <div className="space-y-1">
                        <span className="text-xs text-[var(--color-bakery-text)]/60 uppercase font-bold">{monthNames[parseInt(m)-1]} {parseInt(y)+543}</span>
                        <div className="text-xl font-bold text-[var(--color-bakery-accent)]">฿{amount.toLocaleString()}</div>
                      </div>
                      <div className="p-3 bg-white rounded-xl text-[var(--color-bakery-accent)] shadow-sm border border-[var(--color-bakery-border)]">
                        <TrendingUp size={20} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* --- Footer --- */}
        <footer className="py-12 text-center border-t border-[var(--color-bakery-border)]">
          <p className="text-[var(--color-bakery-text)]/40 text-xs uppercase tracking-[0.5em]">© 2026 Art Commission Workflow System</p>
        </footer>
      </div>

      {/* --- Receipt Modal --- */}
      <AnimatePresence>
        {showReceipt && currentOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--color-bakery-text)]/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md"
            >
              <button 
                onClick={() => setShowReceipt(false)}
                className="absolute -top-12 right-0 text-white/80 hover:text-white transition-colors"
              >
                <X size={32} />
              </button>

              <div className="space-y-6">
                {/* The Actual Receipt for html2canvas */}
                <div 
                  ref={receiptRef}
                  className="zigzag-border p-10 text-[var(--color-bakery-text)] font-sans space-y-8 shadow-2xl"
                >
                  <div className="text-center space-y-2 border-b-2 border-dashed border-[var(--color-bakery-border)] pb-6">
                    <h2 className="text-2xl font-black tracking-tighter uppercase text-[var(--color-bakery-accent)]">Commission Receipt</h2>
                    <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Official Order Confirmation</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs font-bold uppercase tracking-wider">
                    <div className="space-y-1">
                      <span className="opacity-60 block">Customer</span>
                      <span>{currentOrder.clientName}</span>
                    </div>
                    <div className="space-y-1 text-right">
                      <span className="opacity-60 block">Date</span>
                      <span>{currentOrder.date}</span>
                    </div>
                  </div>

                  <div className="space-y-4 py-6 border-y-2 border-dashed border-[var(--color-bakery-border)]">
                    <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest block">Order Details</span>
                    <div className="space-y-3">
                      {currentOrder.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <div className="flex-1">
                            <div className="font-bold">{item.name}</div>
                            <div className="text-[10px] opacity-80">
                              {item.subType && `${item.subType} `}
                              {item.isFullBody && `+ Full Body `}
                              {item.hasAiFile && `+ Ai File `}
                              {!item.noMultiplier && currentOrder.multiplier > 1 && `(x${currentOrder.multiplier})`}
                            </div>
                          </div>
                          <span className="font-bold">฿{
                            ((item.customPrice || item.basePrice) * (item.isFullBody ? 2 : 1) + (item.hasAiFile ? 300 : 0)) * 
                            (item.noMultiplier ? 1 : currentOrder.multiplier)
                          }</span>
                        </div>
                      ))}
                      {(currentOrder.addOns.propSmall > 0 || currentOrder.addOns.propLarge > 0 || currentOrder.addOns.customDesignPrice > 0) && (
                        <div className="pt-2 space-y-1 border-t border-[var(--color-bakery-border)]">
                          {currentOrder.addOns.propSmall > 0 && (
                            <div className="flex justify-between text-[11px]">
                              <span className="opacity-80">Prop เล็ก (x{currentOrder.addOns.propSmall})</span>
                              <span className="font-bold">฿{currentOrder.addOns.propSmall * 10}</span>
                            </div>
                          )}
                          {currentOrder.addOns.propLarge > 0 && (
                            <div className="flex justify-between text-[11px]">
                              <span className="opacity-80">Prop ใหญ่ (x{currentOrder.addOns.propLarge})</span>
                              <span className="font-bold">฿{currentOrder.addOns.propLarge * 20}</span>
                            </div>
                          )}
                          {currentOrder.addOns.customDesignPrice > 0 && (
                            <div className="flex justify-between text-[11px]">
                              <span className="opacity-80">Custom Design</span>
                              <span className="font-bold">฿{currentOrder.addOns.customDesignPrice}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-black uppercase tracking-tighter">Total Net</span>
                      <span className="text-3xl font-black tracking-tighter text-[var(--color-bakery-accent)]">฿{currentOrder.totalPrice.toLocaleString()}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--color-bakery-border)]">
                      <div className="bg-[var(--color-bakery-bg)] p-3 rounded-xl space-y-1 border border-[var(--color-bakery-border)]">
                        <span className="text-[9px] font-bold opacity-60 uppercase block">Deposit (50%)</span>
                        <span className="text-sm font-black">฿{(currentOrder.totalPrice / 2).toLocaleString()}</span>
                      </div>
                      <div className="bg-[var(--color-bakery-bg)] p-3 rounded-xl space-y-1 border border-[var(--color-bakery-border)]">
                        <span className="text-[9px] font-bold opacity-60 uppercase block">Balance (50%)</span>
                        <span className="text-sm font-black">฿{(currentOrder.totalPrice / 2).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="text-center pt-4">
                      <p className="text-[10px] font-bold opacity-60 uppercase tracking-[0.3em]">Thank you for your order</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={saveAsImage}
                    className="flex-1 bg-white text-[var(--color-bakery-text)] border border-[var(--color-bakery-border)] py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[var(--color-bakery-bg)] transition-all shadow-sm"
                  >
                    <Download size={20} /> Save as Image
                  </button>
                  <button 
                    onClick={() => setShowReceipt(false)}
                    className="flex-1 bg-[var(--color-bakery-accent)] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[var(--color-bakery-accent-hover)] transition-all shadow-md"
                  >
                    <CheckCircle2 size={20} /> ปิดหน้าต่าง
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
