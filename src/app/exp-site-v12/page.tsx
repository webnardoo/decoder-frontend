// src/app/exp-site-v12/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

async function startJourney(journey: "PAID" | "TRIAL") {
  try {
    await fetch("/api/journey/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ journey }),
    });
  } catch {
    // não bloqueia navegação
  }
}

type ThemeMode = "light" | "dark";

function readThemeFromDom(): ThemeMode {
  const v = document?.documentElement?.getAttribute("data-theme");
  return v === "dark" ? "dark" : "light";
}

function applyThemeToDom(next: ThemeMode) {
  document.documentElement.setAttribute("data-theme", next);
  document.documentElement.style.colorScheme = next === "dark" ? "dark" : "light";
  try {
    localStorage.setItem("hitch_theme", next);
  } catch {}
}

export default function ExpSiteV12Page() {
  const router = useRouter();

  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    try {
      const current = readThemeFromDom();
      setTheme(current);
      document.documentElement.style.colorScheme = current === "dark" ? "dark" : "light";
    } catch {
      setTheme("light");
      document.documentElement.style.colorScheme = "light";
    }
  }, []);

  const isLight = theme === "light";

  function onSetTheme(next: ThemeMode) {
    setTheme(next);
    applyThemeToDom(next);
  }

  async function goPaidPlans(e: React.MouseEvent) {
    e.preventDefault();
    await startJourney("PAID");
    router.push("/planos");
  }

  async function goTrialRegister(e: React.MouseEvent) {
    e.preventDefault();
    await startJourney("TRIAL");
    router.push("/app/register?next=%2Fapp");
  }

  const themeLabel = useMemo(() => (isLight ? "Light" : "Dark"), [isLight]);

  const LOGO_SRC = "/logo-hitchai.png";
  const HERO_SRC = "/Banner_site.png";

  return (
    <main className="mkt page">
      {/* TOP HEADER */}
      <header className="topHeader">
        <div className="container">
          <div className="topHeaderInner">
            <Link className="brand" href="/" aria-label="Hitch.ai">
              <Image src={LOGO_SRC} alt="Hitch.ai" width={34} height={34} priority style={{ display: "block" }} />
              <span>Hitch.ai</span>
            </Link>

            <nav className="navRight" aria-label="Navegação principal">
              <div className="themeToggle" role="tablist" aria-label={`Tema atual: ${themeLabel}`}>
                <button
                  type="button"
                  className={`themePill ${theme === "light" ? "themePillActive" : ""}`}
                  onClick={() => onSetTheme("light")}
                  role="tab"
                  aria-selected={theme === "light"}
                >
                  Light
                </button>
                <button
                  type="button"
                  className={`themePill ${theme === "dark" ? "themePillActive" : ""}`}
                  onClick={() => onSetTheme("dark")}
                  role="tab"
                  aria-selected={theme === "dark"}
                >
                  Dark
                </button>
              </div>

              <a className="navLink navPill navPillEmph" href="/planos" onClick={goPaidPlans}>
  Assinar
</a>

              <Link className="navLink navPill navPillEmph" href="/app/login">
  Entrar
</Link>

              <a className="btn btnPrimary" href="/app/register" onClick={goTrialRegister}>
                Começar a degustação
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* HERO */}
      <div id="top" className="heroWrap">
        <div className="container">
          <div className="heroCard">
            <div className="heroCopy">
              <div className="eyebrow eyebrowStack">
                <span className="eyebrowBrand">HITCH.AI</span>
                <span className="eyebrowLine">INTELIGÊNCIA ARTIFICIAL PARA ANÁLISE DE CONVERSAS</span>
              </div>

              <h1 className="h1Hero">Entenda o que está por trás de cada conversa.</h1>

              <p className="bodyText heroSubtitle">
                Análise clara de mensagens para interpretar intenções e responder com mais segurança.
              </p>

              <div className="heroCtas">
                <a className="btn btnPrimary" href="/app/register" onClick={goTrialRegister}>
                  Analisar uma conversa
                </a>
                <a className="btn btnSecondary btnPlans" href="/planos" onClick={goPaidPlans}>
                  Ver planos
                </a>
              </div>
            </div>

            {/* IMAGEM (coluna direita) */}
            <div className="heroBanner" aria-label="Hero banner">
              <img
                src={HERO_SRC}
                alt="Banner do Hitch.ai"
                style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  height: "100%",
                  width: "115%",
                  objectFit: "cover",
                  objectPosition: "right center",
                  display: "block",
                }}
              />
            </div>
          </div>

          {/* Service bar */}
          <div className="serviceBar" aria-label="Serviços">
            <div className="serviceRow">
              <div className="serviceItem">
                <div className="serviceIcon" aria-hidden>
                  ✅
                </div>
                <div>
                  <p className="serviceTitle">ANÁLISE</p>
                  <p className="serviceDesc">Clareza do contexto e intenção.</p>
                </div>
              </div>

              <div className="serviceItem">
                <div className="serviceIcon" aria-hidden>
                  ✅
                </div>
                <div>
                  <p className="serviceTitle">RESPOSTA</p>
                  <p className="serviceDesc">Sugestões diretas e seguras.</p>
                </div>
              </div>

              <div className="serviceItem">
                <div className="serviceIcon" aria-hidden>
                  ✅
                </div>
                <div>
                  <p className="serviceTitle">RISCO</p>
                  <p className="serviceDesc">Evite ruído e escaladas.</p>
                </div>
              </div>

              <div className="serviceItem">
                <div className="serviceIcon" aria-hidden>
                  ✅
                </div>
                <div>
                  <p className="serviceTitle">PRIVACIDADE</p>
                  <p className="serviceDesc">Sem armazenar suas mensagens.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="section sectionAlt">
        <div className="container">
          <h2 className="h2">Como funciona</h2>
          <p className="bodyText">Leitura estratégica em poucos passos.</p>

          <div className="stepsRow" role="list">
            <div className="stepCard" role="listitem">
              <div className="stepTop">01</div>
              <p className="stepTitle">Cole a conversa</p>
              <p className="stepBody">Qualquer mensagem ambígua ou delicada</p>
              <div className="stepMedia" aria-hidden />
            </div>

            <div className="stepCard" role="listitem">
              <div className="stepTop">02</div>
              <p className="stepTitle">O Hitch.ai analisa</p>
              <p className="stepBody">Intenção, emoção e riscos invisíveis.</p>
              <div className="stepMedia" aria-hidden />
            </div>

            <div className="stepCard" role="listitem">
              <div className="stepTop">03</div>
              <p className="stepTitle">Você decide melhor</p>
              <p className="stepBody">Clareza antes da ação.</p>
              <div className="stepMedia" aria-hidden />
            </div>
          </div>
        </div>
      </section>

      {/* POR QUE FUNCIONA */}
      <section id="por-que-funciona" className="section">
        <div className="container">
          <div className="blockText">
            <div className="kicker">COMO O HITCH.AI FUNCIONA</div>
            <h2 className="h2">Veja o que está por trás das mensagens — antes de responder.</h2>
            <p className="bodyText">
              O Hitch.ai analisa conversas para identificar intenções, padrões emocionais e riscos invisíveis à primeira
              leitura — ajudando você a responder com clareza e segurança.
            </p>

            <div style={{ marginTop: 18 }}>
              <a className="btn btnPrimary" href="/app/register" onClick={goTrialRegister}>
                Começar a degustação
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section id="beneficios" className="section">
        <div className="container">
          <div className="blockText">
            <div className="kicker">BENEFÍCIOS NA PRÁTICA</div>
            <h2 className="h2">Clareza para decidir. Segurança para responder.</h2>
            <p className="bodyText">
              Evite respostas precipitadas, interprete o contexto real da conversa e aja com mais confiança — mesmo em
              situações delicadas.
            </p>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="section">
        <div className="container">
          <div className="blockText">
            <div className="kicker">FEATURES</div>
            <h2 className="h2">O essencial, do jeito certo.</h2>
            <p className="bodyText">Quatro pilares para reduzir ruído, aumentar clareza e manter controle.</p>
          </div>

          <div className="featuresWrap">
            <div className="featuresGrid">
              <div className="featureCard">
                <div className="featureIcon" aria-hidden>
                  🔎
                </div>
                <div>
                  <p className="featureLabel">INTENÇÃO</p>
                  <p className="featureTitle">Entenda o que está por trás das palavras</p>
                  <p className="featureBody">Contexto e subtexto organizados pra você responder com clareza.</p>
                </div>
              </div>

              <div className="featureCard">
                <div className="featureIcon" aria-hidden>
                  ⚡
                </div>
                <div>
                  <p className="featureLabel">VELOCIDADE</p>
                  <p className="featureTitle">Análise clara em segundos</p>
                  <p className="featureBody">Leitura rápida para decisões melhores, sem ruído.</p>
                </div>
              </div>

              <div className="featureCard">
                <div className="featureIcon" aria-hidden>
                  🛡️
                </div>
                <div>
                  <p className="featureLabel">SEGURANÇA</p>
                  <p className="featureTitle">Responda com contexto, não no impulso</p>
                  <p className="featureBody">Evite escaladas e reduza risco de conflito com respostas mais estratégicas.</p>
                </div>
              </div>

              <div className="featureCard">
                <div className="featureIcon" aria-hidden>
                  🔒
                </div>
                <div>
                  <p className="featureLabel">PRIVACIDADE</p>
                  <p className="featureTitle">Privacidade</p>
                  <p className="featureBody">
                    As mensagens enviadas não são armazenadas. Após a análise todas as mensagens são descartadas e
                    guardamos apenas os metadados do resultado.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="section">
        <div className="container">
          <div className="blockText">
            <div className="kicker">PLANOS</div>
            <h2 className="h2">Escolha o plano e siga para o app.</h2>
            <p className="bodyText">Veja os detalhes na página de planos.</p>

            <div style={{ marginTop: 18 }}>
              <a className="btn btnSecondary btnPlans" href="/planos" onClick={goPaidPlans}>
                Ver planos
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section id="cta" className="section">
        <div className="container">
          <h2 className="h2">Comece agora</h2>
          <p className="bodyText" style={{ maxWidth: 820 }}>
            Se a conversa é delicada, você não precisa improvisar. Use o Hitch.ai para ganhar clareza e responder com
            segurança.
          </p>

          <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a className="btn btnPrimary" href="/app/register" onClick={goTrialRegister}>
              Começar a degustação
            </a>
            <a className="btn btnSecondary btnPlans" href="/planos" onClick={goPaidPlans}>
              Ver planos
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
