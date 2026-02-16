export class BohrModel {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.atomData = null;

    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    const size = rect.width;

    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;

    this.ctx.scale(dpr, dpr);
    this.draw();
  }

  setAtom(atomData) {
    this.atomData = atomData;
    this.draw();
  }

  draw() {
    if (!this.atomData) return;

    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    const cx = width / 2;
    const cy = height / 2;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);

    // 1. Process Shells
    const shells = {};
    let maxN = 0;

    // Aggregate electrons by principal quantum number (n)
    this.atomData.orbitals.forEach((orb) => {
      if (!shells[orb.n]) shells[orb.n] = 0;
      shells[orb.n] += orb.currentElectrons;
      if (orb.n > maxN) maxN = orb.n;
    });

    // 2. Draw Nucleus
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = this.atomData.nucleus.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.atomData.nucleus.color;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.closePath();

    // 3. Draw Shells & Electrons
    const maxRadius = Math.min(width, height) / 2 - 10;
    const step = maxRadius / (maxN + 0.5);

    for (let n = 1; n <= maxN; n++) {
      if (!shells[n]) continue;

      const radius = step * n + 5;

      // Draw Ring
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.closePath();

      // Draw Electrons
      const count = shells[n];
      const angleStep = (Math.PI * 2) / count;

      // FIX: Force start angle to -PI/2 (12 o'clock) for alignment
      const startAngle = -Math.PI / 2;

      for (let i = 0; i < count; i++) {
        const angle = startAngle + angleStep * i;
        const ex = cx + Math.cos(angle) * radius;
        const ey = cy + Math.sin(angle) * radius;

        ctx.beginPath();
        ctx.arc(ex, ey, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#58a6ff";
        ctx.fill();
        ctx.closePath();
      }
    }
  }
}
