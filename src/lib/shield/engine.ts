export type Verdict = "podvod" | "podozrive" | "v-poriadku";

export type LinkFlag = "official" | "lookalike" | "shortener" | "suspicious" | "unknown";

export type FoundLink = {
  href: string;
  host: string;
  flag: LinkFlag;
};

export type Analysis = {
  score: number;
  verdict: Verdict;
  type: string;
  reasons: string[];
  steps: string[];
  compromised: string[];
  links: FoundLink[];
  source: "pravidla" | "ai";
};

export type BankLine = {
  name: string;
  phone: string;
  href: string;
  note: string;
};

export const DISCLAIMER =
  "Štít je pomocník, nie záruka. Pri pochybnostiach nič neplať a zavolaj do banky na číslo z karty alebo z jej oficiálnej aplikácie.";

export const BANKS: BankLine[] = [
  {
    name: "Slovenská sporiteľňa",
    phone: "0850 111 888",
    href: "tel:0850111888",
    note: "aj 0910 111 888",
  },
  {
    name: "Tatra banka",
    phone: "*1100",
    href: "tel:*1100",
    note: "alebo 0800 00 1100",
  },
  {
    name: "VÚB",
    phone: "0850 123 000",
    href: "tel:0850123000",
    note: "zo zahraničia +421 248 555 970",
  },
  {
    name: "ČSOB",
    phone: "0850 111 777",
    href: "tel:0850111777",
    note: "blokácia karty +421 2 5966 8230",
  },
];

const OFFICIAL_HOSTS = [
  "slovenskaposta.sk",
  "posta.sk",
  "slsp.sk",
  "tatrabanka.sk",
  "vub.sk",
  "csob.sk",
  "365.bank",
  "mbank.sk",
  "primabanka.sk",
  "unicreditbank.sk",
  "packeta.com",
  "gls-group.eu",
  "gls-slovakia.sk",
  "dpd.com",
  "dpd.sk",
  "sps-sro.sk",
  "alza.sk",
  "mall.sk",
  "notino.sk",
  "bazos.sk",
  "financnasprava.sk",
  "slovensko.sk",
  "ezdravie.sk",
  "minv.sk",
];

const BRANDS: { id: string; label: string; tokens: string[] }[] = [
  { id: "posta", label: "Falošná pošta", tokens: ["slovenskaposta", "posta"] },
  { id: "slsp", label: "Falošná banka", tokens: ["slsp", "sporitelna", "george"] },
  { id: "tatra", label: "Falošná banka", tokens: ["tatrabanka", "tatra"] },
  { id: "vub", label: "Falošná banka", tokens: ["vub"] },
  { id: "csob", label: "Falošná banka", tokens: ["csob"] },
  { id: "365", label: "Falošná banka", tokens: ["365bank"] },
  { id: "kuriér", label: "Falošný kuriér", tokens: ["packeta", "gls", "dpd"] },
  { id: "bazar", label: "Podvod na bazári", tokens: ["bazos", "bazos"] },
  { id: "eshop", label: "Falošný e-shop", tokens: ["alza", "mall", "notino"] },
  { id: "stat", label: "Falošný úrad", tokens: ["financnasprava", "ezdravie"] },
];

const SHORTENERS = new Set([
  "bit.ly",
  "tinyurl.com",
  "cutt.ly",
  "t.ly",
  "is.gd",
  "rb.gy",
  "shorturl.at",
  "tiny.cc",
  "ow.ly",
  "buff.ly",
  "rebrand.ly",
  "s.id",
  "goo.gl",
]);

const BAD_TLDS = new Set([
  "top",
  "xyz",
  "click",
  "cfd",
  "buzz",
  "icu",
  "loan",
  "gq",
  "ml",
  "tk",
  "cf",
  "ga",
  "rest",
  "quest",
  "monster",
]);

type Signal = { weight: number; reason: string; type?: string; kind: string };

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function luhn(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = digits.charCodeAt(i) - 48;
    if (n < 0 || n > 9) return false;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0 && digits.length >= 13;
}

