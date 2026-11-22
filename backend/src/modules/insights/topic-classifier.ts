/**
 * Keyword-based operational topic classifier.
 *
 * Booking.com reviews are split into a "liked" and a "disliked" field. We use that split as the
 * polarity signal instead of guessing sentiment from free text: a topic found in the disliked
 * text is a complaint, a topic found in the liked text is praise. Within each field we only need
 * to answer "which operational topics are mentioned?", which keyword matching does well.
 *
 * Known limits (also in the README): no negation handling inside a single field ("not dirty" in
 * the liked field still counts as Cleanliness praise, which is correct, but "not very clean" in
 * the disliked field is also a Cleanliness complaint, so both work because polarity comes from the
 * field); sarcasm and non-English text are not understood; keywords are a hand-tuned list.
 */

export type TopicKey =
  | 'cleanliness'
  | 'checkin'
  | 'staff'
  | 'noise'
  | 'facilities'
  | 'location'
  | 'room_condition'
  | 'value'
  | 'comfort'
  | 'food'
  | 'wifi';

export interface TopicDefinition {
  key: TopicKey;
  label: string;
  patterns: RegExp[];
}

export const TOPICS: TopicDefinition[] = [
  {
    key: 'cleanliness',
    label: 'Cleanliness',
    patterns: [
      /\bclean/i, /\bdirt/i, /\bfilth/i, /\bstain/i, /\bdust/i, /\bhygien/i, /\bmould/i, /\bmold/i,
      /\bsmell/i, /\bsmelt/i, /\bodou?r/i, /\bstink/i, /\bstank/i, /\bgrubby/i, /\bgross\b/i,
      /\bcockroach/i, /\bbed ?bug/i, /\bbug(s)?\b/i, /\bpests?\b/i, /\brats?\b/i, /\bmice\b/i,
      /\bhair(s)?\b/i, /\bunhygien/i, /\bsticky/i, /\bsoiled/i, /\bunwashed/i, /\bsanitar/i,
    ],
  },
  {
    key: 'checkin',
    label: 'Check-in experience',
    patterns: [
      /check[ -]?in/i, /check[ -]?out/i, /\barriv(al|ed|ing|e)\b/i, /\bkey ?(card|code|box|safe)?s?\b/i,
      /\bkeys?\b/i, /\bself[ -]service/i, /\bself check/i, /\block ?box/i, /\bentry code/i,
      /\bdoor code/i, /\bwait(ed|ing)? (for|to|at)/i, /\bearly check/i, /\blate check/i,
      /\bluggage/i, /\bbag storage/i, /\bhandover/i, /\bregistration/i, /\breception (was )?closed/i,
      /\bno (one|body) (at|on) (the )?(front|reception|desk)/i,
    ],
  },
  {
    key: 'staff',
    label: 'Staff & service',
    patterns: [
      /\bstaff/i, /\breception(ist|s)?\b/i, /\bfront desk/i, /\bmanager/i, /\bhost\b/i, /\bowner/i,
      /\bservice\b/i, /\bhelpful/i, /\bunhelpful/i, /\brude/i, /\bfriendly/i, /\bunfriendly/i,
      /\bpolite/i, /\bimpolite/i, /\battitude/i, /\bwelcoming/i, /\bcourteous/i, /\bhospitality/i,
      /\bcleaner(s)?\b/i, /\bhousekeep/i, /\bconcierge/i, /\bproffesional|\bprofessional/i,
      /\bguy at\b/i, /\blady at\b/i, /\bman at\b/i, /\bwoman at\b/i, /\bshouted/i, /\brefund/i,
    ],
  },
  {
    key: 'noise',
    label: 'Noise',
    patterns: [
      /\bnois(e|y)/i, /\bloud/i, /\bthin walls?/i, /\bsound ?proof/i, /\bparty|\bparties/i,
      /\bquiet/i, /\bpaper[ -]thin/i, /\bheard (everything|every|the|people|neighbo)/i,
      /\bconstruction/i, /\bjackhammer|\bdrill(ing)?\b/i, /\btraffic (noise|sound)/i,
      /\bstreet noise/i, /\bsirens?\b/i, /\bscream/i, /\bshout/i, /\bbass\b/i, /\bmusic\b/i,
      /\bdisturb/i, /\bcould not sleep|couldn'?t sleep|unable to sleep|hard to sleep/i,
      /\bearplugs?\b/i, /\bdoors? (slam|bang)/i,
    ],
  },
  {
    key: 'facilities',
    label: 'Facilities',
    patterns: [
      /\bfacilit/i, /\blift\b/i, /\belevator/i, /\bstairs?\b/i, /\bair[ -]?con/i, /\b(a\/c|ac)\b/i,
      /\bheating|\bheater/i, /\bkitchen/i, /\blaundry/i, /\bwashing machine/i, /\bparking/i,
      /\bcar park/i, /\bgarage/i, /\bpool\b/i, /\bgym\b/i, /\blounge/i, /\bcommon (area|room)/i,
      /\bterrace|\brooftop|\bbalcony|\bcourtyard/i, /\bluggage storage/i, /\bfridge|\brefrigerator/i,
      /\bmicrowave/i, /\bkettle/i, /\bhot water/i, /\bwater pressure/i, /\bshared (bathroom|toilet|kitchen)/i,
      /\bamenit/i, /\btv\b|\btelevision/i, /\biron(ing)?\b/i, /\bhair ?dryer/i, /\bsafe\b/i,
      /\bwheelchair|\baccessib/i, /\bsmoking/i, /\bfan\b/i,
      /\btowels?\b/i, /\bsoap\b|\bshampoo|\btoilet paper|\btoiletries/i, /\blockers?\b/i, /\bshared (bathrooms?|showers?|toilets?)/i,
      /\b(bathrooms?|showers?|toilets?)\b[^.]{0,40}\b(occupied|queue|queues|queuing|limited|not enough|too few|only (one|two|1|2))/i,
    ],
  },
  {
    key: 'location',
    label: 'Location',
    patterns: [
      /\blocation/i, /\bnear (the )?(station|city|cbd|beach|train|bus|tram|metro|shops?|restaurants?|cafes?|airport|stadium|centre|center)/i,
      /\bclose (to|by)\b/i, /\bwalking distance/i, /\b(far|away) (from|to)\b/i, /\b\d+ ?(min|mins|minutes?)\.? walk/i,
      /\bwalk(ed|ing)? (to|from|into|around)\b/i, /\bstation\b/i, /\btrain\b/i, /\bbus(es)?\b/i, /\btram\b/i, /\bmetro\b/i,
      /\bstadium/i, /\bcbd\b|\bcity (centre|center)\b/i, /\brestaurants?\b/i, /\bcafes?\b/i, /\bshops?\b/i,
      /\bconvenient/i, /\bneighbou?rhood/i, /\b(surrounding|local|nearby|the|that|this|dodgy|bad|rough|seedy) area\b/i,
      /\bsurroundings\b/i, /\b(busy|main|dark|quiet) (road|street)\b/i,
      /\bunsafe|\bsketchy|\bdodgy|\bshady/i, /\bairport/i, /\bbeach/i, /\bharbou?r/i,
    ],
  },
  {
    key: 'room_condition',
    label: 'Room condition',
    patterns: [
      // Condition words that are about the building/room on their own.
      /\bworn\b/i, /\bdated\b/i, /\boutdated/i, /\brun[ -]?down/i, /\bdamaged?\b/i, /\bbroken\b|\bbroke\b/i,
      /\bleak/i, /\bpeeling/i, /\bcracked?\b/i, /\bfaulty/i, /\bshabby/i, /\bdingy/i, /\bcramped/i,
      /\bdamp\b/i, /\bmaintenance/i, /\brenovat/i, /\brefurbish/i, /\bno windows?\b/i, /\bwithout (a )?windows?\b/i,
      /\bsmall (room|bathroom|space|bedroom)/i, /\btiny (room|bathroom|space|bedroom)/i, /\bdark (room|rooms)\b/i,
      /\btired (room|rooms|decor|furniture|bathroom)/i, /\bneeds? (a )?(renovat|repair|updat|fix|replac|upgrad)/i,
      /\bstained (carpet|wall|walls|ceiling|sheets?|mattress)/i,
      // A fixture followed (or preceded) closely by a problem word.
      new RegExp(`\\b${'(room|bathroom|shower|toilet|bed|carpet|walls?|ceiling|floor|window|door|curtains?|furniture|tiles?|paint|lock|tap|sink|fan)'}s?\\b(\\W+\\w+){0,3}\\W+(old|worn|broken|leak\\w*|damp|mould\\w*|stained|cracked|rusty|falling|faulty|damaged|dirty|dingy|shabby|outdated|dated|not (working|closing|locking)|(did|does)(n'?t| not) (work|close|lock|flush|drain)|too small|poor condition)`, 'i'),
      new RegExp(`\\b(old|worn|broken|leaking|damp|mouldy|stained|cracked|rusty|faulty|damaged|dingy|shabby|outdated|dated|tiny|cramped)\\W+(\\w+\\W+){0,2}${'(room|bathroom|shower|toilet|bed|carpet|walls?|ceiling|floor|window|door|curtains?|furniture|tiles?|paint|lock|tap|sink|fan|building|property)'}`, 'i'),
      /\b(room|bathroom|shower|toilet|building|property)\b[^.]{0,40}\b(run[ -]?down|not (been )?(maintained|renovated|updated))/i,
      /\bnot working|doesn'?t work|didn'?t work|did not work|didnt work|stopped working/i,
      /\bspacious/i, /\bmodern\b/i,
    ],
  },
  {
    key: 'value',
    label: 'Value for money',
    patterns: [
      /\bvalue\b/i, /\bprice/i, /\bpric(ed|ing)/i, /\bcheap/i, /\bexpensive/i, /\boverpriced/i,
      /\bworth\b/i, /\bmoney\b/i, /\baffordable/i, /\bbudget/i, /\bcost/i, /\bpaid\b/i,
      /\bovercharg/i, /\bfees?\b/i, /\bdeposit/i, /\bbond\b/i, /\bhidden charge/i, /\bsurcharge/i,
      /\bbang for/i, /\bfor the price/i, /\bwhat you pay/i,
    ],
  },
  {
    key: 'comfort',
    label: 'Bed & comfort',
    patterns: [
      new RegExp(`\\b(beds?|bunks?|mattress(es)?|pillows?)\\b(\\W+\\w+){0,4}\\W+(uncomfortable|hard|soft|lumpy|squeak\\w*|sag\\w*|thin|old|bad|terrible|awful|poor|horrible|rock\\w*|shak\\w*|creak\\w*|wobbl\\w*|rickety|too (small|hard|soft|high|short|narrow)|not (very )?(comfortable|comfy))`, 'i'),
      new RegExp(`\\b(uncomfortable|hard|lumpy|squeaky|saggy|thin|old|terrible|awful|horrible|rickety|tiny|narrow)\\W+(\\w+\\W+){0,2}(beds?|bunks?|mattress(es)?|pillows?)\\b`, 'i'),
      /\bcomfort/i, /\buncomfortable/i, /\bcosy|\bcozy/i,
      /\b(poor|bad|terrible|little|no|lack of) sleep\b|\bslept (badly|poorly|terribly)/i, /\bquilt|\bduvet|\bblanket/i, /\bspring/i,
      /\btemperature/i, /\bfreezing|\bcold\b/i, /\bhot\b|\bstuffy|\bwarm\b/i, /\bventilat/i,
    ],
  },
  {
    key: 'food',
    label: 'Breakfast & food',
    patterns: [
      /\bbreakfast/i, /\bfood\b/i, /\bcoffee/i, /\btea\b/i, /\bdining/i, /\bmeals?\b/i, /\bbar\b/i,
      /\bminibar/i, /\bsnacks?\b/i, /\bcomplimentary/i,
    ],
  },
  {
    key: 'wifi',
    label: 'Wi-Fi',
    patterns: [/\bwi[ -]?fi\b/i, /\binternet\b/i, /\bwifi\b/i, /\bconnection\b/i, /\bsignal\b/i],
  },
];

