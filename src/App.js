import { useState, useEffect, useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
  useInView,
} from "framer-motion";

/* ─── Global Styles ─────────────────────────────────────────────────────────── */
const GlobalStyle = () => (
  <style>{`
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --red:      #990000;
      --red-mid:  #bb0000;
      --charcoal: #111111;
      --mid:      #444444;
      --muted:    #888888;
      --white:    #FAFAFA;
      --offwhite: #F2F0ED;
      --border:   rgba(17,17,17,0.10);
    }

    html { scroll-behavior: smooth; }

    body {
      background: var(--white);
      color: var(--charcoal);
      font-family: 'Montserrat', sans-serif;
      overflow-x: hidden;
      cursor: none;
    }

    /* ── Custom cursor ── */
    .c-dot {
      width: 8px; height: 8px;
      background: var(--charcoal);
      border-radius: 50%;
      position: fixed; top: 0; left: 0;
      pointer-events: none; z-index: 9999;
    }
    .c-ring {
      width: 36px; height: 36px;
      border: 1.5px solid var(--charcoal);
      border-radius: 50%;
      position: fixed; top: 0; left: 0;
      pointer-events: none; z-index: 9998;
      transition: width 0.22s ease, height 0.22s ease,
                  border-color 0.22s ease, transform 0.14s ease;
    }
    .c-ring.hov {
      width: 60px; height: 60px;
      border-color: var(--red);
    }

    /* ── Scrollbar ── */
    ::-webkit-scrollbar { width: 3px; }
    ::-webkit-scrollbar-track { background: var(--offwhite); }
    ::-webkit-scrollbar-thumb { background: var(--red); }

    /* ── Selection ── */
    ::selection { background: var(--red); color: #fff; }

    /* ── Nav underline ── */
    .nav-ul { position: absolute; bottom: 0; left: 0; height: 1.5px;
               width: 0; background: var(--red);
               transition: width 0.3s ease; display: block; }
    .nav-a:hover .nav-ul { width: 100%; }
    .nav-a { position: relative; padding: 4px 0; text-decoration: none;
              font-family: 'Montserrat', sans-serif; font-size: 11px;
              font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase;
              color: var(--charcoal); }

    /* ── Lookbook card ── */
    .lb-card { break-inside: avoid; margin-bottom: 1.5rem; cursor: none; }
    .lb-card img { width: 100%; display: block; object-fit: cover;
                   transition: transform 0.6s cubic-bezier(.25,.1,.25,1); }
    .lb-card:hover img { transform: scale(1.05); }
    .lb-overlay { position: absolute; inset: 0; opacity: 0;
                  background: linear-gradient(to top,
                    rgba(17,17,17,.88) 0%, rgba(17,17,17,.2) 60%, transparent 100%);
                  display: flex; flex-direction: column;
                  justify-content: flex-end; padding: 1.25rem;
                  transition: opacity 0.35s ease; }
    .lb-card:hover .lb-overlay { opacity: 1; }

    /* ── Footer link ── */
    .ft-link { font-family:'Montserrat',sans-serif; font-size:9px; font-weight:600;
               letter-spacing:0.18em; text-transform:uppercase;
               color:rgba(255,255,255,.25); text-decoration:none;
               transition: color 0.2s; }
    .ft-link:hover { color: var(--red); }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .about-grid { grid-template-columns: 1fr !important; }
      .nav-links  { display: none; }
      body        { cursor: auto; }
      .c-dot, .c-ring { display: none; }
    }
    @media (max-width: 600px) {
      .masonry { columns: 2 !important; }
    }
  `}</style>
);

/* ─── Photo manifest (paths relative to /public) ──────────────────────────── */
const PHOTOS = Array.from({ length: 20 }, (_, i) =>
  `/photos/photo-${String(i + 1).padStart(2, "0")}.jpg`
);

const LABELS = [
  "Architectural Canvas",
  "Garden State",
  "Nature's Frame",
  "The Plot Unfolds",
  "Skyline Protocol",
  "Urban Still",
  "City Silhouette",
  "Market Days",
  "Hotel Corridor",
  "Fitting Room",
  "Mirror Test",
  "All Black Everything",
  "New Era",
  "Door of Opportunity",
  "The Look",
  "Golden Hour",
  "Evening Grounds",
  "Laughing at the Top",
  "Grounded",
  "Stone & Steel",
];