export function redactSensitive(input: string): { text: string; notes: string[] } {
  const notes: string[] = [];
  let text = input;
  text = text.replace(/\b(?:\d[ -]?){13,19}\b/g, (raw) => {
    const digits = raw.replace(/\D/g, "");
    if (!luhn(digits)) return raw;
    if (!notes.includes("karta")) notes.push("karta");
    return "[karta]";
  });
  text = text.replace(/\b\d{6}\s*\/\s*\d{3,4}\b/g, () => {
    if (!notes.includes("rodné číslo")) notes.push("rodné číslo");
    return "[rodné číslo]";
  });
  text = text.replace(/\b[A-Z]{2}\d{2}(?:\s?\d{4}){3,8}\b/gi, () => {
    if (!notes.includes("IBAN")) notes.push("IBAN");
    return "[IBAN]";
  });
  return { text, notes };
}

function cleanUrl(raw: string): string {
  return raw.replace(/[),.;!?>\]]+$/g, "");
}

function isOfficial(host: string): boolean {
  return OFFICIAL_HOSTS.some((item) => host === item || host.endsWith(`.${item}`));
}

function brandHit(host: string): { label: string } | null {
  const flat = host.replace(/[^a-z0-9]/g, "");
  for (const brand of BRANDS) {
    if (brand.tokens.some((token) => flat.includes(token))) return { label: brand.label };
  }
  return null;
}