export const TOPIC_LABELS: Record<string, string> = Object.fromEntries(
  TOPICS.map((t) => [t.key, t.label]),
);

/** Text that carries no content, e.g. "Nothing", "N/A", "No complaints". */
const TRIVIAL = /^(n\/?a|none|nothing( really| at all| to (dislike|complain)( about)?)?|no(thing)?( complaints?| comments?| dislikes?)?|nil|-+|\.+|all good|everything( was)? (good|fine|great))\.?!?$/i;

export function isTrivialText(text?: string | null): boolean {
  if (!text) return true;
  const t = text.trim();
  return t.length < 3 || TRIVIAL.test(t);
}

/** Returns the topic keys mentioned in `text`. Empty for trivial text. */
export function classifyText(text?: string | null): TopicKey[] {
  if (isTrivialText(text)) return [];
  const body = text as string;
  return TOPICS.filter((topic) => topic.patterns.some((p) => p.test(body))).map((t) => t.key);
}

export interface ClassifiedTopic {
  topic: TopicKey;
  polarity: 'POSITIVE' | 'NEGATIVE';
}

export function classifyReview(input: {
  positiveText?: string | null;
  negativeText?: string | null;
}): ClassifiedTopic[] {
  return [
    ...classifyText(input.positiveText).map((topic) => ({ topic, polarity: 'POSITIVE' as const })),
    ...classifyText(input.negativeText).map((topic) => ({ topic, polarity: 'NEGATIVE' as const })),
  ];
}
