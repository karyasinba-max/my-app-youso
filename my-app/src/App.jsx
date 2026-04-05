import { useState, useRef, useCallback, useEffect } from "react";

/* ════════════════════════ Helpers ════════════════════════ */
let _id = Date.now();
const uid = (pfx = "x") => `${pfx}_${_id++}`;

const DEFAULT_COLORS = ["#FFD6E8", "#FFD5B8", "#FFF3A3", "#D4F0C0", "#C4EEFF", "#E1D6FF"];
const DEFAULT_COLS = ["場所","動機","売り","感情"];
const COL_MIN_W = 100;
const COL_MAX_W = 500;
const DEFAULT_W = 170;

function emptyScene(cols) {
  const cells = {};
  cols.forEach(c => (cells[c] = ""));
  return { id: uid("s"), cells, bgColors: {} };
}

function newProject(name = "新規プロジェクト") {
  const cols = [...DEFAULT_COLS];
  return {
    id: uid("p"), name, columns: cols,
    colWidths: {}, scenes: [emptyScene(cols), emptyScene(cols), emptyScene(cols)],
    createdAt: Date.now(), updatedAt: Date.now(),
  };
}

/* ════════════════════ Storage ═══════════════════════ */
async function storeSet(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.error("Save failed:", e); }
}
async function storeGet(k) {
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch (e) { console.error("Load failed:", e); return null; }
}
async function storeDel(k) {
  try { localStorage.removeItem(k); } catch (e) { console.error("Delete failed:", e); }
}
async function storeList(pfx) {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(pfx)) keys.push(key);
    }
    return keys;
  } catch (e) {
    console.error("List failed:", e);
    return [];
  }
}

/* ════════════════════ GripIcon ═════════════════════ */
const Grip = ({ size = 14, style }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={style}>
    <circle cx="5" cy="3" r="1.2" fill="currentColor"/><circle cx="11" cy="3" r="1.2" fill="currentColor"/>
    <circle cx="5" cy="8" r="1.2" fill="currentColor"/><circle cx="11" cy="8" r="1.2" fill="currentColor"/>
    <circle cx="5" cy="13" r="1.2" fill="currentColor"/><circle cx="11" cy="13" r="1.2" fill="currentColor"/>
  </svg>
);

/* ══════════════ RichCell (contentEditable) ═════════════ */
function RichCell({ html, onChange, onFocusCell, placeholder, bgColor }) {
  const elRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const lastHtml = useRef(html);

  useEffect(() => {
    if (!focused && elRef.current && elRef.current.innerHTML !== html) {
      elRef.current.innerHTML = html || "";
      lastHtml.current = html;
    }
  }, [html, focused]);

  const handleBlur = () => {
    setFocused(false);
    const cur = elRef.current?.innerHTML || "";
    if (cur !== lastHtml.current) { lastHtml.current = cur; onChange(cur); }
    onFocusCell?.(null);
  };

  const textOnly = html ? html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, "").trim() : "";
  const empty = !textOnly;
  const hasBg = !!bgColor && bgColor !== "transparent";

  return (
    <div className="rich-cell-wrap" data-placeholder={!focused && empty ? (placeholder || "—") : undefined}>
      <div
        ref={elRef}
        className={"rich-cell" + (focused ? " editing" : "") + (hasBg ? " has-bg" : "")}
        style={hasBg ? { backgroundColor: bgColor } : undefined}
        contentEditable
        suppressContentEditableWarning
        onFocus={() => { setFocused(true); onFocusCell?.(elRef); }}
        onBlur={handleBlur}
      />
    </div>
  );
}

/* ═══════════════ FormatBar ══════════════════ */
function FormatBar({ visible, onColorSelect, customColors }) {
  return (
    <div className={"fmt-bar" + (visible ? " show" : "")}>
      <span style={{ fontSize: "12px", color: "var(--text-muted)", marginRight: "8px" }}>背景色:</span>
      <button className="fmt-color" style={{ background: "transparent", border: "1px solid var(--border-main)" }}
        onMouseDown={e => { e.preventDefault(); onColorSelect(null); }}
        title="クリア" />
      <span className="fmt-sep" />
      {customColors.map((c, i) => (
        <button key={i} className="fmt-color" style={{ background: c }}
          onMouseDown={e => { e.preventDefault(); onColorSelect(c); }} />
      ))}
    </div>
  );
}

