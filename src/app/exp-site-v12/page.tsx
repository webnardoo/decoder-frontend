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
              {/* Logo "H" (sem styled-jsx) */}
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

              {/* FIX: estava sem "/" */}
              <Link className="btn btnPrimary" href="/app/register">
                Começar a degustação
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* DOBRA 1 */}
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

            <div
              className="frame"
              aria-label="Frame de imagem do sistema (placeholder)"
            />
          </div>
        </div>
      </section>

      {/* DOBRA 2 — Como funciona (sem radial + 3 cards grandes) */}
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

      {/* DOBRA 5 — Features 2x2 */}
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

      {/* DOBRA FINAL — Planos */}
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
