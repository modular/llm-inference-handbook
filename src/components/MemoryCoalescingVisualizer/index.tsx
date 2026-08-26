import { useState } from 'react'
import styles from './styles.module.css'

const WARP = 32
const BYTES_PER_ELEMENT = 4
const SECTOR_BYTES = 32
const ELEMENTS_PER_SECTOR = SECTOR_BYTES / BYTES_PER_ELEMENT
const BYTES_REQUESTED = WARP * BYTES_PER_ELEMENT
const MIN_SECTORS = BYTES_REQUESTED / SECTOR_BYTES

/** A fixed scatter so the random case is reproducible across renders. */
const SCATTERED = [
  10, 12, 24, 25, 40, 61, 71, 91, 92, 94, 97, 118, 124, 135, 137, 159, 163, 176,
  215, 220, 228, 282, 295, 301, 307, 313, 333, 350, 359, 362, 375, 378
]

type Pattern = {
  id: string
  label: string
  expr: string
  index: (tid: number) => number
  title: string
  text: string
}

const PATTERNS: Pattern[] = [
  {
    id: 'contiguous',
    label: 'Contiguous',
    expr: 'a[tid]',
    index: (tid) => tid,
    title: 'Four sectors carry every requested byte',
    text: 'Adjacent threads read adjacent float32 values. Eight values fit in each sector, so four sectors carry all 32 values with no unused bytes.'
  },
  {
    id: 'misaligned',
    label: 'Misaligned',
    expr: 'a[tid + 1]',
    index: (tid) => tid + 1,
    title: 'One-value offset adds a sector',
    text: 'The values remain adjacent, but the first value begins 4 bytes into a sector. The request crosses five sectors and transfers 32 unused bytes.'
  },
  {
    id: 'strided',
    label: 'Strided',
    expr: 'a[tid * 2]',
    index: (tid) => tid * 2,
    title: 'Stride 2 doubles the transfer',
    text: 'Every thread skips one float32 value. The warp spans eight sectors and uses 16 bytes from each, so 128 of 256 transferred bytes are useful.'
  },
  {
    id: 'scattered',
    label: 'Scattered',
    expr: 'a[idx[tid]]',
    index: (tid) => SCATTERED[tid],
    title: 'Scattered indices need 28 sectors',
    text: 'The 32 indices touch 28 separate sectors. The GPU transfers 896 bytes to return 128 useful bytes, so most of the transferred data goes unused.'
  }
]

/** SVG geometry. */
const VIEW_W = 540
const MARGIN = 10
const INNER_W = VIEW_W - MARGIN * 2
const LANE_Y = 4
const LANE_H = 18
const SECTOR_Y = 76
const SECTOR_H = 30