/* ═══════════════════ MenuBar ══════════════════════ */
function MenuBar({ project, dirty, onSave, onSaveAs, onNew, onOpen, onExport, onImport, onRename, onSettings, onUndo, onRedo, canUndo, canRedo }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draft, setDraft] = useState(project.name);
  const fileRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => { setDraft(project.name); }, [project.name]);
  useEffect(() => {
    if (!menuOpen) return;
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("pointerdown", h);
    return () => document.removeEventListener("pointerdown", h);
  }, [menuOpen]);

  const commitName = () => {
    setEditingName(false);
    const t = draft.trim();
    if (t && t !== project.name) onRename(t);
    else setDraft(project.name);
  };

  const handleImportFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { onImport(JSON.parse(r.result)); } catch { alert("無効なファイルです"); } };
    r.readAsText(f);
    e.target.value = "";
  };

  return (
    <div className="menu-bar">
      <div className="menu-left" ref={menuRef}>
        <button className="menu-hamburger" onClick={() => setMenuOpen(o => !o)}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
        {menuOpen && (
          <div className="menu-dropdown">
            <button onClick={() => { setMenuOpen(false); onNew(); }}>新規プロジェクト</button>
            <button onClick={() => { setMenuOpen(false); onOpen(); }}>プロジェクトを開く…</button>
            <hr />
            <button onClick={() => { setMenuOpen(false); onSave(); }}>保存</button>
            <button onClick={() => { setMenuOpen(false); onSaveAs(); }}>名前をつけて保存…</button>
            <hr />
            <button onClick={() => { setMenuOpen(false); onExport(); }}>JSONエクスポート</button>
            <button onClick={() => { setMenuOpen(false); fileRef.current?.click(); }}>JSONインポート</button>
            <hr />
            <button onClick={() => { setMenuOpen(false); onSettings(); }}>設定…</button>
          </div>
        )}
        <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleImportFile} />
        
        <span style={{ width: "1px", height: "16px", background: "var(--border-mid)", margin: "0 8px" }} />
        <button className="menu-icon-btn" onClick={onUndo} disabled={!canUndo} title="元に戻す (Ctrl+Z)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
        </button>
        <button className="menu-icon-btn" onClick={onRedo} disabled={!canRedo} title="やり直す (Ctrl+Y / Ctrl+Shift+Z)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>
        </button>
      </div>
      <div className="menu-center">
        {editingName ? (
          <input className="name-input" value={draft} autoFocus
            onChange={e => setDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={e => { if (e.key === "Enter") commitName(); if (e.key === "Escape") { setDraft(project.name); setEditingName(false); }}} />
        ) : (
          <span className="proj-name" onClick={() => setEditingName(true)}>
            {project.name}{dirty && <span className="dirty-dot" />}
          </span>
        )}
      </div>
      <div className="menu-right">
        <button className={"save-btn" + (dirty ? " unsaved" : "")} onClick={onSave}>保存</button>
      </div>
    </div>
  );
}

/* ══════════════════ ProjectPicker ═════════════════ */
function ProjectPicker({ projects, onSelect, onDelete, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h3>プロジェクト一覧</h3>
        {projects.length === 0 && <p className="empty-msg">保存済みプロジェクトはありません</p>}
        <div className="proj-list">
          {projects.map(p => (
            <div key={p.id} className="proj-item">
              <div className="proj-item-info" onClick={() => onSelect(p.id)}>
                <span className="proj-item-name">{p.name}</span>
                <span className="proj-item-date">{new Date(p.updatedAt).toLocaleDateString("ja-JP")}</span>
              </div>
              <button className="proj-item-del" onClick={() => onDelete(p.id)}>削除</button>
            </div>
          ))}
        </div>
        <button className="modal-close-btn" onClick={onClose}>閉じる</button>
      </div>
    </div>
  );
}

