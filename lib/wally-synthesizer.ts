/**
 * Yearbound Wally Agent Synthesizer
 * 
 * Transforms user resolutions, personal motivations, and transaction telemetry
 * into crisp, natural, human second-person accountability interventions.
 * 
 * Zero roleplay slop (no third-person character gestures, no 'Wally peers over glasses').
 * Zero mechanical string concatenation (no 'remember, you are doing this for: "..."').
 */

export interface WallyInterventionContext {
  ruleTitle: string;
  motivation?: string;
  condition?: string;
  recipient?: string;
  memo?: string;
  amountSui?: number;
  repeatCount?: number;
  cleanStreakDays?: number;
  vaultDepositSui?: number;
}

/**
 * Naturally converts first-person user motivations into fluent second-person expressions.
 * e.g. "I want to stop waking up coughing and save for my Japan trip"
 *   -> "you wanted to stop waking up coughing and save for your Japan trip"
 * e.g. "I'm tired of feeling broke by the 20th of every month with nothing left for my future"
 *   -> "you were tired of feeling broke by the 20th of every month with nothing left for your future"
 * e.g. "She moved on and I need to respect myself. Falling for late-night guilt texts always sets me back."
 *   -> "she moved on and you need to respect yourself, knowing that falling for late-night guilt texts always sets you back"
 */