export function extractLinks(text: string): FoundLink[] {
  const matches = text.match(/https?:\/\/[^\s<>"']+/gi) ?? [];
  const links: FoundLink[] = [];
  for (const raw of matches) {
    const href = cleanUrl(raw);
    let host = "";
    try {
      host = new URL(href).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      continue;
    }
    const tld = host.split(".").pop() ?? "";
    let flag: LinkFlag = "unknown";
    if (SHORTENERS.has(host)) flag = "shortener";
    else if (isOfficial(host)) flag = "official";
    else if (brandHit(host) && (BAD_TLDS.has(tld) || host.includes("-") || host.split(".").length > 2))
      flag = "lookalike";
    else if (brandHit(host)) flag = "lookalike";
    else if (BAD_TLDS.has(tld)) flag = "suspicious";
    links.push({ href, host, flag });
  }
  return links;
}

function push(signals: Signal[], signal: Signal | null) {
  if (!signal || signal.weight <= 0) return;
  if (signals.some((item) => item.reason === signal.reason)) return;
  signals.push(signal);
}

function textSignals(text: string): Signal[] {
  const folded = fold(text);
  const signals: Signal[] = [];
  const has = (re: RegExp) => re.test(folded);

  const posta = has(/clo\b|coln|zasielk|balik|neprevzat|slovenska posta|dorucen/);
  const payment = has(
    /doplat|zaplat|platb|kartou|iban|prevod|posli mi|posli peniaze|eur\b|€|zaloh|colne|clo\b/,
  );
  const urgent = has(
    /ihned|okamzit|do \d+ min|do \d+ hod|posledn\w* (sanca|moznost)|inak bude|hned\b|nestihnes|vyprsi/,
  );
  const creds = has(/heslo|pin\b|sms kod|overovac\w* kod|prihlas sa|cvv|cislo karty|rodne cislo/);
  const family = has(
    /aho[jy] (mami|mamicka|mamka|tati|tato|oci)|nove cislo|rozbil sa mi mobil|nikomu nehovor|nikomu nepis|nikomu nevrav/,
  );
  const bank = has(/zablokovan|internet banking|ibanking|over\w* ident|george k|vas ucet/);
  const invest = has(/krypto|bitcoin|garantovan\w* (zisk|vynos)|pasivn\w* prijem|investicn\w* prilezit/);
  const bazar = has(/bazos|rezervova\w*|platobn\w* brana|kupujuci.*odkaz|predaj.*odkaz/);
  const vishing = has(
    /policajt|vysetrovatel|bezpecn\w* ucet|trestn\w*|nesmies to nikomu|som z banky|pracovnik banky|nbs\b/,
  );
  const kuriér = has(/gls|dpd|packeta|kurier|sps\b/);

  if (family) {
    push(signals, {
      weight: 36,
      kind: "family",
      type: "Falošný príbuzný",
      reason: "Správa sa tvári ako blízky človek s novým číslom alebo prosbou o peniaze.",
    });
  }
  if (vishing) {
    push(signals, {
      weight: 32,
      kind: "vishing",
      type: "Falošný policajt alebo bankár",
      reason: "Niekoho tlačia, aby si konal hneď a nikomu o tom nepovedal.",
    });
  }
  if (bank || (creds && payment)) {
    push(signals, {
      weight: bank ? 28 : 18,
      kind: "bank",
      type: "Falošná banka",
      reason: "Žiada overenie účtu, heslo, PIN alebo kód. Banka toto v správe nepýta.",
    });
  }
  if (posta && (payment || urgent)) {
    push(signals, {
      weight: 24,
      kind: "posta",
      type: "Falošná pošta",
      reason: "Pošta a colnica nepýtajú drobnú platbu cez odkaz v SMS.",
    });
  } else if (posta) {
    push(signals, {
      weight: 8,
      kind: "posta-weak",
      type: "Zásielka",
      reason: "Spomína zásielku. Samo osebe to podvod nie je, záleží na odkaze.",
    });
  }
  if (invest) {
    push(signals, {
      weight: 26,
      kind: "invest",
      type: "Falošná investícia",
      reason: "Sľubuje ľahký zisk. Takto sa začínajú investičné podvody.",
    });
  }
  if (bazar) {
    push(signals, {
      weight: 18,
      kind: "bazar",
      type: "Podvod na bazári",
      reason: "Platba alebo rezervácia mimo bazáru je častý trik falošného kupujúceho.",
    });
  }
  if (kuriér && payment) {
    push(signals, {
      weight: 16,
      kind: "kuriér",
      type: "Falošný kuriér",
      reason: "Kuriér žiada doplatok cez správu. Reálne poplatky sa riešia v ich aplikácii.",
    });
  }
  if (payment) {
    push(signals, {
      weight: 16,
      kind: "pay",
      reason: "Žiada peniaze, kartu alebo prevod.",
    });
  }
  if (urgent) {
    push(signals, {
      weight: 14,
      kind: "urgent",
      reason: "Tlačí na čas, aby si nestíhal rozmýšľať.",
    });
  }
  if (creds) {
    push(signals, {
      weight: 16,
      kind: "creds",
      reason: "Pýta údaj, ktorý sa do správy nikdy nepíše: heslo, PIN, kód alebo číslo karty.",
    });
  }
  if (has(/\[karta\]|\[iban\]|\[rodne cislo\]/)) {
    push(signals, {
      weight: 8,
      kind: "sensitive",
      reason: "V texte je citlivý údaj. Ten do cudzej správy nepatrí.",
    });
  }
  return signals;
}

function linkSignals(links: FoundLink[]): Signal[] {
  const signals: Signal[] = [];
  for (const link of links) {
    const brand = brandHit(link.host);
    if (link.flag === "lookalike") {
      push(signals, {
        weight: 48,
        kind: "lookalike",
        type: brand?.label ?? "Falošný odkaz",
        reason: `Odkaz ${link.host} napodobňuje známu službu, ale nie je to jej stránka.`,
      });
    } else if (link.flag === "shortener") {
      push(signals, {
        weight: 22,
        kind: "short",
        reason: "Odkaz je skrátený, takže nevidíš, kam skutočne vedie.",
      });
    } else if (link.flag === "suspicious") {
      push(signals, {
        weight: 18,
        kind: "tld",
        reason: `Doména ${link.host} používa koncovku, ktorú podvodníci často kupujú na jeden deň.`,
      });
    } else if (link.flag === "unknown") {
      push(signals, {
        weight: 6,
        kind: "unknown-link",
        reason: `Odkaz vedie na ${link.host}. Over si, či túto stránku naozaj poznáš.`,
      });
    }
  }
  if (links.some((link) => link.flag === "official") && !links.some((link) => link.flag !== "official")) {
    push(signals, {
      weight: 0,
      kind: "official",
      reason: "Odkaz vedie na oficiálnu stránku známej služby.",
    });
  }
  return signals;
}

function verdictOf(score: number): Verdict {
  if (score >= 70) return "podvod";
  if (score >= 35) return "podozrive";
  return "v-poriadku";
}

function pickType(signals: Signal[], links: FoundLink[]): string {
  const ranked = signals.filter((signal) => signal.type).sort((a, b) => b.weight - a.weight);
  if (ranked[0]?.type) return ranked[0].type;
  const look = links.find((link) => link.flag === "lookalike");
  if (look) return brandHit(look.host)?.label ?? "Falošný odkaz";
  if (signals.length === 0) return "Bežná správa";
  return "Podozrivá správa";
}

function stepsFor(type: string, verdict: Verdict, signals: Signal[]): string[] {
  if (verdict === "v-poriadku") {
    return [
      "Nič neplať a na nič neklikaj, ak ťa správa aj tak znepokojuje.",
      "Dôležité veci si over v oficiálnej aplikácii, nie cez odkaz zo správy.",
      "Ak ide o banku, použi číslo z karty.",
    ];
  }
  const base = [
    "Neklikaj na odkaz a nič neplať.",
    "Správu zmaž a číslo zablokuj.",
    "Neprepisuj kódy z SMS ani údaje z karty.",
  ];
  if (type === "Falošný príbuzný") {
    return [
      "Neposielaj peniaze. Najprv zavolaj na staré číslo tej osoby.",
      "Opýtaj sa na niečo, čo vie len ona.",
      "Ak už si peniaze poslal, hneď volaj svoju banku.",
    ];
  }
  if (type === "Falošná pošta" || type === "Falošný kuriér") {
    return [
      "Neklikaj. Pošta ani kuriér neberú clo cez odkaz v SMS.",
      "Zásielku si over v aplikácii alebo na slovenskaposta.sk, ktorú si otvoríš sám.",
      "Správu zmaž.",
    ];
  }
  if (type === "Podvod na bazári") {
    return [
      "Neplať cez odkaz, ktorý ti poslal neznámy kupujúci.",
      "Zostaň v správach na bazári a nedávaj číslo karty.",
      "Ak ide o predaj, peniaze musia prísť tebe, nie naopak.",
    ];
  }
  if (signals.some((signal) => signal.kind === "vishing")) {
    return [
      "Polož to. Policajt ani bankár nechce, aby si o hovore nikomu nepovedal.",
      "Zavolaj do banky sám, na číslo z karty. Nie na číslo, ktoré ti nadiktovali.",
      "Neprevádzaj peniaze na žiadny „bezpečný účet“.",
    ];
  }
  return base;
}

function compromisedFor(verdict: Verdict, signals: Signal[]): string[] {
  if (verdict === "v-poriadku") return [];
  const lines = [
    "Ak si na odkaz klikol, stránku zavri a neprihlasuj sa.",
    "Ak si zadal kartu, PIN alebo kód z SMS, hneď volaj banku a kartu zablokuj.",
  ];
  if (
    signals.some((signal) =>
      ["family", "pay", "vishing", "invest", "bazar"].includes(signal.kind),
    )
  ) {
    lines.push("Ak si už poslal peniaze, povedz banke, že išlo o podvod. Čím skôr, tým lepšie.");
  }
  if (signals.some((signal) => signal.kind === "vishing")) {
    lines.push("Skutočná polícia je na 158. Človeku, ktorý ti volal, už nezdvíhaj.");
  }
  return lines.slice(0, 3);
}

export function analyzeRules(raw: string): Analysis {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      score: 0,
      verdict: "v-poriadku",
      type: "Prázdna správa",
      reasons: ["Nie je čo kontrolovať."],
      steps: ["Vlož text správy, odkaz alebo screenshot."],
      compromised: [],
      links: [],
      source: "pravidla",
    };
  }

  const { text } = redactSensitive(trimmed);
  const links = extractLinks(text);
  const signals = [...textSignals(text), ...linkSignals(links)].filter((signal) => signal.weight > 0);

  let score = signals.reduce((sum, signal) => sum + signal.weight, 0);
  const officialOnly =
    links.length > 0 && links.every((link) => link.flag === "official") && score < 40;
  if (officialOnly) score = Math.max(0, score - 18);
  if (links.some((link) => link.flag === "lookalike")) score = Math.max(score, 78);
  if (signals.some((signal) => signal.kind === "family") && signals.some((signal) => signal.kind === "pay")) {
    score = Math.max(score, 76);
  }
  score = Math.max(0, Math.min(100, Math.round(score)));

  const verdict = verdictOf(score);
  const type = pickType(signals, links);
  const reasons = signals
    .sort((a, b) => b.weight - a.weight)
    .map((signal) => signal.reason)
    .filter((reason, index, all) => all.indexOf(reason) === index)
    .slice(0, 3);

  if (reasons.length < 3 && verdict === "v-poriadku") {
    reasons.push("Nenašli sme typický nátlak, žiadosť o heslo ani falošnú doménu.");
  }
  if (reasons.length < 3 && links.some((link) => link.flag === "official")) {
    reasons.push("Odkaz sedí s oficiálnou stránkou.");
  }
  while (reasons.length < 3) {
    reasons.push(
      verdict === "v-poriadku"
        ? "Aj tak nič neplať, ak správu nečakáš."
        : "Podvodníci počítajú s tým, že budeš v strese a nestihneš si to overiť.",
    );
  }

  return {
    score,
    verdict,
    type,
    reasons: reasons.slice(0, 3),
    steps: stepsFor(type, verdict, signals),
    compromised: compromisedFor(verdict, signals),
    links,
    source: "pravidla",
  };
}

