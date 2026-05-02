/* DEVICE DETECTION */
const isAndroid = /android/i.test(navigator.userAgent);
const particleField = {
  reveal: 0,
  focus: 0,
  shapeProgress: 0,
  howFocus: 0,
  phoneX: 0,
  phoneY: 0,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isDesktopMotion() {
  return (
    window.matchMedia("(min-width: 861px)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

window.onload = () => {
  if (isAndroid) {
    document.getElementById("android").style.display = "block";
    document.getElementById("unsupported").style.display = "none";
  } else {
    document.getElementById("android").style.display = "none";
    document.getElementById("unsupported").style.display = "block";
    return; // Stop animations from running on the unsupported screen
  }

  requestAnimationFrame(() => {
    document.querySelectorAll(".anim").forEach((el) => el.classList.add("go"));
  });

  initScrollReveal();
  initCounters();
  initParticles();
  initHeroMotion();
  initScrollParallax();
  initMagneticHover();
  fetchDownloadCount();
};

async function fetchDownloadCount() {
  try {
    const res = await fetch("https://api.counterapi.dev/v1/anonpro/downloads/");
    const data = await res.json();
    const countEl = document.getElementById("live-download-count");
    if (countEl && data.count !== undefined) {
      countEl.dataset.count = data.count;
      countEl.textContent = data.count;
    }
  } catch (err) {
    console.error("Failed to fetch download count", err);
  }
}

function downloadApp() {
  const modal = document.getElementById("download-modal");
  if (modal) {
    modal.classList.add("show");
  }

  // Increment download count silently
  fetch("https://api.counterapi.dev/v1/anonpro/downloads/up").catch(() => {});

  // Trigger download in the background without redirecting
  const link = document.createElement("a");
  link.href =
    "https://github.com/Ferousco-dev/anonpro_release/releases/download/v1.0.1/AnonPro.apk";
  link.download = "AnonPro.apk";
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function closeDownloadModal() {
  const modal = document.getElementById("download-modal");
  if (modal) {
    modal.classList.remove("show");
  }
}

/* FAQ */
function toggleFaq(btn) {
  const item = btn.closest(".faq-item");
  const wasOpen = item.classList.contains("open");
  document
    .querySelectorAll(".faq-item.open")
    .forEach((i) => i.classList.remove("open"));
  if (!wasOpen) item.classList.add("open");
}

/* SCROLL REVEAL */
function initScrollReveal() {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        if (!reduceMotion) {
          const group = entry.target.dataset.revealGroup;
          if (group) {
            document
              .querySelectorAll(`[data-reveal-group="${group}"]`)
              .forEach((el, index) => {
                el.style.transitionDelay = `${index * 90}ms`;
              });
          }
        }

        entry.target.classList.add("visible");
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.1 },
  );

  document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
}

/* ANIMATED COUNTERS */
function initCounters() {
  const els = document.querySelectorAll("[data-count]");
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const el = entry.target;
        const target = Number(el.dataset.count);
        const suffix = el.dataset.suffix || "";
        const dur = 1400;
        const start = performance.now();

        obs.unobserve(el);

        function tick(now) {
          const t = Math.min((now - start) / dur, 1);
          const ease = 1 - Math.pow(1 - t, 3);
          const val = Math.round(ease * target);
          el.textContent = val + suffix;

          if (t < 1) {
            requestAnimationFrame(tick);
          } else {
            el.closest(".stat-item")?.classList.add("counted");
          }
        }

        requestAnimationFrame(tick);
      });
    },
    { threshold: 0.5 },
  );

  els.forEach((el) => obs.observe(el));
}

