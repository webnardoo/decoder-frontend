// src/app/exp-site-v12/page.tsx
import Link from "next/link";

export default function ExpSiteV12Page() {
  return (
    <main className="page">
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
              <Link className="navLink" href="/planos">
                Assinar
              </Link>
              <Link className="navLink" href="/app/login">
                Entrar
              </Link>
              <Link className="btn btnPrimary" href="/app/register">
                Começar a degustação
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section id="top" className="section hero1">
        <div className="container">
          <div className="heroGrid">
            <div className="heroCopy">
              <div className="eyebrow heroEyebrow">
                HITCH.AI
                <br />
                INTELIGÊNCIA ARTIFICIAL PARA ANÁLISE DE CONVERSAS
              </div>

              <h1 className="h1Hero">
                Entenda o que está por trás de cada conversa.
              </h1>

              <p className="bodyText heroSubtitle">
                Análise clara de mensagens para interpretar intenções e responder
                com mais segurança.
              </p>

              <div className="heroCtaRow">
                <Link className="btn btnPrimary" href="/exp-site-v12/register">
                  Analisar uma conversa
                </Link>
              </div>
            </div>

            {/* HERO VISUAL — AMBIENT (sem card, sem borda) */}
            <div
              aria-label="Visual do sistema Hitch.ai"
              style={{
                position: "relative",
                width: "100%",
                minHeight: 420,

                // importante: sem “cartão”
                background: "transparent",
                border: "none",
                boxShadow: "none",
                borderRadius: 0,
                overflow: "visible",
              }}
            >
              {/* Glow de base (cola no fundo roxo sem parecer “elemento”) */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: "-18% -12% -18% -12%",
                  background:
                    "radial-gradient(55% 55% at 65% 45%, rgba(168,85,247,0.22) 0%, rgba(168,85,247,0.0) 60%)",
                  filter: "blur(2px)",
                  pointerEvents: "none",
                }}
              />

              {/* Imagem “vazando” + máscara (fade) */}
              <img
                src="/HeroSystem.png"
                alt="Visual do sistema Hitch.ai"
                style={{
                  position: "absolute",
                  inset: "-8% -8% -8% -8%",
                  width: "116%",
                  height: "116%",
                  objectFit: "cover",
                  display: "block",

                  // reduz “cara de stock”
                  filter: "contrast(1.02) saturate(0.85) brightness(0.78)",
                  opacity: 0.92,
                  transform: "scale(1.03)",

                  // AQUI está o que resolve: a imagem some para o fundo (não vira card)
                  WebkitMaskImage:
                    "radial-gradient(60% 70% at 65% 45%, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 35%, rgba(0,0,0,0.65) 55%, rgba(0,0,0,0) 78%)",
                  maskImage:
                    "radial-gradient(60% 70% at 65% 45%, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 35%, rgba(0,0,0,0.65) 55%, rgba(0,0,0,0) 78%)",
                }}
              />

              {/* Overlay para casar com o gradiente do hero (sem escurecer demais) */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: "-8% -8% -8% -8%",
                  background:
                    "linear-gradient(90deg, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.30) 42%, rgba(0,0,0,0.08) 70%, rgba(0,0,0,0.55) 100%)",
                  pointerEvents: "none",
                  WebkitMaskImage:
                    "radial-gradient(60% 70% at 65% 45%, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 35%, rgba(0,0,0,0.65) 55%, rgba(0,0,0,0) 78%)",
                  maskImage:
                    "radial-gradient(60% 70% at 65% 45%, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 35%, rgba(0,0,0,0.65) 55%, rgba(0,0,0,0) 78%)",
                }}
              />

              {/* Label: opcional e discreta (não chama foco) */}
              <div
                style={{
                  position: "absolute",
                  right: 10,
                  bottom: 10,
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(0,0,0,0.18)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  color: "rgba(255,255,255,0.70)",
                  fontSize: 12,
                  letterSpacing: "0.01em",
                }}
              >
                Camadas de leitura • sinais • decisão
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DOBRA 2 */}
      <section id="como-funciona" className="section hero2">
        <div className="container">
          <div>
            <h2 className="h2">Como funciona</h2>
            <p className="bodyText">Leitura estratégica em poucos passos.</p>

            <div className="stepsRow" role="list">
              <div className="stepCard" role="listitem">
                <div className="stepTop">01</div>
                <p className="stepTitle">Cole a conversa</p>
                <p className="stepBody">Qualquer mensagem ambígua ou delicada</p>
                <div
                  className="stepMedia"
                  aria-label="Área para print (placeholder)"
                />
              </div>

              <div className="stepCard" role="listitem">
                <div className="stepTop">02</div>
                <p className="stepTitle">O Hitch.ai analisa</p>
                <p className="stepBody">Intenção, emoção e riscos invisíveis.</p>
                <div
                  className="stepMedia"
                  aria-label="Área para print (placeholder)"
                />
              </div>

              <div className="stepCard" role="listitem">
                <div className="stepTop">03</div>
                <p className="stepTitle">Você entende antes de responder</p>
                <p className="stepBody">Clareza antes da ação.</p>
                <div
                  className="stepMedia"
                  aria-label="Área para print (placeholder)"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DOBRA 3 */}
      <section id="por-que-funciona" className="section hero2">
        <div className="container">
          <div className="blockText">
            <div className="kicker">COMO O HITCH.AI FUNCIONA</div>
            <h2 className="h2">
              Veja o que está por trás das mensagens — antes de responder.
            </h2>
            <p className="bodyText">
              O Hitch.ai analisa conversas para identificar intenções, padrões
              emocionais e riscos invisíveis à primeira leitura — ajudando você
              a responder com clareza e segurança.
            </p>

            <div style={{ marginTop: 18 }}>
              <Link className="btn" href="/exp-site-v12/register">
                Começar a degustação
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* DOBRA 4 */}
      <section id="quando-faz-diferenca" className="section hero2">
        <div className="container">
          <div className="blockText">
            <div className="kicker">BENEFÍCIOS NA PRÁTICA</div>
            <h2 className="h2">
              Clareza para decidir. Segurança para responder.
            </h2>
            <p className="bodyText">
              Evite respostas precipitadas, interprete o contexto real da
              conversa e aja com mais confiança — mesmo em situações delicadas.
            </p>
          </div>
        </div>
      </section>

      {/* DOBRA 5 */}
      <section id="features" className="section hero2">
        <div className="container">
          <div className="blockText">
            <div className="kicker">FEATURES</div>
            <h2 className="h2">O essencial, do jeito certo.</h2>
            <p className="bodyText">
              Quatro pilares para reduzir ruído, aumentar clareza e manter
              controle.
            </p>
          </div>

          <div className="featuresWrap">
            <div className="featuresGrid">
              <div className="featureCard">
                <div className="featureIcon" aria-hidden>
                  ▢
                </div>
                <div>
                  <p className="featureLabel">INTENÇÃO</p>
                  <p className="featureTitle">
                    Entenda o que está por trás das palavras
                  </p>
                  <p className="featureBody">
                    Contexto e subtexto organizados pra você responder com
                    clareza.
                  </p>
                </div>
              </div>

              <div className="featureCard">
                <div className="featureIcon" aria-hidden>
                  ○
                </div>
                <div>
                  <p className="featureLabel">VELOCIDADE</p>
                  <p className="featureTitle">Análise clara em segundos</p>
                  <p className="featureBody">
                    Leitura rápida para decisões melhores, sem ruído.
                  </p>
                </div>
              </div>

              <div className="featureCard">
                <div className="featureIcon" aria-hidden>
                  △
                </div>
                <div>
                  <p className="featureLabel">SEGURANÇA</p>
                  <p className="featureTitle">
                    Responda com contexto, não no impulso
                  </p>
                  <p className="featureBody">
                    Evite escaladas e reduza risco de conflito com respostas
                    mais estratégicas.
                  </p>
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
                    As mensagens enviadas não são armazenadas. Após a análise
                    todas as mensagens são descartadas e guardamos apenas os
                    metadados do resultado.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DOBRA FINAL */}
      <section id="planos" className="section hero2">
        <div className="container">
          <div className="blockText">
            <div className="kicker">PLANOS</div>
            <h2 className="h2">Escolha o plano e siga para o app.</h2>
            <p className="bodyText">Veja os detalhes na página de planos.</p>

            <div style={{ marginTop: 18 }}>
              <Link className="btn" href="/exp-site-v12/planos">
                Ver planos
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
