/**
 * Client-side verdict catalog, mirroring the server-side Go catalog.
 * Used to resolve (state, c1, c2, c3) tuples from the binary batch response
 * into human-readable verdict phrases + subtexts without a second round-trip.
 *
 * Must stay in sync with verdict_catalog.go on the backend.
 *
 * Category indices (v2, 9 categories):
 *   0 = genuine    1 = helpful     2 = wholesome
 *   3 = ad-promo   4 = ai-slop     5 = bait
 *   6 = brainrot   7 = misleading  8 = rant
 */

// Signature states
export const STATE_SPARSE = 0;
export const STATE_CLEAR = 1;
export const STATE_SPLIT = 2;
export const STATE_DISPUTED = 3;

const ABSENT = 0xff; // -1 as uint8

/** A human-readable verdict produced by the catalog lookup. */
export interface VerdictLabel {
  phrase: string;
  subtext: string;
}

/** Pack (state, c1, c2, c3) into a 32-bit key, matching the Go side. */
function key(
  state: number,
  c1: number,
  c2: number,
  c3: number
): number {
  function enc(c: number | undefined): number {
    if (c === undefined || c === ABSENT || c === -1) return 0xf;
    return c & 0xff;
  }
  return (
    ((state & 0xff) << 24) |
    (enc(c1) << 16) |
    (enc(c2) << 8) |
    enc(c3)
  );
}

function clear(c1: number): number {
  return key(STATE_CLEAR, c1, ABSENT, ABSENT);
}
function split(c1: number, c2: number): number {
  return key(STATE_SPLIT, c1, c2, ABSENT);
}
function disputed(c1: number, c2: number, c3: number): number {
  return key(STATE_DISPUTED, c1, c2, c3);
}

// Category indices; keep in sync with CategoryXxx in models.go.
const G = 0,
  He = 1,
  Wh = 2,
  Ad = 3,
  Ai = 4,
  Ba = 5,
  Br = 6,
  Mi = 7,
  Ra = 8;

type CatalogEntry = [string, string];

