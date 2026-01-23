"use client";

// src/app/exp-site-v12/page.tsx
import Link from "next/link";
import { useRouter } from "next/navigation";

const PURPLE = "#220D54";

async function startJourney(journey: "PAID" | "TRIAL") {
  try {
    await fetch("/api/journey/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ journey }),
    });
  } catch {
    // silêncio: não bloqueia navegação
  }
}

function HeroImageOverlay() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: "38%",
        zIndex: 1,
        pointerEvents: "none",
        backgroundImage: `
          /* TOP */
          linear-gradient(to bottom,
            rgba(0,0,0,0.92) 0%,
            rgba(0,0,0,0.42) 16%,
            rgba(0,0,0,0.00) 42%
          ),
          /* BOTTOM */
          linear-gradient(to top,
            rgba(0,0,0,0.96) 0%,
            rgba(0,0,0,0.48) 16%,
            rgba(0,0,0,0.00) 44%
          ),
          /* LEFT */
          linear-gradient(to right,
            rgba(0,0,0,0.98) 0%,
            rgba(0,0,0,0.64) 12%,
            rgba(0,0,0,0.00) 34%
          ),
          /* RIGHT */
          linear-gradient(to left,
            rgba(0,0,0,0.98) 0%,
            rgba(0,0,0,0.70) 14%,
            rgba(0,0,0,0.16) 34%,
            rgba(0,0,0,0.00) 58%
          ),
          /* vinheta suave */
          radial-gradient(120% 120% at 70% 48%,
            rgba(0,0,0,0.00) 0%,
            rgba(0,0,0,0.12) 58%,
            rgba(0,0,0,0.42) 100%
          ),
          /* vinheta “cinema” (muito leve) */
          radial-gradient(140% 120% at 62% 52%,
            rgba(0,0,0,0.00) 0%,
            rgba(0,0,0,0.06) 52%,
            rgba(0,0,0,0.22) 100%
          ),
          url("/HeroSystem.png")
        `,
        backgroundSize: "cover",
        backgroundPosition: "left center",
        backgroundRepeat: "no-repeat",
        opacity: 0.99,
        filter: "saturate(1.10) contrast(1.10) brightness(1.05)",
        transform: "translateZ(0)",
      }}
    />
  );
}

