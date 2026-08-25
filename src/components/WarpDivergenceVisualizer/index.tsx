import { type CSSProperties, useState } from 'react'
import styles from './styles.module.css'

const WARP_SIZE = 32

type Lang = 'cuda' | 'mojo'

const LANGS: { id: Lang; label: string }[] = [
  { id: 'cuda', label: 'CUDA' },
  { id: 'mojo', label: 'Mojo' }
]

/** Most branch tags read the same in both languages. */
const both = (tag: string) => ({ cuda: tag, mojo: tag })

type Scenario = {
  id: string
  label: string
  predicate: string
  code: Record<Lang, string>
  paths: { tag: Record<Lang, string>; mask: (tid: number) => boolean }[]
  title: string
  text: string
}

const SCENARIOS: Scenario[] = [
  {
    id: 'uniform',
    label: 'Uniform',
    predicate: 'all threads',
    code: {
      cuda: `// scale is the same for every thread
if (scale > 0.0f)
  out[tid] = a[tid] * scale;`,
      mojo: `# scale is the same for every thread
if scale > 0:
    out[tid] = a[tid] * scale`
    },
    paths: [{ tag: both('if'), mask: () => true }],
    title: 'No divergence',
    text: 'Every thread takes the same path, so the warp issues the body once with all 32 lanes active. A branch only costs something when it splits the warp.'
  },
  {
    id: 'half',
    label: 'Two-way',
    predicate: 'tid < 16',
    code: {
      cuda: `if (tid < 16)
  out[tid] = a[tid];
else
  out[tid] = b[tid];`,
      mojo: `if tid < 16:
    out[tid] = a[tid]
else:
    out[tid] = b[tid]`
    },
    paths: [
      { tag: both('if'), mask: (tid) => tid < 16 },
      { tag: both('else'), mask: (tid) => tid >= 16 }
    ],
    title: 'The body runs twice',
    text: 'The warp issues each path separately. While one path runs, the 16 threads on the other are masked off and sit idle.'
  },
  {
    id: 'alternating',
    label: 'Alternating',
    predicate: 'tid % 2 == 0',
    code: {
      cuda: `if (tid % 2 == 0)
  out[tid] = a[tid];
else
  out[tid] = b[tid];`,
      mojo: `if tid % 2 == 0:
    out[tid] = a[tid]
else:
    out[tid] = b[tid]`
    },
    paths: [
      { tag: both('if'), mask: (tid) => tid % 2 === 0 },
      { tag: both('else'), mask: (tid) => tid % 2 !== 0 }
    ],
    title: 'Same cost, different lanes',
    text: 'Interleaving the threads changes nothing. The cost follows the number of distinct paths, not which threads take them.'
  },
  {
    id: 'three',
    label: 'Three-way',
    predicate: 'tid % 3',
    code: {
      cuda: `if (tid % 3 == 0)
  out[tid] = a[tid];
else if (tid % 3 == 1)
  out[tid] = b[tid];
else
  out[tid] = c[tid];`,
      mojo: `if tid % 3 == 0:
    out[tid] = a[tid]
elif tid % 3 == 1:
    out[tid] = b[tid]
else:
    out[tid] = c[tid]`
    },
    paths: [
      { tag: both('if'), mask: (tid) => tid % 3 === 0 },
      { tag: { cuda: 'else if', mojo: 'elif' }, mask: (tid) => tid % 3 === 1 },
      { tag: both('else'), mask: (tid) => tid % 3 === 2 }
    ],
    title: 'Three serialized passes',
    text: 'Each extra path adds another pass. Thirty-two threads do not divide evenly by three, so one pass covers 10 lanes and the others 11. A partial pass costs the same as a full one.'
  }
]

export default function WarpDivergenceVisualizer() {
  const [selected, setSelected] = useState(SCENARIOS[0].id)
  const [lang, setLang] = useState<Lang>('cuda')
  const scenario = SCENARIOS.find((s) => s.id === selected) ?? SCENARIOS[0]

  const masks = scenario.paths.map((path) =>
    Array.from({ length: WARP_SIZE }, (_, tid) => path.mask(tid))
  )
  const activeLanes = masks.reduce(
    (sum, mask) => sum + mask.filter(Boolean).length,
    0
  )
  const utilization = activeLanes / (masks.length * WARP_SIZE)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>Warp Divergence Visualizer</div>
        <div className={styles.headerDescription}>
          A warp issues one instruction at a time for all 32 of its threads.
          When a branch sends those threads down different paths, the warp runs
          each path separately, and the threads on every other path are
          masked off and sit idle.
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.sectionLabel}>Choose a branch</div>
        <div
          className={styles.scenarios}
          role="group"
          aria-label="Branch pattern"
        >
          {SCENARIOS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`${styles.scenario} ${option.id === selected ? styles.scenarioActive : ''}`}
              aria-pressed={option.id === selected}
              onClick={() => setSelected(option.id)}
            >
              <span className={styles.scenarioLabel}>{option.label}</span>
              <span className={styles.scenarioDetail}>{option.predicate}</span>
            </button>
          ))}
        </div>

        <div className={styles.codePanel}>
          <div className={styles.langTabs} role="group" aria-label="Language">
            {LANGS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`${styles.langTab} ${option.id === lang ? styles.langTabActive : ''}`}
                aria-pressed={option.id === lang}
                onClick={() => setLang(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <pre className={styles.code}>
            <code>{scenario.code[lang]}</code>
          </pre>
        </div>

        <div
          className={styles.lanes}
          aria-label={`Warp execution for the ${scenario.label} branch`}
        >
          <div
            className={styles.lanesInner}
            style={{ '--lanes': WARP_SIZE } as CSSProperties}
          >
            <div className={styles.axisRow}>
              <span className={styles.axisTitle}>Thread</span>
              <div className={styles.cells}>
                {Array.from({ length: WARP_SIZE }, (_, tid) => (
                  <span key={tid}>{tid % 8 === 0 ? tid : ''}</span>
                ))}
              </div>
              <span className={styles.axisCount}>Active</span>
            </div>

            {masks.map((mask, pass) => {
              const tag = scenario.paths[pass].tag[lang]
              const count = mask.filter(Boolean).length

              return (
                <div className={styles.passRow} key={pass}>
                  <span className={styles.passLabel}>
                    Pass {pass + 1}{' '}
                    <span className={styles.passTag}>{tag}</span>
                  </span>
                  <div className={styles.cells}>
                    {mask.map((active, tid) => (
                      <span
                        key={tid}
                        className={`${styles.lane} ${active ? styles.laneActive : styles.laneIdle}`}
                        title={
                          active
                            ? `Thread ${tid} runs ${tag}`
                            : `Thread ${tid} is masked off`
                        }
                      />
                    ))}
                  </div>
                  <span className={styles.passCount}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className={styles.readout}>
          <div className={styles.metric}>
            <span className={styles.metricValue}>
              {Math.round(utilization * 100)}%
            </span>
            <span className={styles.metricLabel}>lanes busy</span>
          </div>
          <div>
            <div className={styles.summaryTitle}>{scenario.title}</div>
            <p className={styles.summaryText}>{scenario.text}</p>
          </div>
        </div>

        <div className={styles.note}>
          Each path is shown here as a single instruction. Real cost scales with
          the work inside each path, so a short divergent branch is cheap and a
          long one is not.
        </div>
      </div>
    </div>
  )
}
