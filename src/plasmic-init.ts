"use client";

import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";
import SiteV13Client from "@/components/marketing/SiteV13Client";

/**
 * Para o Studio funcionar com App Hosting, este arquivo acaba indo para o client.
 * Então, por enquanto, usamos NEXT_PUBLIC_* (temporário).
 */
const PROJECT_ID = process.env.NEXT_PUBLIC_PLASMIC_PROJECT_ID ?? "";
const API_TOKEN = process.env.NEXT_PUBLIC_PLASMIC_API_TOKEN ?? "";

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: PROJECT_ID,
      token: API_TOKEN,
    },
  ],
  preview: true,
});

/**
 * Code Component: o Plasmic NÃO edita seu JSX interno.
 * Ele edita os props que você expõe aqui.
 */
PLASMIC.registerComponent(SiteV13Client, {
  name: "SiteV13Client",
  props: {
    // NAV
    brandText: { type: "string", defaultValue: "Hitch.ai" },
    navPlanosLabel: { type: "string", defaultValue: "Assinar" },
    navEntrarLabel: { type: "string", defaultValue: "Entrar" },
    navCtaLabel: { type: "string", defaultValue: "Começar a degustação" },

    // HERO 1
    heroEyebrow: {
      type: "string",
      defaultValue: "HITCH.AI\nINTELIGÊNCIA ARTIFICIAL PARA ANÁLISE DE CONVERSAS",
    },
    heroTitle: {
      type: "string",
      defaultValue: "Entenda o que está por trás de cada conversa.",
    },
    heroSubtitle: {
      type: "string",
      defaultValue:
        "Análise clara de mensagens para interpretar intenções e responder com mais segurança.",
    },
    heroCtaLabel: { type: "string", defaultValue: "Analisar uma conversa" },
    heroImageUrl: { type: "string", defaultValue: "/HeroSystem.png" },

    // Como funciona
    howTitle: { type: "string", defaultValue: "Como funciona" },
    howSubtitle: {
      type: "string",
      defaultValue: "Leitura estratégica em poucos passos.",
    },
    step1Title: { type: "string", defaultValue: "Cole a conversa" },
    step1Body: {
      type: "string",
      defaultValue: "Qualquer mensagem ambígua ou delicada",
    },
    step2Title: { type: "string", defaultValue: "O Hitch.ai analisa" },
    step2Body: {
      type: "string",
      defaultValue: "Intenção, emoção e riscos invisíveis.",
    },
    step3Title: {
      type: "string",
      defaultValue: "Você entende antes de responder",
    },
    step3Body: { type: "string", defaultValue: "Clareza antes da ação." },

    // Seções
    whyKicker: { type: "string", defaultValue: "COMO O HITCH.AI FUNCIONA" },
    whyTitle: {
      type: "string",
      defaultValue: "Veja o que está por trás das mensagens — antes de responder.",
    },
    whyBody: {
      type: "string",
      defaultValue:
        "O Hitch.ai analisa conversas para identificar intenções, padrões emocionais e riscos invisíveis à primeira leitura — ajudando você a responder com clareza e segurança.",
    },
    whyCtaLabel: { type: "string", defaultValue: "Começar a degustação" },

    benefitsKicker: { type: "string", defaultValue: "BENEFÍCIOS NA PRÁTICA" },
    benefitsTitle: {
      type: "string",
      defaultValue: "Clareza para decidir. Segurança para responder.",
    },
    benefitsBody: {
      type: "string",
      defaultValue:
        "Evite respostas precipitadas, interprete o contexto real da conversa e aja com mais confiança — mesmo em situações delicadas.",
    },

    featuresKicker: { type: "string", defaultValue: "FEATURES" },
    featuresTitle: { type: "string", defaultValue: "O essencial, do jeito certo." },
    featuresSubtitle: {
      type: "string",
      defaultValue:
        "Quatro pilares para reduzir ruído, aumentar clareza e manter controle.",
    },

    planosKicker: { type: "string", defaultValue: "PLANOS" },
    planosTitle: {
      type: "string",
      defaultValue: "Escolha o plano e siga para o app.",
    },
    planosBody: {
      type: "string",
      defaultValue: "Veja os detalhes na página de planos.",
    },
    planosCtaLabel: { type: "string", defaultValue: "Ver planos" },

    // Links
    hrefPlanos: { type: "string", defaultValue: "/planos" },
    hrefLogin: { type: "string", defaultValue: "/app/login" },
    hrefRegister: { type: "string", defaultValue: "/app/register" },
  },
});