const CATALOG = new Map<number, CatalogEntry>([
  // SPARSE (1)
  [
    key(STATE_SPARSE, 0xf, 0xf, 0xf),
    [
      "Too Few Votes",
      "Not enough community signal yet. The verdict will sharpen as more people vote.",
    ],
  ],

  // CLEAR (9)
  [
    clear(G),
    [
      "Real Deal",
      "A real human contribution that the community recognizes.",
    ],
  ],
  [
    clear(He),
    ["Genuinely Useful", "Practical and informative, exactly what it set out to be."],
  ],
  [
    clear(Wh),
    ["Heartwarming", "Warm, kind, and uplifting. The internet at its best."],
  ],
  [
    clear(Ad),
    ["Stealth Sell", "Looks organic, smells commercial."],
  ],
  [
    clear(Ai),
    ["Bot Residue", "Reads like machine output rather than lived experience."],
  ],
  [clear(Ba), ["Pure Bait", "Designed to trigger, not to inform."]],
  [
    clear(Br),
    ["Certified Brainrot", "All vibes, no substance."],
  ],
  [
    clear(Mi),
    ["Fact Bent", "The claims here don't hold up to scrutiny."],
  ],
  [
    clear(Ra),
    ["Just Venting", "Pure emotional discharge with little actionable content."],
  ],

  // SPLIT: Genuine primary (8)
  [split(G, He), ["Helpful Gem", "Authentic and packed with value."]],
  [split(G, Wh), ["Pure Gold", "Real and heartwarming, a rare combo."]],
  [split(G, Ad), ["Honest Pitch", "Real person, real product, but still selling."]],
  [
    split(G, Ai),
    ["AI-Assisted Real", "Human intent with machine polish; useful, just not handwritten."],
  ],
  [
    split(G, Ba),
    ["Accidental Bait", "Genuine sentiment, framed to hook you anyway."],
  ],
  [split(G, Br), ["Chaotic Authentic", "Real person, chaotic delivery."]],
  [split(G, Mi), ["Honest Error", "Good faith, shaky facts."]],
  [split(G, Ra), ["Passionate but Fair", "Real frustration, mostly measured."]],

  // SPLIT: Helpful primary (8)
  [split(He, G), ["Worth Bookmarking", "Useful content you can trust."]],
  [
    split(He, Wh),
    ["Feel-Good Advice", "Helpful and warm in equal measure."],
  ],
  [
    split(He, Ad),
    ["Helpful Upsell", "Useful tips with a product pitch at the end."],
  ],
  [
    split(He, Ai),
    ["AI-Drafted Advice", "Probably useful, definitely machine-written."],
  ],
  [split(He, Ba), ["Hook with Value", "Baited you in, then delivered."]],
  [
    split(He, Br),
    ["Chaotic Tutorial", "Hard to follow, but there's a gem inside."],
  ],
  [
    split(He, Mi),
    ["Useful but Shaky", "Actionable, but verify the facts first."],
  ],
  [
    split(He, Ra),
    ["Frustrated Advice", "Valuable insight buried in frustration."],
  ],

  // SPLIT: Wholesome primary (8)
  [split(Wh, G), ["Sincere Heart", "Genuine warmth without performance."]],
  [
    split(Wh, He),
    ["Kind and Useful", "Uplifting content that delivers real value."],
  ],
  [
    split(Wh, Ad),
    ["Warm Sell", "Heartwarming with a product placement in the credits."],
  ],
  [
    split(Wh, Ai),
    ["Machine Warmth", "Wholesome vibes, AI-generated soul."],
  ],
  [
    split(Wh, Ba),
    ["Sweet Bait", "Feels good but was designed to hook you."],
  ],
  [
    split(Wh, Br),
    ["Wholesome Chaos", "Chaotic energy that somehow feels kind."],
  ],
  [split(Wh, Mi), ["Warm but Wrong", "Good vibes, bad facts."]],
  [
    split(Wh, Ra),
    ["Kind Anger", "Righteous frustration with a compassionate core."],
  ],

  // SPLIT: AdPromo primary (8)
  [
    split(Ad, G),
    ["Real Ad", "Commercial through and through, but the person is genuine."],
  ],
  [split(Ad, He), ["Useful Ad", "Actually informative, for an ad."]],
  [
    split(Ad, Wh),
    ["Heartwarming Ad", "Commercial content with genuine warmth."],
  ],
  [split(Ad, Ai), ["Automated Ad", "AI-generated commercial content."]],
  [
    split(Ad, Ba),
    ["Bait-and-Switch", "Clickbait with a product at the end."],
  ],
  [
    split(Ad, Br),
    ["Meme Ad", "Commercial content wearing a meme costume."],
  ],
  [
    split(Ad, Mi),
    ["Deceptive Ad", "A commercial disguised as truth."],
  ],
  [
    split(Ad, Ra),
    ["Angry Upsell", "Frustrated voice with a sales goal."],
  ],

  // SPLIT: AISlop primary (8)
  [
    split(Ai, G),
    ["Human-ish", "Almost real, but the seams are showing."],
  ],
  [
    split(Ai, He),
    ["AI-Useful", "Machine-generated but actually helpful."],
  ],
  [
    split(Ai, Wh),
    ["Synthetic Warmth", "AI-generated warmth, formulaic but harmless."],
  ],
  [split(Ai, Ad), ["Synthetic Pitch", "Generated promotional voice."]],
  [
    split(Ai, Ba),
    ["AI Bait", "Algorithmically-generated engagement trap."],
  ],
  [
    split(Ai, Br),
    ["Digital Noise", "AI-generated brainrot, the worst of both worlds."],
  ],
  [
    split(Ai, Mi),
    ["Hallucinated Truth", "Confidently generated, demonstrably wrong."],
  ],
  [split(Ai, Ra), ["Robot Rage", "Machine-generated outrage bait."]],

  // SPLIT: Bait primary (8)
  [
    split(Ba, G),
    ["Genuine Hook", "Real person, real bait, intentional or not."],
  ],
  [
    split(Ba, He),
    ["Bait with Substance", "Clickbaited you in, but delivered real value."],
  ],
  [
    split(Ba, Wh),
    ["Wholesome Hook", "Warm bait you don't mind being caught by."],
  ],
  [split(Ba, Ad), ["Bait Ad", "Clickbait funded by a product."]],
  [
    split(Ba, Ai),
    ["AI-Generated Bait", "Engineered engagement, machine-written."],
  ],
  [
    split(Ba, Br),
    ["Maximum Engagement", "Pure algorithm food with no nutrition."],
  ],
  [
    split(Ba, Mi),
    ["Rage Bait", "Misleading content designed to make you angry."],
  ],
  [
    split(Ba, Ra),
    ["Manufactured Outrage", "Designed to trigger you and the author alike."],
  ],

  // SPLIT: Brainrot primary (8)
  [
    split(Br, G),
    ["Authentic Chaos", "Real person, unfiltered chaos."],
  ],
  [
    split(Br, He),
    ["Buried Gem", "Chaotic format, genuine value inside."],
  ],
  [
    split(Br, Wh),
    ["Wholesome Brainrot", "Chaotic, absurd, and somehow kind."],
  ],
  [split(Br, Ad), ["Meme Shill", "Brand content with chaos energy."]],
  [split(Br, Ai), ["AI Brainrot", "Machine-generated chaos content."]],
  [
    split(Br, Ba),
    ["Engagement Vortex", "Peak engagement bait with zero substance."],
  ],
  [split(Br, Mi), ["Confusing Chaos", "Incoherent and inaccurate."]],
  [split(Br, Ra), ["Chaos Rant", "Unhinged, unstructured brain dump."]],

  // SPLIT: Misleading primary (8)
  [
    split(Mi, G),
    ["Honest Mistake", "Well-meaning, but the facts got away from them."],
  ],
  [
    split(Mi, He),
    ["Misleading Advice", "Sounds useful but warrants a double check before acting on it."],
  ],
  [
    split(Mi, Wh),
    ["Sweet Misinfo", "Warm feelings, dubious facts."],
  ],
  [
    split(Mi, Ad),
    ["Deceptive Pitch", "Commercial interests warped the facts."],
  ],
  [
    split(Mi, Ai),
    ["AI Disinformation", "Machine-generated and factually wrong."],
  ],
  [
    split(Mi, Ba),
    ["Misinformation Bait", "False premise designed to go viral."],
  ],
  [
    split(Mi, Br),
    ["Misinformation Chaos", "Inaccurate and incoherent."],
  ],
  [
    split(Mi, Ra),
    ["Angry Misinfo", "Passionate delivery, wrong facts."],
  ],

  // SPLIT: Rant primary (8)
  [
    split(Ra, G),
    ["Honest Rant", "Unfiltered frustration from a real person."],
  ],
  [
    split(Ra, He),
    ["Frustrated but Useful", "Venting, but with actual insight."],
  ],
  [
    split(Ra, Wh),
    ["Compassionate Rant", "Angry but kind at heart."],
  ],
  [
    split(Ra, Ad),
    ["Angry Shill", "Emotional rant with a product to sell."],
  ],
  [split(Ra, Ai), ["Machine Rage", "Machine-generated frustration."]],
  [
    split(Ra, Ba),
    ["Outrage Bait", "Engineered anger masquerading as passion."],
  ],
  [
    split(Ra, Br),
    ["Pure Chaos", "Unhinged, unstructured, and uninformative."],
  ],
  [
    split(Ra, Mi),
    ["Passionate Misinfo", "Sincere anger, wrong facts."],
  ],

  // DISPUTED: curated triads (~40)

  // All-positive triads
  [
    disputed(G, He, Wh),
    ["Community Gold", "Real, useful, and kind. The rarest kind of post."],
  ],
  [
    disputed(He, Wh, G),
    ["The Good Post", "Warm, helpful, and genuinely human."],
  ],
  [
    disputed(Wh, G, He),
    ["Heartfelt Value", "Genuine, kind, and actually useful."],
  ],

  // Genuine-led triads
  [
    disputed(G, He, Ai),
    ["Assisted Insight", "Useful and real, with a hint of machine polish."],
  ],
  [
    disputed(G, He, Mi),
    ["Honest but Flawed", "Well-meaning and useful, but fact-check the details."],
  ],
  [
    disputed(G, Ai, Mi),
    ["Honest but Hazy", "Sincere voice, fuzzy facts, AI-assisted feel."],
  ],
  [
    disputed(G, Ba, Ra),
    ["Authentic Outrage", "Real frustration, bait-y framing."],
  ],
  [
    disputed(G, Ad, Ai),
    ["Sincere Bot Pitch", "Real person behind an AI-drafted ad."],
  ],
  [
    disputed(G, Mi, Ba),
    ["Passionate but Wrong", "Real conviction, shaky facts, designed to hook."],
  ],
  [
    disputed(G, Ra, Mi),
    ["Sincere but Heated", "Authentic voice, dubious claims."],
  ],

  // Helpful-led triads
  [
    disputed(He, Ai, Ad),
    ["Helpful Ad Bot", "AI-generated tips with a product to sell."],
  ],
  [
    disputed(He, Mi, Ai),
    ["Flawed AI Advice", "Machine-written, possibly useful, possibly wrong."],
  ],
  [
    disputed(He, Ba, Ai),
    ["AI Click Farm", "Machine-generated bait that's somehow useful."],
  ],

  // Wholesome-led triads
  [
    disputed(Wh, Ai, Ba),
    ["AI Feel-Good Bait", "Machine-generated warmth engineered to hook."],
  ],
  [
    disputed(Wh, Mi, Ba),
    ["Dangerous Warmth", "Comforting tone, misleading content."],
  ],

  // AdPromo-led triads
  [
    disputed(Ad, Ai, Mi),
    ["Synthetic Scam", "Generated, promotional, untrue."],
  ],
  [
    disputed(Ad, Ba, Mi),
    ["Full-Stack Scam", "Hook, lie, sell: the complete trifecta."],
  ],
  [
    disputed(Ad, Ai, Ba),
    ["Astroturf Bait", "Generated promotion engineered for clicks."],
  ],
  [
    disputed(Ad, Br, Ba),
    ["Viral Shill", "Meme-format ad engineered to spread."],
  ],
  [
    disputed(Ad, Ai, Ra),
    ["Coordinated Outrage", "Bot-driven promotional anger."],
  ],
  [
    disputed(Ad, Mi, Br),
    ["Chaos Deception", "Misleading commercial content wrapped in noise."],
  ],

  // AISlop-led triads
  [
    disputed(Ai, Ba, Mi),
    ["Algorithmic Propaganda", "Generated, hooky, false."],
  ],
  [
    disputed(Ai, Ba, Ra),
    ["Engagement Slop", "All the engagement levers, none of the soul."],
  ],
  [
    disputed(Ai, Mi, Ra),
    ["Disinformation Op", "Machine-generated, inflamed, and false."],
  ],
  [
    disputed(Ai, Br, Mi),
    ["Digital Pollution", "AI chaos with false claims."],
  ],
  [
    disputed(Ai, Ad, Br),
    ["Bot Meme Factory", "Generated, commercial, chaotic."],
  ],

  // Bait-led triads
  [
    disputed(Ba, Mi, Ra),
    ["Outrage Scam", "Angry, misleading, designed to provoke."],
  ],
  [
    disputed(Ba, Mi, Ai),
    ["AI Rage Bait", "Machine-generated false content designed to anger."],
  ],
  [
    disputed(Ba, Br, Mi),
    ["Chaos Misinfo", "Incoherent, misleading, and baity."],
  ],
  [
    disputed(Ba, Ra, Mi),
    ["Manufactured Misinfo", "Engineered anger built on false claims."],
  ],
  [
    disputed(Ba, Ad, Mi),
    ["Commercial Lie", "False content pushing a product."],
  ],

  // Brainrot-led triads
  [
    disputed(Br, Mi, Ra),
    ["Chaos Rage Misinfo", "Unhinged, wrong, and angry."],
  ],
  [
    disputed(Br, Ba, Mi),
    ["Chaos Farm", "Incoherent engagement bait with false claims."],
  ],
  [
    disputed(Br, Ai, Mi),
    ["AI Chaos", "Machine-generated incoherence with bad facts."],
  ],
  [
    disputed(Br, Ad, Ai),
    ["Bot Meme Shill", "AI-generated meme-format commercial content."],
  ],

  // Misleading-led triads
  [
    disputed(Mi, Ba, Ra),
    ["Inflammatory Falsehood", "Wrong on purpose, loudly."],
  ],
  [
    disputed(Mi, Ai, Ba),
    ["Generated Misinfo Bait", "AI-made, false, and designed to hook."],
  ],
  [
    disputed(Mi, Ad, Ai),
    ["Sponsored Misinfo", "Paid, generated, untrue."],
  ],
  [
    disputed(Mi, Ra, Ba),
    ["Angry Disinformation", "Emotionally charged false claims."],
  ],

  // Rant-led triads
  [
    disputed(Ra, Mi, Ba),
    ["Passionate Misinfo Bait", "Real anger, wrong facts, baity framing."],
  ],
  [
    disputed(Ra, Ba, Mi),
    ["Outrage Baiter", "Designed to enrage, built on falsehoods."],
  ],
  [
    disputed(Ra, Br, Mi),
    ["Chaos Misinfo Rant", "Incoherent, wrong, and emotional."],
  ],
]);