/* ─── Custom Cursor ──────────────────────────────────────────────────────────── */
function Cursor() {
  const dot  = useRef(null);
  const ring = useRef(null);
  const hov  = useRef(false);

  useEffect(() => {
    const onMove = ({ clientX: x, clientY: y }) => {
      if (dot.current)  dot.current.style.transform  = `translate(${x - 4}px,${y - 4}px)`;
      if (ring.current) {
        const s = hov.current ? 60 : 36;
        ring.current.style.transform = `translate(${x - s / 2}px,${y - s / 2}px)`;
      }
    };
    const onOver = ({ target }) => {
      if (target.closest("a,button,[data-hov]")) {
        hov.current = true;
        ring.current?.classList.add("hov");
      }
    };
    const onOut = () => {
      hov.current = false;
      ring.current?.classList.remove("hov");
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover",  onOver);
    window.addEventListener("mouseout",   onOut);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover",  onOver);
      window.removeEventListener("mouseout",   onOut);
    };
  }, []);

  return (
    <>
      <div ref={dot}  className="c-dot" />
      <div ref={ring} className="c-ring" />
    </>
  );
}

/* ─── Navigation ─────────────────────────────────────────────────────────────── */
function Nav() {
  const [visible,  setVisible]  = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const fn = () => {
      const y = window.scrollY;
      setVisible(y < lastY.current || y < 80);
      setScrolled(y > 40);
      lastY.current = y;
    };
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const navBg = scrolled
    ? "rgba(250,250,250,0.93)"
    : "transparent";
  const navBorder = scrolled
    ? "1px solid rgba(17,17,17,0.08)"
    : "1px solid transparent";

  return (
    <motion.header
      animate={{ y: visible ? 0 : -90, opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.38, ease: [0.25, 0.1, 0.25, 1] }}
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 900,
        height: 72,
        background: navBg,
        backdropFilter: scrolled ? "blur(18px)" : "none",
        borderBottom: navBorder,
        transition: "background 0.4s, border-color 0.4s, backdrop-filter 0.4s",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 clamp(1.5rem,5vw,4rem)",
      }}
    >
      {/* Logo mark */}
      <a href="#hero" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 34, height: 34, background: "#990000",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 13, color: "#fff", letterSpacing: "-0.5px" }}>JM</span>
        </div>
        <span style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 600, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "#111" }}>
          Jamin Mandela
        </span>
      </a>

      {/* Links */}
      <nav className="nav-links" style={{ display: "flex", gap: "clamp(1.5rem,3vw,2.5rem)", alignItems: "center" }}>
        {["About", "Lookbook", "Connect"].map((item) => (
          <a key={item} href={`#${item.toLowerCase()}`} className="nav-a">
            {item}
            <span className="nav-ul" />
          </a>
        ))}
        <a
          href="https://www.instagram.com/amirimayne"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: "'Montserrat',sans-serif", fontSize: 10, fontWeight: 700,
            letterSpacing: "0.15em", textTransform: "uppercase",
            color: "#fff", background: "#990000",
            padding: "10px 22px", textDecoration: "none",
            transition: "background 0.25s, transform 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#bb0000"; e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#990000"; e.currentTarget.style.transform = "translateY(0)"; }}
        >
          Instagram ↗
        </a>
      </nav>
    </motion.header>
  );
}

