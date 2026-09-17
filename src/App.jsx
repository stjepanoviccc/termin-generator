import { useState } from "react";
import jsPDF from "jspdf";
import { Toaster, toast } from "react-hot-toast";
import { NESO_PLAYERS } from "./players";

const TEAM_NAMES = ["A", "B", "C", "D"];

const DEFAULT_TEAMS_COUNT = 3;
const DEFAULT_PLAYERS_PER_TEAM = 5;
const DEFAULT_START_TIME = "19:00";
const DEFAULT_END_TIME = "20:30";

function App() {
  const [nesoMode, setNesoMode] = useState(false);

  const [teamsCount, setTeamsCount] = useState(DEFAULT_TEAMS_COUNT);
  const [playersPerTeam, setPlayersPerTeam] = useState(
    DEFAULT_PLAYERS_PER_TEAM
  );

  const [seedPlayers, setSeedPlayers] = useState("");
  const [otherPlayers, setOtherPlayers] = useState("");

  const [selectedNeso, setSelectedNeso] = useState([]);
  const [nesoCaptains, setNesoCaptains] = useState([]);

  const [startTime, setStartTime] = useState(DEFAULT_START_TIME);
  const [endTime, setEndTime] = useState(DEFAULT_END_TIME);

  const nesoCapacity = teamsCount * playersPerTeam;

  const notifyError = (msg) => {
    toast.error(msg, {
      style: {
        border: "1px solid #ff4d4f",
        padding: "16px",
        color: "#fff",
        background: "#ff4d4f",
        borderRadius: "10px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        fontWeight: "bold",
        fontSize: "14px",
      },
      iconTheme: {
        primary: "#fff",
        secondary: "#ff4d4f",
      },
      duration: 4000,
    });
  };

  const notifyInfo = (msg) => {
    toast(msg, {
      style: {
        border: "1px solid #2e7d32",
        padding: "16px",
        color: "#fff",
        background: "#2e7d32",
        borderRadius: "10px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        fontWeight: "bold",
        fontSize: "14px",
      },
      duration: 3000,
    });
  };

  const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5);
  const timeToMinutes = (time) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };
  const formatTime = (minutes) => {
    const h = String(Math.floor(minutes / 60)).padStart(2, "0");
    const m = String(Math.floor(minutes % 60)).padStart(2, "0");
    return `${h}:${m}`;
  };
  const generatePairs = (teams) => {
    const n = teams.length;
    const rounds = [];

    const list = [...teams];
    if (n % 2 !== 0) list.push("BYE");

    const size = list.length;
    const half = size / 2;

    let arr = [...list];

    for (let r = 0; r < size - 1; r++) {
      const round = [];

      for (let i = 0; i < half; i++) {
        const a = arr[i];
        const b = arr[size - 1 - i];
        if (a !== "BYE" && b !== "BYE") {
          round.push([a, b]);
        }
      }

      rounds.push(round);

      arr = [arr[0], ...arr.slice(1).slice(-1), ...arr.slice(1, -1)];
    }

    return rounds.flat();
  };

  /* ---------- MOD ---------- */

  const resetConfig = () => {
    setTeamsCount(DEFAULT_TEAMS_COUNT);
    setPlayersPerTeam(DEFAULT_PLAYERS_PER_TEAM);
    setSeedPlayers("");
    setOtherPlayers("");
    setSelectedNeso([]);
    setNesoCaptains([]);
    setStartTime(DEFAULT_START_TIME);
    setEndTime(DEFAULT_END_TIME);
  };

  const toggleMode = () => {
    resetConfig();
    setNesoMode((prev) => !prev);
  };

  /* ---------- NESO SELEKCIJA ---------- */

  const toggleNesoPlayer = (name) => {
    setSelectedNeso((prev) => {
      if (prev.includes(name)) {
        // Izbačen igrač ne može ostati kapiten.
        setNesoCaptains((caps) => caps.filter((c) => c !== name));
        return prev.filter((n) => n !== name);
      }

      if (prev.length >= nesoCapacity) {
        notifyError(
          `Možeš izabrati maksimalno ${nesoCapacity} igrača (${teamsCount} x ${playersPerTeam})!`
        );
        return prev;
      }

      return [...prev, name];
    });
  };

  const toggleNesoCaptain = (name) => {
    setNesoCaptains((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name);

      if (prev.length >= teamsCount) {
        notifyError(`Možeš izabrati najviše ${teamsCount} kapitena!`);
        return prev;
      }

      return [...prev, name];
    });
  };

  const clearNesoSelection = () => {
    setSelectedNeso([]);
    setNesoCaptains([]);
  };

  const trimSelectionTo = (capacity) => {
    setSelectedNeso((prev) => {
      if (prev.length <= capacity) return prev;
      notifyInfo(`Selekcija smanjena na ${capacity} igrača.`);

      const kept = prev.slice(0, capacity);
      setNesoCaptains((caps) => caps.filter((c) => kept.includes(c)));
      return kept;
    });
  };

  const changeTeamsCount = (value) => {
    setTeamsCount(value);
    setNesoCaptains((prev) => prev.slice(0, value));
    if (nesoMode) trimSelectionTo(value * playersPerTeam);
  };

  const changePlayersPerTeam = (value) => {
    setPlayersPerTeam(value);
    if (nesoMode) trimSelectionTo(teamsCount * value);
  };

  /* ---------- SASTAVLJANJE EKIPA ---------- */

  // Imena u ekipi se ispisuju po abecedi – redoslijed ne odaje ničiju snagu.
  const sortNames = (players) =>
    [...players].sort((a, b) => a.localeCompare(b, "sr"));

  // Ručni mod: kapiteni + ostali igrači se dijele random.
  const buildManualTeams = () => {
    let seed = seedPlayers
      .split(/,|\n/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (seed.length !== teamsCount) {
      notifyError(`Broj kapitena mora biti tačno ${teamsCount}!`);
      return null;
    }
    seed = seed.map((p) => `${p} (C)`);

    const others = shuffleArray(
      otherPlayers
        .split(/,|\n/)
        .map((p) => p.trim())
        .filter(Boolean)
    );

    const totalPlayers = others.length;
    const maxPlayers = teamsCount * playersPerTeam - teamsCount;

    if (totalPlayers > maxPlayers) {
      notifyError(
        `Ukupan broj igrača (${totalPlayers}) je veći od maksimalnog dozvoljenog (${maxPlayers})!`
      );
      return null;
    }

    const teams = {};
    for (let i = 0; i < teamsCount; i++) teams[TEAM_NAMES[i]] = [];

    seed.forEach((p, i) => (teams[TEAM_NAMES[i]] = [p]));

    let ti = 0;
    others.forEach((p) => {
      while (teams[TEAM_NAMES[ti]].length >= playersPerTeam) {
        ti = (ti + 1) % teamsCount;
      }
      teams[TEAM_NAMES[ti]].push(p);
      ti = (ti + 1) % teamsCount;
    });

    // Kapiten ostaje prvi, ostali po abecedi.
    for (let i = 0; i < teamsCount; i++) {
      const [captain, ...rest] = teams[TEAM_NAMES[i]];
      teams[TEAM_NAMES[i]] = [captain, ...sortNames(rest)];
    }

    return teams;
  };

  // NESO mod: igrači nose snagu 5 ili 4, pa se ravnomjerno raspoređuju.
  const buildNesoTeams = () => {
    if (selectedNeso.length < teamsCount) {
      notifyError(`Izaberi najmanje ${teamsCount} igrača (po jedan za ekipu)!`);
      return null;
    }

    if (selectedNeso.length > nesoCapacity) {
      notifyError(
        `Izabrano je ${selectedNeso.length} igrača, a maksimum je ${nesoCapacity}!`
      );
      return null;
    }

    const byName = new Map(NESO_PLAYERS.map((p) => [p.name, p]));
    const picked = selectedNeso.map((name) => byName.get(name)).filter(Boolean);

    const captains = shuffleArray(
      picked.filter((p) => nesoCaptains.includes(p.name))
    );
    const rest = picked.filter((p) => !nesoCaptains.includes(p.name));

    const strong = shuffleArray(rest.filter((p) => p.strength === 5));
    const weak = shuffleArray(rest.filter((p) => p.strength !== 5));

    const names = TEAM_NAMES.slice(0, teamsCount);
    // Random redoslijed ekipa: kad broj ne dijeli ravno, "viška" igrač ne ide uvijek u ekipu A.
    const order = shuffleArray(names);

    const teams = {};
    names.forEach((t) => (teams[t] = []));

    // Kapiteni prvi – svaki u svoju ekipu.
    captains.forEach((p, i) => {
      teams[order[i]].push({ ...p, captain: true });
    });

    const openTeams = () => order.filter((t) => teams[t].length < playersPerTeam);
    const strongIn = (t) => teams[t].filter((p) => p.strength === 5).length;

    // Jači igrači idu u ekipu koja trenutno ima najmanje petica – računajući i kapitene.
    strong.forEach((p) => {
      const open = openTeams();
      const min = Math.min(...open.map(strongIn));
      teams[open.find((t) => strongIn(t) === min)].push(p);
    });

    // Zatim slabiji, uvijek u ekipu koja trenutno ima najmanje igrača.
    weak.forEach((p) => {
      const open = openTeams();
      const min = Math.min(...open.map((t) => teams[t].length));
      teams[open.find((t) => teams[t].length === min)].push(p);
    });

    // Kapiten se ispisuje prvi sa oznakom (C), ostatak ekipe po abecedi.
    names.forEach((t) => {
      const captain = teams[t].find((p) => p.captain);
      const others = sortNames(
        teams[t].filter((p) => !p.captain).map((p) => p.name)
      );
      teams[t] = captain ? [`${captain.name} (C)`, ...others] : others;
    });

    return teams;
  };

  const generateAndOpenPDF = () => {
    const teams = nesoMode ? buildNesoTeams() : buildManualTeams();
    if (!teams) return;

    for (let i = 0; i < teamsCount; i++) {
      while (teams[TEAM_NAMES[i]].length < playersPerTeam) {
        teams[TEAM_NAMES[i]].push("Joker");
      }
    }

    const startM = timeToMinutes(startTime);
    const endM = timeToMinutes(endTime);
    const totalM = endM - startM;
    const BREAK = 1;

    const pairs = generatePairs(Object.keys(teams));
    const matches = [];

    const cycles = Math.max(
      1,
      Math.floor(totalM / ((6 + BREAK) * pairs.length))
    );

    for (let c = 0; c < cycles; c++) {
      pairs.forEach((p) => matches.push(`${p[0]} : ${p[1]}`));
    }

    let duration = (totalM - matches.length * BREAK) / matches.length;
    duration = Math.min(8, Math.max(6, duration));

    let cur = startM;
    const schedule = [];

    matches.forEach((m) => {
      if (cur + duration > endM) return;
      schedule.push({
        match: m,
        from: formatTime(cur),
        to: formatTime(cur + duration),
      });
      cur += duration + BREAK;
    });

    const doc = new jsPDF("p", "mm", "a4");

    if (teamsCount === 2) {
      doc.setFontSize(20);
      doc.setFont("helvetica");
      doc.text("EKIPE", 105, 20, { align: "center" });

      Object.entries(teams).forEach(([t, players], i) => {
        const x = i === 0 ? 20 : 110;
        const y = 35;

        doc.rect(x, y, 80, 80);
        doc.setFontSize(14);
        doc.text(`TIM ${t}`, x + 40, y + 10, { align: "center" });

        let py = y + 22;
        doc.setFontSize(11);
        players.forEach((p) => {
          doc.setFont("helvetica", "normal");
          doc.text(p, x + 8, py);
          py += 7;
        });
      });

      window.open(doc.output("bloburl"), "_blank");
      return;
    }

    let y = 15;
    doc.setFontSize(18);
    doc.setFont("helvetica");
    doc.text("TURNIRSKI RASPORED", 105, y, { align: "center" });
    y += 10;

    doc.setFontSize(14);
    doc.text("Ekipe", 10, y);
    y += 6;

    const boxW = teamsCount === 3 ? 60 : 45;
    const boxH = 45;

    Object.entries(teams).forEach(([t, players], i) => {
      const x = 10 + i * (boxW + 5);
      doc.rect(x, y, boxW, boxH);

      doc.setFontSize(12);
      doc.text(`TIM ${t}`, x + boxW / 2, y + 7, { align: "center" });

      let py = y + 15;
      doc.setFontSize(10);
      players.forEach((p) => {
        doc.setFont("helvetica");
        doc.text(p, x + 3, py);
        py += 5;
      });
    });

    y += boxH + 10;

    doc.setFontSize(14);
    doc.text("Raspored utakmica", 10, y);
    y += 10;

    doc.setFontSize(11);
    schedule.forEach((s) => {
      doc.text(`${s.from} – ${s.to}   ${s.match}`, 10, y);

      doc.line(55, y + 1, 70, y + 1);
      doc.text(":", 72, y);
      doc.line(75, y + 1, 90, y + 1);

      y += 6;
    });

    y += 6;

    doc.setFontSize(14);
    doc.text("Tabela", 10, y);
    y += 6;

    doc.setFontSize(10);

    // "Bodovi" zauzima širinu dvije nekadašnje kolone (Pobjeda + Nerješeno).
    const headers = ["Tim", "Bodovi", "Ukupno"];
    const widths = [30, 60, 30];

    let x = 10;
    headers.forEach((h, i) => {
      doc.rect(x, y, widths[i], 8);
      doc.text(h, x + 2, y + 5);
      x += widths[i];
    });

    y += 8;

    Object.keys(teams).forEach((t) => {
      let rx = 10;
      widths.forEach((w, i) => {
        doc.rect(rx, y, w, 8);
        if (i === 0) doc.text(`Tim ${t}`, rx + 2, y + 5);
        rx += w;
      });
      y += 8;
    });

    window.open(doc.output("bloburl"), "_blank");
  };

  const jokers = Math.max(0, nesoCapacity - selectedNeso.length);

  // Prikaz po abecedi – da redoslijed u listi ne odaje ko koju snagu nosi.
  const displayPlayers = [...NESO_PLAYERS].sort((a, b) =>
    a.name.localeCompare(b.name, "sr")
  );

  // Za kapitene se nude samo igrači koji su već selektovani za termin.
  const captainCandidates = sortNames(selectedNeso);

  return (
    <div className="App">
      <Toaster />
      <h2>Termin Generator</h2>

      <button
        type="button"
        className={`mode-btn ${nesoMode ? "active" : ""}`}
        onClick={toggleMode}
      >
        {nesoMode ? "REGULARNI TERMIN" : "NESO TERMIN"}
      </button>

      <div className="form-wrap">
        <div className="form-group">
          <label>Broj ekipa:</label>
          <select
            value={teamsCount}
            onChange={(e) => changeTeamsCount(Number(e.target.value))}
          >
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </div>

        <div className="form-group">
          <label>Igrača po ekipi:</label>
          <select
            value={playersPerTeam}
            onChange={(e) => changePlayersPerTeam(Number(e.target.value))}
          >
            <option value={4}>4</option>
            <option value={5}>5</option>
            <option value={6}>6</option>
          </select>
        </div>

        {nesoMode ? (
          <div className="form-group players-group">
            <label>
              Igrači na terminu ({selectedNeso.length}/{nesoCapacity})
            </label>

            <div className="players-meta">
              <span>Joker: {jokers}</span>
              {selectedNeso.length > 0 && (
                <button
                  type="button"
                  className="clear-btn"
                  onClick={clearNesoSelection}
                >
                  Očisti
                </button>
              )}
            </div>

            <div className="players-grid">
              {displayPlayers.map((p) => {
                const checked = selectedNeso.includes(p.name);
                const disabled =
                  !checked && selectedNeso.length >= nesoCapacity;

                return (
                  <label
                    key={p.name}
                    className={`player-item ${checked ? "checked" : ""} ${
                      disabled ? "disabled" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleNesoPlayer(p.name)}
                    />
                    <span className="player-name">{p.name}</span>
                  </label>
                );
              })}
            </div>

            {selectedNeso.length > 0 && (
              <>
                <label className="captains-label">
                  Kapiteni ({nesoCaptains.length}/{teamsCount}) – opciono
                </label>

                <div className="players-grid captains-grid">
                  {captainCandidates.map((name) => {
                    const checked = nesoCaptains.includes(name);
                    const disabled =
                      !checked && nesoCaptains.length >= teamsCount;

                    return (
                      <label
                        key={name}
                        className={`player-item ${checked ? "checked" : ""} ${
                          disabled ? "disabled" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleNesoCaptain(name)}
                        />
                        <span className="player-name">{name}</span>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="form-group">
              <label>Kapiteni (jedan po liniji ili zarezom):</label>
              <textarea
                value={seedPlayers}
                onChange={(e) => setSeedPlayers(e.target.value)}
                rows={6}
                placeholder="Neso, Bojan, Dado..."
              />
            </div>

            <div className="form-group">
              <label>Ostali igrači (jedan po liniji ili zarezom):</label>
              <textarea
                value={otherPlayers}
                onChange={(e) => setOtherPlayers(e.target.value)}
                rows={6}
                placeholder="Stefan, Nikola, Darko..."
              />
            </div>
          </>
        )}

        <div className="time-group">
          <div className="form-group">
            <label>Od:</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Do:</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        <button onClick={generateAndOpenPDF}>Generiši PDF</button>
      </div>
    </div>
  );
}

export default App;