/**
 * Look up the verdict label for a (state, c1, c2, c3) 4-tuple.
 * Returns { phrase, subtext } or a sensible fallback if no exact match.
 */
export function lookupVerdict(
  state: number,
  c1: number,
  c2: number,
  c3: number
): VerdictLabel {
  if (state === STATE_SPARSE) {
    const e = CATALOG.get(key(STATE_SPARSE, 0xf, 0xf, 0xf));
    return e
      ? { phrase: e[0], subtext: e[1] }
      : { phrase: "Too Few Votes", subtext: "" };
  }

  const k = key(state, c1, c2, c3);
  const entry = CATALOG.get(k);
  if (entry) return { phrase: entry[0], subtext: entry[1] };

  if (state === STATE_DISPUTED) {
    return {
      phrase: "Mixed Signals",
      subtext:
        "Community can't agree what this post is. Voters are split across multiple categories.",
    };
  }
  return {
    phrase: "Unclear Verdict",
    subtext: "The community is divided on this post.",
  };
}

// Firefox MV2 fallback: attach to globalThis so importScripts() can use it.
if (typeof globalThis !== "undefined") {
  (globalThis as Record<string, unknown>)._slazeVerdictCatalog = {
    lookupVerdict,
    STATE_SPARSE,
    STATE_CLEAR,
    STATE_SPLIT,
    STATE_DISPUTED,
  };
}