/* ─── Hero ───────────────────────────────────────────────────────────────────── */
function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imgY  = useTransform(scrollYProgress, [0, 1], ["0%",  "28%"]);
  const txtY  = useTransform(scrollYProgress, [0, 1], ["0%",  "65%"]);
  const fade  = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section
      ref={ref}
      id="hero"
      style={{ position: "relative", height: "100vh", minHeight: 680, overflow: "hidden", display: "flex", alignItems: "flex-end" }}
    >
      {/* Parallax image */}
      <motion.div style={{ y: imgY, position: "absolute", inset: 0 }}>
        <div style={{
          position: "absolute", inset: 0, zIndex: 1,
          background: "linear-gradient(to top, rgba(10,10,10,.88) 0%, rgba(10,10,10,.35) 55%, rgba(10,10,10,.05) 100%)",
        }} />
        <img
          src={PHOTOS[4]}
          alt="Jamin Mandela"
          style={{ width: "100%", height: "115%", objectFit: "cover", objectPosition: "center top", display: "block" }}
        />
      </motion.div>

      {/* Hero text */}
      <motion.div
        style={{ y: txtY, opacity: fade, position: "relative", zIndex: 10, width: "100%", padding: "clamp(2rem,6vw,5rem)" }}
      >
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x:  0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}
        >
          <div style={{ width: 40, height: 1, background: "#990000" }} />
          <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(255,255,255,.65)" }}>
            Nairobi, Kenya — Est. 2024
          </span>
        </motion.div>

        {/* JAMIN */}
        <div style={{ overflow: "hidden", marginBottom: 2 }}>
          <motion.h1
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            transition={{ delay: 0.5, duration: 1, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontFamily: "'Playfair Display',serif", fontWeight: 900,
              fontSize: "clamp(3.8rem,12vw,11rem)",
              lineHeight: 0.88, color: "#fff", letterSpacing: "-0.02em",
            }}
          >
            JAMIN
          </motion.h1>
        </div>

        {/* MANDELA + tag */}
        <div style={{ overflow: "hidden", display: "flex", alignItems: "flex-end", gap: "clamp(1rem,2vw,2rem)", flexWrap: "wrap" }}>
          <motion.h1
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            transition={{ delay: 0.65, duration: 1, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontFamily: "'Playfair Display',serif", fontWeight: 900, fontStyle: "italic",
              fontSize: "clamp(3.8rem,12vw,11rem)",
              lineHeight: 0.88, color: "#990000", letterSpacing: "-0.02em",
            }}
          >
            MANDELA
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y:  0 }}
            transition={{ delay: 1.1, duration: 0.7 }}
            style={{ paddingBottom: "clamp(.4rem,1vw,.9rem)" }}
          >
            <span style={{ display: "block", fontFamily: "'Montserrat',sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,.45)", marginBottom: 4 }}>
              Fashion Influencer
            </span>
            <span style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 17, color: "rgba(255,255,255,.7)" }}>
              Founder of Plotwear
            </span>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.7 }}
          style={{ position: "absolute", right: "clamp(2rem,6vw,5rem)", bottom: "3rem", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
        >
          <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,.4)", writingMode: "vertical-rl" }}>
            Scroll
          </span>
          <motion.div
            animate={{ scaleY: [1, 1.5, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: 1, height: 52, background: "rgba(255,255,255,.25)", transformOrigin: "top" }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ─── About ──────────────────────────────────────────────────────────────────── */
function About() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="about"
      ref={ref}
      className="about-grid"
      style={{
        padding: "clamp(5rem,12vw,10rem) clamp(1.5rem,8vw,8rem)",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "clamp(3rem,8vw,8rem)",
        alignItems: "center",
        background: "#FAFAFA",
      }}
    >
      {/* Image stack */}
      <motion.div
        initial={{ opacity: 0, x: -60 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: "relative", aspectRatio: "3/4" }}
      >
        {/* Accent block */}
        <div style={{
          position: "absolute", top: "14%", left: "-6%",
          width: "32%", height: "32%", background: "#990000", opacity: 0.12, zIndex: 1,
        }} />
        {/* Ghost year */}
        <div style={{
          position: "absolute", top: "6%", left: "-9%", zIndex: 0,
          fontFamily: "'Playfair Display',serif", fontWeight: 900,
          fontSize: "clamp(4rem,8vw,7rem)", lineHeight: 1,
          color: "transparent", WebkitTextStroke: "1px rgba(17,17,17,.1)",
          userSelect: "none",
        }}>2026</div>
        {/* Main image */}
        <img
          src={PHOTOS[5]}
          alt=""
          style={{ width: "80%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block", position: "relative", zIndex: 2 }}
        />
        {/* Inset image */}
        <img
          src={PHOTOS[0]}
          alt=""
          style={{
            width: "56%", height: "60%", objectFit: "cover", objectPosition: "top",
            position: "absolute", bottom: "-6%", right: 0, zIndex: 3,
            outline: "6px solid #FAFAFA",
          }}
        />
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, x: 60 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "2rem" }}>
          <div style={{ width: 40, height: 2, background: "#990000" }} />
          <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", color: "#990000" }}>
            The Story
          </span>
        </div>

        <h2 style={{
          fontFamily: "'Playfair Display',serif", fontWeight: 800,
          fontSize: "clamp(2.2rem,4vw,3.6rem)",
          lineHeight: 1.05, color: "#111", marginBottom: "1.75rem", letterSpacing: "-0.02em",
        }}>
          The{" "}
          <em style={{ fontStyle: "italic", color: "#990000" }}>Plot</em>
          <br />You're Building.
        </h2>

        <p style={{
          fontFamily: "'Cormorant Garamond',serif", fontWeight: 400,
          fontSize: "clamp(1.05rem,1.5vw,1.22rem)",
          lineHeight: 1.9, color: "#555", marginBottom: "2.5rem",
        }}>
          Jamin Mandela is a Nairobi-based fashion influencer and the creative force behind Plotwear.
          Defining the intersection of contemporary streetwear and classic silhouettes, Jamin uses the
          city's architectural landscape as his canvas. His style isn't just about what you wear—it's
          about the narrative of the 'Plot' you're building.
        </p>

        <div style={{ display: "flex", gap: "2.5rem", flexWrap: "wrap" }}>
          {[["Nairobi", "Base"], ["Plotwear", "Label"], ["Urban Luxury", "Aesthetic"]].map(([val, lbl]) => (
            <div key={lbl}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: "1.05rem", color: "#111", marginBottom: 3 }}>{val}</div>
              <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#999" }}>{lbl}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

/* ─── Lookbook card ───────────────────────────────────────────────────────────── */
function LBCard({ src, label, index, onClick }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      className="lb-card"
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.75, delay: (index % 4) * 0.07, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => onClick(index)}
      data-hov="true"
    >
      <div style={{ position: "relative", overflow: "hidden" }}>
        <img src={src} alt={label} loading="lazy" />

        <div className="lb-overlay">
          <span style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: "1.05rem", color: "#fff", marginBottom: 5 }}>
            {label}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 20, height: 1, background: "#990000" }} />
            <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,.65)" }}>
              View Full
            </span>
          </div>
        </div>

        {/* Number badge */}
        <div style={{
          position: "absolute", top: 10, right: 10,
          fontFamily: "'Montserrat',sans-serif", fontSize: 9, fontWeight: 700,
          letterSpacing: "0.1em", color: "#fff",
          background: "rgba(0,0,0,.32)", backdropFilter: "blur(6px)",
          padding: "4px 8px",
        }}>
          {String(index + 1).padStart(2, "0")}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Lightbox ────────────────────────────────────────────────────────────────── */
