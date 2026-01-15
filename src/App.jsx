import { useState } from "react";
import jsPDF from "jspdf";

const TEAM_NAMES = ["A", "B", "C", "D"];

function App() {
  const [teamsCount, setTeamsCount] = useState(3);
  const [playersPerTeam, setPlayersPerTeam] = useState(5);

  const [seedPlayers, setSeedPlayers] = useState("");
  const [otherPlayers, setOtherPlayers] = useState("");

  const [startTime, setStartTime] = useState("19:00");
  const [endTime, setEndTime] = useState("20:30");

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

  const generateAndOpenPDF = () => {
    let seed = seedPlayers
      .split(/,|\n/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (seed.length !== teamsCount) {
      alert(`Broj kapitena mora biti tačno ${teamsCount}!`);
      return;
    }

    seed = seed.map((p) => `${p} (C)`);

    const others = shuffleArray(
      otherPlayers
        .split(/,|\n/)
        .map((p) => p.trim())
        .filter(Boolean)
    );

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

    setTimeout(() => {
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
            doc.setFont("helvetica", p.includes("(C)") ? "bold" : "normal");
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

      const headers = [
        "Tim",
        "Odigrano",
        "Pobjeda",
        "Nerješeno",
        "Izgubljenih",
        "Bodovi",
      ];
      const widths = [30, 30, 30, 30, 30, 30];

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
    }, 100);
  };

  return (
    <div className="App">
      <h2>Termin Generator</h2>

      <div className="form-wrap">
        <div className="form-group">
          <label>Broj ekipa:</label>
          <select
            value={teamsCount}
            onChange={(e) => setTeamsCount(Number(e.target.value))}
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
            onChange={(e) => setPlayersPerTeam(Number(e.target.value))}
          >
            <option value={4}>4</option>
            <option value={5}>5</option>
            <option value={6}>6</option>
          </select>
        </div>

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
