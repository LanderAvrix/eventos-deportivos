import { useState, useEffect } from "react";
import { db, auth } from "./firebase";
import {
  collection, doc, onSnapshot, setDoc, deleteDoc, updateDoc, addDoc
} from "firebase/firestore";
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  reauthenticateWithCredential, EmailAuthProvider
} from "firebase/auth";

// ─── DATOS DEL TORNEO ────────────────────────────────────────────────────────

const BOMBOS = [
  {
    id: 1, name: "Bombo 1", color: "#FFD700",
    desc: "Elige 1 pareja — Los favoritos",
    pick: 1,
    parejas: ["TXIKITO - GALLAGA","GARMENDIA - SALAZAR","GOMEZ - SAGREDO",
              "ARRUTIA - PRIETO","ARENAZA - OMEÑACA","AGIRRE - POBLACION"]
  },
  {
    id: 2, name: "Bombo 2", color: "#C0C0C0",
    desc: "Elige 2 parejas",
    pick: 2,
    parejas: ["GUERRA - ETXEBARRIA","MARIN - ALVAREZ","ALAVA - ARROITA",
              "BALENZIAGA - IBAÑEZ","LASAGABASTER - CARRETERO","EGURBIDE - SAENZ DE BURUAGA"]
  },
  {
    id: 3, name: "Bombo 3", color: "#CD7F32",
    desc: "Elige 2 parejas",
    pick: 2,
    parejas: ["GONDRA - HERNANDEZ","AMIGO - AMIGO","GUEVARA - ZABALA",
              "DE MARCOS - SUSAETA","ORS - ORS","MELERO - ALBERDI"]
  },
];

// Todas las parejas del torneo
const ALL_PAREJAS = BOMBOS.flatMap(b => b.parejas);

// Partidos de la fase de liga (P1–P27)
// phase: "liga" | "playin" | "semis" | "final" | "tercero"
// puntua: true = cuenta para la porra
const CALENDAR = [
  {id:"P1",  fecha:"2026-04-13", hora:"19:15", local:"EGURBIDE - SAENZ DE BURUAGA", visitante:"ARRUTIA - PRIETO",       phase:"liga"},
  {id:"P2",  fecha:"2026-04-13", hora:"20:00", local:"GOMEZ - SAGREDO",              visitante:"GUERRA - ETXEBARRIA",    phase:"liga"},
  {id:"P10", fecha:"2026-04-13", hora:"21:00", local:"MELERO - ALBERDI",             visitante:"GONDRA - HERNANDEZ",     phase:"liga"},
  {id:"P6",  fecha:"2026-04-20", hora:"19:00", local:"GUERRA - ETXEBARRIA",          visitante:"GARMENDIA - SALAZAR",    phase:"liga"},
  {id:"P4",  fecha:"2026-04-20", hora:"20:00", local:"TXIKITO - GALLAGA",            visitante:"ALAVA - ARROITA",        phase:"liga"},
  {id:"P5",  fecha:"2026-04-20", hora:"21:00", local:"GOMEZ - SAGREDO",              visitante:"MARIN - ALVAREZ",        phase:"liga"},
  {id:"P3",  fecha:"2026-04-27", hora:"19:00", local:"LASAGABASTER - CARRETERO",     visitante:"GONDRA - HERNANDEZ",     phase:"liga"},
  {id:"P11", fecha:"2026-04-27", hora:"20:00", local:"GUEVARA - ZABALA",             visitante:"EGURBIDE - SAENZ DE BURUAGA", phase:"liga"},
  {id:"P12", fecha:"2026-04-27", hora:"21:00", local:"MELERO - ALBERDI",             visitante:"ARENAZA - OMEÑACA",      phase:"liga"},
  {id:"P9",  fecha:"2026-04-28", hora:"19:30", local:"DE MARCOS - SUSAETA",          visitante:"TXIKITO - GALLAGA",      phase:"liga"},
  {id:"P8",  fecha:"2026-04-28", hora:"20:15", local:"BALENZIAGA - IBAÑEZ",          visitante:"AMIGO - AMIGO",          phase:"liga"},
  {id:"P13", fecha:"2026-05-04", hora:"19:00", local:"AGIRRE - POBLACION",           visitante:"LASAGABASTER - CARRETERO", phase:"liga"},
  {id:"P14", fecha:"2026-05-04", hora:"20:00", local:"ORS - ORS",                    visitante:"AMIGO - AMIGO",          phase:"liga"},
  {id:"P15", fecha:"2026-05-05", hora:"19:30", local:"AMIGO - AMIGO",                visitante:"AGIRRE - POBLACION",     phase:"liga"},
  {id:"P7",  fecha:"2026-05-05", hora:"20:15", local:"ALAVA - ARROITA",              visitante:"BALENZIAGA - IBAÑEZ",    phase:"liga"},
  {id:"P16", fecha:"2026-05-06", hora:"21:00", local:"ARENAZA - OMEÑACA",            visitante:"GOMEZ - SAGREDO",        phase:"liga"},
  {id:"P26", fecha:"2026-05-07", hora:"19:30", local:"ARRUTIA - PRIETO",             visitante:"AGIRRE - POBLACION",     phase:"liga"},
  {id:"P19", fecha:"2026-05-07", hora:"20:15", local:"GONDRA - HERNANDEZ",           visitante:"DE MARCOS - SUSAETA",    phase:"liga"},
  {id:"P20", fecha:"2026-05-07", hora:"21:00", local:"MARIN - ALVAREZ",              visitante:"EGURBIDE - SAENZ DE BURUAGA", phase:"liga"},
  {id:"P27", fecha:"2026-05-11", hora:"12:00", local:"ARENAZA - OMEÑACA",            visitante:"BALENZIAGA - IBAÑEZ",    phase:"liga"},
  {id:"P22", fecha:"2026-05-11", hora:"19:00", local:"LASAGABASTER - CARRETERO",     visitante:"GUERRA - ETXEBARRIA",    phase:"liga"},
  {id:"P24", fecha:"2026-05-11", hora:"20:00", local:"ORS - ORS",                    visitante:"ALAVA - ARROITA",        phase:"liga"},
  {id:"P21", fecha:"2026-05-11", hora:"21:00", local:"GUEVARA - ZABALA",             visitante:"MELERO - ALBERDI",       phase:"liga"},
  {id:"P25", fecha:"2026-05-12", hora:"19:30", local:"TXIKITO - GALLAGA",            visitante:"GARMENDIA - SALAZAR",    phase:"liga"},
  {id:"P17", fecha:"2026-05-13", hora:"21:00", local:"ARRUTIA - PRIETO",             visitante:"GUEVARA - ZABALA",       phase:"liga"},
  {id:"P18", fecha:"2026-05-14", hora:"19:30", local:"GARMENDIA - SALAZAR",          visitante:"ORS - ORS",              phase:"liga"},
  {id:"P23", fecha:"2026-05-14", hora:"20:15", local:"MARIN - ALVAREZ",              visitante:"DE MARCOS - SUSAETA",    phase:"liga"},
  // Play-In (NO puntúa para la porra)
  {id:"PIN1", fecha:"2026-05-18", hora:"19:00", local:"3º",              visitante:"10º",             phase:"playin"},
  {id:"PIN2", fecha:"2026-05-18", hora:"20:00", local:"4º",              visitante:"9º",              phase:"playin"},
  {id:"PIN3", fecha:"2026-05-19", hora:"19:30", local:"5º",              visitante:"8º",              phase:"playin"},
  {id:"PIN4", fecha:"2026-05-19", hora:"20:30", local:"6º",              visitante:"7º",              phase:"playin"},
  {id:"PIN5", fecha:"2026-05-21", hora:"19:30", local:"Ganador PIN1",    visitante:"Ganador PIN4",    phase:"playin"},
  {id:"PIN6", fecha:"2026-05-21", hora:"20:30", local:"Ganador PIN2",    visitante:"Ganador PIN3",    phase:"playin"},
  // Semifinales (SÍ puntúa)
  {id:"S1",  fecha:"2026-05-25", hora:"19:00", local:"1º",              visitante:"Peor Play-In",    phase:"semis"},
  {id:"S2",  fecha:"2026-05-25", hora:"20:00", local:"2º",              visitante:"Mejor Play-In",   phase:"semis"},
  // 3º y 4º puesto
  {id:"3P",  fecha:"2026-05-26", hora:"19:30", local:"Perdedor S1",     visitante:"Perdedor S2",     phase:"tercero"},
  // Final (SÍ puntúa)
  {id:"F",   fecha:"2026-05-28", hora:"20:15", local:"Ganador S1",      visitante:"Ganador S2",      phase:"final"},
];

// Fases que puntúan para la porra
const PUNTUA = (phase) => ["liga","semis","final"].includes(phase);

// ─── PUNTUACIÓN (Champions: 4 pts 2-0, 3+1 pts 2-1) ────────────────────────

const puntosPorPartido = (result) => {
  // result: { winner: "local"|"visitante", sets: [a,b] o [a,b,c] }
  if (!result || !result.winner) return { local: 0, visitante: 0 };
  const sets = result.sets || [];
  const ganadorLocal = result.winner === "local";
  if (sets.length === 2) {
    // Victoria 2-0
    return ganadorLocal ? { local: 4, visitante: 0 } : { local: 0, visitante: 4 };
  } else if (sets.length === 3) {
    // Victoria 2-1
    return ganadorLocal ? { local: 3, visitante: 1 } : { local: 1, visitante: 3 };
  }
  return { local: 0, visitante: 0 };
};