export default function MemoryCoalescingVisualizer() {
  const [selected, setSelected] = useState(PATTERNS[0].id)
  const pattern = PATTERNS.find((p) => p.id === selected) ?? PATTERNS[0]

  const addresses = Array.from(
    { length: WARP },
    (_, tid) => pattern.index(tid) * BYTES_PER_ELEMENT
  )
  const laneSector = addresses.map((addr) => Math.floor(addr / SECTOR_BYTES))

  // Every distinct sector the warp touches has to be fetched in full.
  const fetched = laneSector
    .filter((sector, i, all) => all.indexOf(sector) === i)
    .sort((a, b) => a - b)

  const slotsUsed: boolean[][] = fetched.map(() =>
    Array.from({ length: ELEMENTS_PER_SECTOR }, () => false)
  )
  addresses.forEach((addr) => {
    const column = fetched.indexOf(Math.floor(addr / SECTOR_BYTES))
    slotsUsed[column][(addr % SECTOR_BYTES) / BYTES_PER_ELEMENT] = true
  })

  const bytesFetched = fetched.length * SECTOR_BYTES
  const efficiency = BYTES_REQUESTED / bytesFetched

  const laneStep = INNER_W / WARP
  const sectorStep = INNER_W / fetched.length
  const sectorW = Math.max(sectorStep - 2, 2)
  // Individual slots only stay legible while the boxes are wide.
  const showSlots = fetched.length <= ELEMENTS_PER_SECTOR

  const laneCenter = (tid: number) => MARGIN + tid * laneStep + laneStep / 2
  const sectorX = (column: number) => MARGIN + column * sectorStep
  const sectorCenter = (column: number) => sectorX(column) + sectorW / 2

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>Memory Coalescing Visualizer</div>
        <div className={styles.headerDescription}>
          A sector is an aligned 32-byte region of global memory. Each thread
          loads one float32 value, or 4 bytes, so one sector can hold eight
          requested values. Choose a pattern to compare transferred and useful
          bytes.
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.sectionLabel}>Choose an access pattern</div>
        <div className={styles.patterns} role="group" aria-label="Access pattern">
          {PATTERNS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`${styles.pattern} ${option.id === selected ? styles.patternActive : ''}`}
              aria-pressed={option.id === selected}
              onClick={() => setSelected(option.id)}
            >
              <span className={styles.patternLabel}>{option.label}</span>
              <span className={styles.patternExpr}>{option.expr}</span>
            </button>
          ))}
        </div>

        <div className={styles.stageLabel}>
          Warp request · 32 threads × one float32 value (4 B)
        </div>

        <svg
          className={styles.stage}
          viewBox={`0 0 ${VIEW_W} 112`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`${pattern.label} access: 32 threads map onto ${fetched.length} sectors, ${Math.round(efficiency * 100)} percent of transferred bytes used`}
        >
          {laneSector.map((sector, tid) => (
            <line
              className={styles.wire}
              key={tid}
              x1={laneCenter(tid)}
              y1={LANE_Y + LANE_H}
              x2={sectorCenter(fetched.indexOf(sector))}
              y2={SECTOR_Y}
            />
          ))}

          {Array.from({ length: WARP }, (_, tid) => (
            <rect
              className={styles.lane}
              key={tid}
              x={MARGIN + tid * laneStep}
              y={LANE_Y}
              width={Math.max(laneStep - 2, 1)}
              height={LANE_H}
              rx="2"
            />
          ))}

          {fetched.map((sector, column) => {
            const used = slotsUsed[column].filter(Boolean).length
            const innerX = sectorX(column) + 3
            const innerW = sectorW - 6
            const slotW = innerW / ELEMENTS_PER_SECTOR
            const usedW = (innerW * used) / ELEMENTS_PER_SECTOR
            const unusedW = innerW - usedW

            return (
              <g key={sector}>
                <rect
                  className={styles.sector}
                  x={sectorX(column)}
                  y={SECTOR_Y}
                  width={sectorW}
                  height={SECTOR_H}
                  rx="3"
                >
                  <title>
                    {`Bytes ${sector * SECTOR_BYTES}–${(sector + 1) * SECTOR_BYTES - 1} · ${used} of ${ELEMENTS_PER_SECTOR} elements used`}
                  </title>
                </rect>

                {showSlots ? (
                  slotsUsed[column].map((isUsed, slot) => (
                    <rect
                      className={`${styles.slot} ${isUsed ? styles.slotUsed : styles.slotWaste}`}
                      key={slot}
                      x={innerX + slot * slotW}
                      y={SECTOR_Y + 3}
                      width={Math.max(slotW - 1.5, 1)}
                      height={SECTOR_H - 6}
                      rx="1.5"
                    />
                  ))
                ) : (
                  <>
                    <rect
                      className={`${styles.slot} ${styles.slotUsed}`}
                      x={innerX}
                      y={SECTOR_Y + 3}
                      width={usedW}
                      height={SECTOR_H - 6}
                      rx="1.5"
                    />
                    {unusedW > 0 && (
                      <rect
                        className={`${styles.slot} ${styles.slotWaste}`}
                        x={innerX + usedW}
                        y={SECTOR_Y + 3}
                        width={unusedW}
                        height={SECTOR_H - 6}
                        rx="1.5"
                      />
                    )}
                  </>
                )}
              </g>
            )
          })}
        </svg>

        <div className={styles.stageFoot}>
          <span>Global memory · each box is one 32 B sector</span>
          <span className={styles.stats}>
            {fetched.length} sectors · {BYTES_REQUESTED} B requested ·{' '}
            {bytesFetched} B transferred
          </span>
        </div>

        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={`${styles.swatch} ${styles.swatchUsed}`} aria-hidden="true" />
            requested bytes
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.swatch} ${styles.swatchWaste}`} aria-hidden="true" />
            transferred but unused
          </span>
        </div>

        <div className={styles.readout} aria-live="polite">
          <div className={styles.metric}>
            <span className={styles.metricValue}>
              {Math.round(efficiency * 100)}%
            </span>
            <span className={styles.metricLabel}>useful-byte ratio</span>
            <span className={styles.metricFormula}>
              {BYTES_REQUESTED} B ÷ {bytesFetched} B
            </span>
          </div>
          <div>
            <div className={styles.summaryTitle}>{pattern.title}</div>
            <p className={styles.summaryText}>{pattern.text}</p>
          </div>
        </div>

        <div className={styles.note}>
          For 32 distinct float32 values, {MIN_SECTORS} sectors is the minimum:
          32 threads × 4 B = {BYTES_REQUESTED} B, and each sector carries 32 B.
          Data layout, alignment, and thread-to-data mapping determine the
          sector count.
        </div>
      </div>
    </div>
  )
}