export function mergeAnalysis(rules: Analysis, ai: Partial<Analysis> | null): Analysis {
  if (!ai || typeof ai.score !== "number" || !ai.verdict) return rules;
  const aiScore = Math.max(0, Math.min(100, Math.round(ai.score)));
  let score = Math.round(rules.score * 0.42 + aiScore * 0.58);
  if (rules.score >= 75) score = Math.max(score, 72);
  if (rules.links.some((link) => link.flag === "lookalike")) score = Math.max(score, 78);
  score = Math.max(0, Math.min(100, score));
  const verdict = verdictOf(score);
  const reasons = (ai.reasons ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 3);
  const steps = (ai.steps ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 3);
  const compromised = (ai.compromised ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 3);
  return {
    score,
    verdict,
    type: (ai.type && ai.type.trim()) || rules.type,
    reasons: reasons.length === 3 ? reasons : rules.reasons,
    steps: steps.length >= 2 ? steps : rules.steps,
    compromised: verdict === "v-poriadku" ? [] : compromised.length ? compromised : rules.compromised,
    links: rules.links,
    source: "ai",
  };
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  podvod: "Podvod",
  podozrive: "Podozrivé",
  "v-poriadku": "V poriadku",
};

export const SAMPLES: { id: string; label: string; text: string }[] = [
  {
    id: "posta",
    label: "Pošta a clo",
    text: "Slovenská pošta: Vaša zásielka č. SK49281 je zadržaná na colnici. Doplaťte clo 1,20 EUR do 12 hodín, inak bude balík vrátený. https://posta-sk.top/platba",
  },
  {
    id: "banka",
    label: "Banka",
    text: "SLSP: Váš účet bol dočasne zablokovaný kvôli podozrivej platbe. Overte identitu do 10 minút, inak účet zrušíme: https://slsp-bezpecnost.com/login",
  },
  {
    id: "mama",
    label: "Ahoj mami",
    text: "Ahoj mami, rozbil sa mi mobil, toto je moje nové číslo. Som v núdzi, pošli mi prosím 200 EUR na účet SK12 1100 0000 0000 1234 5678. Nikomu nehovor, vysvetlím večer.",
  },
  {
    id: "cisty",
    label: "Bežná správa",
    text: "Dobrý deň, vaša objednávka bola odovzdaná kuriérovi Packeta. Sledovanie: https://tracking.packeta.com/sk/123456789",
  },
];