const computeParejaPuntos = (pareja, matches) => {
  let pts = 0, jugados = 0, ganados = 0;
  for (const m of matches) {
    if (!PUNTUA(m.phase)) continue;
    if (!m.result || !m.result.winner) continue;
    const esLocal = m.local === pareja;
    const esVisitante = m.visitante === pareja;
    if (!esLocal && !esVisitante) continue;
    jugados++;
    const p = puntosPorPartido(m.result);
    if (esLocal) { pts += p.local; if (p.local > p.visitante) ganados++; }
    else { pts += p.visitante; if (p.visitante > p.local) ganados++; }
  }
  return { pts, jugados, ganados };
};

const computeParticipantePuntos = (participante, matches) => {
  const picks = participante.picks || {};
  const misParejas = [
    picks.bombo1,
    ...(picks.bombo2 || []),
    ...(picks.bombo3 || []),
  ].filter(Boolean);
  let total = 0;
  const detalle = {};
  for (const p of misParejas) {
    const r = computeParejaPuntos(p, matches);
    total += r.pts;
    detalle[p] = r;
  }
  return { pts: total, detalle, misParejas };
};

// ─── TABLA DE LIGA (para seguimiento del torneo) ─────────────────────────────

const computeTablaTorneo = (matches) => {
  const stats = {};
  for (const p of ALL_PAREJAS) {
    stats[p] = { jugados: 0, ganados: 0, perdidos: 0, pts: 0, tantosFavor: 0, tantosContra: 0, pareja: p };
  }
  for (const m of matches) {
    if (m.phase !== "liga") continue;
    if (!m.result || !m.result.winner) continue;
    const { local, visitante } = m;
    if (!stats[local] || !stats[visitante]) continue;
    stats[local].jugados++;
    stats[visitante].jugados++;
    const p = puntosPorPartido(m.result);
    stats[local].pts += p.local;
    stats[visitante].pts += p.visitante;
    if (m.result.winner === "local") {
      stats[local].ganados++;
      stats[visitante].perdidos++;
    } else {
      stats[visitante].ganados++;
      stats[local].perdidos++;
    }
    // Tantos de cada set
    for (const set of (m.result.sets || [])) {
      if (!set) continue;
      const l = set.l ?? set[0] ?? 0;
      const v = set.v ?? set[1] ?? 0;
      stats[local].tantosFavor += Number(l);
      stats[local].tantosContra += Number(v);
      stats[visitante].tantosFavor += Number(v);
      stats[visitante].tantosContra += Number(l);
    }
  }

  // Función para obtener resultado directo entre dos parejas
  const directResult = (a, b) => {
    const m = matches.find(m => m.phase === "liga" && m.result?.winner &&
      ((m.local === a && m.visitante === b) || (m.local === b && m.visitante === a)));
    if (!m) return null;
    const aWon = (m.local === a && m.result.winner === "local") ||
                 (m.visitante === a && m.result.winner === "visitante");
    return aWon ? 1 : -1;
  };

  return Object.values(stats).sort((a, b) => {
    // 1. Puntos
    if (b.pts !== a.pts) return b.pts - a.pts;
    // 2. Enfrentamiento directo
    const direct = directResult(a.pareja, b.pareja);
    if (direct !== null) return -direct; // -1 = a ganó = a va antes
    // 3. Partidos ganados
    if (b.ganados !== a.ganados) return b.ganados - a.ganados;
    // 4. Diferencia de tantos
    const diffA = a.tantosFavor - a.tantosContra;
    const diffB = b.tantosFavor - b.tantosContra;
    if (diffB !== diffA) return diffB - diffA;
    // 5. Tantos a favor
    if (b.tantosFavor !== a.tantosFavor) return b.tantosFavor - a.tantosFavor;
    return a.pareja.localeCompare(b.pareja);
  });
};

