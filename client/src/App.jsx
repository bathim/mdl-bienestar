import { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

const API = "/api/records";

const VARIABLES = [
  { key: "sueno",        label: "Sueño",         unit: "h",   min: 0, max: 12,   step: 0.5, color: "#5b8dd9", icon: "🌙", desc: "Horas dormidas" },
  { key: "digestion",    label: "Digestión",      unit: "/5",  min: 1, max: 5,    step: 1,   color: "#3d7a5e", icon: "🌿", desc: "1=mal · 5=excelente" },
  { key: "ansiedad",     label: "Ansiedad",       unit: "/5",  min: 1, max: 5,    step: 1,   color: "#e07b39", icon: "🧠", desc: "1=alta · 5=tranquilo" },
  { key: "alcohol_ml",   label: "Alcohol",        unit: "ml",  min: 0, max: 4000, step: 100, color: "#c0392b", icon: "🍺", desc: "ml totales consumidos" },
  { key: "agua_ml",      label: "Agua",           unit: "ml",  min: 0, max: 4000, step: 250, color: "#3498db", icon: "💧", desc: "ml de agua consumidos" },
  { key: "ejercicio",    label: "Ejercicio",      unit: "",    min: 0, max: 1,    step: 1,   color: "#e67e22", icon: "🚶", desc: "¿Caminata o actividad física?" },
  { key: "nopal",        label: "Nopal",          unit: "",    min: 0, max: 1,    step: 1,   color: "#5a9e6f", icon: "🌵", desc: "¿Consumiste hoy?" },
  { key: "evento_social",label: "Evento social",  unit: "",    min: 0, max: 1,    step: 1,   color: "#8e44ad", icon: "🤝", desc: "¿Hubo reunión?" },
];

const defaultEntry = () => ({
  fecha: new Date().toISOString().split("T")[0],
  sueno: 7, digestion: 3, ansiedad: 3,
  alcohol_ml: 0, agua_ml: 2000,
  ejercicio: false, nopal: true, evento_social: false,
  notas: "",
});

const toFormEntry = (r) => ({
  ...r,
  ejercicio: r.ejercicio ? 1 : 0,
  nopal: r.nopal ? 1 : 0,
  evento_social: r.evento_social ? 1 : 0,
  sueno: parseFloat(r.sueno) || 7,
});

const toAPIEntry = (e) => ({
  ...e,
  ejercicio: !!e.ejercicio,
  nopal: !!e.nopal,
  evento_social: !!e.evento_social,
});

function formatFecha(isoDate) {
  const [, m, d] = isoDate.split("-");
  return `${d}/${m}`;
}

function weekLabel(isoDate) {
  const d = new Date(isoDate + "T12:00:00");
  const week = Math.ceil(d.getDate() / 7);
  return `S${week} ${d.toLocaleString("es", { month: "short" })}`;
}

function calcStats(records, key) {
  if (!records.length) return { avg: 0, min: 0, max: 0, trend: 0 };
  const vals = records.map(r => typeof r[key] === "boolean" ? (r[key] ? 1 : 0) : +r[key]);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const half = Math.floor(vals.length / 2);
  const avgFirst = vals.slice(0, half || 1).reduce((a, b) => a + b, 0) / (half || 1);
  const avgSecond = vals.slice(half).reduce((a, b) => a + b, 0) / vals.slice(half).length;
  return {
    avg: +avg.toFixed(1),
    min: Math.min(...vals),
    max: Math.max(...vals),
    trend: +(avgSecond - avgFirst).toFixed(1),
  };
}

const SliderInput = ({ variable, value, onChange }) => {
  const isBoolean = variable.max === 1;
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
        <span style={{ fontSize: "0.82rem", fontWeight: 500, color: "#444" }}>{variable.icon} {variable.label}</span>
        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: variable.color }}>
          {isBoolean ? (value ? "Sí ✓" : "No") : `${value}${variable.unit}`}
        </span>
      </div>
      <p style={{ fontSize: "0.68rem", color: "#aaa", margin: "0 0 0.3rem" }}>{variable.desc}</p>
      {isBoolean ? (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {["No", "Sí"].map((label, i) => (
            <button key={i} onClick={() => onChange(i)} style={{
              flex: 1, padding: "0.4rem", borderRadius: "8px",
              border: `2px solid ${value === i ? variable.color : "#e0e0e0"}`,
              background: value === i ? variable.color : "white",
              color: value === i ? "white" : "#888",
              fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
            }}>{label}</button>
          ))}
        </div>
      ) : (
        <input type="range" min={variable.min} max={variable.max} step={variable.step}
          value={value} onChange={e => onChange(+e.target.value)}
          style={{ width: "100%", accentColor: variable.color }} />
      )}
    </div>
  );
};

