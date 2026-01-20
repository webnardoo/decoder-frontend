"use client";

import Link from "next/link";

const PURPLE = "#220D54";

export type SiteV13ClientProps = {
  // NAV
  brandText?: string;
  navPlanosLabel?: string;
  navEntrarLabel?: string;
  navCtaLabel?: string;

  // HERO 1
  heroEyebrow?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroCtaLabel?: string;
  heroImageUrl?: string;

  // HERO 2 / Como funciona
  howTitle?: string;
  howSubtitle?: string;

  step1Title?: string;
  step1Body?: string;
  step2Title?: string;
  step2Body?: string;
  step3Title?: string;
  step3Body?: string;

  // Seções
  whyKicker?: string;
  whyTitle?: string;
  whyBody?: string;
  whyCtaLabel?: string;

  benefitsKicker?: string;
  benefitsTitle?: string;
  benefitsBody?: string;

  featuresKicker?: string;
  featuresTitle?: string;
  featuresSubtitle?: string;

  planosKicker?: string;
  planosTitle?: string;
  planosBody?: string;
  planosCtaLabel?: string;

  // Links (se precisar alterar depois)
  hrefPlanos?: string;
  hrefLogin?: string;
  hrefRegister?: string;
};

function HeroImageOverlay({ heroImageUrl }: { heroImageUrl: string }) {
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
          linear-gradient(to bottom,
            rgba(0,0,0,0.92) 0%,
            rgba(0,0,0,0.42) 16%,
            rgba(0,0,0,0.00) 42%
          ),
          linear-gradient(to top,
            rgba(0,0,0,0.96) 0%,
            rgba(0,0,0,0.48) 16%,
            rgba(0,0,0,0.00) 44%
          ),
          linear-gradient(to right,
            rgba(0,0,0,0.98) 0%,
            rgba(0,0,0,0.64) 12%,
            rgba(0,0,0,0.00) 34%
          ),
          linear-gradient(to left,
            rgba(0,0,0,0.98) 0%,
            rgba(0,0,0,0.70) 14%,
            rgba(0,0,0,0.16) 34%,
            rgba(0,0,0,0.00) 58%
          ),
          radial-gradient(120% 120% at 70% 48%,
            rgba(0,0,0,0.00) 0%,
            rgba(0,0,0,0.12) 58%,
            rgba(0,0,0,0.42) 100%
          ),
          radial-gradient(140% 120% at 62% 52%,
            rgba(0,0,0,0.00) 0%,
            rgba(0,0,0,0.06) 52%,
            rgba(0,0,0,0.22) 100%
          ),
          url("${heroImageUrl}")
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

export default function SiteV13Client({
  brandText = "Hitch.ai",
  navPlanosLabel = "Assinar",
  navEntrarLabel = "Entrar",
  navCtaLabel = "Começar a degustação",

  heroEyebrow = "HITCH.AI\nINTELIGÊNCIA ARTIFICIAL PARA ANÁLISE DE CONVERSAS",
  heroTitle = "Entenda o que está por trás de cada conversa.",
  heroSubtitle = "Análise clara de mensagens para interpretar intenções e responder com mais segurança.",
  heroCtaLabel = "Analisar uma conversa",
  heroImageUrl = "/HeroSystem.png",

  howTitle = "Como funciona",
  howSubtitle = "Leitura estratégica em poucos passos.",

  step1Title = "Cole a conversa",
  step1Body = "Qualquer mensagem ambígua ou delicada",
  step2Title = "O Hitch.ai analisa",
  step2Body = "Intenção, emoção e riscos invisíveis.",
  step3Title = "Você entende antes de responder",
  step3Body = "Clareza antes da ação.",

  whyKicker = "COMO O HITCH.AI FUNCIONA",
  whyTitle = "Veja o que está por trás das mensagens — antes de responder.",
  whyBody = "O Hitch.ai analisa conversas para identificar intenções, padrões emocionais e riscos invisíveis à primeira leitura — ajudando você a responder com clareza e segurança.",
  whyCtaLabel = "Começar a degustação",

  benefitsKicker = "BENEFÍCIOS NA PRÁTICA",
  benefitsTitle = "Clareza para decidir. Segurança para responder.",
  benefitsBody = "Evite respostas precipitadas, interprete o contexto real da conversa e aja com mais confiança — mesmo em situações delicadas.",

  featuresKicker = "FEATURES",
  featuresTitle = "O essencial, do jeito certo.",
  featuresSubtitle = "Quatro pilares para reduzir ruído, aumentar clareza e manter controle.",

  planosKicker = "PLANOS",
  planosTitle = "Escolha o plano e siga para o app.",
  planosBody = "Veja os detalhes na página de planos.",
  planosCtaLabel = "Ver planos",

  hrefPlanos = "/planos",
  hrefLogin = "/app/login",
  hrefRegister = "/app/register",
}: SiteV13ClientProps) {
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
      `}</style>

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
              <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "0.02em" }}>
                {brandText}
              </span>
            </Link>

            <nav className="navRight" aria-label="Navegação principal">
              <Link className="navLink" href={hrefPlanos}>
                {navPlanosLabel}
              </Link>
              <Link className="navLink" href={hrefLogin}>
                {navEntrarLabel}
              </Link>
              <Link className="btn btnPrimary" href={hrefRegister}>
                {navCtaLabel}
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div style={{ position: "relative", overflow: "hidden", background: "transparent" }}>
        <section id="top" className="section hero1" style={{ position: "relative", zIndex: 2 }}>
          <div className="container">
            <div className="heroGrid" style={{ position: "relative", overflow: "hidden", background: "transparent" }}>
              <HeroImageOverlay heroImageUrl={heroImageUrl} />

              <div className="heroCopy" style={{ position: "relative", zIndex: 2 }}>
                <div className="eyebrow heroEyebrow" style={{ whiteSpace: "pre-line" }}>
                  {heroEyebrow}
                </div>

                <h1 className="h1Hero">{heroTitle}</h1>

                <p className="bodyText heroSubtitle">{heroSubtitle}</p>

                <div className="heroCtaRow">
                  <Link className="btn btnPrimary" href={hrefRegister}>
                    {heroCtaLabel}
                  </Link>
                </div>
              </div>

              <div aria-hidden style={{ position: "relative", zIndex: 2 }} />
            </div>
          </div>
        </section>

        <section id="como-funciona" className="section hero2" style={{ position: "relative", zIndex: 2, background: "transparent" }}>
          <div className="container">
            <div>
              <h2 className="h2">{howTitle}</h2>
              <p className="bodyText">{howSubtitle}</p>

              <div className="stepsRow" role="list">
                <div className="stepCard" role="listitem">
                  <div className="stepTop">01</div>
                  <p className="stepTitle">{step1Title}</p>
                  <p className="stepBody">{step1Body}</p>
                  <div className="stepMedia" aria-label="Área para print (placeholder)" />
                </div>

                <div className="stepCard" role="listitem">
                  <div className="stepTop">02</div>
                  <p className="stepTitle">{step2Title}</p>
                  <p className="stepBody">{step2Body}</p>
                  <div className="stepMedia" aria-label="Área para print (placeholder)" />
                </div>

                <div className="stepCard" role="listitem">
                  <div className="stepTop">03</div>
                  <p className="stepTitle">{step3Title}</p>
                  <p className="stepBody">{step3Body}</p>
                  <div className="stepMedia" aria-label="Área para print (placeholder)" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section id="por-que-funciona" className="section" style={{ position: "relative", background: "transparent" }}>
        <div className="container">
          <div className="blockText">
            <div className="kicker">{whyKicker}</div>
            <h2 className="h2">{whyTitle}</h2>
            <p className="bodyText">{whyBody}</p>

            <div style={{ marginTop: 18 }}>
              <Link className="btn" href={hrefRegister}>
                {whyCtaLabel}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="beneficios" className="section" style={{ background: "transparent" }}>
        <div className="container">
          <div className="blockText">
            <div className="kicker">{benefitsKicker}</div>
            <h2 className="h2">{benefitsTitle}</h2>
            <p className="bodyText">{benefitsBody}</p>
          </div>
        </div>
      </section>

      <section id="features" className="section" style={{ background: "transparent" }}>
        <div className="container">
          <div className="blockText">
            <div className="kicker">{featuresKicker}</div>
            <h2 className="h2">{featuresTitle}</h2>
            <p className="bodyText">{featuresSubtitle}</p>
          </div>

          <div className="featuresWrap">
            <div className="featuresGrid">
              {/* Mantive hardcoded aqui por enquanto (podemos “propizar” depois) */}
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
                    As mensagens enviadas não são armazenadas. Após a análise todas as mensagens são descartadas e
                    guardamos apenas os metadados do resultado.
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
            <div className="kicker">{planosKicker}</div>
            <h2 className="h2">{planosTitle}</h2>
            <p className="bodyText">{planosBody}</p>

            <div style={{ marginTop: 18 }}>
              <Link className="btn" href={hrefPlanos}>
                {planosCtaLabel}
              </Link>
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
