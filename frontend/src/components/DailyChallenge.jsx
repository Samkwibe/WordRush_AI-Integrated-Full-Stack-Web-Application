import { useEffect, useState } from "react";
import { fetchDailyChallenge } from "../lib/api";
import { useNavigate } from "react-router-dom";
import { Flame, Calendar, ArrowRight } from "lucide-react";
import { getStats } from "../lib/storage";

export default function DailyChallenge() {
  const [d, setD] = useState(null);
  const [streak, setStreak] = useState(getStats().streak);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDailyChallenge().then(setD).catch(() => setD(null));
    setStreak(getStats().streak);
  }, []);

  if (!d) return null;

  const target = d.mode === "flash" ? "/flash" : d.mode === "speed" ? "/speed-read" : "/match";

  return (
    <section className="nb-card p-6 sm:p-7 bg-[#FFB8D1]" data-testid="daily-challenge">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="nb-badge bg-white"><Calendar size={12} strokeWidth={3}/> Today</span>
        <span className="nb-badge bg-[#FFD3B6]"><Flame size={12} strokeWidth={3}/> Streak {streak?.current ?? 0}d</span>
        <span className="nb-badge bg-white">{d.difficulty}</span>
        <span className="nb-badge bg-white capitalize">{d.mode}</span>
      </div>
      <h2 className="font-display font-black text-2xl sm:text-3xl mt-3">{d.title}</h2>
      <p className="text-[#1f1f1f] mt-1">Theme: <b>{d.theme}</b> · Language: <b>{d.language}</b></p>
      <button
        data-testid="daily-start-btn"
        onClick={() => navigate(`${target}?daily=1&theme=${encodeURIComponent(d.theme)}&difficulty=${d.difficulty}&language=${d.language}`)}
        className="nb-btn mt-4"
      >
        Start daily <ArrowRight size={16} strokeWidth={3}/>
      </button>
    </section>
  );
}
