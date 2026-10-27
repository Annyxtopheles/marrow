export interface ProseCadenceMetrics {
  wordCount: number;
  sentenceCount: number;
  avgSentenceWords: number;
  sentenceLengths: number[];
  rhythmDistribution: {
    short: number; // <= 8 words
    medium: number; // 9 - 20 words
    long: number; // >= 21 words
  };
  pacingLabel: string;
  dialogueRatio: number; // 0 - 100%
  adverbCount: number;
  adverbExamples: string[];
  wordEchoes: Array<{ word: string; count: number }>;
}

const NON_ADVERB_LY = new Set([
  'only',
  'early',
  'family',
  'belly',
  'supply',
  'reply',
  'apply',
  'holy',
  'folly',
  'ally',
  'bully',
  'rally',
  'tally',
  'lily',
  'jelly',
  'chilly',
  'friendly',
  'lonely',
  'lovely',
  'likely',
  'unlikely',
  'timely',
  'orderly',
  'elderly',
  'deadly',
  'ghostly',
  'costly',
  'ghastly',
  'anomaly',
  'monopoly',
  'assembly',
  'homily',
  'multiply',
  'comply',
  'imply',
  'rely',
  'underbelly',
  'firefly',
  'butterfly',
  'dragonfly',
  'panoply',
  'melancholy',
]);

const STOPWORDS = new Set([
  'about',
  'above',
  'after',
  'again',
  'against',
  'almost',
  'along',
  'already',
  'always',
  'among',
  'another',
  'around',
  'because',
  'before',
  'behind',
  'being',
  'below',
  'Beneath',
  'beneath',
  'beside',
  'between',
  'beyond',
  'could',
  'didnt',
  'doesnt',
  'doing',
  'during',
  'either',
  'enough',
  'every',
  'everything',
  'found',
  'Going',
  'going',
  'having',
  'heard',
  'herself',
  'himself',
  'however',
  'inside',
  'itself',
  'known',
  'later',
  'least',
  'leave',
  'might',
  'myself',
  'never',
  'nothing',
  'often',
  'other',
  'others',
  'outside',
  'perhaps',
  'place',
  'quite',
  'rather',
  'really',
  'right',
  'seemed',
  'several',
  'shall',
  'should',
  'since',
  'small',
  'something',
  'sometimes',
  'still',
  'their',
  'theirs',
  'there',
  'these',
  'thing',
  'things',
  'think',
  'those',
  'though',
  'thought',
  'three',
  'through',
  'together',
  'toward',
  'towards',
  'under',
  'until',
  'water',
  'where',
  'which',
  'while',
  'whole',
  'without',
  'would',
  'wouldnt',
  'years',
  'young',
]);

export const analyzeProseCadence = (html: string): ProseCadenceMetrics => {
  const plain = html
    .replace(/<\/(p|h1|h2|h3|blockquote|li|div)>/gi, '. ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();

  if (!plain) {
    return {
      wordCount: 0,
      sentenceCount: 0,
      avgSentenceWords: 0,
      sentenceLengths: [],
      rhythmDistribution: { short: 0, medium: 0, long: 0 },
      pacingLabel: 'Awaiting Prose',
      dialogueRatio: 0,
      adverbCount: 0,
      adverbExamples: [],
      wordEchoes: [],
    };
  }

  const allWords = plain
    .split(/\s+/)
    .map((w) => w.replace(/^[^a-zA-Z0-9']+|[^a-zA-Z0-9']+$/g, ''))
    .filter(Boolean);

  const wordCount = allWords.length;

  // Split into sentences
  const rawSentences = plain
    .split(/(?<=[.!?…]+)\s+/)
    .map((s) => s.trim())
    .filter((s) => /[a-zA-Z0-9]/.test(s));

  const sentenceLengths: number[] = [];
  let short = 0;
  let medium = 0;
  let long = 0;

  for (const s of rawSentences) {
    const wc = s
      .split(/\s+/)
      .map((w) => w.replace(/[^a-zA-Z0-9']/g, ''))
      .filter(Boolean).length;
    if (wc === 0) continue;
    sentenceLengths.push(wc);
    if (wc <= 8) short++;
    else if (wc <= 20) medium++;
    else long++;
  }

  const sentenceCount = sentenceLengths.length;
  const avgSentenceWords =
    sentenceCount > 0 ? Math.round((wordCount / sentenceCount) * 10) / 10 : 0;

  // Compute standard deviation of sentence lengths to evaluate cadence variety
  let variance = 0;
  if (sentenceCount > 1) {
    const mean = wordCount / sentenceCount;
    variance =
      sentenceLengths.reduce((acc, len) => acc + Math.pow(len - mean, 2), 0) / sentenceCount;
  }
  const stdDev = Math.sqrt(variance);

  let pacingLabel = 'Balanced & Varied';
  if (sentenceCount < 3) {
    pacingLabel = 'Opening Beats';
  } else if (avgSentenceWords <= 10.5) {
    pacingLabel = 'Brisk & Staccato';
  } else if (avgSentenceWords >= 22) {
    pacingLabel = 'Lyrical & Expansive';
  } else if (stdDev < 3.5) {
    pacingLabel = 'Steady & Uniform';
  } else if (stdDev >= 7.5) {
    pacingLabel = 'Dynamic Contrast';
  }

  // Dialogue ratio: count words inside "..." or “...”
  const dialogueMatches = plain.match(/(?:"[^"]*"|“[^”]*”)/g) || [];
  const dialogueWordCount = dialogueMatches.reduce((sum, segment) => {
    const wordsInQuote = segment
      .replace(/["“”]/g, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    return sum + wordsInQuote;
  }, 0);
  const dialogueRatio =
    wordCount > 0 ? Math.min(100, Math.round((dialogueWordCount / wordCount) * 100)) : 0;

  // Adverbs (-ly words)
  let adverbCount = 0;
  const adverbSet = new Set<string>();
  const lowerWords = allWords.map((w) => w.toLowerCase().replace(/[^a-z]/g, ''));

  for (const lw of lowerWords) {
    if (lw.length >= 5 && lw.endsWith('ly') && !NON_ADVERB_LY.has(lw)) {
      adverbCount++;
      if (adverbSet.size < 6) {
        adverbSet.add(lw);
      }
    }
  }

  // Proximity Word Echoes: words >= 5 chars repeated within a 45-word sliding window
  const echoCounts = new Map<string, number>();
  const windowSize = 45;
  for (let i = 0; i < lowerWords.length; i++) {
    const w = lowerWords[i];
    if (w.length < 5 || STOPWORDS.has(w)) continue;

    let repeatsInWindow = 0;
    const limit = Math.min(lowerWords.length, i + windowSize);
    for (let j = i + 1; j < limit; j++) {
      if (lowerWords[j] === w) {
        repeatsInWindow++;
      }
    }
    if (repeatsInWindow > 0) {
      echoCounts.set(w, (echoCounts.get(w) || 1) + 1);
    }
  }

  const wordEchoes = Array.from(echoCounts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    wordCount,
    sentenceCount,
    avgSentenceWords,
    sentenceLengths: sentenceLengths.slice(-42),
    rhythmDistribution: { short, medium, long },
    pacingLabel,
    dialogueRatio,
    adverbCount,
    adverbExamples: Array.from(adverbSet),
    wordEchoes,
  };
};
