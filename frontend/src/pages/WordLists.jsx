import { useState, useMemo, useEffect } from "react";
import { getAllBuiltinLists, LANGUAGES } from "../lib/wordLists";
import { getCustomLists, saveCustomList, deleteCustomList, setCustomLists } from "../lib/storage";
import { generateWords, cloudGetLists, cloudSaveList, cloudDeleteList } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Sparkles, Plus, Trash2, Loader2, Save, X, BookmarkPlus, Wand2 } from "lucide-react";

function uid() { return "c_" + Math.random().toString(36).slice(2, 10); }

export default function WordLists() {
  const { user } = useAuth();
  const builtin = useMemo(() => getAllBuiltinLists(), []);
  const [custom, setCustom] = useState(() => getCustomLists());

  useEffect(() => {
    if (!user) return;
    cloudGetLists()
      .then((cloud) => {
        if (Array.isArray(cloud) && cloud.length > 0) {
          // merge: cloud wins per id
          const local = getCustomLists();
          const map = new Map(local.map((l) => [l.id, l]));
          cloud.forEach((l) => map.set(l.id, l));
          const merged = Array.from(map.values());
          setCustomLists(merged);
          setCustom(merged);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // AI generator
  const [theme, setTheme] = useState("space exploration");
  const [language, setLanguage] = useState("English");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(12);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [genPreview, setGenPreview] = useState(null);

  // Manual editor
  const [editor, setEditor] = useState(null);

  const generate = async () => {
    setGenError("");
    setGenerating(true);
    setGenPreview(null);
    try {
      const words = await generateWords({ theme, difficulty, language, count });
      setGenPreview({
        id: uid(),
        name: `${theme} (${difficulty})`,
        theme,
        difficulty,
        language,
        words,
      });
    } catch (e) {
      setGenError(e?.response?.data?.detail || "Generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  const saveGenerated = () => {
    if (!genPreview) return;
    const next = saveCustomList(genPreview);
    setCustom(next);
    if (user) cloudSaveList(genPreview).catch(() => {});
    setGenPreview(null);
  };

  const removeCustom = (id) => {
    setCustom(deleteCustomList(id));
    if (user) cloudDeleteList(id).catch(() => {});
  };

  const startEditor = () => {
    setEditor({
      id: uid(),
      name: "My Custom List",
      theme: "custom",
      difficulty: "medium",
      language: "English",
      words: [{ word: "", definition: "" }],
    });
  };

  const updateEditor = (patch) => setEditor((e) => ({ ...e, ...patch }));
  const updateWord = (i, patch) => setEditor((e) => ({
    ...e,
    words: e.words.map((w, idx) => idx === i ? { ...w, ...patch } : w),
  }));
  const addEditorWord = () => setEditor((e) => ({ ...e, words: [...e.words, { word: "", definition: "" }] }));
  const removeEditorWord = (i) => setEditor((e) => ({ ...e, words: e.words.filter((_, idx) => idx !== i) }));

  const saveEditor = () => {
    if (!editor) return;
    const cleaned = {
      ...editor,
      words: editor.words.filter((w) => w.word.trim() && w.definition.trim()),
    };
    if (cleaned.words.length < 2) return;
    setCustom(saveCustomList(cleaned));
    if (user) cloudSaveList(cleaned).catch(() => {});
    setEditor(null);
  };

  return (
    <div data-testid="lists-page" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-10 space-y-10">
      <div>
        <span className="nb-badge bg-[#C9B6FF]"><Sparkles size={12} strokeWidth={3}/> Word Lists</span>
        <h1 className="font-display font-black text-3xl sm:text-4xl mt-2">Curate your vocabulary</h1>
        <p className="text-[#3a3a3a]">Use built-in packs, generate fresh lists with AI, or write your own.</p>
      </div>

      {/* AI Generator */}
      <section className="nb-card p-6 sm:p-8 bg-[#FFF5E6]">
        <div className="flex items-center gap-2 mb-4">
          <Wand2 strokeWidth={3} />
          <h2 className="font-display font-black text-2xl">Generate with AI</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <div className="label-cap mb-2">Theme</div>
            <input data-testid="gen-theme" value={theme} onChange={(e) => setTheme(e.target.value)} className="nb-input" placeholder="e.g. ancient Egypt"/>
          </div>
          <div>
            <div className="label-cap mb-2">Language</div>
            <select data-testid="gen-language" value={language} onChange={(e) => setLanguage(e.target.value)} className="nb-input">
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <div className="label-cap mb-2">Difficulty</div>
            <select data-testid="gen-difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="nb-input">
              {["easy", "medium", "hard"].map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <div className="label-cap mb-2">Count ({count})</div>
            <input data-testid="gen-count" type="range" min="6" max="24" value={count} onChange={(e) => setCount(+e.target.value)} className="w-full accent-[#121212]" />
          </div>
        </div>
        <div className="mt-5 flex gap-3 flex-wrap items-center">
          <button data-testid="gen-btn" onClick={generate} disabled={generating || !theme.trim()} className="nb-btn">
            {generating ? <><Loader2 className="animate-spin" size={16}/> Generating…</> : <><Sparkles size={16} strokeWidth={3}/> Generate</>}
          </button>
          {genError && <div className="nb-badge bg-[#FFB8D1]" data-testid="gen-error">{genError}</div>}
        </div>

        {genPreview && (
          <div className="mt-6 nb-card p-5 bg-white" data-testid="gen-preview">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="font-display font-black text-xl">{genPreview.name}</div>
                <div className="text-sm text-[#444]">{genPreview.words.length} words · {genPreview.language}</div>
              </div>
              <button data-testid="gen-save-btn" onClick={saveGenerated} className="nb-btn nb-btn-secondary">
                <Save size={16} strokeWidth={3}/> Save to my lists
              </button>
            </div>
            <div className="mt-4 grid sm:grid-cols-2 gap-2">
              {genPreview.words.map((w, i) => (
                <div key={i} className="nb-border rounded-lg p-3 bg-[#FAFAFA]">
                  <div className="font-display font-bold">{w.word}</div>
                  <div className="text-sm text-[#444]">{w.definition}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Manual editor */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <h2 className="font-display font-black text-2xl">Your custom lists</h2>
          <button data-testid="new-list-btn" onClick={startEditor} className="nb-btn nb-btn-ghost">
            <Plus size={16} strokeWidth={3}/> New list
          </button>
        </div>

        {editor && (
          <div className="nb-card p-6 mb-5 bg-[#E8F8FF]" data-testid="list-editor">
            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              <div>
                <div className="label-cap mb-1">Name</div>
                <input data-testid="editor-name" value={editor.name} onChange={(e) => updateEditor({ name: e.target.value })} className="nb-input"/>
              </div>
              <div>
                <div className="label-cap mb-1">Language</div>
                <select data-testid="editor-lang" value={editor.language} onChange={(e) => updateEditor({ language: e.target.value })} className="nb-input">
                  {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <div className="label-cap mb-1">Difficulty</div>
                <select data-testid="editor-diff" value={editor.difficulty} onChange={(e) => updateEditor({ difficulty: e.target.value })} className="nb-input">
                  {["easy", "medium", "hard"].map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              {editor.words.map((w, i) => (
                <div key={i} className="grid sm:grid-cols-[1fr_2fr_auto] gap-2">
                  <input data-testid={`editor-word-${i}`} value={w.word} onChange={(e) => updateWord(i, { word: e.target.value })} placeholder="word" className="nb-input"/>
                  <input data-testid={`editor-def-${i}`} value={w.definition} onChange={(e) => updateWord(i, { definition: e.target.value })} placeholder="definition" className="nb-input"/>
                  <button data-testid={`editor-remove-${i}`} onClick={() => removeEditorWord(i)} className="nb-badge bg-[#FFB8D1]"><X size={12} strokeWidth={3}/></button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-3">
              <button data-testid="editor-add-word" onClick={addEditorWord} className="nb-btn nb-btn-ghost"><Plus size={16} strokeWidth={3}/> Add word</button>
              <button data-testid="editor-save" onClick={saveEditor} className="nb-btn"><Save size={16} strokeWidth={3}/> Save list</button>
              <button data-testid="editor-cancel" onClick={() => setEditor(null)} className="nb-btn nb-btn-ghost"><X size={16} strokeWidth={3}/> Cancel</button>
            </div>
          </div>
        )}

        {custom.length === 0 ? (
          <div className="nb-card p-6 bg-white">
            <div className="font-bold">No custom lists yet.</div>
            <div className="text-sm text-[#555]">Generate one above or click <b>New list</b> to write your own.</div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {custom.map((l) => (
              <div key={l.id} className="nb-card p-4 bg-white" data-testid={`custom-${l.id}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-display font-black text-lg">{l.name}</div>
                    <div className="text-sm text-[#444]">{l.words.length} words · {l.language}</div>
                  </div>
                  <button data-testid={`delete-${l.id}`} onClick={() => removeCustom(l.id)} className="nb-badge bg-[#FFB8D1]"><Trash2 size={12} strokeWidth={3}/></button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {l.words.slice(0, 4).map((w) => (
                    <span key={w.word} className="nb-badge bg-[#FFF7DC]">{w.word}</span>
                  ))}
                  {l.words.length > 4 && <span className="nb-badge bg-white">+{l.words.length - 4}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Built-in lists */}
      <section>
        <h2 className="font-display font-black text-2xl mb-4">Built-in packs</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {builtin.map((l) => (
            <div key={l.id} className="nb-card p-4 bg-white" data-testid={`builtin-${l.id}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-display font-black text-lg">{l.name}</div>
                  <div className="text-sm text-[#444]">{l.words.length} words · {l.language}</div>
                </div>
                <span className="nb-badge bg-[#FFD3B6]">{l.difficulty}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {l.words.slice(0, 5).map((w) => (
                  <span key={w.word} className="nb-badge bg-[#FFF7DC]">{w.word}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