export type Warning = {
  slug: string;
  title: string;
  type: string;
  flying: boolean;
  summary: string;
  example: string;
  tells: string[];
  actions: string[];
};

export const WARNINGS: Warning[] = [
  {
    slug: "falsna-posta",
    title: "Falošná pošta a clo 1,20 €",
    type: "Falošná pošta",
    flying: true,
    summary: "SMS tvrdí, že balík stojí na colnici a treba doplatiť drobnú sumu. Odkaz nevedie na poštu.",
    example:
      "Slovenská pošta: zásielka je zadržaná. Doplaťte clo 1,20 € do 12 hodín: posta-sk.top/platba",
    tells: [
      "Tlačí na hodiny.",
      "Suma je schválne malá, aby si ju neváhal zaplatiť.",
      "Doména nie je slovenskaposta.sk.",
    ],
    actions: [
      "Na odkaz neklikaj.",
      "Zásielku si over sám na slovenskaposta.sk alebo v aplikácii kuriéra.",
      "Správu zmaž.",
    ],
  },
  {
    slug: "falsna-banka",
    title: "Účet vraj zablokovali",
    type: "Falošná banka",
    flying: true,
    summary: "Správa alebo hovor tvrdí, že účet je v ohrození. Cieľom je heslo, kód z SMS alebo potvrdenie platby v aplikácii.",
    example: "Váš účet bol zablokovaný. Overte identitu do 10 minút: slsp-bezpecnost.com",
    tells: [
      "Banka neposiela odkaz na prihlásenie.",
      "Nikdy nepýta PIN, heslo ani celý kód z SMS.",
      "Volajúci sa často odkáže na správu, ktorá práve prišla.",
    ],
    actions: [
      "Polož a neklikaj.",
      "Otvor bankovú aplikáciu sám, nie cez správu.",
      "Ak si už niečo zadal, volaj na číslo z karty.",
    ],
  },
  {
    slug: "ahoj-mami",
    title: "Ahoj mami, nové číslo",
    type: "Falošný príbuzný",
    flying: false,
    summary: "Cudzí človek sa vydáva za dieťa. Mobil sa vraj rozbil a treba rýchlo poslať peniaze.",
    example: "Ahoj mami, toto je moje nové číslo. Pošli 200 €, vysvetlím večer. Nikomu nehovor.",
    tells: [
      "Nové číslo a prosba, aby si o tom nikomu nepovedal.",
      "Platba hneď, vysvetlenie neskôr.",
      "Nezdvihne, keď zavoláš na staré číslo ty.",
    ],
    actions: [
      "Zavolaj na číslo, ktoré máš uložené roky.",
      "Opýtaj sa na detail, ktorý podvodník nevie.",
      "Peniaze neposielaj.",
    ],
  },
  {
    slug: "krypto",
    title: "Investícia s známou tvárou",
    type: "Falošná investícia",
    flying: false,
    summary: "Reklama sťahuje na skupinu, kde niekto sľubuje istý zisk z krypta. Tvár v videu býva ukradnutá.",
    example: "Garantovaný výnos 8 % týždenne. Miesta v skupine sa míňajú, píš hneď.",
    tells: [
      "Istý zisk neexistuje.",
      "Najprv malý vklad, potom ťa tlačia pridať viac.",
      "Výber peňazí zrazu nejde.",
    ],
    actions: [
      "Neposielaj vklad a nedávaj doklady.",
      "Nenahrávaj sa cez odkaz, ktorý prišiel sám.",
      "Ak si už zaplatil, volaj banku.",
    ],
  },
  {
    slug: "bazar",
    title: "Kupujúci s odkazom na platbu",
    type: "Podvod na bazári",
    flying: false,
    summary: "Pri predaji na bazári príde odkaz, kde máš zadať kartu, aby si „prijal“ platbu. Peniaze odídu od teba.",
    example: "Mám záujem. Dokonči rezerváciu tu, inak to kúpim inde: platba-bazos.shop",
    tells: [
      "Kupujúci ťa ženie mimo bazáru.",
      "Na prijatie peňazí kartu nepotrebuješ.",
      "Odkaz vyzerá ako pošta alebo banka, ale nie je.",
    ],
    actions: [
      "Zostaň v chate na bazári.",
      "Kartu nezadávaj.",
      "Tovar neposielaj, kým peniaze naozaj nie sú na účte.",
    ],
  },
  {
    slug: "policajt",
    title: "Volá falošný policajt",
    type: "Falošný policajt alebo bankár",
    flying: false,
    summary: "Hlas v telefóne hovorí o trestaní, úvere na tvoje meno alebo o účte v nebezpečenstve. Chce prevod na „bezpečný účet“.",
    example: "Som z polície. Na vaše meno je úver. Peniaze treba hneď prehodiť, inak prepadnú. Nikomu nevolajte.",
    tells: [
      "Zákaz volať rodine je najsilnejší znak podvodu.",
      "Štát ani banka nechcú hotovosť do obálky ani prevod na cudzí účet.",
      "Číslo na displeji sa dá sfalšovať.",
    ],
    actions: [
      "Polož.",
      "Zavolaj do svojej banky na číslo z karty.",
      "Ak ti hrozí priamo, volaj 158. Nie číslo, ktoré ti nadiktovali.",
    ],
  },
];
