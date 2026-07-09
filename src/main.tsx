import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Boxes,
  Camera,
  CheckCircle2,
  ClipboardList,
  Edit3,
  History,
  ImagePlus,
  Loader2,
  Minus,
  PackageCheck,
  PackagePlus,
  Plus,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import { Category, LiteratureItem, MovementType, StockMovement } from './types';
import { loadItems, loadMovements, resetDemoData, saveItems, saveMovements } from './lib/storage';
import './styles.css';

const categories: Array<'All' | Category> = [
  'All',
  'Bibles',
  'Books',
  'Brochures and Booklets',
  'Forms and Supplies',
  'Tracts',
  'Public Magazines'
];

const emptyForm: Omit<LiteratureItem, 'id' | 'createdAt' | 'updatedAt'> = {
  title: '',
  code: '',
  category: 'Books',
  quantity: 0,
  lowStockThreshold: 10,
  language: 'Tamil',
  coverImage: ''
};

type PackingRow = {
  id: string;
  title: string;
  code: string;
  quantity: number;
  category: Category;
  matchedItemId?: string;
  confidenceNote: string;
};

function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

function hasTamil(text: string) {
  return /[\u0B80-\u0BFF]/.test(text);
}

function cleanLine(line: string) {
  return line.replace(/[|•·]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractCode(text: string) {
  const matches = text.match(/\b[a-z]{1,8}[-–—]?(?:TL|TA|TAM|E)\b/gi);
  if (!matches?.length) return '';
  return matches[0].replace(/[–—]/g, '-');
}

function inferCategory(text: string): Category {
  const lower = text.toLowerCase();
  if (lower.includes('bible') || lower.includes('nwt') || lower.includes('பைபிள்')) return 'Bibles';
  if (lower.includes('tract') || lower.includes('துண்டுப்பிரதி')) return 'Tracts';
  if (lower.includes('magazine') || lower.includes('watchtower') || lower.includes('awake')) return 'Public Magazines';
  if (lower.includes('form') || lower.includes('supply')) return 'Forms and Supplies';
  if (lower.includes('brochure') || lower.includes('booklet')) return 'Brochures and Booklets';
  return 'Books';
}

function inferTitleFromText(text: string) {
  const lines = text.split(/\r?\n/).map(cleanLine).filter(line => line.length > 2);
  const tamilLines = lines.filter(line => hasTamil(line) && !/\d{2,}/.test(line));
  const candidates = tamilLines.length ? tamilLines : lines.filter(line => !extractCode(line) && !/^\d+$/.test(line));
  return candidates.sort((a, b) => b.length - a.length)[0] || lines[0] || '';
}

function findMatchingItem(items: LiteratureItem[], row: Pick<PackingRow, 'code' | 'title'>) {
  const code = row.code.trim().toLowerCase();
  const title = row.title.trim().toLowerCase();
  if (code) {
    const byCode = items.find(item => item.code.toLowerCase() === code);
    if (byCode) return byCode;
  }
  if (title.length >= 6) {
    return items.find(item => item.title.toLowerCase().includes(title.slice(0, 12)) || title.includes(item.title.toLowerCase().slice(0, 12)));
  }
  return undefined;
}

function parsePackingRows(text: string, items: LiteratureItem[]): PackingRow[] {
  const lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const rows: PackingRow[] = [];

  for (const line of lines) {
    const quantityMatch = line.match(/(?:^|\s)(\d{1,4})(?:\s*(?:x|pcs|copies|qty|quantity|எண்ணிக்கை))?\s*$/i) || line.match(/(?:qty|quantity|copies|pcs)\s*[:\-]?\s*(\d{1,4})/i);
    const code = extractCode(line);
    const likelyItem = items.find(item => line.toLowerCase().includes(item.code.toLowerCase()) || line.includes(item.title.slice(0, 8)));

    if (!quantityMatch && !code && !likelyItem) continue;

    const quantity = Number(quantityMatch?.[1] ?? 1);
    const titleFromLine = cleanLine(
      line
        .replace(/(?:qty|quantity|copies|pcs)\s*[:\-]?\s*\d{1,4}/gi, '')
        .replace(/\b\d{1,4}\s*(?:x|pcs|copies)?\s*$/i, '')
        .replace(code, '')
    );

    const matched = likelyItem || findMatchingItem(items, { code, title: titleFromLine });
    const title = matched?.title || titleFromLine || 'New literature item';
    const finalCode = matched?.code || code || `new-${rows.length + 1}`;

    rows.push({
      id: uid('pack'),
      title,
      code: finalCode,
      quantity: Math.max(1, quantity),
      category: matched?.category || inferCategory(`${line} ${title}`),
      matchedItemId: matched?.id,
      confidenceNote: matched ? 'Matched existing item' : 'New item — check details before applying'
    });
  }

  if (rows.length === 0 && text.trim()) {
    rows.push({
      id: uid('pack'),
      title: inferTitleFromText(text) || 'New literature item',
      code: extractCode(text) || 'new-1',
      quantity: 1,
      category: inferCategory(text),
      confidenceNote: 'OCR found text but could not read a clear quantity'
    });
  }

  return rows;
}

async function extractTextFromImage(file: File, onProgress: (message: string) => void) {
  onProgress('Loading Tamil OCR engine...');
  const Tesseract: any = await import('tesseract.js');
  const result = await Tesseract.recognize(file, 'tam+eng', {
    logger: (m: any) => {
      if (m.status) {
        const percent = typeof m.progress === 'number' ? ` ${Math.round(m.progress * 100)}%` : '';
        onProgress(`${m.status}${percent}`);
      }
    }
  });
  return String(result?.data?.text || '').trim();
}

function App() {
  const [tab, setTab] = useState<'dashboard' | 'literature' | 'packing'>('dashboard');
  const [items, setItems] = useState<LiteratureItem[]>(loadItems);
  const [movements, setMovements] = useState<StockMovement[]>(loadMovements);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'All' | Category>('All');
  const [editing, setEditing] = useState<LiteratureItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [stockItemId, setStockItemId] = useState('');
  const [stockQuantity, setStockQuantity] = useState(1);
  const [stockType, setStockType] = useState<MovementType>('give_out');
  const [stockNotes, setStockNotes] = useState('');
  const [command, setCommand] = useState('');
  const [selectedItem, setSelectedItem] = useState<LiteratureItem | null>(null);
  const [popupType, setPopupType] = useState<MovementType>('give_out');
  const [popupQuantity, setPopupQuantity] = useState(1);
  const [popupNotes, setPopupNotes] = useState('');
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrText, setOcrText] = useState('');
  const [packingImage, setPackingImage] = useState('');
  const [packingRows, setPackingRows] = useState<PackingRow[]>([]);
  const [packingStatus, setPackingStatus] = useState('');
  const [packingRawText, setPackingRawText] = useState('');

  const totalStock = items.reduce((sum, item) => sum + item.quantity, 0);
  const lowStock = items.filter(item => item.quantity <= item.lowStockThreshold);
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(item => {
      const matchesCategory = category === 'All' || item.category === category;
      const matchesQuery = !q || [item.title, item.code, item.category, item.language].some(v => v.toLowerCase().includes(q));
      return matchesCategory && matchesQuery;
    });
  }, [items, query, category]);

  function persist(nextItems: LiteratureItem[], nextMovements = movements) {
    setItems(nextItems);
    setMovements(nextMovements);
    saveItems(nextItems);
    saveMovements(nextMovements);
  }

  function beginAdd() {
    setEditing(null);
    setForm(emptyForm);
    setTab('literature');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function beginEdit(item: LiteratureItem) {
    setEditing(item);
    setForm({
      title: item.title,
      code: item.code,
      category: item.category,
      quantity: item.quantity,
      lowStockThreshold: item.lowStockThreshold,
      language: item.language,
      coverImage: item.coverImage || ''
    });
    setTab('literature');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function saveLiterature(event: React.FormEvent) {
    event.preventDefault();
    const now = new Date().toISOString();
    if (editing) {
      const next = items.map(item => item.id === editing.id ? { ...item, ...form, updatedAt: now } : item);
      persist(next);
      setEditing(null);
    } else {
      const newItem: LiteratureItem = {
        id: uid('lit'),
        ...form,
        quantity: Number(form.quantity),
        lowStockThreshold: Number(form.lowStockThreshold),
        createdAt: now,
        updatedAt: now
      };
      persist([newItem, ...items]);
    }
    setForm(emptyForm);
    setOcrText('');
    setOcrStatus('');
  }

  function deleteItem(id: string) {
    const nextItems = items.filter(item => item.id !== id);
    const nextMovements = movements.filter(movement => movement.itemId !== id);
    persist(nextItems, nextMovements);
  }

  function recordStock(itemId: string, type: MovementType, quantity: number, notes = '') {
    const target = items.find(item => item.id === itemId);
    if (!target || quantity <= 0) return;
    const before = target.quantity;
    const delta = type === 'give_out' ? -quantity : quantity;
    const after = Math.max(0, before + delta);
    const actualDelta = after - before;
    const now = new Date().toISOString();
    const nextItem = { ...target, quantity: after, updatedAt: now };
    const nextItems = items.map(item => item.id === itemId ? nextItem : item);
    const movement: StockMovement = {
      id: uid('movement'),
      itemId: target.id,
      itemTitle: target.title,
      itemCode: target.code,
      type,
      quantityChange: actualDelta,
      quantityBefore: before,
      quantityAfter: after,
      notes,
      createdBy: 'Current User',
      createdAt: now
    };
    persist(nextItems, [movement, ...movements]);
  }

  function handleStockSubmit(event: React.FormEvent) {
    event.preventDefault();
    recordStock(stockItemId, stockType, Number(stockQuantity), stockNotes);
    setStockNotes('');
    setStockQuantity(1);
  }

  function openStockPopup(item: LiteratureItem, type: MovementType = 'give_out') {
    setSelectedItem(item);
    setPopupType(type);
    setPopupQuantity(1);
    setPopupNotes('');
  }

  function closeStockPopup() {
    setSelectedItem(null);
    setPopupQuantity(1);
    setPopupNotes('');
  }

  function handlePopupStockSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedItem) return;
    recordStock(selectedItem.id, popupType, Number(popupQuantity), popupNotes);
    closeStockPopup();
  }

  function handleCommand(event: React.FormEvent) {
    event.preventDefault();
    const text = command.toLowerCase();
    const quantity = Number(text.match(/\d+/)?.[0] ?? 1);
    const type: MovementType = text.includes('restock') || text.includes('add') ? 'restock' : 'give_out';
    const target = items.find(item => text.includes(item.code.toLowerCase()) || text.includes(item.title.toLowerCase().slice(0, 10)) || text.includes(item.category.toLowerCase()));
    if (target) {
      recordStock(target.id, type, quantity, `AI command: ${command}`);
      setCommand('');
    } else {
      alert('Could not match the command to a literature item. Try using the exact code, e.g. "give out 3 nwt-TL".');
    }
  }

  function handleImage(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(prev => ({ ...prev, coverImage: String(reader.result) }));
    reader.readAsDataURL(file);
  }

  async function handleImageWithOcr(file?: File) {
    if (!file) return;
    handleImage(file);
    try {
      setOcrText('');
      const text = await extractTextFromImage(file, setOcrStatus);
      setOcrText(text);
      setForm(prev => ({
        ...prev,
        title: prev.title || inferTitleFromText(text),
        code: prev.code || extractCode(text),
        category: inferCategory(text)
      }));
      setOcrStatus(text ? 'OCR complete — check the extracted fields before saving.' : 'OCR finished but no clear text was found.');
    } catch (error) {
      console.error(error);
      setOcrStatus('OCR failed. You can still enter the details manually.');
    }
  }

  async function handlePackingImage(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPackingImage(String(reader.result));
    reader.readAsDataURL(file);

    try {
      setPackingRows([]);
      setPackingRawText('');
      const text = await extractTextFromImage(file, setPackingStatus);
      setPackingRawText(text);
      const rows = parsePackingRows(text, items);
      setPackingRows(rows);
      setPackingStatus(rows.length ? 'Packing list scanned — review before applying stock.' : 'OCR complete, but no clear stock rows were found.');
    } catch (error) {
      console.error(error);
      setPackingStatus('Packing-list OCR failed. Try a clearer photo or enter the stock manually.');
    }
  }

  function updatePackingRow(rowId: string, patch: Partial<PackingRow>) {
    setPackingRows(rows => rows.map(row => row.id === rowId ? { ...row, ...patch } : row));
  }

  function removePackingRow(rowId: string) {
    setPackingRows(rows => rows.filter(row => row.id !== rowId));
  }

  function addManualPackingRow() {
    setPackingRows(rows => [{
      id: uid('pack'),
      title: '',
      code: '',
      quantity: 1,
      category: 'Books',
      confidenceNote: 'Manual row'
    }, ...rows]);
  }

  function applyPackingList() {
    if (packingRows.length === 0) return;
    const now = new Date().toISOString();
    let nextItems = [...items];
    const newMovements: StockMovement[] = [];

    for (const row of packingRows) {
      const quantity = Number(row.quantity);
      if (!row.title.trim() || !row.code.trim() || quantity <= 0) continue;

      const existing = row.matchedItemId
        ? nextItems.find(item => item.id === row.matchedItemId)
        : findMatchingItem(nextItems, row);

      if (existing) {
        const before = existing.quantity;
        const after = before + quantity;
        nextItems = nextItems.map(item => item.id === existing.id ? { ...item, quantity: after, updatedAt: now } : item);
        newMovements.push({
          id: uid('movement'),
          itemId: existing.id,
          itemTitle: existing.title,
          itemCode: existing.code,
          type: 'restock',
          quantityChange: quantity,
          quantityBefore: before,
          quantityAfter: after,
          notes: 'Received from packing list scan',
          createdBy: 'Current User',
          createdAt: now
        });
      } else {
        const newItem: LiteratureItem = {
          id: uid('lit'),
          title: row.title.trim(),
          code: row.code.trim(),
          category: row.category,
          quantity,
          lowStockThreshold: 10,
          language: hasTamil(row.title) ? 'Tamil' : 'Tamil',
          coverImage: '',
          createdAt: now,
          updatedAt: now
        };
        nextItems = [newItem, ...nextItems];
        newMovements.push({
          id: uid('movement'),
          itemId: newItem.id,
          itemTitle: newItem.title,
          itemCode: newItem.code,
          type: 'restock',
          quantityChange: quantity,
          quantityBefore: 0,
          quantityAfter: quantity,
          notes: 'New item created from packing list scan',
          createdBy: 'Current User',
          createdAt: now
        });
      }
    }

    persist(nextItems, [...newMovements, ...movements]);
    setPackingStatus(`Applied ${newMovements.length} stock update${newMovements.length === 1 ? '' : 's'}.`);
    setPackingRows([]);
  }

  function hardReset() {
    resetDemoData();
    const nextItems = loadItems();
    const nextMovements = loadMovements();
    setItems(nextItems);
    setMovements(nextMovements);
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Shared congregation inventory</p>
          <h1>Literature Stock</h1>
          <p className="muted">Track Tamil literature, stock movements, low-stock warnings and packing preparation.</p>
        </div>
        <button className="ghost" onClick={hardReset}><RotateCcw size={16} /> Reset demo data</button>
      </header>

      {tab === 'dashboard' && (
        <section className="page-grid">
          <section className="stats-grid">
            <Stat icon={<Boxes />} label="Total items" value={items.length} />
            <Stat icon={<BookOpen />} label="Total stock" value={totalStock} />
            <Stat icon={<AlertTriangle />} label="Low stock" value={lowStock.length} danger={lowStock.length > 0} />
          </section>

          <form className="card command-card" onSubmit={handleCommand}>
            <div className="section-title"><Sparkles size={18} /> AI-style command</div>
            <div className="command-row">
              <input value={command} onChange={e => setCommand(e.target.value)} placeholder="Example: give out 3 nwt-TL" />
              <button type="submit">Run</button>
            </div>
            <p className="hint">This starter uses a simple parser. You can connect OpenAI later for flexible natural language actions.</p>
          </form>

          <section className="card">
            <div className="section-title"><BookOpen size={18} /> Tap an item to update stock</div>
            <div className="main-literature-grid">
              {items.map(item => (
                <button className="main-lit-card" key={item.id} onClick={() => openStockPopup(item, 'give_out')}>
                  <div className="main-cover">{item.coverImage ? <img src={item.coverImage} alt={item.title} /> : <BookOpen size={44} />}</div>
                  <div className="main-lit-details">
                    <strong>{item.title}</strong>
                    <span>{item.code}</span>
                    <em>{item.quantity} in stock</em>
                  </div>
                </button>
              ))}
            </div>
            <p className="hint tap-hint">Tap a cover to record “how many have you given out?”. Use the Literature tab to add or edit images.</p>
          </section>

          <form className="card" onSubmit={handleStockSubmit}>
            <div className="section-title"><PackagePlus size={18} /> Manual stock action</div>
            <div className="form-grid compact">
              <label>Item
                <select value={stockItemId} onChange={e => setStockItemId(e.target.value)} required>
                  <option value="">Choose item</option>
                  {items.map(item => <option key={item.id} value={item.id}>{item.code} — {item.title}</option>)}
                </select>
              </label>
              <label>Action
                <select value={stockType} onChange={e => setStockType(e.target.value as MovementType)}>
                  <option value="give_out">Give out</option>
                  <option value="restock">Restock</option>
                </select>
              </label>
              <label>Quantity
                <input type="number" min={1} value={stockQuantity} onChange={e => setStockQuantity(Number(e.target.value))} />
              </label>
              <label>Notes
                <input value={stockNotes} onChange={e => setStockNotes(e.target.value)} placeholder="Optional" />
              </label>
            </div>
            <button type="submit">Save stock movement</button>
          </form>

          {lowStock.length > 0 && (
            <section className="card danger-card">
              <div className="section-title"><AlertTriangle size={18} /> Low-stock alert</div>
              <div className="stock-list">
                {lowStock.map(item => (
                  <div className="stock-row" key={item.id}>
                    <span>{item.code} — {item.title}</span>
                    <strong>{item.quantity} left</strong>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="card">
            <div className="section-title"><History size={18} /> Recent activity</div>
            <div className="activity-list">
              {movements.slice(0, 8).map(movement => <MovementRow key={movement.id} movement={movement} />)}
            </div>
          </section>
        </section>
      )}

      {tab === 'literature' && (
        <section className="page-grid">
          <LiteratureForm
            editing={editing}
            form={form}
            setForm={setForm}
            onSubmit={saveLiterature}
            onCancel={() => { setEditing(null); setForm(emptyForm); setOcrText(''); setOcrStatus(''); }}
            onImage={handleImage}
            onImageWithOcr={handleImageWithOcr}
            ocrStatus={ocrStatus}
            ocrText={ocrText}
          />

          <section className="card">
            <div className="toolbar">
              <div className="search-wrap"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by title, code, language or category" /></div>
              <button onClick={beginAdd}><Plus size={16} /> Add</button>
            </div>
            <div className="chips">
              {categories.map(c => <button key={c} onClick={() => setCategory(c)} className={category === c ? 'chip active' : 'chip'}>{c}</button>)}
            </div>
            {filteredItems.length === 0 ? (
              <div className="empty-state">No literature matches this search or filter.</div>
            ) : (
              <div className="literature-grid">
                {filteredItems.map(item => (
                  <article className="lit-card" key={item.id}>
                    <div className="cover">{item.coverImage ? <img src={item.coverImage} alt="Cover" /> : <BookOpen size={42} />}</div>
                    <div className="lit-body">
                      <h3>{item.title}</h3>
                      <p className="code">{item.code}</p>
                      <div className="lit-meta"><span>{item.category}</span><strong>{item.quantity} in stock</strong></div>
                      <div className="card-actions">
                        <button className="ghost" onClick={() => openStockPopup(item, 'give_out')}><Minus size={15} /> Give out</button>
                        <button className="ghost" onClick={() => beginEdit(item)}><Edit3 size={15} /> Edit</button>
                        <button className="ghost danger-text" onClick={() => deleteItem(item.id)}><Trash2 size={15} /> Delete</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      )}

      {tab === 'packing' && (
        <PackingListPage
          rows={packingRows}
          setRows={setPackingRows}
          status={packingStatus}
          rawText={packingRawText}
          image={packingImage}
          onImage={handlePackingImage}
          onApply={applyPackingList}
          onAddRow={addManualPackingRow}
          onUpdateRow={updatePackingRow}
          onRemoveRow={removePackingRow}
        />
      )}

      {selectedItem && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="stock-modal" onSubmit={handlePopupStockSubmit}>
            <button type="button" className="modal-close" onClick={closeStockPopup} aria-label="Close"><X size={18} /></button>
            <div className="modal-cover">{selectedItem.coverImage ? <img src={selectedItem.coverImage} alt={selectedItem.title} /> : <BookOpen size={52} />}</div>
            <h2>{selectedItem.title}</h2>
            <p className="code">{selectedItem.code} · {selectedItem.quantity} currently in stock</p>
            <label>What happened?
              <select value={popupType} onChange={e => setPopupType(e.target.value as MovementType)}>
                <option value="give_out">Given out</option>
                <option value="restock">Restocked</option>
              </select>
            </label>
            <label>{popupType === 'give_out' ? 'How many have you given out?' : 'How many are you adding?'}
              <input autoFocus type="number" min={1} max={popupType === 'give_out' ? selectedItem.quantity : undefined} value={popupQuantity} onChange={e => setPopupQuantity(Number(e.target.value))} />
            </label>
            <label>Notes
              <input value={popupNotes} onChange={e => setPopupNotes(e.target.value)} placeholder="Optional" />
            </label>
            <button type="submit">Save</button>
          </form>
        </div>
      )}

      <nav className="bottom-nav">
        <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}><BarChart3 size={18} /> Dashboard</button>
        <button className={tab === 'literature' ? 'active' : ''} onClick={() => setTab('literature')}><BookOpen size={18} /> Literature</button>
        <button className={tab === 'packing' ? 'active' : ''} onClick={() => setTab('packing')}><PackageCheck size={18} /> Packing List</button>
      </nav>
    </main>
  );
}

function Stat({ icon, label, value, danger = false }: { icon: React.ReactNode; label: string; value: number; danger?: boolean }) {
  return <div className={`stat ${danger ? 'danger' : ''}`}><div>{icon}</div><span>{label}</span><strong>{value}</strong></div>;
}

function MovementRow({ movement }: { movement: StockMovement }) {
  const isOut = movement.quantityChange < 0;
  return (
    <div className="movement-row">
      <div className={isOut ? 'movement-icon out' : 'movement-icon in'}>{isOut ? <Minus size={14} /> : <Plus size={14} />}</div>
      <div>
        <strong>{movement.itemCode}</strong> {isOut ? 'given out' : 'restocked'} {Math.abs(movement.quantityChange)}
        <p>{movement.itemTitle}</p>
      </div>
      <span>{new Date(movement.createdAt).toLocaleDateString()}</span>
    </div>
  );
}

function LiteratureForm({ editing, form, setForm, onSubmit, onCancel, onImage, onImageWithOcr, ocrStatus, ocrText }: {
  editing: LiteratureItem | null;
  form: Omit<LiteratureItem, 'id' | 'createdAt' | 'updatedAt'>;
  setForm: React.Dispatch<React.SetStateAction<Omit<LiteratureItem, 'id' | 'createdAt' | 'updatedAt'>>>;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
  onImage: (file?: File) => void;
  onImageWithOcr: (file?: File) => void;
  ocrStatus: string;
  ocrText: string;
}) {
  return (
    <form className="card" onSubmit={onSubmit}>
      <div className="section-title"><ClipboardList size={18} /> {editing ? 'Edit literature' : 'Add literature'}</div>
      <div className="form-grid">
        <label>Title
          <input value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} required />
        </label>
        <label>Code
          <input value={form.code} onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))} placeholder="e.g. nwt-TL" required />
        </label>
        <label>Category
          <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value as Category }))}>
            {categories.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>Language
          <input value={form.language} onChange={e => setForm(prev => ({ ...prev, language: e.target.value }))} />
        </label>
        <label>Quantity
          <input type="number" min={0} value={form.quantity} onChange={e => setForm(prev => ({ ...prev, quantity: Number(e.target.value) }))} />
        </label>
        <label>Low-stock threshold
          <input type="number" min={0} value={form.lowStockThreshold} onChange={e => setForm(prev => ({ ...prev, lowStockThreshold: Number(e.target.value) }))} />
        </label>
      </div>
      <div className="upload-actions">
        <label className="image-uploader">
          <ImagePlus size={18} /> Upload cover only
          <input type="file" accept="image/*" capture="environment" onChange={e => onImage(e.target.files?.[0])} />
        </label>
        <label className="image-uploader strong-upload">
          <Camera size={18} /> Take/upload and extract Tamil title
          <input type="file" accept="image/*" capture="environment" onChange={e => onImageWithOcr(e.target.files?.[0])} />
        </label>
      </div>
      {ocrStatus && <p className="ocr-status"><Loader2 size={14} /> {ocrStatus}</p>}
      {ocrText && <details className="ocr-details"><summary>View extracted OCR text</summary><pre>{ocrText}</pre></details>}
      {form.coverImage && <img className="preview" src={form.coverImage} alt="Cover preview" />}
      <div className="form-actions">
        <button type="submit"><Save size={16} /> {editing ? 'Save changes' : 'Add literature'}</button>
        {editing && <button type="button" className="ghost" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

function PackingListPage({ rows, status, rawText, image, onImage, onApply, onAddRow, onUpdateRow, onRemoveRow }: {
  rows: PackingRow[];
  status: string;
  rawText: string;
  image: string;
  onImage: (file?: File) => void;
  onApply: () => void;
  onAddRow: () => void;
  onUpdateRow: (rowId: string, patch: Partial<PackingRow>) => void;
  onRemoveRow: (rowId: string) => void;
}) {
  return (
    <section className="page-grid">
      <section className="card packing-hero">
        <div className="section-title"><PackageCheck size={18} /> Packing List</div>
        <p className="muted">Take or upload a photo of received literature. The app reads Tamil/English text, matches existing items, and prepares stock increases for review.</p>
        <label className="image-uploader strong-upload wide-upload">
          <Camera size={18} /> Take/upload packing-list image
          <input type="file" accept="image/*" capture="environment" onChange={e => onImage(e.target.files?.[0])} />
        </label>
        {status && <p className="ocr-status"><Loader2 size={14} /> {status}</p>}
        {image && <img className="packing-preview" src={image} alt="Packing list preview" />}
      </section>

      <section className="card">
        <div className="toolbar packing-toolbar">
          <div>
            <div className="section-title compact-title"><ClipboardList size={18} /> Review stock updates</div>
            <p className="hint">Nothing is changed until you press Apply. Fix titles, codes, categories or quantities first.</p>
          </div>
          <button className="ghost" onClick={onAddRow}><Plus size={16} /> Add row</button>
        </div>

        {rows.length === 0 ? (
          <div className="empty-state">Scan a packing list image or add a manual row.</div>
        ) : (
          <div className="packing-table">
            {rows.map(row => (
              <div className="packing-row" key={row.id}>
                <label>Title
                  <input value={row.title} onChange={e => onUpdateRow(row.id, { title: e.target.value })} placeholder="Tamil title" />
                </label>
                <label>Code
                  <input value={row.code} onChange={e => onUpdateRow(row.id, { code: e.target.value })} placeholder="e.g. lff-TL" />
                </label>
                <label>Qty received
                  <input type="number" min={1} value={row.quantity} onChange={e => onUpdateRow(row.id, { quantity: Number(e.target.value) })} />
                </label>
                <label>Category
                  <select value={row.category} onChange={e => onUpdateRow(row.id, { category: e.target.value as Category })}>
                    {categories.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                  </select>
                </label>
                <div className="packing-note">
                  <span>{row.confidenceNote}</span>
                  <button className="ghost danger-text" onClick={() => onRemoveRow(row.id)}><X size={15} /> Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="form-actions">
          <button type="button" onClick={onApply} disabled={rows.length === 0}><CheckCircle2 size={16} /> Apply received stock</button>
        </div>
      </section>

      {rawText && (
        <details className="card ocr-details block-details">
          <summary>View raw OCR text</summary>
          <pre>{rawText}</pre>
        </details>
      )}
    </section>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
