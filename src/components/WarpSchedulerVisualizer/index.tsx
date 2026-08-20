import { type CSSProperties, useState } from 'react'
import styles from './styles.module.css'

const MEMORY_WAIT = 5
const WARP_PERIOD = MEMORY_WAIT + 1
const CYCLES = 12

const SCENARIOS = [
  { warps: 2, label: 'Too few', detail: '2 warps' },
  { warps: 6, label: 'Enough', detail: '6 warps' },
  { warps: 9, label: 'Extra', detail: '9 warps' }
]

type CellState = 'issuing' | 'memory' | 'ready'

function stateLabel(state: CellState) {
  if (state === 'issuing') return 'Issue'
  if (state === 'ready') return 'Ready'
  return ''
}

export default function WarpSchedulerVisualizer() {
  const [warps, setWarps] = useState(2)
  const period = Math.max(WARP_PERIOD, warps)
  const utilization = Math.min(warps, WARP_PERIOD) / WARP_PERIOD

  function cellState(warp: number, cycle: number): CellState {
    if (cycle < warp) return 'ready'

    const sinceIssue = (cycle - warp) % period
    if (sinceIssue === 0) return 'issuing'
    if (sinceIssue <= MEMORY_WAIT) return 'memory'
    return 'ready'
  }

  function issueOwner(cycle: number): number | null {
    const slot = cycle % period
    return slot < warps ? slot : null
  }

  const summary =
    warps < WARP_PERIOD
      ? {
          title: 'Idle gaps remain',
          text: `Only ${warps} of every ${WARP_PERIOD} issue slots are used. Once each warp has issued, the scheduler has no ready work left.`
        }
      : warps === WARP_PERIOD
        ? {
            title: 'Memory latency is covered',
            text: 'When one warp starts waiting, another warp is ready. Every issue slot stays busy.'
          }
        : {
            title: 'A ready queue forms',
            text: `${WARP_PERIOD} warps already fill every issue slot. The extra ${warps - WARP_PERIOD} become ready before the scheduler can choose them.`
          }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>Warp Scheduler Visualizer</div>
        <div className={styles.headerDescription}>
          A scheduler issues at most one instruction per cycle, and can only
          pick a warp that is ready. A warp that reads memory isn&rsquo;t ready
          again until its data arrives &mdash; tens of cycles on an L1 hit,
          hundreds on an HBM miss, fixed at {MEMORY_WAIT} here. More resident
          warps give the scheduler something to run in those gaps.
        </div>
      </div>

      <div className={styles.body}>
        <div>
          <div className={styles.sectionLabel}>Choose a scenario</div>
          <div
            className={styles.scenarios}
            role="group"
            aria-label="Resident warp scenario"
          >
            {SCENARIOS.map((scenario) => (
              <button
                key={scenario.warps}
                type="button"
                className={`${styles.scenario} ${warps === scenario.warps ? styles.scenarioActive : ''}`}
                aria-pressed={warps === scenario.warps}
                onClick={() => setWarps(scenario.warps)}
              >
                <span className={styles.scenarioLabel}>{scenario.label}</span>
                <span className={styles.scenarioDetail}>{scenario.detail}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.rule}>
          <span className={styles.ruleLabel}>Each warp repeats</span>
          <span className={`${styles.ruleStep} ${styles.ruleIssue}`}>
            <strong>1 cycle</strong> issue
          </span>
          <span className={styles.ruleArrow}>→</span>
          <span className={`${styles.ruleStep} ${styles.ruleMemory}`}>
            <strong>{MEMORY_WAIT} cycles</strong> memory wait
          </span>
          <span className={styles.ruleArrow}>→</span>
          <span className={`${styles.ruleStep} ${styles.ruleReady}`}>
            ready again
          </span>
        </div>

        <div className={styles.rule}>
          <span className={styles.ruleLabel}>Each scheduler picks</span>
          <span>
            <strong>at most one warp per cycle</strong>, so a warp that turns
            ready while the scheduler is busy has to wait its turn. A warp
            picked the moment it turns ready shows Issue, so Ready only marks a
            cycle spent waiting for a free slot.
          </span>
        </div>

        <div
          className={styles.timeline}
          aria-label={`Schedule for ${warps} resident warps`}
        >
          <div
            className={styles.timelineInner}
            style={{ '--cycles': CYCLES } as CSSProperties}
          >
            <div className={styles.cycleRow}>
              <span className={styles.axisLabel}>Cycle</span>
              <div className={styles.cycleCells}>
                {Array.from({ length: CYCLES }, (_, cycle) => (
                  <span key={cycle}>{cycle + 1}</span>
                ))}
              </div>
            </div>

            {Array.from({ length: warps }, (_, warp) => (
              <div className={styles.row} key={warp}>
                <span className={styles.rowLabel}>Warp {warp + 1}</span>
                <div className={styles.cells}>
                  {Array.from({ length: CYCLES }, (_, cycle) => {
                    const state = cellState(warp, cycle)
                    const label = stateLabel(state)

                    return (
                      <span
                        key={cycle}
                        className={`${styles.cell} ${styles[state]}`}
                        aria-label={`Warp ${warp + 1}, cycle ${cycle + 1}: ${state === 'memory' ? 'waiting on memory' : label.toLowerCase()}`}
                        title={
                          state === 'memory'
                            ? `Warp ${warp + 1} waits on memory`
                            : state === 'issuing'
                              ? `Warp ${warp + 1} issues an instruction`
                              : `Warp ${warp + 1} is ready`
                        }
                      >
                        {label}
                      </span>
                    )
                  })}
                </div>
              </div>
            ))}

            <div className={`${styles.row} ${styles.schedulerRow}`}>
              <span className={styles.rowLabel}>Scheduler</span>
              <div className={styles.cells}>
                {Array.from({ length: CYCLES }, (_, cycle) => {
                  const owner = issueOwner(cycle)

                  return (
                    <span
                      key={cycle}
                      className={`${styles.slot} ${owner === null ? styles.slotIdle : styles.slotUsed}`}
                    >
                      {owner === null ? 'Idle' : `W${owner + 1}`}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.readout}>
          <div className={styles.metric}>
            <span className={styles.metricValue}>
              {Math.round(utilization * 100)}%
            </span>
            <span className={styles.metricLabel}>scheduler busy</span>
          </div>
          <div>
            <div className={styles.summaryTitle}>{summary.title}</div>
            <p className={styles.summaryText}>{summary.text}</p>
          </div>
        </div>

        <div className={styles.note}>
          This is a simplified model: the timeline starts with every resident warp
          ready, every warp waits the same number of cycles, and real kernels stall
          on instruction dependencies too, not memory alone. The
          one-instruction-per-cycle limit belongs to a single scheduler, not to
          the whole SM. An H100 SM has four, each with its own issue slot.
        </div>
      </div>
    </div>
  )
}