export default function ExpSiteV12Page() {
  const router = useRouter();

  async function goPaidPlans(e: React.MouseEvent) {
    e.preventDefault();
    await startJourney("PAID");
    router.push("/planos");
  }

  async function goTrialRegister(e: React.MouseEvent) {
    e.preventDefault();
    await startJourney("TRIAL");
    // ✅ REGRA OFICIAL: /register = TRIAL
    router.push("/register?journey=TRIAL&next=%2Fapp");
  }

  return (
    <main className="page h-fixed-radial-bg">
      <style jsx global>{`
        .hero1::after {
          content: none !important;
        }
        .hero2FromHero {
          background: transparent !important;
        }
        .hero1,
        .hero2,
        .section {
          background: transparent !important;
        }
        .navInner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .navRight {
          display: flex !important;
          align-items: center;
          gap: 16px;
          flex: 0 0 auto;
        }
        .navRight .navLink {
          display: inline-flex !important;
          align-items: center;
          white-space: nowrap;
        }
        @media (max-width: 640px) {
          .navRight {
            gap: 10px;
          }
          .navRight .navLink {
            font-size: 13px;
            opacity: 0.9;
          }
          .navRight .btnPrimary {
            padding: 10px 12px;
            font-size: 13px;
            line-height: 1;
            white-space: nowrap;
          }
        }
      `}</style>

      {/* NAV */}
      <header className="navbar">
        <div className="container">
          <div className="navInner">
            <Link className="brand" href="#top">
              <span
                aria-hidden
                style={{
                  display: "inline-flex",
                  height: 32,
                  width: 32,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12,
                  fontWeight: 900,
                  color: "#fff",
                  background: "rgb(31, 14, 55)",
                  boxShadow: "0 1px 0 rgba(255,255,255,0.06)",
                  flex: "0 0 auto",
                }}
              >
                H
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                }}
              >
                Hitch.ai
              </span>
            </Link>

            <nav className="navRight" aria-label="Navegação principal">
              {/* ✅ PAID */}
              <a className="navLink" href="/planos" onClick={goPaidPlans}>
                Assinar
              </a>

              <Link className="navLink" href="/app/login">
                Entrar
              </Link>

              {/* ✅ TRIAL */}
              <a className="btn btnPrimary" href="/register" onClick={goTrialRegister}>
                Começar a degustação
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* WRAPPER */}
      <div style={{ position: "relative", overflow: "hidden", background: "transparent" }}>
        {/* HERO 1 */}
        <section id="top" className="section hero1" style={{ position: "relative", zIndex: 2 }}>
          <div className="container">
            <div
              className="heroGrid"
              style={{ position: "relative", overflow: "hidden", background: "transparent" }}
            >
              <HeroImageOverlay />

              <div className="heroCopy" style={{ position: "relative", zIndex: 2 }}>
                <div className="eyebrow heroEyebrow">
                  HITCH.AI
                  <br />
                  INTELIGÊNCIA ARTIFICIAL PARA ANÁLISE DE CONVERSAS
                </div>

                <h1 className="h1Hero">Entenda o que está por trás de cada conversa.</h1>

                <p className="bodyText heroSubtitle">
                  Análise clara de mensagens para interpretar intenções e responder com mais segurança.
                </p>

                <div className="heroCtaRow">
                  <a className="btn btnPrimary" href="/register" onClick={goTrialRegister}>
                    Analisar uma conversa
                  </a>
                </div>
              </div>

              <div aria-hidden style={{ position: "relative", zIndex: 2 }} />
            </div>
          </div>
        </section>

        {/* HERO 2 */}
        <section
          id="como-funciona"
          className="section hero2"
          style={{ position: "relative", zIndex: 2, background: "transparent" }}
        >
          <div className="container">
            <div>
              <h2 className="h2">Como funciona</h2>
              <p className="bodyText">Leitura estratégica em poucos passos.</p>

              <div className="stepsRow" role="list">
                <div className="stepCard" role="listitem">
                  <div className="stepTop">01</div>
                  <p className="stepTitle">Cole a conversa</p>
                  <p className="stepBody">Qualquer mensagem ambígua ou delicada</p>
                  <div className="stepMedia" aria-label="Área para print (placeholder)" />
                </div>

                <div className="stepCard" role="listitem">
                  <div className="stepTop">02</div>
                  <p className="stepTitle">O Hitch.ai analisa</p>
                  <p className="stepBody">Intenção, emoção e riscos invisíveis.</p>
                  <div className="stepMedia" aria-label="Área para print (placeholder)" />
                </div>

                <div className="stepCard" role="listitem">
                  <div className="stepTop">03</div>
                  <p className="stepTitle">Você entende antes de responder</p>
                  <p className="stepBody">Clareza antes da ação.</p>
                  <div className="stepMedia" aria-label="Área para print (placeholder)" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* RESTANTE */}
      <section id="por-que-funciona" className="section" style={{ position: "relative", background: "transparent" }}>
        <div className="container">
          <div className="blockText">
            <div className="kicker">COMO O HITCH.AI FUNCIONA</div>
            <h2 className="h2">Veja o que está por trás das mensagens — antes de responder.</h2>
            <p className="bodyText">
              O Hitch.ai analisa conversas para identificar intenções, padrões emocionais e riscos
              invisíveis à primeira leitura — ajudando você a responder com clareza e segurança.
            </p>

            <div style={{ marginTop: 18 }}>
              <a className="btn" href="/register" onClick={goTrialRegister}>
                Começar a degustação
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="beneficios" className="section" style={{ background: "transparent" }}>
        <div className="container">
          <div className="blockText">
            <div className="kicker">BENEFÍCIOS NA PRÁTICA</div>
            <h2 className="h2">Clareza para decidir. Segurança para responder.</h2>
            <p className="bodyText">
              Evite respostas precipitadas, interprete o contexto real da conversa e aja com mais
              confiança — mesmo em situações delicadas.
            </p>
          </div>
        </div>
      </section>

      <section id="features" className="section" style={{ background: "transparent" }}>
        <div className="container">
          <div className="blockText">
            <div className="kicker">FEATURES</div>
            <h2 className="h2">O essencial, do jeito certo.</h2>
            <p className="bodyText">Quatro pilares para reduzir ruído, aumentar clareza e manter controle.</p>
          </div>

          <div className="featuresWrap">
            <div className="featuresGrid">
              <div className="featureCard">
                <div className="featureIcon" aria-hidden>▢</div>
                <div>
                  <p className="featureLabel">INTENÇÃO</p>
                  <p className="featureTitle">Entenda o que está por trás das palavras</p>
                  <p className="featureBody">Contexto e subtexto organizados pra você responder com clareza.</p>
                </div>
              </div>

              <div className="featureCard">
                <div className="featureIcon" aria-hidden>○</div>
                <div>
                  <p className="featureLabel">VELOCIDADE</p>
                  <p className="featureTitle">Análise clara em segundos</p>
                  <p className="featureBody">Leitura rápida para decisões melhores, sem ruído.</p>
                </div>
              </div>

              <div className="featureCard">
                <div className="featureIcon" aria-hidden>△</div>
                <div>
                  <p className="featureLabel">SEGURANÇA</p>
                  <p className="featureTitle">Responda com contexto, não no impulso</p>
                  <p className="featureBody">Evite escaladas e reduza risco de conflito com respostas mais estratégicas.</p>
                </div>
              </div>

              <div className="featureCard">
                <div className="featureIcon" aria-hidden>🔒</div>
                <div>
                  <p className="featureLabel">PRIVACIDADE</p>
                  <p className="featureTitle">Privacidade</p>
                  <p className="featureBody">
                    As mensagens enviadas não são armazenadas. Após a análise todas as mensagens
                    são descartadas e guardamos apenas os metadados do resultado.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="planos" className="section" style={{ background: "transparent" }}>
        <div className="container">
          <div className="blockText">
            <div className="kicker">PLANOS</div>
            <h2 className="h2">Escolha o plano e siga para o app.</h2>
            <p className="bodyText">Veja os detalhes na página de planos.</p>

            <div style={{ marginTop: 18 }}>
              <a className="btn" href="/planos" onClick={goPaidPlans}>
                Ver planos
              </a>
            </div>

            <div
              aria-hidden
              style={{
                marginTop: 22,
                height: 1,
                width: "100%",
                background: `linear-gradient(to right, rgba(0,0,0,0), ${PURPLE}, rgba(0,0,0,0))`,
                opacity: 0.35,
              }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