const StatCard = ({ variable, stats, records }) => {
  const isGoodUp = ["digestion", "ansiedad", "sueno", "agua_ml", "nopal", "ejercicio"].includes(variable.key);
  const trendColor = stats.trend === 0 ? "#999" : ((isGoodUp ? stats.trend > 0 : stats.trend < 0) ? "#3d7a5e" : "#c0392b");
  const chartData = records.slice(-14).map(r => ({
    fecha: formatFecha(r.fecha),
    val: typeof r[variable.key] === "boolean" ? (r[variable.key] ? 1 : 0) : +r[variable.key]
  }));
  return (
    <div style={{ background: "white", borderRadius: "12px", padding: "1rem", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", marginBottom: "0.75rem", borderLeft: `4px solid ${variable.color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <div>
          <div style={{ fontSize: "0.72rem", color: "#999" }}>{variable.icon} {variable.label}</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 700, color: variable.color, lineHeight: 1.1 }}>{stats.avg}{variable.unit}</div>
          <div style={{ fontSize: "0.68rem", color: "#bbb" }}>promedio</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.72rem", color: trendColor, fontWeight: 600 }}>
            {stats.trend === 0 ? "— Estable" : `${stats.trend > 0 ? "↑" : "↓"} ${Math.abs(stats.trend)}${variable.unit}`}
          </div>
          <div style={{ fontSize: "0.65rem", color: "#bbb" }}>tendencia</div>
          <div style={{ fontSize: "0.65rem", color: "#bbb", marginTop: "0.2rem" }}>min {stats.min} · max {stats.max}</div>
        </div>
      </div>
      {chartData.length > 1 && (
        <ResponsiveContainer width="100%" height={50}>
          <LineChart data={chartData}>
            <Line type="monotone" dataKey="val" stroke={variable.color} strokeWidth={2} dot={false} />
            <XAxis dataKey="fecha" hide />
            <YAxis domain={[variable.min, variable.max]} hide />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default function App() {
  const [records, setRecords] = useState([]);
  const [entry, setEntry] = useState(defaultEntry());
  const [view, setView] = useState("registro");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const showStatus = (msg, ms = 2500) => {
    setStatus(msg);
    setTimeout(() => setStatus(""), ms);
  };

  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch(API);
      const data = await res.json();
      setRecords(data.map(toFormEntry));
    } catch {
      showStatus("⚠️ Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toAPIEntry(entry)),
      });
      if (!res.ok) throw new Error();
      await fetchRecords();
      showStatus("✓ Guardado correctamente");
    } catch {
      showStatus("⚠️ Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (fecha) => {
    try {
      await fetch(`${API}/${fecha}`, { method: "DELETE" });
      await fetchRecords();
    } catch {
      showStatus("⚠️ Error al eliminar");
    }
  };

  const weeklyData = () => {
    const grouped = {};
    records.forEach(r => {
      const wk = weekLabel(r.fecha);
      if (!grouped[wk]) grouped[wk] = { label: wk, alcohol_ml: 0, count: 0 };
      grouped[wk].alcohol_ml += +r.alcohol_ml || 0;
      grouped[wk].count++;
    });
    return Object.values(grouped).slice(-8);
  };

  const iasData = () => {
    const wkMap = {};
    records.forEach(r => {
      const wk = weekLabel(r.fecha);
      if (!wkMap[wk]) wkMap[wk] = { label: wk, nopal: 0 };
      if (r.nopal) wkMap[wk].nopal++;
    });
    return Object.entries(wkMap).slice(-6).map(([label, v]) => ({
      label,
      ias: Math.round((v.nopal / 7) * 100),
    }));
  };

  const rachaActiva = () => {
    const sorted = [...records].sort((a, b) => b.fecha.localeCompare(a.fecha));
    let r = 0;
    for (const rec of sorted) {
      if (rec.nopal) r++;
      else break;
    }
    return r;
  };

  const NAV = [
    { key: "registro", label: "Registrar", icon: "✏️" },
    { key: "stats",    label: "Stats",     icon: "📊" },
    { key: "historial",label: "Historial", icon: "📋" },
  ];

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f5f7f5" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem" }}>🌵</div>
        <div style={{ fontSize: "0.85rem", color: "#888", marginTop: "0.5rem" }}>Cargando...</div>
      </div>
    </div>
  );

  const lastIAS = iasData().slice(-1)[0]?.ias ?? 0;
  const iasColor = lastIAS >= 85 ? "#3d7a5e" : lastIAS >= 57 ? "#e67e22" : "#c0392b";
  const iasLabel = lastIAS >= 85 ? "Control consolidado" : lastIAS >= 57 ? "Control en proceso" : lastIAS >= 29 ? "Control inestable" : "Sin control";
  const racha = rachaActiva();

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#f5f7f5", minHeight: "100vh", maxWidth: 480, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ background: "#2d5a42", color: "white", padding: "1.5rem 1.25rem 1rem" }}>
        <div style={{ fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", opacity: 0.6 }}>MDL · Seguimiento personal</div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0.25rem 0 0.15rem" }}>Bienestar & Proceso</h1>
        <p style={{ fontSize: "0.78rem", opacity: 0.7, margin: 0 }}>{records.length} día{records.length !== 1 ? "s" : ""} registrado{records.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Nav */}
      <div style={{ display: "flex", background: "white", borderBottom: "1px solid #e8e8e8" }}>
        {NAV.map(n => (
          <button key={n.key} onClick={() => setView(n.key)} style={{
            flex: 1, padding: "0.75rem 0", border: "none", background: "none",
            fontSize: "0.72rem", fontWeight: 600, cursor: "pointer",
            color: view === n.key ? "#2d5a42" : "#aaa",
            borderBottom: view === n.key ? "2px solid #2d5a42" : "2px solid transparent",
          }}>{n.icon} {n.label}</button>
        ))}
      </div>

      {status && (
        <div style={{ background: status.startsWith("✓") ? "#e8f5ee" : "#fff3cd", padding: "0.5rem 1rem", fontSize: "0.78rem", color: status.startsWith("✓") ? "#2d5a42" : "#856404", textAlign: "center", fontWeight: 600 }}>
          {status}
        </div>
      )}

      <div style={{ padding: "1rem 1rem 5rem" }}>

        {/* REGISTRO */}
        {view === "registro" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#999" }}>Registrando el</div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                  {new Date(entry.fecha + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
                </div>
              </div>
              <input type="date" value={entry.fecha}
                onChange={e => setEntry({ ...entry, fecha: e.target.value })}
                style={{ fontSize: "0.75rem", padding: "0.3rem 0.5rem", borderRadius: "8px", border: "1px solid #ddd" }} />
            </div>

            {records.find(r => r.fecha === entry.fecha) && (
              <div style={{ background: "#fff8e6", border: "1px solid #f0d080", borderRadius: "8px", padding: "0.5rem 0.75rem", fontSize: "0.75rem", color: "#7a6000", marginBottom: "0.75rem" }}>
                ⚠️ Ya existe registro para este día — guardar lo actualizará.
              </div>
            )}

            {VARIABLES.map(v => (
              <SliderInput key={v.key} variable={v}
                value={entry[v.key] ?? (v.max === 1 ? 0 : v.min)}
                onChange={val => setEntry({ ...entry, [v.key]: val })} />
            ))}

            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 500, color: "#666", marginBottom: "0.3rem" }}>📝 Notas del día</div>
              <textarea value={entry.notas}
                onChange={e => setEntry({ ...entry, notas: e.target.value })}
                placeholder="Cómo te sentiste, qué comiste, eventos destacados..."
                rows={3}
                style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ddd", fontSize: "0.82rem", resize: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>

            <button onClick={handleSave} disabled={saving} style={{
              width: "100%", padding: "0.9rem",
              background: saving ? "#888" : "#2d5a42",
              color: "white", border: "none", borderRadius: "10px",
              fontSize: "0.9rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
            }}>
              {saving ? "Guardando..." : "Guardar registro"}
            </button>
          </div>
        )}

        {/* STATS */}
        {view === "stats" && (
          <div>
            {records.length < 3 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#aaa" }}>
                <div style={{ fontSize: "2rem" }}>📊</div>
                <div style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>Registra al menos 3 días para ver estadísticas</div>
              </div>
            ) : (
              <>
                {/* IAS */}
                <div style={{ background: "white", borderRadius: "12px", padding: "1rem", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", marginBottom: "0.75rem", borderLeft: "4px solid #5a9e6f" }}>
                  <div style={{ fontSize: "0.72rem", color: "#999", fontWeight: 600, marginBottom: "0.75rem" }}>🌵 ÍNDICE DE ADHERENCIA AL NOPAL (IAS)</div>
                  <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem" }}>
                    <div style={{ flex: 1, textAlign: "center", background: "#f5faf7", borderRadius: "8px", padding: "0.6rem" }}>
                      <div style={{ fontSize: "1.8rem", fontWeight: 700, color: iasColor }}>{lastIAS}%</div>
                      <div style={{ fontSize: "0.65rem", color: "#888" }}>IAS esta semana</div>
                      <div style={{ fontSize: "0.68rem", fontWeight: 600, color: iasColor }}>{iasLabel}</div>
                    </div>
                    <div style={{ flex: 1, textAlign: "center", background: "#f5faf7", borderRadius: "8px", padding: "0.6rem" }}>
                      <div style={{ fontSize: "1.8rem", fontWeight: 700, color: racha >= 21 ? "#3d7a5e" : racha >= 7 ? "#e67e22" : "#c0392b" }}>{racha}</div>
                      <div style={{ fontSize: "0.65rem", color: "#888" }}>días de racha</div>
                      <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "#aaa" }}>{racha >= 21 ? "✓ Hábito instalado" : racha >= 7 ? "En consolidación" : "Construyendo"}</div>
                    </div>
                  </div>
                  {iasData().length > 1 && (
                    <>
                      <div style={{ fontSize: "0.65rem", color: "#bbb", marginBottom: "0.3rem" }}>IAS semanal (%)</div>
                      <ResponsiveContainer width="100%" height={70}>
                        <BarChart data={iasData()}>
                          <Bar dataKey="ias" fill="#5a9e6f" radius={[4,4,0,0]} />
                          <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                          <YAxis domain={[0,100]} hide />
                          <Tooltip formatter={v => [`${v}%`, "IAS"]} />
                          <ReferenceLine y={85} stroke="#3d7a5e" strokeDasharray="3 3" />
                          <ReferenceLine y={57} stroke="#e67e22" strokeDasharray="3 3" />
                        </BarChart>
                      </ResponsiveContainer>
                    </>
                  )}
                </div>

                {/* Stats por variable */}
                {VARIABLES.filter(v => v.max > 1).map(v => (
                  <StatCard key={v.key} variable={v} stats={calcStats(records, v.key)} records={records} />
                ))}

                {/* Adherencia binaria */}
                <div style={{ background: "white", borderRadius: "12px", padding: "1rem", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", marginBottom: "0.75rem" }}>
                  <div style={{ fontSize: "0.72rem", color: "#999", fontWeight: 600, marginBottom: "0.75rem" }}>ADHERENCIA</div>
                  {[
                    { key: "nopal", label: "🌵 Nopal", color: "#5a9e6f" },
                    { key: "ejercicio", label: "🚶 Ejercicio", color: "#e67e22" },
                    { key: "evento_social", label: "🤝 Eventos sociales", color: "#8e44ad" },
                  ].map(item => {
                    const count = records.filter(r => r[item.key]).length;
                    const pct = Math.round((count / records.length) * 100);
                    return (
                      <div key={item.key} style={{ marginBottom: "0.6rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "0.2rem" }}>
                          <span>{item.label}</span>
                          <span style={{ fontWeight: 700, color: item.color }}>{pct}% ({count}/{records.length})</span>
                        </div>
                        <div style={{ height: "6px", background: "#f0f0f0", borderRadius: "3px" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: item.color, borderRadius: "3px" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Alcohol semanal */}
                {weeklyData().length > 1 && (
                  <div style={{ background: "white", borderRadius: "12px", padding: "1rem", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", marginBottom: "0.75rem" }}>
                    <div style={{ fontSize: "0.72rem", color: "#999", fontWeight: 600, marginBottom: "0.75rem" }}>🍺 Alcohol semanal (ml)</div>
                    <ResponsiveContainer width="100%" height={100}>
                      <BarChart data={weeklyData()}>
                        <Bar dataKey="alcohol_ml" fill="#c0392b" radius={[4,4,0,0]} />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                        <YAxis hide />
                        <Tooltip formatter={v => [`${v} ml`, "Alcohol"]} />
                        <ReferenceLine y={1000} stroke="#e07b39" strokeDasharray="3 3" />
                      </BarChart>
                    </ResponsiveContainer>
                    <div style={{ fontSize: "0.62rem", color: "#bbb", textAlign: "center" }}>referencia: 1,000ml/semana</div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* HISTORIAL */}
        {view === "historial" && (
          <div>
            {records.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#aaa" }}>
                <div style={{ fontSize: "2rem" }}>📋</div>
                <div style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>No hay registros aún</div>
              </div>
            ) : (
              [...records].reverse().map(r => (
                <div key={r.fecha} style={{ background: "white", borderRadius: "10px", padding: "0.85rem 1rem", marginBottom: "0.6rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#333" }}>
                        {new Date(r.fecha + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.4rem" }}>
                        {VARIABLES.map(v => (
                          <span key={v.key} style={{ fontSize: "0.65rem", background: "#f5f5f5", padding: "0.1rem 0.4rem", borderRadius: "8px", color: "#555" }}>
                            {v.icon} {v.max === 1 ? (r[v.key] ? "✓" : "—") : `${r[v.key] ?? "—"}${v.unit}`}
                          </span>
                        ))}
                      </div>
                      {r.notas ? <div style={{ fontSize: "0.72rem", color: "#888", marginTop: "0.4rem", fontStyle: "italic" }}>"{r.notas}"</div> : null}
                    </div>
                    <div style={{ display: "flex", gap: "0.4rem", marginLeft: "0.5rem" }}>
                      <button onClick={() => { setEntry(r); setView("registro"); }} style={{ background: "#e8f5ee", border: "none", borderRadius: "6px", padding: "0.3rem 0.5rem", fontSize: "0.7rem", cursor: "pointer", color: "#2d5a42" }}>✏️</button>
                      <button onClick={() => handleDelete(r.fecha)} style={{ background: "#fdecea", border: "none", borderRadius: "6px", padding: "0.3rem 0.5rem", fontSize: "0.7rem", cursor: "pointer", color: "#c0392b" }}>🗑</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}
