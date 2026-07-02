"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen text-white" style={{ background: "#07101f" }}>
      {/* Achtergrond sfeer */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-60 -right-60 w-[600px] h-[600px] rounded-full" style={{ background: "radial-gradient(circle, rgba(58,172,184,0.12), transparent 70%)" }} />
        <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] rounded-full" style={{ background: "radial-gradient(circle, rgba(29,53,87,0.5), transparent 70%)" }} />
        <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] rounded-full" style={{ background: "radial-gradient(circle, rgba(58,172,184,0.07), transparent 70%)" }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      <div className="relative z-10">
        {/* Nav */}
        <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
          <div className="flex items-center gap-1">
            <span className="text-2xl font-black tracking-tight" style={{ color: "#3AACB8" }}>Any</span>
            <span className="text-2xl font-black tracking-tight text-white">Stats</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="mailto:info@anystats.nl" className="hidden sm:block px-4 py-2 text-sm font-medium text-white/50 hover:text-white transition-colors">
              Contact
            </a>
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors">
              Inloggen
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 text-sm font-bold rounded-lg text-[#07101f] transition-all hover:scale-105 hover:brightness-110"
              style={{ background: "#3AACB8" }}
            >
              Gratis meedoen
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <section className="flex flex-col items-center text-center px-6 pt-16 pb-20 max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8 border" style={{ background: "rgba(58,172,184,0.1)", borderColor: "rgba(58,172,184,0.25)", color: "#3AACB8" }}>
            ✦ Het anytimer-platform voor jouw vriendengroep
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight mb-6 leading-[1.05]">
            Wie durft de meeste{" "}
            <span style={{ background: "linear-gradient(135deg, #3AACB8, #5fd3e0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              anytimers
            </span>
            {" "}aan?
          </h1>

          <p className="text-lg sm:text-xl text-white/55 max-w-2xl mb-4 leading-relaxed">
            AnyStats is hét platform om uitdagingen bij te houden binnen jouw vriendengroep.
            Geef een anytimer, laat ze het uitvoeren en zie wie bovenaan het klassement eindigt.
          </p>
          <p className="text-sm text-white/30 max-w-xl mb-10">
            Uitgenodigd door een vriend? Deelnemen is gratis. Een eigen groep starten? Neem contact op.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-16">
            <Link
              href="/register"
              className="px-10 py-4 text-base font-bold rounded-xl text-[#07101f] transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #3AACB8 0%, #2d9faa 100%)", boxShadow: "0 0 40px rgba(58,172,184,0.35), 0 4px 15px rgba(0,0,0,0.3)" }}
            >
              Gratis meedoen →
            </Link>
            <Link
              href="/login"
              className="px-10 py-4 text-base font-semibold rounded-xl border text-white/70 hover:text-white hover:border-white/30 transition-all"
              style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)" }}
            >
              Al een account? Inloggen
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-4">
            {[
              { value: "Gratis", label: "Deelnemen via uitnodiging" },
              { value: "WhatsApp", label: "Notificaties ingebouwd" },
              { value: "Onbeperkt", label: "Uitdagingen per groep" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-xl font-black" style={{ color: "#3AACB8" }}>{s.value}</div>
                <div className="text-xs text-white/35 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Feature cards */}
        <section className="px-6 pb-24 max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black mb-2">Alles in één platform</h2>
            <p className="text-white/40 text-sm">Van uitdaging tot klassement — AnyStats regelt het</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: "🎯",
                title: "Anytimers uitdelen",
                desc: "Stuur een uitdaging naar een groepslid. Zij accepteren of weigeren. Accepteren betekent: uitvoeren zodra jij het zegt. Bewijs uploaden verplicht.",
                tag: "Kern functie",
              },
              {
                icon: "🏆",
                title: "Live klassement",
                desc: "Realtime overzicht wie de meeste anytimers heeft voltooid, gegeven en overleefd. Inclusief achievement-tiers van Rookie tot Onsterfelijk.",
                tag: "Competitie",
              },
              {
                icon: "👥",
                title: "Groepsbeheer",
                desc: "Eén centrale plek voor jouw vriendengroep. Nodig mensen uit met een unieke code. Iedereen ziet elkaars stats, uitdagingen en voortgang.",
                tag: "Organisatie",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl p-6 border transition-all hover:border-white/20 hover:-translate-y-1"
                style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))", borderColor: "rgba(255,255,255,0.08)" }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-3xl">{f.icon}</div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: "rgba(58,172,184,0.12)", color: "#3AACB8" }}>{f.tag}</span>
                </div>
                <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-white/45 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Prijzen */}
        <section className="px-6 pb-24 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black mb-2">Simpel en eerlijk</h2>
            <p className="text-white/40 text-sm">Meedoen is altijd gratis — een groep starten is op aanvraag</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Gratis */}
            <div
              className="rounded-2xl p-7 border"
              style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}
            >
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Deelnemer</p>
              <p className="text-4xl font-black mb-1">Gratis</p>
              <p className="text-sm text-white/40 mb-6">Altijd en voor iedereen</p>
              <ul className="space-y-3 mb-8 text-sm text-white/60">
                {[
                  "Account aanmaken",
                  "Joinen via uitnodigingscode",
                  "Anytimers ontvangen en geven",
                  "Klassement bekijken",
                  "WhatsApp-notificaties",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span style={{ color: "#3AACB8" }}>✓</span> {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="block text-center py-3 rounded-xl font-bold text-sm border text-white hover:bg-white/5 transition-all"
                style={{ borderColor: "rgba(255,255,255,0.12)" }}
              >
                Gratis meedoen →
              </Link>
            </div>

            {/* Groep aanmaken */}
            <div
              className="rounded-2xl p-7 border relative overflow-hidden"
              style={{ background: "linear-gradient(145deg, rgba(58,172,184,0.1), rgba(29,53,87,0.4))", borderColor: "rgba(58,172,184,0.3)" }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full" style={{ background: "radial-gradient(circle, rgba(58,172,184,0.15), transparent 70%)" }} />
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#3AACB8" }}>Groep aanmaken</p>
              <p className="text-4xl font-black mb-1">Op aanvraag</p>
              <p className="text-sm text-white/40 mb-6">Neem contact op voor de mogelijkheden</p>
              <ul className="space-y-3 mb-8 text-sm text-white/60">
                {[
                  "Alles van Deelnemer",
                  "Eigen organisatie aanmaken",
                  "Onbeperkt leden uitnodigen",
                  "Beheerdersbevoegdheden",
                  "Persoonlijke ondersteuning bij setup",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span style={{ color: "#3AACB8" }}>✓</span> {item}
                  </li>
                ))}
              </ul>
              <a
                href="mailto:info@anystats.nl"
                className="block text-center py-3 rounded-xl font-bold text-sm text-[#07101f] transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg, #3AACB8, #2d9faa)" }}
              >
                Contact opnemen →
              </a>
            </div>
          </div>
        </section>

        {/* Hoe werkt het */}
        <section className="px-6 pb-24 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black mb-2">In vier stappen live</h2>
            <p className="text-white/40 text-sm">Binnen vijf minuten speelt jouw groep mee</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { step: "01", title: "Account aanmaken", desc: "Registreer gratis met een gebruikersnaam en e-mailadres. Optioneel: voeg je telefoonnummer toe voor WhatsApp-meldingen." },
              { step: "02", title: "Groep joinen of starten", desc: "Gebruik een uitnodigingscode van een vriend om gratis mee te doen, of neem contact op om een eigen groep te starten." },
              { step: "03", title: "Geef een anytimer", desc: "Kies een groepslid en geef de uitdaging. Ze accepteren of weigeren. Accepteren betekent: uitvoeren wanneer jij het vraagt." },
              { step: "04", title: "Stijg op het klassement", desc: "Voltooi anytimers, unlock achievement-tiers en zie wie de absolute kampioen is van de groep." },
            ].map((s) => (
              <div
                key={s.step}
                className="flex gap-4 p-5 rounded-2xl border"
                style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}
              >
                <div
                  className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black"
                  style={{ background: "rgba(58,172,184,0.15)", color: "#3AACB8" }}
                >
                  {s.step}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm mb-1">{s.title}</h4>
                  <p className="text-xs text-white/45 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Onderste CTA */}
        <section className="px-6 pb-28 max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-black mb-3">Klaar om mee te doen?</h2>
          <p className="text-white/40 mb-2 text-sm">Meedoen is altijd gratis. Wil je een eigen groep? Mail ons.</p>
          <p className="text-white/25 mb-8 text-xs">
            <a href="mailto:info@anystats.nl" className="hover:text-white/50 transition-colors">info@anystats.nl</a>
          </p>
          <Link
            href="/register"
            className="inline-block px-12 py-4 text-base font-bold rounded-xl text-[#07101f] transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, #3AACB8, #2d9faa)", boxShadow: "0 0 50px rgba(58,172,184,0.3)" }}
          >
            Maak gratis een account →
          </Link>
        </section>

        {/* Footer */}
        <footer className="border-t px-6 py-10 max-w-6xl mx-auto" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1">
              <span className="font-black" style={{ color: "#3AACB8" }}>Any</span>
              <span className="font-black text-white">Stats</span>
            </div>
            <div className="flex items-center gap-6 text-xs text-white/30">
              <a href="mailto:info@anystats.nl" className="hover:text-white/60 transition-colors">info@anystats.nl</a>
              <Link href="/login" className="hover:text-white/60 transition-colors">Inloggen</Link>
              <Link href="/register" className="hover:text-white/60 transition-colors">Registreren</Link>
            </div>
            <p className="text-xs text-white/20">© 2026 AnyStats</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