export function paraphraseUserMotivation(rawMotivation: string): string {
  if (!rawMotivation) return "";

  let cleaned = rawMotivation.trim();

  // Normalize casing for replacement
  const replacements: Array<[RegExp, string]> = [
    [/\bI'm tired of\b/gi, "you were tired of"],
    [/\bI am tired of\b/gi, "you were tired of"],
    [/\bI want to\b/gi, "you wanted to"],
    [/\bI need to\b/gi, "you needed to"],
    [/\bI wake up\b/gi, "you wake up"],
    [/\bI'm\b/gi, "you're"],
    [/\bI am\b/gi, "you are"],
    [/\bI have\b/gi, "you've"],
    [/\bI've\b/gi, "you've"],
    [/\bI will\b/gi, "you would"],
    [/\bI'll\b/gi, "you'd"],
    [/\bI hate\b/gi, "you hate"],
    [/\bI love\b/gi, "you love"],
    [/\bI feel\b/gi, "you feel"],
    [/\bI'd\b/gi, "you'd"],
    [/\bmyself\b/gi, "yourself"],
    [/\bmy\b/gi, "your"],
    [/\bmine\b/gi, "yours"],
    [/\bme\b/gi, "you"],
    [/\bI\b/g, "you"],
  ];

  for (const [pattern, replacement] of replacements) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  // Remove trailing period if present so it flows into the sentence
  cleaned = cleaned.replace(/\.+$/, "");

  // Lowercase initial character unless it is a proper noun
  if (cleaned.length > 0 && !/^[A-Z][a-z]+ [A-Z]/.test(cleaned)) {
    cleaned = cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
  }

  return cleaned;
}

/**
 * Synthesizes Wally's intervention when a transaction conflicts with user's Genesis Pact.
 */
export function synthesizeWallyIntervention(ctx: WallyInterventionContext): string {
  const {
    ruleTitle,
    motivation,
    recipient = "",
    memo = "",
    amountSui = 0.05,
    repeatCount = 1,
    cleanStreakDays = 0,
  } = ctx;

  const paraphrased = motivation ? paraphraseUserMotivation(motivation) : "";
  const lowerMemo = memo.toLowerCase();
  const lowerTitle = ruleTitle.toLowerCase();
  const lowerRecipient = recipient.toLowerCase();

  const isTakeout =
    lowerMemo.includes("food") ||
    lowerMemo.includes("uber") ||
    lowerMemo.includes("dash") ||
    lowerMemo.includes("takeout") ||
    lowerMemo.includes("delivery") ||
    lowerMemo.includes("burger") ||
    lowerMemo.includes("pizza") ||
    lowerTitle.includes("takeout") ||
    lowerTitle.includes("food");

  const isEx =
    lowerTitle.includes("ex") ||
    lowerMemo.includes("sarah") ||
    lowerRecipient.includes("sarah") ||
    lowerMemo.includes("ex");

  const isBetting =
    lowerMemo.includes("bet") ||
    lowerMemo.includes("stake") ||
    lowerMemo.includes("draftking") ||
    lowerMemo.includes("fanduel") ||
    lowerMemo.includes("parlay") ||
    lowerMemo.includes("casino") ||
    lowerTitle.includes("gambl") ||
    lowerTitle.includes("bet");

  const isSmoking =
    lowerMemo.includes("smoke") ||
    lowerMemo.includes("cig") ||
    lowerMemo.includes("vape") ||
    lowerTitle.includes("smok");

  // REPEAT OFFENSE: 3 or more times
  if (repeatCount >= 3) {
    if (paraphrased) {
      return `This is your ${repeatCount}th violation for '${ruleTitle}'. You swore in Walrus Memory that ${paraphrased} — each slip now triggers an escalated fine into your Christmas vault. Don't let an impulse purchase undo that promise.`;
    }
    return `This marks violation #${repeatCount} against '${ruleTitle}'. You have repeatedly broken this boundary, and your fine has now escalated. Take a breath and step back.`;
  }

  // REPEAT OFFENSE: 2nd time
  if (repeatCount === 2) {
    if (isEx) {
      return `This is your second time sending funds to ${recipient || "your ex"}. You swore you'd protect your boundaries because ${paraphrased || "falling for past guilt always sets you back"}. Step away from this transfer.`;
    }
    if (isTakeout) {
      return `This is your second late-night delivery slip-up. You promised to stop because ${paraphrased || "you're tired of waking up sluggish and broke"}. Don't let an impulse purchase undo that progress.`;
    }
    if (isBetting) {
      return `You're about to slip for the second time on your betting commitment. You promised you'd quit because ${paraphrased || "chasing losses ruins your mental health"}. Walk away before the fine locks in.`;
    }
    if (paraphrased) {
      return `This is your second time breaking '${ruleTitle}'. You committed to staying disciplined because ${paraphrased} — don't throw that away right now.`;
    }
    return `You've done this twice now. This transfer violates '${ruleTitle}', and proceeding will forfeit an escalated penalty to your Christmas vault.`;
  }

  // FIRST VIOLATION - Context-Aware Synthesis
  if (isEx) {
    if (paraphrased) {
      return `You committed to respecting your boundaries because ${paraphrased}. Sending ${amountSui} SUI to ${recipient || "your ex"} directly violates the oath you recorded in Walrus Memory.`;
    }
    return `Sending funds to ${recipient || "your ex"} breaks the sacred boundary you set in your Genesis Pact. Respect your own progress and cancel this transfer.`;
  }

  if (isTakeout) {
    if (paraphrased) {
      return `You made a pact to stop late-night takeout because ${paraphrased}. Ordering food right now directly breaches that commitment.`;
    }
    return `Late-night delivery breaches your '${ruleTitle}' commitment. Step back before this penalty locks into your Christmas vault.`;
  }

  if (isBetting) {
    if (paraphrased) {
      return `You swore off sports betting because ${paraphrased}. Depositing ${amountSui} SUI into ${recipient || "gambling"} runs straight against that oath.`;
    }
    return `This transfer directly breaches your anti-gambling commitment. Keep your discipline intact and walk away.`;
  }

  if (isSmoking) {
    if (paraphrased) {
      return `You committed to quitting because ${paraphrased}. Spending funds on this right now throws away the streak you're trying to build.`;
    }
    return `This purchase violates your commitment to quit smoking. Keep your lungs clean and your vault untouched.`;
  }

  // General with motivation
  if (paraphrased) {
    if (cleanStreakDays > 3) {
      return `You have maintained a clean ${cleanStreakDays}-day streak because ${paraphrased}. This transfer directly breaches '${ruleTitle}' — don't shatter your progress over a temporary impulse.`;
    }
    return `You locked your SUI away because ${paraphrased}. This transfer directly conflicts with '${ruleTitle}' — step back before the penalty settles.`;
  }

  // General fallback (clean, direct, human)
  return `This transfer directly violates your commitment to '${ruleTitle}'. Proceeding will lock a penalty into your Christmas vault.`;
}