// ─── CSS ────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Lora:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#06080e;}
::-webkit-scrollbar{width:5px;}
::-webkit-scrollbar-track{background:#0b0e18;}
::-webkit-scrollbar-thumb{background:#c9272760;border-radius:3px;}
.app{min-height:100vh;background:#06080e;color:#e2d9c5;font-family:'Lora',Georgia,serif;}
.refresh-btn{display:none;position:fixed;bottom:1.2rem;right:1.2rem;width:48px;height:48px;border-radius:50%;background:#c92727;color:#fff;border:none;font-size:1.3rem;cursor:pointer;box-shadow:0 2px 12px #c9272760;z-index:999;align-items:center;justify-content:center;}
@media(max-width:600px){.refresh-btn{display:flex;}}
.hdr{background:linear-gradient(150deg,#1a0808 0%,#06080e 45%,#1a0808 100%);padding:1.8rem 1.5rem 1.2rem;text-align:center;border-bottom:1px solid #c9272728;position:relative;overflow:hidden;}
.hdr::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(55deg,transparent,transparent 35px,#ffffff03 35px,#ffffff03 36px);pointer-events:none;}
.htrophy{font-size:2.6rem;display:block;filter:drop-shadow(0 0 16px #c9272799);cursor:pointer;}
.htitle{font-family:'Bebas Neue',sans-serif;font-size:2.4rem;color:#c92727;letter-spacing:.1em;line-height:1;text-shadow:0 0 40px #c9272744;}
.hsub{color:#5a3232;font-size:.72rem;letter-spacing:.12em;margin-top:.3rem;text-transform:uppercase;}
.hbadge{display:inline-block;background:#c9272720;border:1px solid #c9272740;color:#c92727;border-radius:12px;padding:.18rem .7rem;font-size:.72rem;margin-top:.5rem;letter-spacing:.06em;}
.nav{display:flex;background:#090c15;border-bottom:1px solid #12172a;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
.nav::-webkit-scrollbar{display:none;}
.nb{flex:0 0 auto;padding:.75rem .9rem;border:none;border-bottom:3px solid transparent;background:transparent;color:#5a5a70;cursor:pointer;font-family:'Lora',serif;font-size:.78rem;transition:all .2s;white-space:nowrap;}
.nb:hover{color:#c92727;background:#c9272708;}
.nb.on{color:#c92727;border-bottom-color:#c92727;background:#c9272710;}
.sec{max-width:740px;margin:0 auto;padding:1.1rem;}
.card{background:#090c15;border:1px solid #12172a;border-radius:8px;padding:1.2rem;margin-bottom:.9rem;}
.card-red{border-color:#c9272740;}
.card-danger{border-color:#c9222244;}
.ct{font-family:'Bebas Neue',sans-serif;font-size:1.3rem;color:#c92727;letter-spacing:.06em;margin-bottom:.9rem;}
.lbl{color:#c9272799;font-size:.8rem;text-transform:uppercase;letter-spacing:.09em;display:block;margin:.85rem 0 .3rem;}
.inp{width:100%;background:#06080e;border:1px solid #1c2135;color:#e2d9c5;padding:.62rem .85rem;border-radius:4px;font-family:inherit;font-size:1rem;outline:none;transition:border .2s;}
.inp:focus{border-color:#c92727;}
.sel{background:#06080e;border:1px solid #1c2135;color:#e2d9c5;padding:.48rem .7rem;border-radius:4px;font-family:inherit;font-size:.82rem;outline:none;}
.btn{padding:.62rem 1.4rem;background:#c92727;color:#fff;border:none;border-radius:4px;cursor:pointer;font-family:'Bebas Neue',sans-serif;font-size:1rem;letter-spacing:.06em;transition:all .2s;}
.btn:hover{background:#e03030;transform:translateY(-1px);}
.btn-g{background:transparent;border:1px solid #c9272760;color:#c92727;}
.btn-g:hover{background:#c9272712;}
.btn-ok{background:#0a280a;color:#5ec85e;border:1px solid #286a28;}
.btn-ok:hover{background:#0d380d;}
.btn-danger{background:#1a0808;color:#e05555;border:1px solid #5a1818;}
.btn-sm{padding:.3rem .65rem;font-size:.82rem;}
.btn-del{background:transparent;border:none;color:#e0555544;cursor:pointer;font-size:.85rem;padding:.1rem .25rem;}
.btn-del:hover{color:#e05555;}
.chip{display:inline-block;padding:.32rem .75rem;margin:.18rem;border-radius:14px;cursor:pointer;font-size:.8rem;border:1px solid #1c2135;background:#090c15;color:#666;transition:all .15s;}
.chip:hover{border-color:#c9272760;color:#c9272799;}
.chip.on{border-color:#c92727;background:#c9272720;color:#c92727;}
.chip.dis{opacity:.4;cursor:not-allowed;}
.lb-row{display:flex;align-items:flex-start;gap:.8rem;padding:.85rem .9rem;border-radius:6px;margin-bottom:.4rem;border:1px solid #12172a;cursor:pointer;transition:border .15s;}
.lb-row:hover{border-color:#c9272730;}
.lb-pts{font-family:'Bebas Neue',sans-serif;font-size:2rem;color:#c92727;min-width:50px;text-align:right;line-height:1;}
.lb-name{font-size:1rem;font-weight:600;}
.tag{display:inline-block;padding:.1rem .55rem;border-radius:9px;font-size:.72rem;margin:.08rem;}
.tag-b1{background:#2e2400;color:#c9a227;border:1px solid #5a3810;}
.tag-b2{background:#1e1e1e;color:#C0C0C0;border:1px solid #404040;}
.tag-b3{background:#1e1008;color:#CD7F32;border:1px solid #5a3010;}
.tag-open{background:#0a280a;color:#5ec85e;border:1px solid #286a28;}
.tag-closed{background:#280a0a;color:#e05555;border:1px solid #6a2828;}
.match-row{display:flex;align-items:center;justify-content:space-between;padding:.55rem .7rem;border-bottom:1px solid #0b0e18;font-size:.82rem;gap:.5rem;}
.match-row:last-child{border-bottom:none;}
.match-teams{flex:1;display:flex;flex-direction:column;gap:.18rem;}
.match-local{color:#e2d9c5;font-weight:600;font-size:.78rem;}
.match-visit{color:#888;font-size:.78rem;}
.match-score{font-family:'Bebas Neue',sans-serif;font-size:1.3rem;color:#c92727;min-width:60px;text-align:center;}
.match-score.pend{color:#333;font-size:.75rem;font-family:'Lora',serif;}
.match-hora{color:#444;font-size:.7rem;min-width:38px;text-align:right;}
.match-phase{font-size:.65rem;padding:.08rem .4rem;border-radius:6px;margin-left:.3rem;}
.phase-liga{background:#06080e;color:#555;border:1px solid #1c2135;}
.phase-playin{background:#080a18;color:#4466aa;border:1px solid #223366;}
.phase-semis{background:#180a28;color:#cc88ff;border:1px solid #6a389a;}
.phase-final{background:#2e2400;color:#c9a227;border:1px solid #5a3810;}
.phase-tercero{background:#0a1a0a;color:#5ec85e;border:1px solid #286a28;}
.tabla-row{display:grid;grid-template-columns:1.2rem 1fr 2rem 2rem 2rem 2.5rem;gap:.3rem;align-items:center;padding:.38rem .5rem;border-bottom:1px solid #0b0e18;font-size:.78rem;}
.tabla-hdr{color:#444;font-size:.68rem;text-transform:uppercase;letter-spacing:.05em;}
.pos1{color:#FFD700;font-weight:bold;}
.pos2{color:#C0C0C0;}
.pos3{color:#CD7F32;}
.stat-g{display:flex;gap:1.4rem;flex-wrap:wrap;}
.stat{text-align:center;}
.stn{font-family:'Bebas Neue',sans-serif;font-size:2.2rem;color:#c92727;line-height:1;}
.stl{font-size:.72rem;color:#444;text-transform:uppercase;letter-spacing:.06em;margin-top:.12rem;}
.row{display:flex;align-items:center;gap:.55rem;flex-wrap:wrap;}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;}
.fade{animation:fadeIn .28s ease;}
@keyframes fadeIn{from{opacity:0;transform:translateY(5px);}to{opacity:1;transform:translateY(0);}}
.loading{text-align:center;padding:3rem;color:#444;font-style:italic;}
.success-box{text-align:center;padding:1.8rem;}
.num-inp{width:52px;background:#06080e;border:1px solid #1c2135;color:#e2d9c5;padding:.38rem .45rem;border-radius:4px;font-family:inherit;font-size:.85rem;text-align:center;outline:none;}
.bombo-card{border-radius:8px;padding:.9rem 1rem;margin-bottom:.7rem;border:1px solid;}
.bombo-title{font-family:'Bebas Neue',sans-serif;font-size:1.1rem;letter-spacing:.06em;display:flex;align-items:center;gap:.5rem;margin-bottom:.25rem;}
.bombo-desc{font-size:.75rem;color:#555;margin-bottom:.6rem;}
.expand-btn{background:transparent;border:none;color:#c9272760;cursor:pointer;font-size:.8rem;padding:.2rem .4rem;}
.expand-btn:hover{color:#c92727;}
.solidarity-bar{background:linear-gradient(90deg,#c9272720,#c9272710);border:1px solid #c9272730;border-radius:6px;padding:.6rem 1rem;margin-bottom:.7rem;font-size:.8rem;color:#c92727;display:flex;align-items:center;gap:.5rem;}
`;

const medalBg = (i) => ["#2e1010","#1e1e1e","#1e1000"][i] || "#0d1020";
const medalBorder = (i) => ["#c92727","#909090","#9a5a20"][i] || "#12172a";

const phaseName = (phase) => ({
  liga: "Liga", playin: "Play-In", semis: "Semifinal",
  tercero: "3er/4º", final: "Final"
}[phase] || phase);

const phaseClass = (phase) => `match-phase phase-${phase}`;

const formatFecha = (f) => {
  if (!f) return "";
  const [y, m, d] = f.split("-");
  const dias = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
  const meses = ["","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  return `${dias[dt.getDay()]} ${Number(d)} ${meses[Number(m)]}`;
};

// ─── APP ─────────────────────────────────────────────────────────────────────

export default function App() {
  const isAdminUrl = window.location.search.includes("athletic_1898");
  const [adminTaps, setAdminTaps] = useState(0);
  const [adminUnlocked, setAdminUnlocked] = useState(isAdminUrl);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Firestore state
  const [participants, setParticipants] = useState([]);
  const [matches, setMatches] = useState([]);
  const [config, setConfig] = useState({
    registrationOpen: true, charityName: "", prizeDesc: "",
    champion: null, finalist: null, third: null
  });
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("home");

  // Admin form
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminErr, setAdminErr] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  // Registro porra
  const [rName, setRName] = useState("");
  const [rSurname, setRSurname] = useState("");
  const [rPwd, setRPwd] = useState("");
  const [rPicks, setRPicks] = useState({ bombo1: null, bombo2: [], bombo3: [] });
  const [rErr, setRErr] = useState("");
  const [rOk, setROk] = useState(false);

  // Editar porra
  const [editMode, setEditMode] = useState(false);
  const [editLoginName, setEditLoginName] = useState("");
  const [editLoginPwd, setEditLoginPwd] = useState("");
  const [editLoginErr, setEditLoginErr] = useState("");
  const [editParticipant, setEditParticipant] = useState(null);

  // Admin match entry
  const [nm, setNm] = useState({ matchId: null, local: "", visitante: "", sets: [], winner: "", phase: "liga", fecha: "" });
  const [sLocal, setSLocal] = useState(["","",""]);
  const [sVisit, setSVisit] = useState(["","",""]);

  // UI
  const [expandedLb, setExpandedLb] = useState(null);
  const [tablaTab, setTablaTab] = useState("porra");
  const [calFilter, setCalFilter] = useState("todas");

  // Firestore subscriptions
  useEffect(() => {
    const u = [];
    u.push(onSnapshot(collection(db, "participants"), s =>
      setParticipants(s.docs.map(d => ({ id: d.id, ...d.data() })))));
    u.push(onSnapshot(collection(db, "matches"), s =>
      setMatches(s.docs.map(d => ({ id: d.id, ...d.data() })))));
    u.push(onSnapshot(doc(db, "config", "settings"), s => {
      if (s.exists()) setConfig(s.data());
    }));
    u.push(onAuthStateChanged(auth, user => setAdminUser(user)));
    const splash = setTimeout(() => setLoading(false), 800);
    return () => { u.forEach(x => x()); clearTimeout(splash); };
  }, []);

  // ─── Computed ───────────────────────────────────────────────────────────────

  const approved = participants.filter(p => p.approved);
  const pending = participants.filter(p => !p.approved);

  const leaderboard = approved
    .map(p => ({ ...p, ...computeParticipantePuntos(p, matches) }))
    .sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      return a.name.localeCompare(b.name);
    });

  const tablaTorneo = computeTablaTorneo(matches);

  // Match results lookup by id
  const matchByCalId = {};
  for (const m of matches) { if (m.calId) matchByCalId[m.calId] = m; }

  // Next upcoming matches
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = CALENDAR.filter(c => c.fecha >= today && !matchByCalId[c.id]).slice(0, 5);
  const recent = matches
    .filter(m => m.result && m.result.winner)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 5);

  // Puntos por pareja para mostrar en clasificación
  const parejaStats = {};
  for (const p of ALL_PAREJAS) {
    parejaStats[p] = computeParejaPuntos(p, matches);
  }

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleTrophyTap = () => {
    const next = adminTaps + 1;
    if (next >= 5) { setAdminUnlocked(true); setAdminTaps(0); }
    else setAdminTaps(next);
  };

  const pickBombo = (bomboId, pareja) => {
    const b = BOMBOS.find(x => x.id === bomboId);
    if (!b) return;
    if (bomboId === 1) {
      setRPicks(p => ({ ...p, bombo1: p.bombo1 === pareja ? null : pareja }));
    } else {
      const key = `bombo${bomboId}`;
      setRPicks(p => {
        const cur = p[key] || [];
        if (cur.includes(pareja)) return { ...p, [key]: cur.filter(x => x !== pareja) };
        if (cur.length >= b.pick) return p;
        return { ...p, [key]: [...cur, pareja] };
      });
    }
  };

  const handleRegister = async () => {
    if (!config.registrationOpen) return setRErr("Las inscripciones están cerradas.");
    if (!rName.trim()) return setRErr("Introduce tu nombre.");
    if (!rSurname.trim()) return setRErr("Introduce tus apellidos.");
    const fullName = `${rName.trim()} ${rSurname.trim()}`;
    if (!rPwd || rPwd.length < 6) return setRErr("La contraseña debe tener al menos 6 caracteres.");
    if (!rPicks.bombo1) return setRErr("Elige 1 pareja del Bombo 1.");
    if ((rPicks.bombo2 || []).length < 2) return setRErr("Elige 2 parejas del Bombo 2.");
    if ((rPicks.bombo3 || []).length < 2) return setRErr("Elige 2 parejas del Bombo 3.");
    if (participants.find(p => p.name.toLowerCase() === fullName.toLowerCase()))
      return setRErr("Ese nombre ya está registrado.");
    await addDoc(collection(db, "participants"), {
      name: fullName, firstName: rName.trim(), lastName: rSurname.trim(),
      pwd: rPwd, picks: rPicks, approved: false, createdAt: Date.now()
    });
    setROk(true);
    setRName(""); setRSurname(""); setRPwd(""); setRPicks({ bombo1: null, bombo2: [], bombo3: [] });
  };

  const handleEditLogin = () => {
    if (!config.registrationOpen) return setEditLoginErr("Las inscripciones están cerradas.");
    const p = participants.find(p => p.name.toLowerCase() === editLoginName.trim().toLowerCase());
    if (!p) return setEditLoginErr("Nombre no encontrado.");
    if (p.pwd !== editLoginPwd) return setEditLoginErr("Contraseña incorrecta.");
    setEditParticipant(p);
    setRName(p.firstName || ""); setRSurname(p.lastName || "");
    setRPwd(p.pwd);
    setRPicks(p.picks || { bombo1: null, bombo2: [], bombo3: [] });
    setEditLoginErr("");
  };

  const handleSaveEdit = async () => {
    if (!config.registrationOpen) return setRErr("Las inscripciones están cerradas.");
    if (!rPicks.bombo1) return setRErr("Elige 1 pareja del Bombo 1.");
    if ((rPicks.bombo2 || []).length < 2) return setRErr("Elige 2 parejas del Bombo 2.");
    if ((rPicks.bombo3 || []).length < 2) return setRErr("Elige 2 parejas del Bombo 3.");
    await updateDoc(doc(db, "participants", editParticipant.id), { picks: rPicks });
    setROk(true); setEditParticipant(null); setEditMode(false);
    setRName(""); setRSurname(""); setRPwd(""); setRPicks({ bombo1: null, bombo2: [], bombo3: [] });
  };

  const handleApprove = (id) => updateDoc(doc(db, "participants", id), {
    approved: true, approvedBy: adminUser?.email || "admin", approvedAt: Date.now()
  });
  const handleReject = (id) => deleteDoc(doc(db, "participants", id));

  const handleAdminLogin = async () => {
    if (!adminEmail || !adminPass) return setAdminErr("Introduce email y contraseña.");
    setAdminLoading(true); setAdminErr("");
    try {
      await signInWithEmailAndPassword(auth, adminEmail, adminPass);
      setAdminEmail(""); setAdminPass("");
    } catch (e) {
      setAdminErr("Email o contraseña incorrectos.");
    } finally { setAdminLoading(false); }
  };

  const handleAdminLogout = () => signOut(auth);

  const reauth = async () => {
    const pwd = window.prompt("Contraseña de admin:");
    if (!pwd) return false;
    try {
      const cred = EmailAuthProvider.credential(adminUser.email, pwd);
      await reauthenticateWithCredential(adminUser, cred);
      return true;
    } catch (e) { window.alert("Contraseña incorrecta."); return false; }
  };

  // Guardar resultado de partido
  const handleSaveMatch = async (winnerOverride) => {
    const winner = winnerOverride || nm.winner;
    if (!nm.matchId || !winner) return;
    // Filtrar sets con datos reales y guardar como objetos (Firestore no soporta arrays anidados)
    const setsData = [0,1,2]
      .filter(i => sLocal[i] !== "" && sLocal[i] !== undefined && sVisit[i] !== "" && sVisit[i] !== undefined && sLocal[i] !== null && sVisit[i] !== null)
      .map(i => ({ l: Number(sLocal[i]), v: Number(sVisit[i]) }));
    const result = { winner, sets: setsData };
    const cal = CALENDAR.find(c => c.id === nm.matchId);
    const existingMatch = matchByCalId[nm.matchId];
    const data = {
      calId: nm.matchId, local: cal?.local || nm.local,
      visitante: cal?.visitante || nm.visitante,
      phase: cal?.phase || nm.phase,
      fecha: cal?.fecha || nm.fecha,
      result, updatedAt: Date.now()
    };
    if (existingMatch) {
      await updateDoc(doc(db, "matches", existingMatch.id), data);
    } else {
      await addDoc(collection(db, "matches"), { ...data, createdAt: Date.now() });
    }
    if (cal?.phase === "final") {
      const champ = winner === "local" ? cal.local : cal.visitante;
      const next = { ...config, champion: champ };
      setConfig(next);
      setDoc(doc(db, "config", "settings"), next);
    }
    setNm({ matchId: null, local: "", visitante: "", sets: [], winner: "", phase: "liga", fecha: "" });
    setSLocal(["","",""]); setSVisit(["","",""]);
  };

  const saveConfig = (updates) => {
    const next = { ...config, ...updates };
    setConfig(next);
    setDoc(doc(db, "config", "settings"), next);
  };

  // ─── Render helpers ──────────────────────────────────────────────────────────

  const renderMatchResult = (calId) => {
    const m = matchByCalId[calId];
    if (!m || !m.result || !m.result.winner) return null;
    const sets = m.result.sets || [];
    const winnerLocal = m.result.winner === "local";
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div className="match-score">
          {winnerLocal ? "2" : (sets.length === 3 ? "1" : "0")} - {winnerLocal ? (sets.length === 3 ? "1" : "0") : "2"}
        </div>
        {sets.length > 0 && (
          <div style={{ fontSize: ".62rem", color: "#444" }}>
            {sets.map((s, i) => `${s.l ?? s[0]}-${s.v ?? s[1]}`).join(" | ")}
          </div>
        )}
      </div>
    );
  };

  // ─── VIEWS ───────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="app"><style>{CSS}</style>
      <div className="loading" style={{ paddingTop: "5rem" }}>⏳ Cargando...</div>
    </div>
  );

  return (
    <div className="app">
      <style>{CSS}</style>

      {/* HEADER */}
      <div className="hdr">
        <span className="htrophy" onClick={handleTrophyTap}>🏆</span>
        <div className="htitle">PALETA CUERO 2026</div>
        <div className="hsub">Txapelketa · Porra Solidaria</div>
        {config.charityName && (
          <div className="hbadge">❤️ Recaudación para: {config.charityName}</div>
        )}
      </div>

      {/* NAV */}
      <nav className="nav">
        {[
          { id: "home", label: "🏠 Inicio" },
          { id: "porra", label: "🎯 Mi Porra" },
          { id: "calendario", label: "📅 Calendario" },
          { id: "clasificacion", label: "🏆 Clasificación" },
          { id: "instalar", label: "📲 Instalar" },
          ...(adminUnlocked ? [{ id: "admin", label: "⚙️ Admin" }] : []),
        ].map(t => (
          <button key={t.id} className={`nb${view === t.id ? " on" : ""}`}
            onClick={() => setView(t.id)}>{t.label}</button>
        ))}
      </nav>

      {/* ── HOME ── */}
      {view === "home" && (
        <div className="sec fade">
          {/* Solidaridad */}
          <div className="solidarity-bar">
            ❤️ Porra solidaria — Premio: {config.prizeDesc || "2 entradas para un partido de pelota"}
            {config.charityName && ` · Recaudación para ${config.charityName}`}
          </div>

          {/* Stats */}
          <div className="card">
            <div className="ct">Resumen</div>
            <div className="stat-g">
              <div className="stat"><div className="stn">{approved.length}</div><div className="stl">Participantes</div></div>
              <div className="stat"><div className="stn">{matches.filter(m => m.result?.winner).length}</div><div className="stl">Partidos jugados</div></div>
              <div className="stat"><div className="stn">{matches.filter(m => m.result?.winner && m.phase === "liga").length}/27</div><div className="stl">Liga</div></div>
              <div className="stat">
                <div className="stn" style={{ color: config.registrationOpen ? "#5ec85e" : "#e05555" }}>
                  {config.registrationOpen ? "ABIERTA" : "CERRADA"}
                </div>
                <div className="stl">Inscripción</div>
              </div>
            </div>
          </div>

          {/* Top 3 porra */}
          {leaderboard.length > 0 && (
            <div className="card">
              <div className="ct">Top Porra</div>
              {leaderboard.slice(0, 3).map((p, i) => (
                <div key={p.id} style={{
                  background: medalBg(i), border: `1px solid ${medalBorder(i)}`,
                  borderRadius: "6px", padding: ".6rem .8rem", marginBottom: ".4rem",
                  display: "flex", alignItems: "center", gap: ".8rem"
                }}>
                  <span style={{ fontFamily: "'Bebas Neue'", fontSize: "1.4rem", color: medalBorder(i), minWidth: "1.4rem" }}>
                    {i + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: ".9rem" }}>{p.name}</div>
                    <div style={{ fontSize: ".72rem", color: "#555", marginTop: ".18rem" }}>
                      {p.misParejas?.map(x => (
                        <span key={x} className="tag tag-b1" style={{ marginRight: ".2rem" }}>{x}</span>
                      ))}
                    </div>
                  </div>
                  <div className="lb-pts">{p.pts}</div>
                </div>
              ))}
              <button className="btn btn-g btn-sm" style={{ marginTop: ".5rem" }}
                onClick={() => setView("clasificacion")}>Ver clasificación completa →</button>
            </div>
          )}

          {/* Próximos partidos */}
          {upcoming.length > 0 && (
            <div className="card">
              <div className="ct">Próximos Partidos</div>
              {upcoming.map(c => (
                <div key={c.id} className="match-row">
                  <div className="match-teams">
                    <div className="match-local">{c.local}</div>
                    <div className="match-visit">{c.visitante}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: ".7rem", color: "#555" }}>{formatFecha(c.fecha)}</div>
                    <div className="match-hora">{c.hora}</div>
                    <span className={phaseClass(c.phase)}>{phaseName(c.phase)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Últimos resultados */}
          {recent.length > 0 && (
            <div className="card">
              <div className="ct">Últimos Resultados</div>
              {recent.map(m => (
                <div key={m.id} className="match-row">
                  <div className="match-teams">
                    <div className="match-local" style={{ color: m.result?.winner === "local" ? "#c92727" : "#e2d9c5" }}>
                      {m.local}
                    </div>
                    <div className="match-visit" style={{ color: m.result?.winner === "visitante" ? "#c92727" : "#888" }}>
                      {m.visitante}
                    </div>
                  </div>
                  {renderMatchResult(m.calId)}
                  <span className={phaseClass(m.phase)}>{phaseName(m.phase)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PORRA ── */}
      {view === "porra" && (
        <div className="sec fade">
          {!editMode && !editParticipant && (
            <>
              {/* Instrucciones */}
              <div className="card card-red">
                <div className="ct">¿Cómo funciona?</div>
                <div style={{ fontSize: ".82rem", color: "#b0a080", lineHeight: 1.6 }}>
                  <p>1. Elige <strong style={{ color: "#c92727" }}>1 pareja del Bombo 1</strong> y <strong style={{ color: "#c92727" }}>2 parejas de cada Bombo 2 y 3</strong>.</p>
                  <p style={{ marginTop: ".4rem" }}>2. Cada punto que saquen tus parejas en la <strong>liga, semifinales y final</strong> suma para ti.</p>
                  <p style={{ marginTop: ".4rem" }}>3. El Play-In no puntúa para la porra.</p>
                  <p style={{ marginTop: ".4rem" }}>4. Sistema <strong>Champions</strong>: victoria 2-0 = 4pts, victoria 2-1 = 3pts ganador / 1pt perdedor.</p>
                  <p style={{ marginTop: ".4rem" }}>🏆 Premio: {config.prizeDesc || "2 entradas para un partido de pelota"}</p>
                  {config.charityName && <p style={{ marginTop: ".4rem" }}>❤️ Recaudación para: <strong>{config.charityName}</strong></p>}
                </div>
              </div>

              {/* Formulario registro */}
              {!rOk ? (
                <div className="card">
                  <div className="ct">Apuntar mi Porra</div>
                  {!config.registrationOpen && (
                    <div style={{ background: "#280a0a", border: "1px solid #c9272740", borderRadius: "6px", padding: ".7rem", marginBottom: ".9rem", color: "#c92727", fontSize: ".82rem" }}>
                      ⚠️ Las inscripciones están cerradas. Contacta con la organización.
                    </div>
                  )}
                  <label className="lbl">Nombre</label>
                  <input className="inp" value={rName} onChange={e => setRName(e.target.value)} placeholder="Tu nombre" />
                  <label className="lbl">Apellidos</label>
                  <input className="inp" value={rSurname} onChange={e => setRSurname(e.target.value)} placeholder="Tus apellidos" />
                  <label className="lbl">Contraseña (para editar tu porra)</label>
                  <input className="inp" type="password" value={rPwd} onChange={e => setRPwd(e.target.value)} placeholder="Mínimo 6 caracteres" />

                  {/* Bombos */}
                  {BOMBOS.map(b => (
                    <div key={b.id} className="bombo-card" style={{ borderColor: b.color + "40", marginTop: ".9rem" }}>
                      <div className="bombo-title" style={{ color: b.color }}>
                        {b.name} <span style={{ fontSize: ".75rem", color: "#555" }}>— {b.desc}</span>
                      </div>
                      <div className="bombo-desc">
                        {b.id === 1
                          ? `Elegida: ${rPicks.bombo1 || "ninguna"}`
                          : `Elegidas: ${(rPicks[`bombo${b.id}`] || []).length} / ${b.pick}`}
                      </div>
                      <div>
                        {b.parejas.map(p => {
                          const selected = b.id === 1
                            ? rPicks.bombo1 === p
                            : (rPicks[`bombo${b.id}`] || []).includes(p);
                          const full = b.id !== 1 && !selected &&
                            (rPicks[`bombo${b.id}`] || []).length >= b.pick;
                          return (
                            <span key={p}
                              className={`chip${selected ? " on" : ""}${full ? " dis" : ""}`}
                              style={{ borderColor: selected ? b.color : undefined, color: selected ? b.color : undefined }}
                              onClick={() => !full && pickBombo(b.id, p)}
                            >{p}</span>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {rErr && <div style={{ color: "#c92727", fontSize: ".82rem", marginTop: ".7rem" }}>{rErr}</div>}
                  <div className="row" style={{ marginTop: "1rem" }}>
                    <button className="btn" onClick={handleRegister}
                      disabled={!config.registrationOpen}>Enviar mi porra</button>
                  </div>
                </div>
              ) : (
                <div className="card success-box">
                  <div style={{ fontSize: "2.5rem" }}>✅</div>
                  <div style={{ fontFamily: "'Bebas Neue'", fontSize: "1.4rem", color: "#5ec85e", marginTop: ".5rem" }}>
                    ¡Porra enviada!
                  </div>
                  <div style={{ color: "#555", fontSize: ".82rem", marginTop: ".4rem" }}>
                    Pendiente de aprobación por la organización.
                  </div>
                  <button className="btn btn-g btn-sm" style={{ marginTop: "1rem" }}
                    onClick={() => { setROk(false); setView("home"); }}>Volver al inicio</button>
                </div>
              )}

              {/* Editar porra */}
              {!rOk && (
                <div className="card" style={{ marginTop: ".5rem" }}>
                  <div className="ct">Modificar mi Porra</div>
                  {config.registrationOpen ? (
                    <>
                      <label className="lbl">Nombre completo</label>
                      <input className="inp" value={editLoginName} onChange={e => setEditLoginName(e.target.value)} placeholder="Nombre tal como te registraste" />
                      <label className="lbl">Contraseña</label>
                      <input className="inp" type="password" value={editLoginPwd} onChange={e => setEditLoginPwd(e.target.value)} />
                      {editLoginErr && <div style={{ color: "#c92727", fontSize: ".82rem", marginTop: ".5rem" }}>{editLoginErr}</div>}
                      <button className="btn btn-g btn-sm" style={{ marginTop: ".7rem" }} onClick={handleEditLogin}>Acceder</button>
                    </>
                  ) : (
                    <div style={{ color: "#555", fontSize: ".82rem" }}>Las inscripciones están cerradas.</div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Modo edición */}
          {editParticipant && (
            <div className="card fade">
              <div className="ct">Editar porra de {editParticipant.name}</div>
              {BOMBOS.map(b => (
                <div key={b.id} className="bombo-card" style={{ borderColor: b.color + "40", marginTop: ".9rem" }}>
                  <div className="bombo-title" style={{ color: b.color }}>{b.name} — {b.desc}</div>
                  <div className="bombo-desc">
                    {b.id === 1 ? `Elegida: ${rPicks.bombo1 || "ninguna"}` : `Elegidas: ${(rPicks[`bombo${b.id}`] || []).length} / ${b.pick}`}
                  </div>
                  <div>
                    {b.parejas.map(p => {
                      const selected = b.id === 1 ? rPicks.bombo1 === p : (rPicks[`bombo${b.id}`] || []).includes(p);
                      const full = b.id !== 1 && !selected && (rPicks[`bombo${b.id}`] || []).length >= b.pick;
                      return (
                        <span key={p}
                          className={`chip${selected ? " on" : ""}${full ? " dis" : ""}`}
                          style={{ borderColor: selected ? b.color : undefined, color: selected ? b.color : undefined }}
                          onClick={() => !full && pickBombo(b.id, p)}
                        >{p}</span>
                      );
                    })}
                  </div>
                </div>
              ))}
              {rErr && <div style={{ color: "#c92727", fontSize: ".82rem", marginTop: ".7rem" }}>{rErr}</div>}
              {rOk ? (
                <div style={{ color: "#5ec85e", marginTop: ".7rem" }}>✅ Cambios guardados.</div>
              ) : (
                <div className="row" style={{ marginTop: "1rem" }}>
                  <button className="btn" onClick={handleSaveEdit}>Guardar cambios</button>
                  <button className="btn btn-g btn-sm" onClick={() => {
                    setEditParticipant(null); setEditMode(false);
                    setRName(""); setRSurname(""); setRPwd("");
                    setRPicks({ bombo1: null, bombo2: [], bombo3: [] });
                  }}>Cancelar</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── CALENDARIO ── */}
      {view === "calendario" && (
        <div className="sec fade">
          <div className="card">
            <div className="ct">Calendario</div>
            <div className="row" style={{ marginBottom: ".8rem", flexWrap: "wrap", gap: ".3rem" }}>
              {["todas", "liga", "playin", "semis", "final"].map(f => (
                <button key={f}
                  className={`chip${calFilter === f ? " on" : ""}`}
                  onClick={() => setCalFilter(f)}>
                  {f === "todas" ? "Todas" : phaseName(f)}
                </button>
              ))}
            </div>

            {/* Agrupar por fecha */}
            {(() => {
              const filtered = CALENDAR.filter(c => calFilter === "todas" || c.phase === calFilter);
              const byDate = {};
              for (const c of filtered) {
                if (!byDate[c.fecha]) byDate[c.fecha] = [];
                byDate[c.fecha].push(c);
              }
              return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([fecha, cals]) => (
                <div key={fecha} style={{ marginBottom: ".6rem" }}>
                  <div style={{ fontFamily: "'Bebas Neue'", color: "#555", fontSize: ".85rem", letterSpacing: ".05em", padding: ".3rem 0", borderBottom: "1px solid #0b0e18" }}>
                    {formatFecha(fecha)}
                  </div>
                  {cals.map(c => {
                    const m = matchByCalId[c.id];
                    const hasResult = m?.result?.winner;
                    return (
                      <div key={c.id} className="match-row">
                        <div style={{ color: "#444", fontSize: ".68rem", minWidth: "28px" }}>{c.id}</div>
                        <div className="match-teams">
                          <div className="match-local" style={{ color: hasResult && m.result.winner === "local" ? "#c92727" : "#e2d9c5" }}>
                            {c.local}
                          </div>
                          <div className="match-visit" style={{ color: hasResult && m.result.winner === "visitante" ? "#c92727" : "#888" }}>
                            {c.visitante}
                          </div>
                        </div>
                        {hasResult ? renderMatchResult(c.id) : (
                          <div className="match-score pend">{c.hora}</div>
                        )}
                        <span className={phaseClass(c.phase)}>{phaseName(c.phase)}</span>
                      </div>
                    );
                  })}
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* ── CLASIFICACIÓN ── */}
      {view === "clasificacion" && (
        <div className="sec fade">
          <div className="row" style={{ marginBottom: ".8rem" }}>
            <button className={`chip${tablaTab === "porra" ? " on" : ""}`} onClick={() => setTablaTab("porra")}>🎯 Ranking Porra</button>
            <button className={`chip${tablaTab === "torneo" ? " on" : ""}`} onClick={() => setTablaTab("torneo")}>🏆 Liga Torneo</button>
          </div>

          {/* Ranking Porra */}
          {tablaTab === "porra" && (
            <div className="card">
              <div className="ct">Ranking Porra</div>
              {leaderboard.length === 0 ? (
                <div style={{ color: "#444", fontSize: ".85rem" }}>Sin participantes aprobados aún.</div>
              ) : leaderboard.map((p, i) => (
                <div key={p.id}>
                  <div className="lb-row" style={{
                    background: i < 3 ? medalBg(i) : "#06080e",
                    borderColor: i < 3 ? medalBorder(i) : "#12172a",
                  }} onClick={() => setExpandedLb(expandedLb === p.id ? null : p.id)}>
                    <div style={{ fontFamily: "'Bebas Neue'", fontSize: "1.3rem", color: i < 3 ? medalBorder(i) : "#444", minWidth: "1.8rem" }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="lb-name">{p.name}</div>
                      <div style={{ marginTop: ".25rem" }}>
                        {p.misParejas?.map(x => {
                          const b = BOMBOS.find(b => b.parejas.includes(x));
                          return (
                            <span key={x} className={`tag tag-b${b?.id || 1}`} style={{ marginRight: ".18rem" }}>
                              {x}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="lb-pts">{p.pts}</div>
                  </div>
                  {expandedLb === p.id && (
                    <div style={{ background: "#06080e", border: "1px solid #1c2135", borderTop: "none", borderRadius: "0 0 6px 6px", padding: ".7rem .9rem", marginTop: "-.4rem", marginBottom: ".4rem", fontSize: ".78rem" }}>
                      {p.misParejas?.map(x => {
                        const d = p.detalle?.[x];
                        return (
                          <div key={x} style={{ display: "flex", justifyContent: "space-between", padding: ".2rem 0", borderBottom: "1px solid #0b0e18" }}>
                            <span style={{ color: "#888" }}>{x}</span>
                            <span style={{ color: "#c92727", fontFamily: "'Bebas Neue'", fontSize: ".95rem" }}>
                              {d?.pts || 0} pts ({d?.jugados || 0}J {d?.ganados || 0}G)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Tabla Liga Torneo */}
          {tablaTab === "torneo" && (
            <div className="card">
              <div className="ct">Clasificación Liga</div>
              <div style={{ fontSize: ".7rem", color: "#444", marginBottom: ".5rem" }}>
                Desempate: 1º enfrentamiento directo · 2º partidos ganados · 3º diferencia de tantos
              </div>
              <div className="tabla-row tabla-hdr" style={{ gridTemplateColumns: "1.2rem 1fr 2rem 2rem 2rem 2.5rem 3rem" }}>
                <span>#</span><span>Pareja</span><span style={{ textAlign: "center" }}>J</span>
                <span style={{ textAlign: "center" }}>G</span><span style={{ textAlign: "center" }}>P</span>
                <span style={{ textAlign: "center" }}>Pts</span>
                <span style={{ textAlign: "center" }}>Dif</span>
              </div>
              {tablaTorneo.map((row, i) => (
                <div key={row.pareja}>
                  {/* Separadores de zona */}
                  {i === 2 && <div style={{ borderTop: "1px dashed #c9272730", margin: ".3rem 0", fontSize: ".65rem", color: "#c92727", paddingLeft: ".3rem" }}>▼ Play-In</div>}
                  {i === 10 && <div style={{ borderTop: "1px dashed #33333380", margin: ".3rem 0", fontSize: ".65rem", color: "#333", paddingLeft: ".3rem" }}>▼ Eliminados</div>}
                  <div className="tabla-row" style={{
                    gridTemplateColumns: "1.2rem 1fr 2rem 2rem 2rem 2.5rem 3rem",
                    background: i < 2 ? "#0a1a08" : i < 10 ? "#06080e" : "#060606",
                    borderLeft: i < 2 ? "2px solid #5ec85e" : i < 10 ? "2px solid #c9272730" : "2px solid transparent"
                  }}>
                    <span className={i === 0 ? "pos1" : i === 1 ? "pos2" : i === 2 ? "pos3" : ""}>{i + 1}</span>
                    <span style={{ fontSize: ".68rem", color: i < 2 ? "#e2d9c5" : i < 10 ? "#888" : "#444" }}>{row.pareja}</span>
                    <span style={{ textAlign: "center", color: "#555" }}>{row.jugados}</span>
                    <span style={{ textAlign: "center", color: "#5ec85e" }}>{row.ganados}</span>
                    <span style={{ textAlign: "center", color: "#e05555" }}>{row.perdidos}</span>
                    <span style={{ textAlign: "center", fontFamily: "'Bebas Neue'", fontSize: "1rem", color: "#c92727" }}>{row.pts}</span>
                    <span style={{ textAlign: "center", fontSize: ".75rem", color: (row.tantosFavor - row.tantosContra) >= 0 ? "#5ec85e" : "#e05555" }}>
                      {row.tantosFavor - row.tantosContra > 0 ? "+" : ""}{row.tantosFavor - row.tantosContra}
                    </span>
                  </div>
                </div>
              ))}

              {/* Cruces Play-In automáticos */}
              {tablaTorneo.filter(r => r.jugados > 0).length >= 3 && (
                <div style={{ marginTop: "1rem", background: "#080a18", border: "1px solid #223366", borderRadius: "6px", padding: ".8rem" }}>
                  <div style={{ fontFamily: "'Bebas Neue'", color: "#4466aa", fontSize: "1rem", letterSpacing: ".05em", marginBottom: ".6rem" }}>
                    Cruces Play-In (provisional)
                  </div>
                  {[
                    { label: "PIN 1", a: tablaTorneo[2], b: tablaTorneo[9] },
                    { label: "PIN 2", a: tablaTorneo[3], b: tablaTorneo[8] },
                    { label: "PIN 3", a: tablaTorneo[4], b: tablaTorneo[7] },
                    { label: "PIN 4", a: tablaTorneo[5], b: tablaTorneo[6] },
                  ].map(({ label, a, b }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".3rem 0", borderBottom: "1px solid #0d111c", fontSize: ".75rem" }}>
                      <span style={{ color: "#4466aa", minWidth: "38px", fontFamily: "'Bebas Neue'" }}>{label}</span>
                      <span style={{ color: "#e2d9c5" }}>{a?.pareja || "?"}</span>
                      <span style={{ color: "#333" }}>vs</span>
                      <span style={{ color: "#888" }}>{b?.pareja || "?"}</span>
                    </div>
                  ))}
                  <div style={{ fontSize: ".65rem", color: "#333", marginTop: ".5rem" }}>
                    Semifinales: 1º vs Peor clasificado Play-In · 2º vs Mejor clasificado Play-In
                  </div>
                </div>
              )}

              <div style={{ fontSize: ".68rem", color: "#333", marginTop: ".7rem" }}>
                🟢 Top 2 → Semifinales directas · 🔵 3º–10º → Play-In · ⚫ 11º–18º → Eliminados
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── INSTALAR ── */}
      {view === "instalar" && (
        <div className="sec fade">
          {isStandalone ? (
            <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
              <div style={{ fontSize: "3rem" }}>✅</div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: "1.5rem", color: "#5ec85e", marginTop: ".5rem" }}>
                ¡App ya instalada!
              </div>
              <div style={{ color: "#555", fontSize: ".85rem", marginTop: ".4rem" }}>
                Estás usando la app en modo instalado.
              </div>
            </div>
          ) : (
            <>
              <div className="card card-red" style={{ textAlign: "center", padding: "1.5rem 1.2rem" }}>
                <div style={{ fontSize: "3rem" }}>📲</div>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: "1.6rem", color: "#c92727", marginTop: ".4rem", letterSpacing: ".08em" }}>
                  Instala la App
                </div>
                <div style={{ color: "#666", fontSize: ".82rem", marginTop: ".3rem" }}>
                  Accede rápido desde tu móvil sin abrir el navegador
                </div>
              </div>

              {/* Android / Chrome */}
              {deferredPrompt && (
                <div className="card" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.8rem", marginBottom: ".5rem" }}>🤖</div>
                  <div style={{ fontFamily: "'Bebas Neue'", fontSize: "1.2rem", color: "#e2d9c5", marginBottom: ".8rem" }}>
                    Android / Chrome
                  </div>
                  <button className="btn" onClick={async () => {
                    if (!deferredPrompt) return;
                    deferredPrompt.prompt();
                    await deferredPrompt.userChoice;
                    setDeferredPrompt(null);
                  }}>
                    📲 Instalar en este dispositivo
                  </button>
                </div>
              )}

              {/* iOS */}
              <div className="card">
                <div style={{ display: "flex", alignItems: "center", gap: ".7rem", marginBottom: ".9rem" }}>
                  <span style={{ fontSize: "1.8rem" }}>🍎</span>
                  <div style={{ fontFamily: "'Bebas Neue'", fontSize: "1.2rem", color: "#e2d9c5" }}>
                    iPhone / iPad (Safari)
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: ".7rem" }}>
                  {[
                    { icon: "1️⃣", text: "Abre esta página en Safari (no Chrome)" },
                    { icon: "2️⃣", text: 'Pulsa el botón compartir ⬆ (abajo en iPhone, arriba en iPad)' },
                    { icon: "3️⃣", text: '"Añadir a pantalla de inicio"' },
                    { icon: "4️⃣", text: 'Pulsa "Añadir" — ¡listo!' },
                  ].map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: ".7rem", alignItems: "flex-start", background: "#06080e", border: "1px solid #1c2135", borderRadius: "6px", padding: ".6rem .8rem" }}>
                      <span style={{ fontSize: "1.1rem" }}>{s.icon}</span>
                      <span style={{ fontSize: ".82rem", color: "#b0a080", lineHeight: 1.5 }}>{s.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Android manual */}
              {!deferredPrompt && (
                <div className="card">
                  <div style={{ display: "flex", alignItems: "center", gap: ".7rem", marginBottom: ".9rem" }}>
                    <span style={{ fontSize: "1.8rem" }}>🤖</span>
                    <div style={{ fontFamily: "'Bebas Neue'", fontSize: "1.2rem", color: "#e2d9c5" }}>
                      Android / Chrome
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: ".7rem" }}>
                    {[
                      { icon: "1️⃣", text: "Abre esta página en Chrome" },
                      { icon: "2️⃣", text: "Pulsa el menú ⋮ (tres puntos, arriba a la derecha)" },
                      { icon: "3️⃣", text: '"Añadir a pantalla de inicio" o "Instalar app"' },
                      { icon: "4️⃣", text: 'Confirma — ¡listo!' },
                    ].map((s, i) => (
                      <div key={i} style={{ display: "flex", gap: ".7rem", alignItems: "flex-start", background: "#06080e", border: "1px solid #1c2135", borderRadius: "6px", padding: ".6rem .8rem" }}>
                        <span style={{ fontSize: "1.1rem" }}>{s.icon}</span>
                        <span style={{ fontSize: ".82rem", color: "#b0a080", lineHeight: 1.5 }}>{s.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="card" style={{ textAlign: "center" }}>
                <div style={{ color: "#444", fontSize: ".78rem" }}>URL de la app</div>
                <div style={{ color: "#c92727", fontFamily: "'Bebas Neue'", fontSize: "1.1rem", marginTop: ".3rem", letterSpacing: ".05em" }}>
                  {window.location.hostname}
                </div>
                <div style={{ color: "#333", fontSize: ".72rem", marginTop: ".3rem" }}>
                  Compártela con los participantes
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── ADMIN ── */}
      {view === "admin" && (
        <div className="sec fade">
          {!adminUser ? (
            <div className="card">
              <div className="ct">Admin</div>
              <label className="lbl">Email</label>
              <input className="inp" type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} />
              <label className="lbl">Contraseña</label>
              <input className="inp" type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAdminLogin()} />
              {adminErr && <div style={{ color: "#c92727", fontSize: ".82rem", marginTop: ".5rem" }}>{adminErr}</div>}
              <button className="btn" style={{ marginTop: ".8rem" }} onClick={handleAdminLogin} disabled={adminLoading}>
                {adminLoading ? "Entrando..." : "Entrar"}
              </button>
            </div>
          ) : (
            <>
              {/* Config */}
              <div className="card">
                <div className="ct">Configuración</div>
                <label className="lbl">Inscripción</label>
                <div className="row">
                  <button className={`btn btn-sm ${config.registrationOpen ? "" : "btn-g"}`}
                    onClick={() => saveConfig({ registrationOpen: true })}>Abrir</button>
                  <button className={`btn btn-sm ${!config.registrationOpen ? "btn-danger" : "btn-g"}`}
                    onClick={() => saveConfig({ registrationOpen: false })}>Cerrar</button>
                  <span className={`tag ${config.registrationOpen ? "tag-open" : "tag-closed"}`}>
                    {config.registrationOpen ? "ABIERTA" : "CERRADA"}
                  </span>
                </div>
                <label className="lbl">Premio</label>
                <input className="inp" value={config.prizeDesc || ""} placeholder="ej: 2 entradas para un partido de pelota"
                  onChange={e => saveConfig({ prizeDesc: e.target.value })} />
                <label className="lbl">Asociación beneficiaria</label>
                <input className="inp" value={config.charityName || ""} placeholder="Nombre de la asociación"
                  onChange={e => saveConfig({ charityName: e.target.value })} />
              </div>

              {/* Introducir resultado */}
              {(() => {
                const s1L = sLocal[0] ?? ""; const s1V = sVisit[0] ?? "";
                const s2L = sLocal[1] ?? ""; const s2V = sVisit[1] ?? "";
                const s3L = sLocal[2] ?? ""; const s3V = sVisit[2] ?? "";
                const setOk = (l,v) => l !== "" && v !== "" && l !== undefined && v !== undefined;
                const setWinner = (l,v) => setOk(l,v) ? (Number(l) > Number(v) ? "local" : Number(v) > Number(l) ? "visit" : null) : null;
                const w1 = setWinner(s1L,s1V);
                const w2 = setWinner(s2L,s2V);
                const w3 = setWinner(s3L,s3V);
                const localSets = [w1,w2,w3].filter(x=>x==="local").length;
                const visitSets = [w1,w2,w3].filter(x=>x==="visit").length;
                const needs3 = setOk(s1L,s1V) && setOk(s2L,s2V) && w1 !== null && w2 !== null && w1 !== w2;
                const autoWinner = localSets >= 2 ? "local" : visitSets >= 2 ? "visitante" : null;
                const totalSets = [setOk(s1L,s1V), setOk(s2L,s2V), setOk(s3L,s3V)].filter(Boolean).length;

                return (
                  <div className="card">
                    <div className="ct">Introducir Resultado</div>
                    <label className="lbl">Partido</label>
                    <select className="sel" style={{ width: "100%" }}
                      value={nm.matchId || ""}
                      onChange={e => {
                        const cal = CALENDAR.find(c => c.id === e.target.value);
                        const existing = matchByCalId[e.target.value];
                        const sets = existing?.result?.sets || [];
                        setSLocal(sets.length >= 2 ? [String(sets[0][0]), String(sets[1][0]), sets[2] ? String(sets[2][0]) : ""] : ["","",""]);
                        setSVisit(sets.length >= 2 ? [String(sets[0][1]), String(sets[1][1]), sets[2] ? String(sets[2][1]) : ""] : ["","",""]);
                        setNm({ matchId: e.target.value, local: cal?.local||"", visitante: cal?.visitante||"", phase: cal?.phase||"liga", fecha: cal?.fecha||"", winner: existing?.result?.winner||"" });
                      }}>
                      <option value="">-- Selecciona partido --</option>
                      {CALENDAR.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.id} · {c.local} vs {c.visitante} ({formatFecha(c.fecha)} {c.hora})
                          {matchByCalId[c.id]?.result?.winner ? " ✓" : ""}
                        </option>
                      ))}
                    </select>

                    {nm.matchId && (
                      <>
                        <div style={{ margin: ".8rem 0 .4rem", fontSize: ".8rem", color: "#888" }}>
                          <strong style={{ color: "#e2d9c5" }}>{nm.local}</strong> vs <strong style={{ color: "#e2d9c5" }}>{nm.visitante}</strong>
                          <span className={phaseClass(nm.phase)} style={{ marginLeft: ".5rem" }}>{phaseName(nm.phase)}</span>
                        </div>

                        <label className="lbl">Sets · 1 y 2 a 15 tantos · 3 a 10 tantos</label>

                        {/* Set 1 */}
                        <div className="row" style={{ marginBottom: ".5rem" }}>
                          <span style={{ color: "#555", fontSize: ".75rem", minWidth: "60px" }}>Set 1 (15):</span>
                          <input className="num-inp" type="number" min="0" max="15" value={s1L}
                            onChange={e => setSLocal(a => { const n=[...a]; n[0]=e.target.value; return n; })} />
                          <span style={{ color: "#444" }}>-</span>
                          <input className="num-inp" type="number" min="0" max="15" value={s1V}
                            onChange={e => setSVisit(a => { const n=[...a]; n[0]=e.target.value; return n; })} />
                          {w1 && <span style={{ fontSize: ".72rem", color: w1==="local" ? "#c92727" : "#5ec85e" }}>
                            ✓ {w1==="local" ? nm.local.split(" - ")[0] : nm.visitante.split(" - ")[0]}
                          </span>}
                        </div>

                        {/* Set 2 */}
                        <div className="row" style={{ marginBottom: ".5rem" }}>
                          <span style={{ color: "#555", fontSize: ".75rem", minWidth: "60px" }}>Set 2 (15):</span>
                          <input className="num-inp" type="number" min="0" max="15" value={s2L}
                            onChange={e => setSLocal(a => { const n=[...a]; n[1]=e.target.value; return n; })} />
                          <span style={{ color: "#444" }}>-</span>
                          <input className="num-inp" type="number" min="0" max="15" value={s2V}
                            onChange={e => setSVisit(a => { const n=[...a]; n[1]=e.target.value; return n; })} />
                          {w2 && <span style={{ fontSize: ".72rem", color: w2==="local" ? "#c92727" : "#5ec85e" }}>
                            ✓ {w2==="local" ? nm.local.split(" - ")[0] : nm.visitante.split(" - ")[0]}
                          </span>}
                        </div>

                        {/* Set 3 solo si empate */}
                        {needs3 && (
                          <div className="row" style={{ marginBottom: ".5rem" }}>
                            <span style={{ color: "#c92727", fontSize: ".75rem", minWidth: "60px" }}>Set 3 (10):</span>
                            <input className="num-inp" type="number" min="0" max="10" value={s3L}
                              onChange={e => setSLocal(a => { const n=[...a]; n[2]=e.target.value; return n; })} />
                            <span style={{ color: "#444" }}>-</span>
                            <input className="num-inp" type="number" min="0" max="10" value={s3V}
                              onChange={e => setSVisit(a => { const n=[...a]; n[2]=e.target.value; return n; })} />
                            {w3 && <span style={{ fontSize: ".72rem", color: w3==="local" ? "#c92727" : "#5ec85e" }}>
                              ✓ {w3==="local" ? nm.local.split(" - ")[0] : nm.visitante.split(" - ")[0]}
                            </span>}
                          </div>
                        )}

                        {needs3 && !setOk(s3L,s3V) && (
                          <div style={{ color: "#c9a227", fontSize: ".78rem", marginTop: ".2rem" }}>
                            ⚠️ Empate 1-1 — introduce el Set 3 (a 10 tantos)
                          </div>
                        )}

                        {/* Ganador */}
                        {autoWinner && (
                          <div style={{ background: "#0a1a08", border: "1px solid #286a28", borderRadius: "6px", padding: ".6rem .9rem", marginTop: ".6rem", display: "flex", alignItems: "center", gap: ".6rem" }}>
                            <span style={{ fontSize: "1.1rem" }}>✅</span>
                            <div>
                              <div style={{ color: "#5ec85e", fontSize: ".75rem", fontFamily: "'Bebas Neue'", letterSpacing: ".05em" }}>Ganador detectado</div>
                              <div style={{ color: "#e2d9c5", fontSize: ".85rem", fontWeight: 600 }}>
                                {autoWinner === "local" ? nm.local : nm.visitante}
                                <span style={{ color: "#555", fontWeight: 400, marginLeft: ".4rem" }}>
                                  ({totalSets === 2 ? "2-0" : "2-1"})
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="row" style={{ marginTop: ".9rem" }}>
                          <button className="btn" onClick={() => handleSaveMatch(autoWinner)} disabled={!autoWinner}>
                            Guardar resultado
                          </button>
                          {matchByCalId[nm.matchId]?.result?.winner && (
                            <button className="btn-del" onClick={async () => {
                              const m = matchByCalId[nm.matchId];
                              if (m && window.confirm("¿Borrar este resultado?"))
                                await deleteDoc(doc(db, "matches", m.id));
                              setNm({ matchId: null, local: "", visitante: "", sets: [], winner: "", phase: "liga", fecha: "" });
                              setSLocal(["","",""]); setSVisit(["","",""]);
                            }}>🗑 Borrar resultado</button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Participantes pendientes */}
              {pending.length > 0 && (
                <div className="card">
                  <div className="ct">Pendientes de aprobación ({pending.length})</div>
                  {pending.map(p => (
                    <div key={p.id} style={{ background: "#06080e", border: "1px solid #1c2135", borderRadius: "6px", padding: ".7rem", marginBottom: ".5rem" }}>
                      <div style={{ fontWeight: 600, marginBottom: ".4rem" }}>{p.name}</div>
                      <div style={{ fontSize: ".75rem", color: "#555", marginBottom: ".5rem" }}>
                        {[p.picks?.bombo1, ...(p.picks?.bombo2 || []), ...(p.picks?.bombo3 || [])].filter(Boolean).map(x => (
                          <span key={x} style={{ marginRight: ".3rem", color: "#888" }}>{x}</span>
                        ))}
                      </div>
                      <div className="row">
                        <button className="btn btn-ok btn-sm" onClick={() => handleApprove(p.id)}>✅ Aprobar</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleReject(p.id)}>❌ Rechazar</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Participantes aprobados */}
              <div className="card">
                <div className="ct">Participantes ({approved.length})</div>
                {approved.map(p => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: ".4rem 0", borderBottom: "1px solid #0b0e18", fontSize: ".82rem" }}>
                    <span>{p.name}</span>
                    <div style={{ display: "flex", gap: ".3rem", alignItems: "center" }}>
                      <span style={{ color: "#c92727", fontFamily: "'Bebas Neue'" }}>
                        {computeParticipantePuntos(p, matches).pts} pts
                      </span>
                      <button className="btn-del" onClick={async () => {
                        if (await reauth() && window.confirm(`¿Borrar a ${p.name}?`))
                          deleteDoc(doc(db, "participants", p.id));
                      }}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sesión */}
              <div className="card">
                <div className="ct">Sesión Admin</div>
                <div style={{ color: "#555", fontSize: ".82rem", marginBottom: ".7rem" }}>
                  Conectado como: <strong style={{ color: "#c92727" }}>{adminUser?.email}</strong>
                </div>
                <div className="row">
                  <button className="btn btn-g btn-sm" onClick={handleAdminLogout}>Cerrar sesión</button>
                  <button className="btn btn-g btn-sm" onClick={() => {
                    const backup = {
                      fecha: new Date().toISOString(),
                      participantes: participants.map(p => ({ ...p })),
                      partidos: matches.map(m => ({ ...m })),
                      config,
                    };
                    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `paleta-cuero-backup-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                  }}>💾 Backup JSON</button>
                </div>
              </div>

              {/* Zona peligrosa */}
              <div className="card card-danger">
                <div style={{ color: "#e05555", fontFamily: "'Bebas Neue'", fontSize: "1.1rem", letterSpacing: ".05em", marginBottom: ".6rem" }}>
                  Zona Peligrosa
                </div>
                <button className="btn btn-danger" onClick={async () => {
                  if (!await reauth()) return;
                  if (!window.confirm("¿Borrar TODOS los datos? Esta acción no se puede deshacer.")) return;
                  await Promise.all([
                    setDoc(doc(db, "config", "settings"), {
                      registrationOpen: true, charityName: "", prizeDesc: "",
                      champion: null, finalist: null, third: null
                    }),
                    ...[...participants].map(p => deleteDoc(doc(db, "participants", p.id))),
                    ...[...matches].map(m => deleteDoc(doc(db, "matches", m.id))),
                  ]);
                }}>Resetear porra completa</button>
              </div>
            </>
          )}
        </div>
      )}

      <button className="refresh-btn" onClick={() => window.location.reload()} title="Actualizar">↻</button>
    </div>
  );
}