function Lightbox({ index, onClose }) {
  const [cur, setCur] = useState(index);

  useEffect(() => {
    const fn = (e) => {
      if (e.key === "Escape")     onClose();
      if (e.key === "ArrowRight") setCur(c => (c + 1) % PHOTOS.length);
      if (e.key === "ArrowLeft")  setCur(c => (c - 1 + PHOTOS.length) % PHOTOS.length);
    };
    window.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", fn); document.body.style.overflow = ""; };
  }, [onClose]);

  const btnBase = {
    background: "none", border: "1px solid rgba(255,255,255,.18)",
    color: "#fff", width: 50, height: 50, cursor: "none",
    fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center",
    position: "fixed", top: "50%", transform: "translateY(-50%)", zIndex: 9001,
    transition: "border-color 0.2s, background 0.2s",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(8,8,8,.97)", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <AnimatePresence mode="wait">
        <motion.img
          key={cur}
          initial={{ opacity: 0, scale: 0.93 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          src={PHOTOS[cur]}
          alt=""
          onClick={e => e.stopPropagation()}
          style={{ maxHeight: "90vh", maxWidth: "90vw", objectFit: "contain", display: "block" }}
        />
      </AnimatePresence>

      {/* Close */}
      <button
        onClick={onClose}
        style={{ position: "fixed", top: "1.5rem", right: "1.5rem", background: "none", border: "1px solid rgba(255,255,255,.2)", color: "#fff", width: 44, height: 44, cursor: "none", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9001 }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "#990000"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.2)"; }}
      >✕</button>

      {/* Prev */}
      <button
        onClick={e => { e.stopPropagation(); setCur(c => (c - 1 + PHOTOS.length) % PHOTOS.length); }}
        style={{ ...btnBase, left: "1.5rem" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "#990000"; e.currentTarget.style.background = "rgba(153,0,0,.15)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.18)"; e.currentTarget.style.background = "none"; }}
      >←</button>

      {/* Next */}
      <button
        onClick={e => { e.stopPropagation(); setCur(c => (c + 1) % PHOTOS.length); }}
        style={{ ...btnBase, right: "1.5rem" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "#990000"; e.currentTarget.style.background = "rgba(153,0,0,.15)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.18)"; e.currentTarget.style.background = "none"; }}
      >→</button>

      {/* Counter + label */}
      <div style={{ position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)", fontFamily: "'Montserrat',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.2em", color: "rgba(255,255,255,.35)", textTransform: "uppercase", zIndex: 9001, whiteSpace: "nowrap" }}>
        {String(cur + 1).padStart(2, "0")} / {String(PHOTOS.length).padStart(2, "0")} — {LABELS[cur]}
      </div>
    </motion.div>
  );
}

/* ─── Lookbook Section ────────────────────────────────────────────────────────── */
function Lookbook() {
  const [lb,   setLb]  = useState(null);
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="lookbook" style={{ padding: "clamp(4rem,10vw,8rem) clamp(1.5rem,5vw,4rem)", background: "#F2F0ED" }}>
      {/* Header */}
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 40 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ marginBottom: "clamp(3rem,6vw,5rem)", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1rem" }}>
            <div style={{ width: 40, height: 2, background: "#990000" }} />
            <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", color: "#990000" }}>
              Collection 2024 – 2026
            </span>
          </div>
          <h2 style={{
            fontFamily: "'Playfair Display',serif", fontWeight: 900,
            fontSize: "clamp(2.5rem,5.5vw,4.5rem)",
            lineHeight: 1, color: "#111", letterSpacing: "-0.02em",
          }}>
            The<br /><em style={{ fontStyle: "italic" }}>Lookbook.</em>
          </h2>
        </div>
        <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(1rem,1.4vw,1.15rem)", color: "#777", maxWidth: 280, lineHeight: 1.75, fontStyle: "italic", textAlign: "right" }}>
          Every frame is a chapter.<br />Every outfit, a statement.
        </p>
      </motion.div>

      {/* Masonry grid */}
      <div
        className="masonry"
        style={{ columns: "clamp(200px,28vw,360px) 3", columnGap: "1.5rem" }}
      >
        {PHOTOS.map((src, i) => (
          <LBCard key={i} src={src} label={LABELS[i]} index={i} onClick={setLb} />
        ))}
      </div>

      <AnimatePresence>
        {lb !== null && <Lightbox index={lb} onClose={() => setLb(null)} />}
      </AnimatePresence>
    </section>
  );
}

/* ─── Connect CTA ────────────────────────────────────────────────────────────── */
function Connect() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="connect" style={{ background: "#111", padding: "clamp(5rem,12vw,10rem) clamp(1.5rem,8vw,8rem)", position: "relative", overflow: "hidden" }}>
      {/* Ghost wordmark */}
      <div style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        fontFamily: "'Playfair Display',serif", fontWeight: 900,
        fontSize: "clamp(8rem,22vw,20rem)", lineHeight: 1,
        color: "transparent", WebkitTextStroke: "1px rgba(255,255,255,.04)",
        whiteSpace: "nowrap", userSelect: "none", pointerEvents: "none",
      }}>PLOT</div>

      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 60 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: "relative", zIndex: 2, textAlign: "center" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: "2rem" }}>
          <div style={{ width: 40, height: 1, background: "#990000" }} />
          <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", color: "#990000" }}>Social</span>
          <div style={{ width: 40, height: 1, background: "#990000" }} />
        </div>

        <h2 style={{
          fontFamily: "'Playfair Display',serif", fontWeight: 900,
          fontSize: "clamp(2.5rem,6.5vw,5.5rem)",
          lineHeight: 1.05, color: "#fff", letterSpacing: "-0.02em", marginBottom: "1.5rem",
        }}>
          Join the Journey<br />
          <em style={{ fontStyle: "italic", color: "#990000" }}>on Instagram.</em>
        </h2>

        <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(1.1rem,1.8vw,1.35rem)", color: "rgba(255,255,255,.45)", marginBottom: "3rem", fontStyle: "italic" }}>
          Behind the fit. Behind the plot.
        </p>

        <motion.a
          href="https://www.instagram.com/amirimayne"
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.04, backgroundColor: "#bb0000" }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.2 }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 12,
            background: "#990000", color: "#fff",
            fontFamily: "'Montserrat',sans-serif", fontSize: 11, fontWeight: 700,
            letterSpacing: "0.2em", textTransform: "uppercase",
            textDecoration: "none", padding: "18px 52px", borderRadius: 999,
          }}
        >
          <span>@amirimayne</span>
          <span style={{ fontSize: 17 }}>↗</span>
        </motion.a>

        <div style={{ marginTop: "2.5rem", fontFamily: "'Montserrat',sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: "0.15em", color: "rgba(255,255,255,.2)", textTransform: "uppercase" }}>
          Follow for daily fits & behind-the-scenes
        </div>
      </motion.div>
    </section>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer style={{
      background: "#0A0A0A",
      borderTop: "1px solid rgba(255,255,255,.06)",
      padding: "2rem clamp(1.5rem,5vw,4rem)",
      display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 26, height: 26, background: "#990000", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 11, color: "#fff" }}>JM</span>
        </div>
        <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,.28)" }}>
          © 2026 Jamin Mandela | Founder of Plotwear
        </span>
      </div>
      <div style={{ display: "flex", gap: "2rem" }}>
        {["About", "Lookbook", "Connect"].map(item => (
          <a key={item} href={`#${item.toLowerCase()}`} className="ft-link">{item}</a>
        ))}
      </div>
    </footer>
  );
}

