import { useState } from 'react';
import styles from './styles.module.css';

const RUNS = 100;
const TOP_LOGIT = 19.8125;

const NOISE_LEVELS = [
  { label: 'None', value: 0 },
  { label: '±0.0005', value: 0.0005 },
  { label: '±0.0020', value: 0.002 },
] as const;

const TOKENS = [
  { token: 'to', completion: 'to practice every day' },
  { token: 'by', completion: 'by speaking with native speakers' },
] as const;

// Seeded PRNG so the first render is the same on the server and the client.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Each run jitters both logits by up to ±noise, then greedy decoding picks
// the larger one. Ties go to `to`, the first token.
type Run = { to: number; by: number; winner: 0 | 1 };

function simulate(gap: number, noise: number, seed: number): Run[] {
  const rand = mulberry32(seed);
  const jitter = () => (rand() * 2 - 1) * noise;
  return Array.from({ length: RUNS }, () => {
    const to = TOP_LOGIT + jitter();
    const by = TOP_LOGIT - gap + jitter();
    return { to, by, winner: by > to ? 1 : 0 };
  });
}

export default function TokenFlipSimulator() {
  const [gap, setGap] = useState(0.0005);
  const [noise, setNoise] = useState<number>(0.0005);
  const [seed, setSeed] = useState(7);
  const [picked, setPicked] = useState<number | null>(null);

  const runs = simulate(gap, noise, seed);
  const counts = [0, 1].map((t) => runs.filter((r) => r.winner === t).length);
  const distinct = counts.filter((c) => c > 0).length;

  // Until the reader picks a run, show the first flipped one if there is any.
  const firstFlip = runs.findIndex((r) => r.winner === 1);
  const selected = picked ?? (firstFlip >= 0 ? firstFlip : 0);
  const run = runs[selected];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>Near-tie Token Flip</div>
        <div className={styles.headerDesc}>
          100 simulated runs at temperature 0 after "The best way to learn a new
          language is". Each run adds illustrative logit variation.
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <div className={styles.controlHeader}>
              <span className={styles.label}>Logit gap</span>
              <span className={styles.value}>{gap.toFixed(4)}</span>
            </div>
            <input
              type="range"
              aria-label="Logit gap between to and by"
              min={0}
              max={0.003}
              step={0.0001}
              value={gap}
              onChange={(e) => setGap(+e.target.value)}
              className={styles.slider}
            />
            <span className={styles.hint}>
              How far <code>by</code> trails <code>to</code>
            </span>
          </div>
          <div className={styles.controlGroup}>
            <span className={styles.label}>Logit noise</span>
            <div className={styles.presets}>
              {NOISE_LEVELS.map((n) => (
                <button
                  type="button"
                  key={n.label}
                  className={noise === n.value ? styles.presetActive : styles.preset}
                  aria-pressed={noise === n.value}
                  onClick={() => setNoise(n.value)}
                >
                  {n.label}
                </button>
              ))}
            </div>
            <span className={styles.hint}>
              Illustrative run-to-run numerical variation
            </span>
          </div>
          <button
            type="button"
            className={styles.rerun}
            onClick={() => setSeed((s) => s + 1)}
            disabled={noise === 0}
          >
            Run again
          </button>
        </div>

        <div className={styles.logits}>
          <span className={styles.logit}>
            <code>to</code> {TOP_LOGIT.toFixed(4)}
          </span>
          <span className={styles.logit}>
            <code>by</code> {(TOP_LOGIT - gap).toFixed(4)}
          </span>
          <span className={styles.logitNote}>before noise</span>
        </div>

        <div className={styles.grid} role="group" aria-label={`${counts[0]} runs chose to, ${counts[1]} runs chose by`}>
          {runs.map((r, i) => (
            <button
              type="button"
              key={i}
              className={[
                r.winner === 0 ? styles.runTo : styles.runBy,
                i === selected ? styles.runSelected : '',
              ].join(' ')}
              aria-label={`Run ${i + 1}: ${TOKENS[r.winner].token}`}
              aria-pressed={i === selected}
              onClick={() => setPicked(i)}
            />
          ))}
        </div>

        <div className={styles.inspector}>
          <span className={styles.inspectorRun}>Run {selected + 1}</span>
          <span>
            <code>to</code> {run.to.toFixed(5)}
          </span>
          <span className={styles.vs}>vs</span>
          <span>
            <code>by</code> {run.by.toFixed(5)}
          </span>
          <span className={styles.vs}>→</span>
          <span className={run.winner === 0 ? styles.winTo : styles.winBy}>
            <code>{TOKENS[run.winner].token}</code> wins
          </span>
        </div>
        <div className={styles.rule}>
          Each run adds random noise to both logits and picks the higher one.
          The counts tally the winners. Click a square to inspect it.
        </div>

        <div className={styles.outcomes}>
          {TOKENS.map((t, i) => (
            <div key={t.token} className={styles.outcome}>
              <span className={i === 0 ? styles.swatchTo : styles.swatchBy} />
              <span className={styles.completion}>
                <code>{t.token}</code> (example: "…{t.completion}")
              </span>
              <span className={styles.count}>× {counts[i]}</span>
            </div>
          ))}
        </div>

        <div className={distinct === 1 ? styles.verdictSame : styles.verdict}>
          {distinct === 1
            ? `Same next token on all ${RUNS} runs`
            : `${distinct} different next tokens across ${RUNS} runs`}
        </div>
      </div>
    </div>
  );
}
