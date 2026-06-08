import { useMemo } from "react";
import { getAllBuiltinLists, LANGUAGES } from "../lib/wordLists";
import { getCustomLists } from "../lib/storage";
import { Sparkles, BookmarkPlus } from "lucide-react";

export default function ListPicker({ value, onChange, language, onLanguageChange, testIdPrefix = "list" }) {
  const builtin = useMemo(() => getAllBuiltinLists(), []);
  const custom = useMemo(() => getCustomLists(), []);
  const filtered = useMemo(() => {
    const all = [...builtin, ...custom.map((c) => ({ ...c, custom: true }))];
    return language ? all.filter((l) => l.language === language) : all;
  }, [builtin, custom, language]);

  return (
    <div className="space-y-4">
      <div>
        <div className="label-cap mb-2">Language</div>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              data-testid={`${testIdPrefix}-lang-${l.code}`}
              onClick={() => onLanguageChange(l.code)}
              className={`nb-badge ${
                language === l.code ? "bg-[#121212] text-white" : "bg-white"
              }`}
              style={language === l.code ? { color: "#fff" } : {}}
            >
              <span className="font-mono">{l.flag}</span> {l.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="label-cap mb-2">Choose a list ({filtered.length})</div>
        {filtered.length === 0 ? (
          <div className="nb-card p-5 bg-[#FFF5E6]">
            <div className="font-bold">No lists yet for this language.</div>
            <div className="text-sm">Head to <span className="font-bold">Word Lists</span> to generate one with AI or create your own.</div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((l) => (
              <button
                key={l.id}
                data-testid={`${testIdPrefix}-pick-${l.id}`}
                onClick={() => onChange(l)}
                className={`nb-card text-left p-4 ${
                  value?.id === l.id ? "bg-[#A8E6CF]" : "bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="nb-badge bg-[#FFD3B6]">{l.difficulty}</span>
                  <span className="nb-badge bg-white">
                    {l.custom ? <BookmarkPlus size={12} strokeWidth={3} /> : <Sparkles size={12} strokeWidth={3} />}
                    {l.custom ? "Custom" : "Pack"}
                  </span>
                </div>
                <div className="font-display font-black text-lg mt-3">{l.name}</div>
                <div className="text-sm text-[#444]">{l.words.length} words · {l.theme}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