/* ═══════════════ SaveAs ══════════════ */
function SaveAsDialog({ defaultName, onSave, onClose }) {
  const [name, setName] = useState(defaultName);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box small" onClick={e => e.stopPropagation()}>
        <h3>名前をつけて保存</h3>
        <input className="modal-input" value={name} onChange={e => setName(e.target.value)} autoFocus
          onKeyDown={e => { if (e.key === "Enter" && name.trim()) onSave(name.trim()); }} />
        <div className="modal-actions">
          <button className="modal-cancel" onClick={onClose}>キャンセル</button>
          <button className="modal-ok" onClick={() => name.trim() && onSave(name.trim())}>保存</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ SettingsDialog ══════════════ */
function SettingsDialog({ settings, onSave, onClose }) {
  const [draft, setDraft] = useState(settings);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box small" onClick={e => e.stopPropagation()}>
        <h3>アプリ設定</h3>
        
        <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>テーマ</label>
            <select className="modal-input" style={{ marginBottom: 0 }}
              value={draft.theme} onChange={e => setDraft({ ...draft, theme: e.target.value })}>
              <option value="light">ライト</option>
              <option value="dark">ダーク</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>文字サイズ (px)</label>
            <input type="number" className="modal-input" style={{ marginBottom: 0 }} min="10" max="32"
              value={draft.fontSize} onChange={e => setDraft({ ...draft, fontSize: Number(e.target.value) || 13 })} />
          </div>
        </div>
        
        <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>セルの文字配置</label>
            <select className="modal-input" style={{ marginBottom: 0 }}
              value={draft.textAlign} onChange={e => setDraft({ ...draft, textAlign: e.target.value })}>
              <option value="left">左詰め</option>
              <option value="center">中央揃え</option>
              <option value="right">右詰め</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>文字フチ (背景色時)</label>
            <select className="modal-input" style={{ marginBottom: 0 }}
              value={draft.textOutline} onChange={e => setDraft({ ...draft, textOutline: e.target.value })}>
              <option value="none">なし</option>
              <option value="weak">弱め</option>
              <option value="normal">標準</option>
              <option value="strong">強め</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>カスタムカラーパレット</label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {draft.customColors.map((c, i) => (
              <div key={i} className="color-picker-wrap">
                <input type="color" className="color-picker-input" value={c}
                  onChange={e => {
                    const newColors = [...draft.customColors];
                    newColors[i] = e.target.value;
                    setDraft({ ...draft, customColors: newColors });
                  }} />
                <button className="color-picker-del" onClick={() => {
                    const newColors = draft.customColors.filter((_, idx) => idx !== i);
                    setDraft({ ...draft, customColors: newColors });
                  }}>×</button>
              </div>
            ))}
            <button className="color-picker-add" onClick={() => setDraft({ ...draft, customColors: [...draft.customColors, "#ffffff"] })}>+</button>
          </div>
        </div>
        <div className="modal-actions">
          <button className="modal-cancel" onClick={onClose}>キャンセル</button>
          <button className="modal-ok" onClick={() => onSave(draft)}>保存</button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   MAIN APP
   ═════════════════════════════════════════════════════════ */
export default function SceneMatrix() {
  const [project, setProject] = useState(newProject);
  const [dirty, setDirty] = useState(false);
  const [activeCellRef, setActiveCellRef] = useState(null);
  const [activeCellInfo, setActiveCellInfo] = useState(null);
  const [cellEditing, setCellEditing] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [projectMetas, setProjectMetas] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const [settings, setSettings] = useState(() => {
    try { 
      const s = localStorage.getItem("smx:settings"); 
      const p = s ? JSON.parse(s) : {}; 
      return { 
        fontSize: p.fontSize || 13, textAlign: p.textAlign || "left",
        customColors: p.customColors || DEFAULT_COLORS,
        textOutline: p.textOutline || "weak", theme: p.theme || "light"
      };
    }
    catch { return { fontSize: 13, textAlign: "left", customColors: DEFAULT_COLORS, textOutline: "weak", theme: "light" }; }
  });

  const { columns, scenes, colWidths = {} } = project;
  const getW = (c) => colWidths[c] || DEFAULT_W;

  /* ── history state ── */
  const [historyState, setHistoryState] = useState({ stack: [], index: -1 });
  const resetHistory = useCallback((proj) => {
    setHistoryState({ stack: [proj], index: 0 });
  }, []);

  /* ── beforeunload ── */
  useEffect(() => {
    const h = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  /* ── load on mount ── */
  useEffect(() => {
    (async () => {
      const keys = await storeList("smx:");
      const metas = [];
      for (const k of keys) {
        const d = await storeGet(k);
        if (d) metas.push({ id: d.id, name: d.name, updatedAt: d.updatedAt });
      }
      metas.sort((a, b) => b.updatedAt - a.updatedAt);
      setProjectMetas(metas);
      if (metas.length > 0) {
        const last = await storeGet("smx:" + metas[0].id);
        if (last) { setProject(last); resetHistory(last); }
      } else {
        resetHistory(project);
      }
      setLoaded(true);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const mutate = useCallback((fn) => {
    setProject(prev => {
      const next = fn(prev);
      next.updatedAt = Date.now();
      setHistoryState(hs => {
        const newStack = hs.stack.slice(0, hs.index + 1);
        newStack.push(next);
        if (newStack.length > 50) newStack.shift();
        return { stack: newStack, index: newStack.length - 1 };
      });
      return next;
    });
    setDirty(true);
  }, []);

  const saveSettings = (s) => {
    setSettings(s);
    try { localStorage.setItem("smx:settings", JSON.stringify(s)); } catch {}
    setDialog(null);
  };

  const undo = useCallback(() => {
    setHistoryState(hs => {
      if (hs.index > 0) {
        const nextIndex = hs.index - 1;
        setProject(hs.stack[nextIndex]);
        setDirty(true);
        return { ...hs, index: nextIndex };
      }
      return hs;
    });
  }, []);

  const redo = useCallback(() => {
    setHistoryState(hs => {
      if (hs.index < hs.stack.length - 1) {
        const nextIndex = hs.index + 1;
        setProject(hs.stack[nextIndex]);
        setDirty(true);
        return { ...hs, index: nextIndex };
      }
      return hs;
    });
  }, []);

  /* ── keyboard shortcuts (Undo/Redo) ── */
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput = e.target.tagName === 'INPUT' || e.target.isContentEditable || e.target.tagName === 'TEXTAREA';
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') {
          if (!isInput) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
        } else if (e.key === 'y' || e.key === 'Y') {
          if (!isInput) { e.preventDefault(); redo(); }
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  /* ── save / project management ── */
  const doSave = async (proj) => {
    const p = proj || project;
    const d = { ...p, updatedAt: Date.now() };
    await storeSet("smx:" + d.id, d);
    setProject(d);
    setDirty(false);
    setProjectMetas(prev => {
      const rest = prev.filter(m => m.id !== d.id);
      return [{ id: d.id, name: d.name, updatedAt: d.updatedAt }, ...rest];
    });
  };

  const doSaveAs = async (name) => {
    const np = { ...project, id: uid("p"), name, createdAt: Date.now(), updatedAt: Date.now() };
    setProject(np);
    resetHistory(np);
    await doSave(np);
    setDialog(null);
  };

  const doNew = () => {
    if (dirty && !confirm("未保存の変更があります。破棄しますか？")) return;
    const np = newProject();
    setProject(np); resetHistory(np); setDirty(false);
  };

  const doOpen = () => {
    if (dirty && !confirm("未保存の変更があります。破棄しますか？")) return;
    setDialog("open");
  };

  const openProject = async (id) => {
    const d = await storeGet("smx:" + id);
    if (d) { setProject(d); resetHistory(d); setDirty(false); }
    setDialog(null);
  };

  const deleteProject = async (id) => {
    if (!confirm("このプロジェクトを削除しますか？")) return;
    await storeDel("smx:" + id);
    setProjectMetas(prev => prev.filter(m => m.id !== id));
    if (project.id === id) {
      const np = newProject();
      setProject(np); resetHistory(np); setDirty(false);
    }
  };

  const doExport = async () => {
    const dataStr = JSON.stringify(project, null, 2);
    const defaultName = (project.name || "scene-matrix") + ".json";
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: defaultName,
          types: [{ description: 'JSONファイル', accept: { 'application/json': ['.json'] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(dataStr);
        await writable.close();
      } catch (e) {
        if (e.name !== 'AbortError') console.error("Export failed:", e);
      }
    } else {
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = defaultName;
      a.click(); URL.revokeObjectURL(url);
    }
  };

  const doImport = (data) => {
    if (!data.columns || !data.scenes) { alert("無効なデータです"); return; }
    if (dirty && !confirm("未保存の変更があります。インポートで上書きしますか？")) return;
    const np = { ...data, id: uid("p"), updatedAt: Date.now() };
    setProject(np);
    resetHistory(np);
    setDirty(true);
  };

  /* ── column ops ── */
  const addColumn = (name) => {
    if (!name || columns.includes(name)) return;
    mutate(p => ({ ...p, columns: [...p.columns, name], scenes: p.scenes.map(s => ({ ...s, cells: { ...s.cells, [name]: "" }, bgColors: { ...(s.bgColors || {}) } })) }));
  };
  const deleteColumn = (col) => {
    mutate(p => ({ ...p, columns: p.columns.filter(c => c !== col), scenes: p.scenes.map(s => { const c = { ...s.cells }; delete c[col]; const b = { ...(s.bgColors || {}) }; delete b[col]; return { ...s, cells: c, bgColors: b }; }) }));
  };
  const renameColumn = (old, nw) => {
    if (columns.includes(nw)) return;
    mutate(p => ({
      ...p, columns: p.columns.map(c => c === old ? nw : c),
      colWidths: (() => { const w = { ...(p.colWidths || {}) }; if (w[old]) { w[nw] = w[old]; delete w[old]; } return w; })(),
      scenes: p.scenes.map(s => { const c = {}; for (const k of Object.keys(s.cells)) c[k === old ? nw : k] = s.cells[k]; 
      const b = {}; for (const k of Object.keys(s.bgColors || {})) b[k === old ? nw : k] = (s.bgColors || {})[k];
      return { ...s, cells: c, bgColors: b }; }),
    }));
  };

  /* ── scene ops ── */
  const addScene = () => mutate(p => ({ ...p, scenes: [...p.scenes, emptyScene(p.columns)] }));
  const deleteScene = (id) => mutate(p => ({ ...p, scenes: p.scenes.filter(s => s.id !== id) }));
  const updateCell = (id, col, val) => {
    mutate(p => ({ ...p, scenes: p.scenes.map(s => s.id === id ? { ...s, cells: { ...s.cells, [col]: val } } : s) }));
  };
  const updateCellBgColor = (color) => {
    if (!activeCellInfo) return;
    const { sceneId, col } = activeCellInfo;
    mutate(p => ({
      ...p,
      scenes: p.scenes.map(s => s.id === sceneId ? {
        ...s, bgColors: { ...(s.bgColors || {}), [col]: color }
      } : s)
    }));
  };

  /* ── row drag ── */
  const [rowDrag, setRowDrag] = useState(null);
  const [rowOver, setRowOver] = useState(null);
  const onRowDragStart = (e, idx) => { e.dataTransfer.setData("kind", "row"); e.dataTransfer.effectAllowed = "move"; setRowDrag(idx); };
  const onRowDragEnd = () => {
    if (rowDrag !== null && rowOver !== null && rowDrag !== rowOver) {
      mutate(p => { const s = [...p.scenes]; const [m] = s.splice(rowDrag, 1); s.splice(rowOver, 0, m); return { ...p, scenes: s }; });
    }
    setRowDrag(null); setRowOver(null);
  };

  /* ── column drag ── */
  const [colDrag, setColDrag] = useState(null);
  const [colOver, setColOver] = useState(null);
  const onColDragStart = (e, col) => { e.dataTransfer.setData("kind", "col"); e.dataTransfer.effectAllowed = "move"; setColDrag(col); };
  const onColDragEnd = () => {
    if (colDrag && colOver && colDrag !== colOver) {
      mutate(p => { const cols = [...p.columns]; const fi = cols.indexOf(colDrag), ti = cols.indexOf(colOver); cols.splice(fi, 1); cols.splice(ti, 0, colDrag); return { ...p, columns: cols }; });
    }
    setColDrag(null); setColOver(null);
  };

  /* ── cell drag (swap) ── */
  const [cellDrag, setCellDrag] = useState(null);
  const [cellOver, setCellOver] = useState(null);
  const onCellDragStart = (e, sceneId, col) => {
    e.stopPropagation(); e.dataTransfer.setData("kind", "cell"); e.dataTransfer.effectAllowed = "move";
    setCellDrag({ sceneId, col });
  };
  const doCellSwap = () => {
    if (cellDrag && cellOver && (cellDrag.sceneId !== cellOver.sceneId || cellDrag.col !== cellOver.col)) {
      mutate(p => {
        const ss = p.scenes.map(s => ({ ...s, cells: { ...s.cells }, bgColors: { ...(s.bgColors || {}) } }));
        const a = ss.find(s => s.id === cellDrag.sceneId);
        const b = ss.find(s => s.id === cellOver.sceneId);
        if (a && b) { 
          const tmp = a.cells[cellDrag.col]; a.cells[cellDrag.col] = b.cells[cellOver.col]; b.cells[cellOver.col] = tmp; 
          const tmpBg = a.bgColors[cellDrag.col]; a.bgColors[cellDrag.col] = b.bgColors[cellOver.col]; b.bgColors[cellOver.col] = tmpBg;
        }
        return { ...p, scenes: ss };
      });
    }
    setCellDrag(null); setCellOver(null);
  };

  /* ── column resize ── */
  const onResizeStart = (e, col) => {
    e.preventDefault();
    const startX = e.clientX; const startW = getW(col);
    const onMove = (ev) => {
      const nw = Math.min(COL_MAX_W, Math.max(COL_MIN_W, startW + ev.clientX - startX));
      setProject(p => ({ ...p, colWidths: { ...(p.colWidths || {}), [col]: nw } }));
    };
    const onUp = () => { document.removeEventListener("pointermove", onMove); document.removeEventListener("pointerup", onUp); setDirty(true); };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  /* ── add column UI ── */
  const [showAddCol, setShowAddCol] = useState(false);
  const [newColName, setNewColName] = useState("");
  const commitAddCol = () => { const n = newColName.trim(); if (n) addColumn(n); setNewColName(""); setShowAddCol(false); };

  /* ── col header edit ── */
  const [editingCol, setEditingCol] = useState(null);
  const [colDraft, setColDraft] = useState("");

  const isDark = settings.theme === "dark";
  const getOutlineStyle = (level, isDarkTheme) => {
    const c = isDarkTheme ? "#1E1E1E" : "#fff";
    if (level === "none") return "none";
    if (level === "weak") return `0 0 3px ${c}, 0 0 3px ${c}`;
    if (level === "normal") return `-1px -1px 0 ${c},1px -1px 0 ${c},-1px 1px 0 ${c},1px 1px 0 ${c}`;
    if (level === "strong") return `-1px -1px 0 ${c},1px -1px 0 ${c},-1px 1px 0 ${c},1px 1px 0 ${c}, 0 -1px 0 ${c},0 1px 0 ${c},-1px 0 0 ${c},1px 0 0 ${c}`;
    return "none";
  };

  if (!loaded) return <div className="app" data-theme="light"><style>{CSS}</style><div style={{padding:60,textAlign:"center",color:"var(--text-faint)",fontFamily:"'Noto Sans JP',sans-serif"}}>読み込み中…</div></div>;

  return (
    <div className="app" data-theme={settings.theme} style={{ 
      "--base-font-size": `${settings.fontSize}px`, 
      "--cell-text-align": settings.textAlign,
      "--cell-text-outline": getOutlineStyle(settings.textOutline, isDark),
      "--header-top": cellEditing ? "86px" : "48px"
    }}>
      <style>{CSS}</style>

      <MenuBar project={project} dirty={dirty}
        onSave={() => doSave()} onSaveAs={() => setDialog("saveAs")}
        onNew={doNew} onOpen={doOpen} onExport={doExport} onImport={doImport}
        onRename={(n) => mutate(p => ({ ...p, name: n }))}
        onSettings={() => setDialog("settings")}
        onUndo={undo} onRedo={redo}
        canUndo={historyState.index > 0} canRedo={historyState.index < historyState.stack.length - 1} />

      <FormatBar visible={cellEditing} onColorSelect={updateCellBgColor} customColors={settings.customColors} />

      <div className="matrix-wrap">
        <table className="matrix">
          <thead>
            <tr>
              <th className="th-grip" />
              <th className="th-num" />
              {columns.map(col => (
                <th key={col} style={{ width: getW(col), minWidth: getW(col), position: "relative" }}
                  draggable onDragStart={e => onColDragStart(e, col)}
                  onDragOver={e => { e.preventDefault(); setColOver(col); }}
                  onDragEnd={onColDragEnd} onDragLeave={() => setColOver(null)}
                  className={colDrag === col ? "col-dragging" : (colOver === col && colDrag && colDrag !== col ? "col-over" : "")}>
                  <div className="col-header">
                    <Grip size={10} style={{ opacity: 0.2, marginRight: 4, flexShrink: 0, cursor: "grab" }} />
                    {editingCol === col ? (
                      <input className="col-header-input" value={colDraft} autoFocus
                        onChange={e => setColDraft(e.target.value)}
                        onBlur={() => { const t = colDraft.trim(); if (t && t !== col) renameColumn(col, t); setEditingCol(null); }}
                        onKeyDown={e => { if (e.key === "Enter") { const t = colDraft.trim(); if (t && t !== col) renameColumn(col, t); setEditingCol(null); } if (e.key === "Escape") setEditingCol(null); }} />
                    ) : (
                      <span className="col-header-text" onClick={() => { setEditingCol(col); setColDraft(col); }}>{col}</span>
                    )}
                    {columns.length > 1 && <button className="col-delete" onClick={() => deleteColumn(col)} title="列を削除">×</button>}
                  </div>
                  <div className="col-resize" onPointerDown={e => onResizeStart(e, col)} />
                </th>
              ))}
              <th className="th-actions" />
            </tr>
          </thead>
          <tbody>
            {scenes.length === 0 ? (
              <tr><td colSpan={columns.length + 3}><div className="empty-state">シーンを追加してください</div></td></tr>
            ) : scenes.map((scene, idx) => (
              <tr key={scene.id}
                className={[ rowDrag === idx ? "row-dragging" : "", rowOver === idx && rowDrag !== null && rowDrag !== idx ? "row-over" : "" ].join(" ")}>
                <td>
                  <div className="grip-cell" draggable
                    onDragStart={e => onRowDragStart(e, idx)} onDragEnd={onRowDragEnd}
                    onDragOver={e => { e.preventDefault(); setRowOver(idx); }} onDragLeave={() => setRowOver(null)}>
                    <Grip />
                  </div>
                </td>
                <td><div className="row-num">{idx + 1}</div></td>
                {columns.map(col => {
                  const isCDO = cellOver?.sceneId === scene.id && cellOver?.col === col;
                  const isCDG = cellDrag?.sceneId === scene.id && cellDrag?.col === col;
                  return (
                    <td key={col} className={[isCDG ? "cell-dragging" : "", isCDO ? "cell-over" : ""].join(" ")}
                      onDragOver={e => { if (!cellDrag) return; e.preventDefault(); e.stopPropagation(); setCellOver({ sceneId: scene.id, col }); }}
                      onDragLeave={() => { if (cellDrag) setCellOver(null); }}
                      onDrop={e => { if (cellDrag) { e.preventDefault(); e.stopPropagation(); doCellSwap(); } }}>
                      <div className="cell-wrap">
                        <div className="cell-drag-handle" draggable
                          onDragStart={e => onCellDragStart(e, scene.id, col)}
                          onDragEnd={() => { setCellDrag(null); setCellOver(null); }}
                          title="セルを入れ替え">
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3h6M2 5h6M2 7h6" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
                        </div>
                        <RichCell
                          html={scene.cells[col] || ""}
                          bgColor={scene.bgColors?.[col]}
                          onChange={v => updateCell(scene.id, col, v)}
                          onFocusCell={(ref) => { setActiveCellRef(ref ? { current: ref.current } : null); setActiveCellInfo(ref ? { sceneId: scene.id, col } : null); setCellEditing(!!ref); }}
                          placeholder={col} />
                      </div>
                    </td>
                  );
                })}
                <td><button className="row-delete" onClick={() => deleteScene(scene.id)} title="シーン削除">×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="actions-bar">
        <button className="btn-ghost" onClick={addScene}>+ シーン追加</button>
        {showAddCol ? (
          <div className="add-col-inline">
            <input className="add-col-input" value={newColName} placeholder="要素名" autoFocus
              onChange={e => setNewColName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") commitAddCol(); if (e.key === "Escape") { setShowAddCol(false); setNewColName(""); }}} />
            <button className="btn-sm" onClick={commitAddCol}>追加</button>
            <button className="btn-cancel" onClick={() => { setShowAddCol(false); setNewColName(""); }}>やめる</button>
          </div>
        ) : (
          <button className="btn-ghost" onClick={() => setShowAddCol(true)}>+ 要素（列）追加</button>
        )}
      </div>

      {dialog === "open" && <ProjectPicker projects={projectMetas} onSelect={openProject} onDelete={deleteProject} onClose={() => setDialog(null)} />}
      {dialog === "saveAs" && <SaveAsDialog defaultName={project.name + " コピー"} onSave={doSaveAs} onClose={() => setDialog(null)} />}
      {dialog === "settings" && <SettingsDialog settings={settings} onSave={saveSettings} onClose={() => setDialog(null)} />}
    </div>
  );
}

/* ═══════════════════ CSS ═════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500&family=DM+Mono:wght@300;400&display=swap');

:root {
  --bg-base: #FAF9F7;
  --bg-surface: #fff;
  --text-main: #2C2A27;
  --text-muted: #8A857D;
  --text-faint: #C8C4BD;
  --border-light: #EDECEA;
  --border-mid: #E0DDD8;
  --border-main: #D5D2CD;
  --hover-base: #F5F4F2;
  --hover-cell: #F0EFED;
  --accent-orange: #D4842A;
  --accent-red: #C0564B;
  --btn-dark: #2C2A27;
  --btn-dark-hover: #444139;
  --btn-dark-text: #FAF9F7;
  --cell-over: #EDE8DF;
  --unsaved-bg: #FEF9F3;
  --unsaved-hover: #FCEEE0;
  --focus-ring: rgba(44,42,39,.04);
  --focus-ring-strong: rgba(44,42,39,.08);
  --modal-overlay: rgba(44,42,39,.25);
  --shadow-color: rgba(0,0,0,.08);
  --modal-shadow: rgba(0,0,0,.12);
}
[data-theme="dark"] {
  --bg-base: #1E1E1E;
  --bg-surface: #252526;
  --text-main: #D4D4D4;
  --text-muted: #858585;
  --text-faint: #555555;
  --border-light: #333333;
  --border-mid: #3E3E42;
  --border-main: #444444;
  --hover-base: #2A2D2E;
  --hover-cell: #2D2D30;
  --accent-orange: #CE9178;
  --accent-red: #F44747;
  --btn-dark: #D4D4D4;
  --btn-dark-hover: #FFFFFF;
  --btn-dark-text: #1E1E1E;
  --cell-over: #37373D;
  --unsaved-bg: #3A2A18;
  --unsaved-hover: #4A331C;
  --focus-ring: rgba(255,255,255,.05);
  --focus-ring-strong: rgba(255,255,255,.1);
  --modal-overlay: rgba(0,0,0,.6);
  --shadow-color: rgba(0,0,0,.4);
  --modal-shadow: rgba(0,0,0,.6);
}

#root { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; text-align: left !important; display: block !important; }
*{margin:0;padding:0;box-sizing:border-box}
.app{min-height:100vh;background:var(--bg-base);color:var(--text-main);font-family:'Noto Sans JP',sans-serif;font-weight:300;padding:0 0 80px}

.menu-bar{display:flex;align-items:center;height:48px;border-bottom:1px solid var(--border-light);padding:0 16px;position:sticky;top:0;background:var(--bg-base);z-index:20}
.menu-left{position:relative;flex:0 0 auto;display:flex;align-items:center}
.menu-hamburger{background:none;border:none;color:var(--text-muted);cursor:pointer;padding:6px;border-radius:4px;display:flex;align-items:center}
.menu-hamburger:hover{background:var(--border-light);color:var(--text-main)}
.menu-dropdown{position:absolute;top:40px;left:0;background:var(--bg-surface);border:1px solid var(--border-mid);border-radius:6px;box-shadow:0 8px 24px var(--shadow-color);min-width:200px;z-index:30;overflow:hidden}
.menu-dropdown button{display:block;width:100%;text-align:left;background:none;border:none;padding:10px 16px;font-family:'Noto Sans JP',sans-serif;font-size:var(--base-font-size, 13px);color:var(--text-main);cursor:pointer}
.menu-dropdown button:hover{background:var(--hover-base)}
.menu-dropdown hr{border:none;border-top:1px solid var(--border-light);margin:4px 0}
.menu-center{flex:1;text-align:center}
.proj-name{font-size:var(--base-font-size, 13px);font-weight:400;letter-spacing:.02em;cursor:pointer;padding:4px 8px;border-radius:3px;position:relative}
.proj-name:hover{background:var(--border-light)}
.dirty-dot{display:inline-block;width:6px;height:6px;background:var(--accent-orange);border-radius:50%;margin-left:6px;vertical-align:middle}
.name-input{font-family:'Noto Sans JP',sans-serif;font-size:var(--base-font-size, 13px);font-weight:400;text-align:center;border:none;border-bottom:1px solid var(--text-main);background:transparent;outline:none;padding:4px 8px;width:200px;color:var(--text-main)}
.menu-right{flex:0 0 auto}
.save-btn{font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.05em;background:none;border:1px solid var(--border-main);color:var(--text-muted);padding:6px 16px;border-radius:4px;cursor:pointer;transition:all .15s}
.save-btn:hover{border-color:var(--text-muted);color:var(--text-main)}
.save-btn.unsaved{border-color:var(--accent-orange);color:var(--accent-orange);background:var(--unsaved-bg)}
.save-btn.unsaved:hover{background:var(--unsaved-hover)}

.menu-icon-btn{background:none;border:none;color:var(--text-muted);cursor:pointer;padding:6px;border-radius:4px;display:flex;align-items:center;margin-left:4px;transition:all .12s}
.menu-icon-btn:hover:not(:disabled){background:var(--border-light);color:var(--text-main)}
.menu-icon-btn:disabled{opacity:0.3;cursor:default}

.fmt-bar{display:flex;align-items:center;gap:4px;padding:6px 16px;border-bottom:1px solid var(--border-light);background:var(--bg-base);opacity:0;height:0;overflow:hidden;transition:all .15s;position:sticky;top:48px;z-index:19}
.fmt-bar.show{opacity:1;height:38px;padding:6px 16px}
.fmt-sep{width:1px;height:18px;background:var(--border-mid);margin:0 4px}
.fmt-color{width:18px;height:18px;border-radius:50%;border:2px solid transparent;cursor:pointer;transition:border-color .12s}
.fmt-color:hover{border-color:var(--text-main)}

.matrix-wrap{overflow-x:auto;padding:24px 16px 0}
.matrix{border-collapse:separate;border-spacing:0;table-layout:fixed;width:max-content}
.matrix thead th{position:sticky;top:var(--header-top, 48px);background:var(--bg-base);z-index:10;padding:0 0 8px;text-align:left;vertical-align:bottom;user-select:none;border-left:1px solid var(--border-light);transition:top .15s}
.matrix thead th:first-child{border-left:none}
.th-num{width:36px;min-width:36px}.th-grip{width:44px;min-width:44px}.th-actions{width:36px;min-width:36px}
.col-header{display:flex;align-items:center;gap:2px;padding-right:8px}
.col-header-text{font-family:'DM Mono',monospace;font-size:var(--base-font-size, 13px);font-weight:400;letter-spacing:.06em;color:var(--text-muted);cursor:pointer;padding:2px 4px;border-radius:3px;transition:background .12s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.col-header-text:hover{background:var(--border-light)}
.col-header-input{font-family:'DM Mono',monospace;font-size:var(--base-font-size, 13px);border:none;border-bottom:1px solid var(--text-faint);background:transparent;outline:none;padding:2px 4px;width:100%;color:var(--text-main)}
.col-delete{background:none;border:none;color:var(--border-main);cursor:pointer;font-size:var(--base-font-size, 13px);padding:2px;border-radius:3px;flex-shrink:0;transition:color .12s}
.col-delete:hover{color:var(--accent-red)}
.col-resize{position:absolute;right:-2px;top:0;bottom:0;width:5px;cursor:col-resize;z-index:5}
.col-resize:hover{background:var(--focus-ring-strong)}
.col-dragging{opacity:.3}
.col-over{box-shadow:inset 2px 0 0 var(--text-main)}

.matrix tbody tr{transition:background .08s}
.matrix tbody tr:hover{background:var(--hover-base)}
.row-dragging{opacity:.25}
.row-over td{border-top:2px solid var(--text-main) !important}
.matrix tbody td{padding:0;vertical-align:top;border-top:1px solid var(--border-light);border-left:1px solid var(--border-light)}
.matrix tbody td:first-child{border-left:none}
.grip-cell{cursor:grab;display:flex;align-items:center;justify-content:center;min-height:52px;padding-top:16px;color:var(--text-muted);user-select:none}
.grip-cell:active{cursor:grabbing}
.row-num{font-family:'DM Mono',monospace;font-size:10px;color:var(--text-faint);padding:16px 6px 0 0;text-align:right;user-select:none}
.row-delete{background:none;border:none;color:transparent;cursor:pointer;font-size:var(--base-font-size, 13px);padding:16px 4px 0;transition:color .12s}
tr:hover .row-delete{color:var(--text-faint)}
.row-delete:hover{color:var(--accent-red) !important}

.cell-wrap{position:relative;min-height:52px}
.cell-drag-handle{position:absolute;top:4px;right:4px;width:18px;height:18px;display:flex;align-items:center;justify-content:center;color:var(--border-main);cursor:grab;border-radius:3px;opacity:0;transition:opacity .12s;z-index:3}
.cell-wrap:hover .cell-drag-handle{opacity:1}
.cell-drag-handle:hover{background:var(--border-light);color:var(--text-muted)}
.cell-drag-handle:active{cursor:grabbing}
.cell-dragging{opacity:.3;background:var(--hover-base)}
.cell-over{background:var(--cell-over) !important;box-shadow:inset 0 0 0 2px var(--accent-orange)}

.rich-cell-wrap{position:relative;min-height:52px}
.rich-cell-wrap[data-placeholder]::before{content:attr(data-placeholder);position:absolute;top:14px;left:12px;color:var(--border-main);font-style:italic;pointer-events:none;font-size:var(--base-font-size, 13px)}
.rich-cell{min-height:52px;padding:14px 12px;font-size:var(--base-font-size, 13px);text-align:var(--cell-text-align, left);line-height:1.7;outline:none;word-break:break-word;white-space:pre-wrap;border-radius:2px;transition:background .1s}
.rich-cell:hover{background:var(--hover-cell)}
.rich-cell.editing{background:var(--bg-surface);box-shadow:inset 0 0 0 1px var(--text-faint),0 0 0 3px var(--focus-ring)}
.rich-cell.has-bg{text-shadow:var(--cell-text-outline, none);color:var(--text-main)}
.rich-cell.has-bg:hover{filter:brightness(0.96)}

.actions-bar{display:flex;gap:12px;margin-top:16px;padding:0 16px 0 96px;flex-wrap:wrap}
.btn-ghost{font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.05em;color:var(--text-muted);background:none;border:1px dashed var(--border-main);border-radius:4px;padding:8px 16px;cursor:pointer;transition:all .12s;white-space:nowrap}
.btn-ghost:hover{color:var(--text-main);border-color:var(--text-muted);background:var(--hover-base)}
.add-col-inline{display:flex;align-items:center;gap:6px}
.add-col-input{font-family:'Noto Sans JP',sans-serif;font-size:12px;font-weight:300;color:var(--text-main);background:var(--bg-surface);border:1px solid var(--border-main);border-radius:4px;padding:7px 12px;outline:none;width:120px}
.add-col-input:focus{border-color:var(--text-muted)}
.btn-sm{font-family:'DM Mono',monospace;font-size:11px;color:var(--btn-dark-text);background:var(--btn-dark);border:none;border-radius:4px;padding:7px 14px;cursor:pointer}
.btn-sm:hover{background:var(--btn-dark-hover)}
.btn-cancel{font-family:'DM Mono',monospace;font-size:11px;color:var(--text-muted);background:none;border:none;cursor:pointer;padding:7px 8px}
.btn-cancel:hover{color:var(--text-main)}
.empty-state{text-align:center;padding:48px 0;color:var(--text-faint);font-size:var(--base-font-size, 13px)}

.modal-overlay{position:fixed;inset:0;background:var(--modal-overlay);z-index:50;display:flex;align-items:center;justify-content:center;padding:24px}
.modal-box{background:var(--bg-surface);border-radius:8px;box-shadow:0 12px 40px var(--modal-shadow);padding:28px;width:100%;max-width:400px;max-height:80vh;overflow-y:auto}
.modal-box.small{max-width:320px}
.modal-box h3{font-size:15px;font-weight:400;margin-bottom:16px;letter-spacing:.02em}
.modal-input{width:100%;font-family:'Noto Sans JP',sans-serif;font-size:var(--base-font-size, 13px);border:1px solid var(--border-main);background:var(--bg-surface);color:var(--text-main);border-radius:4px;padding:10px 12px;outline:none;margin-bottom:16px}
.modal-input:focus{border-color:var(--text-muted)}
.modal-actions{display:flex;gap:8px;justify-content:flex-end}
.modal-cancel{font-family:'DM Mono',monospace;font-size:12px;background:none;border:1px solid var(--border-main);color:var(--text-muted);padding:8px 16px;border-radius:4px;cursor:pointer}
.modal-cancel:hover{border-color:var(--text-muted);color:var(--text-main)}
.modal-ok{font-family:'DM Mono',monospace;font-size:12px;background:var(--btn-dark);border:none;color:var(--btn-dark-text);padding:8px 20px;border-radius:4px;cursor:pointer}
.modal-ok:hover{background:var(--btn-dark-hover)}
.modal-close-btn{display:block;margin:16px auto 0;font-family:'DM Mono',monospace;font-size:12px;background:none;border:1px solid var(--border-main);color:var(--text-muted);padding:8px 24px;border-radius:4px;cursor:pointer}
.modal-close-btn:hover{border-color:var(--text-muted);color:var(--text-main)}
.empty-msg{color:var(--text-faint);font-size:var(--base-font-size, 13px);text-align:center;padding:16px 0}
.proj-list{display:flex;flex-direction:column;gap:4px;margin-bottom:8px}
.proj-item{display:flex;align-items:center;border:1px solid var(--border-light);border-radius:5px;overflow:hidden}
.proj-item-info{flex:1;padding:10px 14px;cursor:pointer;transition:background .1s;color:var(--text-main)}
.proj-item-info:hover{background:var(--hover-base)}
.proj-item-name{display:block;font-size:var(--base-font-size, 13px);font-weight:400}
.proj-item-date{font-family:'DM Mono',monospace;font-size:10px;color:var(--text-faint)}
.proj-item-del{background:none;border:none;border-left:1px solid var(--border-light);color:var(--text-faint);font-size:11px;padding:10px 14px;cursor:pointer;transition:color .12s}
.proj-item-del:hover{color:var(--accent-red);background:rgba(192,86,75,0.05)}

.color-picker-wrap { position:relative; width:24px; height:24px }
.color-picker-input { width:100%; height:100%; padding:0; border:1px solid var(--border-main); border-radius:4px; cursor:pointer; background:none; outline:none }
.color-picker-input::-webkit-color-swatch-wrapper { padding: 0; }
.color-picker-input::-webkit-color-swatch { border: none; border-radius:3px; }
.color-picker-del { position:absolute; top:-6px; right:-6px; background:var(--bg-surface); border:1px solid var(--border-main); border-radius:50%; width:14px; height:14px; font-size:10px; line-height:10px; cursor:pointer; color:var(--text-main); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity .1s }
.color-picker-wrap:hover .color-picker-del { opacity:1 }
.color-picker-add { width:24px; height:24px; border-radius:4px; border:1px dashed var(--border-main); background:transparent; color:var(--text-muted); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:14px; transition:all .1s }
.color-picker-add:hover { border-color:var(--text-muted); color:var(--text-main) }

@media(max-width:600px){.actions-bar{padding:0 12px}}
`;