/* ─── Loader ─────────────────────────────────────────────────────────────────── */
function Loader({ onDone }) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setPct(p => {
        const next = p + Math.random() * 14 + 5;
        if (next >= 100) { clearInterval(t); setTimeout(onDone, 450); return 100; }
        return next;
      });
    }, 55);
    return () => clearInterval(t);
  }, [onDone]);

  return (
    <motion.div
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      style={{ position: "fixed", inset: 0, background: "#111", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y:  0 }}
        transition={{ delay: 0.2 }}
        style={{ textAlign: "center", marginBottom: "3rem" }}
      >
        <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: "clamp(2rem,7vw,4.5rem)", color: "#fff", letterSpacing: "-0.02em", lineHeight: 1 }}>
          JAMIN{" "}
          <span style={{ color: "#990000", fontStyle: "italic" }}>MANDELA</span>
        </div>
        <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,.3)", marginTop: 10 }}>
          Loading Portfolio
        </div>
      </motion.div>

      <div style={{ width: 200, height: 1, background: "rgba(255,255,255,.1)", position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, height: "100%", background: "#990000", width: `${Math.min(pct, 100)}%`, transition: "width .1s ease" }} />
      </div>
      <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 9, fontWeight: 500, color: "rgba(255,255,255,.2)", letterSpacing: "0.1em", marginTop: 12 }}>
        {Math.min(Math.round(pct), 100)}%
      </div>
    </motion.div>
  );
}

/* ─── App ─────────────────────────────────────────────────────────────────────── */
export default function App() {
  const [ready, setReady] = useState(false);

  return (
    <>
      <GlobalStyle />
      <Cursor />
      <AnimatePresence>
        {!ready && <Loader onDone={() => setReady(true)} />}
      </AnimatePresence>
      {ready && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <Nav />
          <Hero />
          <About />
          <Lookbook />
          <Connect />
          <Footer />
        </motion.div>
      )}
    </>
  );
}