/* SCROLL-MORPHING PARTICLE CANVAS */
function initParticles() {
  const canvas = document.getElementById("particle-canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let particles = [];
  let now = 0;

  const CFG = {
    count: 180,
    color: "30,107,255",
    connectionDistance: 124,
    baseScale: 0.46,
  };

  const shapeFns = [
    cubeSurfacePoint,
    helixPoint,
    wavePoint,
    spherePoint,
    ringPoint,
  ];

  class Particle {
    constructor(index) {
      this.index = index;
      this.group = index % 2;
      this.localIndex = Math.floor(index / 2);
      this.seed = Math.random() * 1000;
      this.size = 1.7 + Math.random() * 2.5;
      this.speed = 0.06 + Math.random() * 0.04;
      this.x = 0;
      this.y = 0;
      this.z = 0;
    }

    step(target) {
      this.x += (target.x - this.x) * this.speed;
      this.y += (target.y - this.y) * this.speed;
      this.z += (target.z - this.z) * this.speed;
    }
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    canvas.style.display = isDesktopMotion() ? "block" : "none";
    build();
  }

  function build() {
    particles = Array.from(
      { length: CFG.count },
      (_, index) => new Particle(index),
    );
    updateTargets(true);
  }

  function cubeSurfacePoint(index, count) {
    const perFace = Math.ceil(count / 6);
    const face = Math.floor(index / perFace) % 6;
    const inner = index % perFace;
    const side = Math.ceil(Math.sqrt(perFace));
    const row = Math.floor(inner / side);
    const col = inner % side;
    const u = side > 1 ? col / (side - 1) - 0.5 : 0;
    const v = side > 1 ? row / (side - 1) - 0.5 : 0;
    const s = 1.18;

    switch (face) {
      case 0:
        return { x: s, y: u * 2 * s, z: v * 2 * s };
      case 1:
        return { x: -s, y: u * 2 * s, z: v * 2 * s };
      case 2:
        return { x: u * 2 * s, y: s, z: v * 2 * s };
      case 3:
        return { x: u * 2 * s, y: -s, z: v * 2 * s };
      case 4:
        return { x: u * 2 * s, y: v * 2 * s, z: s };
      default:
        return { x: u * 2 * s, y: v * 2 * s, z: -s };
    }
  }

  function helixPoint(index, count, time) {
    const t = index / Math.max(count - 1, 1);
    const angle = t * Math.PI * 7 + time * 0.00025;
    const radius = 0.7 + Math.sin(t * Math.PI * 3) * 0.1;
    return {
      x: Math.cos(angle) * radius,
      y: (t - 0.5) * 2.4,
      z: Math.sin(angle) * radius,
    };
  }

  function wavePoint(index, count, time) {
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const col = index % cols;
    const row = Math.floor(index / cols);
    const u = cols > 1 ? col / (cols - 1) - 0.5 : 0;
    const v = rows > 1 ? row / (rows - 1) - 0.5 : 0;
    return {
      x: u * 2.8,
      y:
        Math.sin(u * Math.PI * 3 + time * 0.0012) * 0.35 +
        Math.cos(v * Math.PI * 2.5 + time * 0.0009) * 0.22,
      z: v * 2.2,
    };
  }

  function spherePoint(index, count) {
    const offset = 2 / count;
    const increment = Math.PI * (3 - Math.sqrt(5));
    const y = index * offset - 1 + offset / 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const phi = index * increment;
    return {
      x: Math.cos(phi) * r * 1.5,
      y: y * 1.6,
      z: Math.sin(phi) * r * 1.5,
    };
  }

  function ringPoint(index, count, time) {
    const t = index / count;
    const angle = t * Math.PI * 2;
    const radius = 1.3 + Math.sin(time * 0.001 + t * Math.PI * 6) * 0.12;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle * 3 + time * 0.0011) * 0.24,
      z: Math.sin(angle) * radius,
    };
  }

  function rotatePoint(point, rx, ry, rz) {
    let { x, y, z } = point;

    const cosX = Math.cos(rx);
    const sinX = Math.sin(rx);
    const y1 = y * cosX - z * sinX;
    const z1 = y * sinX + z * cosX;
    y = y1;
    z = z1;

    const cosY = Math.cos(ry);
    const sinY = Math.sin(ry);
    const x1 = x * cosY + z * sinY;
    const z2 = -x * sinY + z * cosY;
    x = x1;
    z = z2;

    const cosZ = Math.cos(rz);
    const sinZ = Math.sin(rz);
    const x2 = x * cosZ - y * sinZ;
    const y2 = x * sinZ + y * cosZ;

    return { x: x2, y: y2, z };
  }

  function lerpPoint(a, b, mix) {
    return {
      x: a.x + (b.x - a.x) * mix,
      y: a.y + (b.y - a.y) * mix,
      z: a.z + (b.z - a.z) * mix,
    };
  }

  function updateTargets(force = false) {
    const shapeValue = particleField.shapeProgress * (shapeFns.length - 1);
    const fromIndex = Math.floor(shapeValue);
    const toIndex = Math.min(shapeFns.length - 1, fromIndex + 1);
    const mix = shapeValue - fromIndex;
    const groupCount = Math.ceil(particles.length / 2);

    particles.forEach((particle) => {
      const a = shapeFns[fromIndex](particle.localIndex, groupCount, now);
      const b = shapeFns[toIndex](particle.localIndex, groupCount, now);
      const target = lerpPoint(a, b, mix);

      if (particle.group === 1) {
        target.x *= -1;
        target.z *= -0.92;
      }

      target.z += Math.sin(now * 0.0008 + particle.seed) * 0.12;

      if (force) {
        particle.x = target.x;
        particle.y = target.y;
        particle.z = target.z;
      } else {
        particle.step(target);
      }
    });
  }

  function updateCanvasState() {
    if (!isDesktopMotion()) {
      particleField.reveal = 0;
      particleField.focus = 0;
      particleField.howFocus = 0;
      canvas.style.opacity = "0";
      canvas.style.transform = "translate3d(0, 80px, 0)";
      return false;
    }

    canvas.style.opacity = `${particleField.reveal * (0.18 + particleField.focus * 0.52 + particleField.howFocus * 0.34)}`;
    canvas.style.transform = `translate3d(0, ${(1 - particleField.reveal) * 80}px, 0)`;
    return true;
  }

  function drawGlow(centerX, centerY, radius) {
    const alpha =
      particleField.reveal *
      (0.016 + particleField.focus * 0.06 + particleField.howFocus * 0.1);
    if (alpha <= 0.002) return;

    const gradient = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      radius * 1.6,
    );
    gradient.addColorStop(0, `rgba(${CFG.color},${alpha})`);
    gradient.addColorStop(1, "rgba(30,107,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function loop(timestamp) {
    now = timestamp || performance.now();
    ctx.clearRect(0, 0, width, height);

    if (!updateCanvasState()) {
      requestAnimationFrame(loop);
      return;
    }

    updateTargets();

    const swapMix =
      (Math.sin(now * 0.00055 + particleField.shapeProgress * Math.PI * 1.8) +
        1) /
      2;
    let leftCenterX =
      width * (0.24 + swapMix * 0.52 - particleField.focus * 0.02);
    let rightCenterX =
      width * (0.76 - swapMix * 0.52 + particleField.focus * 0.02);
    const centerYBase = height * (0.52 + Math.sin(now * 0.00045) * 0.02);
    const crossoverLift = Math.sin(
      now * 0.00055 + particleField.shapeProgress * Math.PI * 1.8,
    );
    let leftCenterY = centerYBase - crossoverLift * height * 0.045;
    let rightCenterY = centerYBase + crossoverLift * height * 0.045;
    const scale =
      Math.min(width, height) *
      CFG.baseScale *
      (0.98 + particleField.focus * 0.52 + particleField.howFocus * 0.42);
    const spinY = now * (0.00022 + particleField.focus * 0.00016);
    const spinX = now * 0.00014;
    const projected = [];

    if (particleField.howFocus > 0.001) {
      const orbitAngle =
        now * 0.0009 + particleField.shapeProgress * Math.PI * 2;
      const orbitRadiusX = scale * (0.98 + particleField.howFocus * 0.24);
      const orbitRadiusY = scale * (0.58 + particleField.howFocus * 0.1);
      const phoneCenterX = particleField.phoneX || width * 0.68;
      const phoneCenterY = particleField.phoneY || height * 0.54;

      const orbitLeftX = phoneCenterX + Math.cos(orbitAngle) * orbitRadiusX;
      const orbitLeftY = phoneCenterY + Math.sin(orbitAngle) * orbitRadiusY;
      const orbitRightX =
        phoneCenterX + Math.cos(orbitAngle + Math.PI) * orbitRadiusX;
      const orbitRightY =
        phoneCenterY + Math.sin(orbitAngle + Math.PI) * orbitRadiusY;

      leftCenterY =
        leftCenterY + (orbitLeftY - leftCenterY) * particleField.howFocus;
      rightCenterY =
        rightCenterY + (orbitRightY - rightCenterY) * particleField.howFocus;

      leftCenterX =
        leftCenterX + (orbitLeftX - leftCenterX) * particleField.howFocus;
      rightCenterX =
        rightCenterX + (orbitRightX - rightCenterX) * particleField.howFocus;

      drawGlow(
        phoneCenterX,
        phoneCenterY,
        scale * (1.05 + particleField.howFocus * 0.2),
      );
    }

    drawGlow(leftCenterX, leftCenterY, scale * 0.92);
    drawGlow(rightCenterX, rightCenterY, scale * 0.92);

    particles.forEach((particle, index) => {
      const rotated = rotatePoint(
        { x: particle.x, y: particle.y, z: particle.z },
        spinX + Math.sin(index * 0.12 + now * 0.0002) * 0.08,
        spinY,
        Math.sin(now * 0.00012 + particle.seed) * 0.18,
      );

      const depth = 3.4 / (3.4 + rotated.z + 2.8);
      const centerX = particle.group === 0 ? leftCenterX : rightCenterX;
      const centerY = particle.group === 0 ? leftCenterY : rightCenterY;
      projected.push({
        group: particle.group,
        x: centerX + rotated.x * scale * depth,
        y: centerY + rotated.y * scale * depth,
        size:
          particle.size *
          depth *
          (1 + particleField.focus * 0.28 + particleField.howFocus * 0.3),
        alpha:
          particleField.reveal *
          (0.16 + particleField.focus * 0.66 + particleField.howFocus * 1.05) *
          (0.35 + depth * 0.9),
        rotation: now * 0.00035 + particle.seed,
      });
    });

    for (let i = 0; i < projected.length; i++) {
      for (let j = i + 1; j < projected.length; j++) {
        if (projected[i].group !== projected[j].group) continue;

        const dx = projected[i].x - projected[j].x;
        const dy = projected[i].y - projected[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > CFG.connectionDistance) continue;

        const lineAlpha =
          ((1 - distance / CFG.connectionDistance) * 0.11 + 0.015) *
          particleField.reveal *
          (0.3 + particleField.focus * 0.52 + particleField.howFocus * 0.95);

        ctx.beginPath();
        ctx.strokeStyle = `rgba(${CFG.color},${lineAlpha})`;
        ctx.lineWidth = 0.7;
        ctx.moveTo(projected[i].x, projected[i].y);
        ctx.lineTo(projected[j].x, projected[j].y);
        ctx.stroke();
      }
    }

    projected.forEach((point) => {
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.rotate(point.rotation);
      ctx.strokeStyle = `rgba(${CFG.color},${point.alpha})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(-point.size / 2, -point.size / 2, point.size, point.size);
      ctx.restore();
    });

    requestAnimationFrame(loop);
  }

  resize();
  loop();
  window.addEventListener("resize", resize);
}

/* MAGNETIC HOVER */
function initMagneticHover() {
  const targets = document.querySelectorAll(".btn, .nav-pill, .github-btn");
  if (!targets.length) return;

  const resetTarget = (target) => {
    target.style.setProperty("--mag-x", "0px");
    target.style.setProperty("--mag-y", "0px");
  };

  targets.forEach((target) => {
    const strength = target.classList.contains("primary")
      ? 16
      : target.classList.contains("github-btn")
        ? 12
        : 9;

    target.addEventListener("mousemove", (event) => {
      if (!isDesktopMotion()) {
        resetTarget(target);
        return;
      }

      const rect = target.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * strength;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * strength;
      target.style.setProperty("--mag-x", `${x}px`);
      target.style.setProperty("--mag-y", `${y}px`);
    });

    target.addEventListener("mouseleave", () => resetTarget(target));
    window.addEventListener("resize", () => {
      if (!isDesktopMotion()) resetTarget(target);
    });
  });
}

/* HERO DEPTH */
function initHeroMotion() {
  if (!isDesktopMotion()) return;

  const hero = document.querySelector(".hero-grid");
  const visual = document.querySelector(".hero-visual");
  const panel = document.querySelector(".hero-panel");
  const cards = document.querySelectorAll(".hero-card");
  const glow = document.querySelector(".hero-glow");
  if (!hero || !visual || !panel) return;

  let raf = null;
  let targetX = 0;
  let targetY = 0;

  function render() {
    raf = null;
    panel.style.transform = `rotateY(${targetX * 10}deg) rotateX(${targetY * -10}deg) translate3d(${targetX * 10}px, ${targetY * 10}px, 0)`;
    cards.forEach((card, index) => {
      const depth = index === 0 ? 18 : 24;
      card.style.transform = `translate3d(${targetX * depth}px, ${targetY * depth}px, 0)`;
    });
    if (glow) {
      glow.style.transform = `translate3d(${targetX * 18}px, ${targetY * 18}px, 0) scale(1.02)`;
    }
  }

  function queueRender() {
    if (!raf) raf = requestAnimationFrame(render);
  }

  hero.addEventListener("mousemove", (event) => {
    if (!isDesktopMotion()) return;

    const rect = visual.getBoundingClientRect();
    const relX = (event.clientX - rect.left) / rect.width - 0.5;
    const relY = (event.clientY - rect.top) / rect.height - 0.5;
    targetX = clamp(relX, -1, 1);
    targetY = clamp(relY, -1, 1);
    queueRender();
  });

  hero.addEventListener("mouseleave", () => {
    targetX = 0;
    targetY = 0;
    queueRender();
  });
}

/* SECTION PARALLAX + HOW TIMELINE */
function initScrollParallax() {
  const hero = document.querySelector(".hero");
  const heroCopy = document.querySelector(".hero-copy");
  const features = document.getElementById("features");
  const howSection = document.getElementById("how");
  const privacySection = document.querySelector(".section--privacy");
  const faqSection = document.getElementById("faq");
  const githubSection = document.querySelector(".section--github");
  const howSequence = document.querySelector(".how-sequence");
  const howImage = document.querySelector(".how-reference-image");
  const steps = document.querySelectorAll(".timeline-step");
  const stats = document.querySelector(".stats-bar");
  const parallaxSections = document.querySelectorAll(".parallax-section");
  const morphSections = [
    features,
    howSection,
    privacySection,
    faqSection,
    githubSection,
  ].filter(Boolean);

  if (!hero && !heroCopy && !stats && !howSection) return;

  let ticking = false;

  function updateHowSequence(progress, desktopMotion) {
    if (!howSequence) return;

    const stage = Math.min(2, Math.floor(progress * 3));
    howSequence.dataset.stage = String(stage);
    howSequence.style.setProperty(
      "--how-feed-shift",
      desktopMotion ? `${-progress * 180}px` : "0px",
    );
    howSequence.style.setProperty(
      "--how-seq-rotate",
      desktopMotion ? `${-progress * 1.1}deg` : "0deg",
    );
    howSequence.style.setProperty(
      "--how-seq-scale",
      desktopMotion ? `${1 + progress * 0.025}` : "1",
    );

    steps.forEach((step, index) => {
      const stepProgress = clamp(progress * 3 - index, 0, 1);
      step.style.setProperty("--step-progress", stepProgress.toFixed(3));
      step.classList.toggle(
        "active",
        stepProgress > 0.14 && stepProgress < 0.98,
      );
      step.classList.toggle("done", stepProgress >= 0.98);
    });
  }

  function updateParticleMorph(desktopMotion) {
    if (!desktopMotion || !morphSections.length) {
      particleField.focus = 0;
      particleField.shapeProgress = 0;
      particleField.howFocus = 0;
      return;
    }

    let stageValue = 0;
    let nearestOffset = Infinity;

    morphSections.forEach((section, index) => {
      const rect = section.getBoundingClientRect();
      const centerOffset =
        rect.top + rect.height * 0.5 - window.innerHeight * 0.5;
      nearestOffset = Math.min(nearestOffset, Math.abs(centerOffset));

      const local = clamp(
        (window.innerHeight * 0.58 - rect.top) / Math.max(rect.height, 1),
        0,
        1,
      );
      stageValue = Math.max(stageValue, index + local);
    });

    particleField.shapeProgress = clamp(
      stageValue / Math.max(morphSections.length - 1, 1),
      0,
      1,
    );
    particleField.focus = clamp(
      1 - nearestOffset / (window.innerHeight * 0.9),
      0.18,
      1,
    );
  }

  function update() {
    ticking = false;
    const desktopMotion = isDesktopMotion();
    const scrollY = window.scrollY;

    if (heroCopy) {
      heroCopy.style.transform = desktopMotion
        ? `translate3d(0, ${Math.min(scrollY * 0.08, 28)}px, 0)`
        : "translate3d(0, 0, 0)";
    }

    if (hero) {
      const heroRect = hero.getBoundingClientRect();
      particleField.reveal = desktopMotion
        ? clamp(
            (window.innerHeight * 0.68 - heroRect.bottom) /
              (window.innerHeight * 0.45),
            0,
            1,
          )
        : 0;
    }

    parallaxSections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const offset =
        (rect.top + rect.height * 0.5 - window.innerHeight * 0.5) /
        window.innerHeight;

      section.style.setProperty(
        "--section-shift",
        `${desktopMotion ? clamp(offset * -34, -34, 34) : 0}px`,
      );
      section.style.setProperty(
        "--section-tilt",
        `${desktopMotion ? clamp(offset * 1.8, -1.8, 1.8) : 0}deg`,
      );
      section.style.setProperty(
        "--section-opacity",
        desktopMotion
          ? `${0.08 + (1 - Math.min(Math.abs(offset), 1)) * 0.12}`
          : "0.08",
      );
    });

    updateParticleMorph(desktopMotion);

    if (howSection) {
      const rect = howSection.getBoundingClientRect();
      const progress = clamp(
        (window.innerHeight * 0.58 - rect.top) /
          Math.max(rect.height - window.innerHeight * 0.3, 1),
        0,
        1,
      );
      updateHowSequence(progress, desktopMotion);
      const howCenterOffset =
        rect.top + rect.height * 0.5 - window.innerHeight * 0.5;
      particleField.howFocus = desktopMotion
        ? clamp(
            1 - Math.abs(howCenterOffset) / (window.innerHeight * 0.55),
            0,
            1,
          )
        : 0;
    } else {
      particleField.howFocus = 0;
    }

    if (howImage) {
      const imageRect = howImage.getBoundingClientRect();
      particleField.phoneX = imageRect.left + imageRect.width * 0.5;
      particleField.phoneY = imageRect.top + imageRect.height * 0.5;
    }

    if (stats) {
      const rect = stats.getBoundingClientRect();
      const active = rect.top < window.innerHeight && rect.bottom > 0;
      stats.classList.toggle("in-view", active);
    }
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  update();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
}
