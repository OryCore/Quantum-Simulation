import { AtomSimulator } from "./AtomSimulator.js";
import { BohrModel } from "./BohrModel.js";
import { setTheme, getThemeGradient } from "./quantumMechanics.js";

class QuantumOrbitalExplorer {
  constructor() {
    this.simulator = null;
    this.bohrModel = null;
    this.atoms = new Map();
    this.init();
  }

  async init() {
    this.simulator = new AtomSimulator(document.getElementById("canvas-container"));
    this.bohrModel = new BohrModel("bohr-canvas");

    // Dynamically load all atoms from the folder
    await this.loadAtomConfigs();
    this.setupUI();

    // Load default
    this.loadAtom("hydrogen");
    this.updateLegendGradient();
  }

  async loadAtomConfigs() {
    const atomSelector = document.getElementById("atom-selector");
    atomSelector.innerHTML = '<option value="" disabled selected>Loading...</option>';

    const modules = import.meta.glob("./atoms/*.json");
    const loadedAtoms = [];

    for (const path in modules) {
      try {
        const mod = await modules[path]();
        const atomData = mod.default || mod;
        const fileKey = path.split("/").pop().replace(".json", "");

        this.atoms.set(fileKey, atomData);
        loadedAtoms.push({ key: fileKey, data: atomData });
      } catch (err) {
        console.error(`Failed to load ${path}`, err);
      }
    }

    // Sort by Atomic Number (Z)
    const validAtoms = loadedAtoms.sort((a, b) => a.data.atomicNumber - b.data.atomicNumber);

    atomSelector.innerHTML = '<option value="" disabled selected>Select Element...</option>';
    validAtoms.forEach(({ key, data }) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = `${data.atomicNumber}. ${data.name}`;
      atomSelector.appendChild(option);
    });
  }

  setupUI() {
    document.getElementById("atom-selector").addEventListener("change", (e) => {
      this.loadAtom(e.target.value);
    });

    document.getElementById("theme-selector").addEventListener("change", (e) => {
      setTheme(e.target.value);
      this.simulator.reloadColors();
      this.updateLegendGradient();
    });
  }

  updateLegendGradient() {
    const bar = document.querySelector(".gradient-bar");
    if (bar) bar.style.background = getThemeGradient();
  }

  loadAtom(atomKey) {
    const atomData = this.atoms.get(atomKey);
    if (!atomData) return;

    this.simulator.loadAtom(atomData);
    this.bohrModel.setAtom(atomData);
    this.updateInfoDisplay(atomData);
  }

  updateInfoDisplay(atomData) {
    // Basic Stats
    document.getElementById("atom-name-disp").textContent = atomData.name;
    document.getElementById("atom-symbol-disp").textContent = atomData.symbol;
    document.getElementById("atom-symbol-disp").style.borderColor = atomData.nucleus.color;
    document.getElementById("atom-number-disp").textContent = `Z = ${atomData.atomicNumber}`;
    document.getElementById("mass-disp").textContent = `~${Math.round(atomData.atomicNumber * 2)} u`;

    // Generate Real Config String (e.g., 1s² 2s²...)
    document.getElementById("config-disp").innerHTML = this.generateConfigString(atomData);

    this.updateOrbitalVisuals(atomData);
  }

  generateConfigString(atomData) {
    // 1. Group electrons by subshell (1s, 2s, 2p...)
    const subshells = {};
    atomData.orbitals.forEach((orb) => {
      // Extract base name (e.g. "2px" -> "2p", "3dxy" -> "3d")
      const match = orb.name.match(/(\d+[spdf])/);
      const key = match ? match[1] : orb.name;
      if (!subshells[key]) subshells[key] = 0;
      subshells[key] += orb.currentElectrons;
    });

    // 2. Sort naturally (1s, 2s, 2p, 3s...)
    const sortedKeys = Object.keys(subshells).sort((a, b) => {
      const nA = parseInt(a),
        nB = parseInt(b);
      if (nA !== nB) return nA - nB;
      const order = { s: 0, p: 1, d: 2, f: 3 };
      const tA = a.replace(/\d+/, ""),
        tB = b.replace(/\d+/, "");
      return (order[tA] || 0) - (order[tB] || 0);
    });

    // 3. Build HTML string with superscripts
    return sortedKeys
      .map((key) => {
        const count = subshells[key];
        // Determine Noble Gas shorthand if needed (simplified)
        return `${key}<sup>${count}</sup>`;
      })
      .join(" ");
  }

  updateOrbitalVisuals(atomData) {
    const list = document.getElementById("orbital-list");
    const graphic = document.getElementById("orbital-graphic-container");
    list.innerHTML = "";
    graphic.innerHTML = "";

    // -- Group Data --
    const groups = {};
    atomData.orbitals.forEach((orb) => {
      const match = orb.name.match(/(\d+[spdf])/);
      const key = match ? match[1] : orb.name;

      if (!groups[key]) {
        groups[key] = {
          name: key,
          orbitals: [],
          totalElectrons: 0,
          maxElectrons: 0,
        };
      }
      groups[key].orbitals.push(orb);
      groups[key].totalElectrons += orb.currentElectrons;
      groups[key].maxElectrons += orb.maxElectrons || 2;
    });

    // -- Sort Groups --
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const nA = parseInt(a),
        nB = parseInt(b);
      if (nA !== nB) return nA - nB;
      const order = { s: 0, p: 1, d: 2, f: 3 };
      const tA = a.replace(/\d+/, ""),
        tB = b.replace(/\d+/, "");
      return (order[tA] || 0) - (order[tB] || 0);
    });

    sortedKeys.forEach((key) => {
      const group = groups[key];

      // 1. ACTIVE ORBITALS LIST (The "Better Representation")
      if (group.totalElectrons > 0) {
        const percent = (group.totalElectrons / group.maxElectrons) * 100;

        const card = document.createElement("div");
        card.className = "orbital-card-new";
        card.innerHTML = `
                <div class="card-row">
                    <span class="orb-id">${group.name}</span>
                    <span class="orb-stat">${group.totalElectrons} / ${group.maxElectrons} e⁻</span>
                </div>
                <div class="progress-track">
                    <div class="progress-fill" style="width: ${percent}%; background-color: ${this.getSubshellColor(key)}"></div>
                </div>
            `;
        list.appendChild(card);
      }

      // 2. ORBITAL DIAGRAM (The Boxes)
      const row = document.createElement("div");
      row.className = "graphic-row";
      row.innerHTML = `<div class="graphic-label">${key}</div><div class="graphic-boxes"></div>`;
      const boxContainer = row.querySelector(".graphic-boxes");

      group.orbitals.forEach((orb) => {
        const max = orb.maxElectrons || 2;
        const count = orb.currentElectrons;

        // Logic to split large grouped orbitals (like "3d" total) into boxes or handle individual orbitals (like "2px")
        const boxesNeeded = max > 2 ? max / 2 : 1;

        for (let i = 0; i < boxesNeeded; i++) {
          const box = document.createElement("div");
          box.className = "orbital-box";

          // Determine arrow content based on simple filling
          let content = "";
          if (max > 2) {
            // Heuristic fill for grouped objects
            const pairIndex = Math.floor(count / 2);
            if (i < pairIndex) content = "↑↓";
            else if (i === pairIndex && count % 2 !== 0) content = "↑";
          } else {
            content = count === 2 ? "↑↓" : count === 1 ? "↑" : "";
          }

          box.textContent = content;
          box.style.borderColor = content !== "" ? "rgba(255,255,255,0.6)" : "#30363d";
          boxContainer.appendChild(box);
        }
      });
      graphic.appendChild(row);
    });
  }

  getSubshellColor(name) {
    if (name.includes("s")) return "#ff9999";
    if (name.includes("p")) return "#99ff99";
    if (name.includes("d")) return "#9999ff";
    if (name.includes("f")) return "#ffff99";
    return "#ffffff";
  }
}

new QuantumOrbitalExplorer();
