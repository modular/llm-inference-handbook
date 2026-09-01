import { useEffect, useRef, useState } from 'react'
import styles from './styles.module.css'

const OPS = ['+ bias', 'silu', '× scale']

/** Tick budget for each phase. Only the ratios matter. */
const LOAD = 3
const COMPUTE = 1.5
const STORE = 3

const KERNEL = LOAD + COMPUTE + STORE
const SEPARATE_END = OPS.length * KERNEL
const FUSED_END = LOAD + OPS.length * COMPUTE + STORE

const TICK_MS = 40
const TICK_STEP = 0.16

/** SVG geometry, shared by both panels so the op boxes line up. */
const BOX_X = [56, 130, 204]
const RAIL_X = [82, 156, 230]
const BOX_W = 52
const TOP_Y = 58
const BOTTOM_Y = 128

type Packet = { x: number; y: number; kind: 'load' | 'store' }

const up = (p: number) => BOTTOM_Y + (TOP_Y - BOTTOM_Y) * p
const down = (p: number) => TOP_Y + (BOTTOM_Y - TOP_Y) * p

function Stage({
  packets,
  active,
  done,
  rails,
  chained,
  idle
}: {
  packets: Packet[]
  active: number
  done: number
  rails: number[]
  chained: boolean
  idle: boolean
}) {
  return (
    <svg
      className={styles.stage}
      viewBox="0 0 280 166"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={
        chained
          ? 'One kernel loads once, chains three stages in registers, and stores once'
          : 'Three kernels, each loading from HBM, computing, and storing back'
      }
    >
      <rect className={styles.band} x="8" y="14" width="264" height="40" rx="6" />
      <text className={styles.bandLabel} x="20" y="39">
        SM
      </text>
      <rect className={styles.band} x="8" y="118" width="264" height="40" rx="6" />
      <text className={styles.bandLabel} x="20" y="143">
        HBM
      </text>

      {rails.map((x) => (
        <line className={styles.rail} key={x} x1={x} y1="56" x2={x} y2="120" />
      ))}

      {chained &&
        BOX_X.slice(0, -1).map((x, i) => (
          <text className={styles.chainArrow} key={i} x={x + BOX_W + 11} y="38">
            ›
          </text>
        ))}

      {OPS.map((label, i) => (
        <g key={label}>
          <rect
            className={`${styles.opBox} ${i === active ? styles.opActive : ''} ${i < done ? styles.opDone : ''}`}
            x={BOX_X[i]}
            y="21"
            width={BOX_W}
            height="26"
            rx="4"
          />
          <text
            className={`${styles.opLabel} ${i === active ? styles.opLabelActive : ''}`}
            x={BOX_X[i] + BOX_W / 2}
            y="38"
          >
            {label}
          </text>
        </g>
      ))}

      {idle && (
        <text className={styles.idleLabel} x="156" y="95">
          idle
        </text>
      )}

      {packets.map((packet, i) => (
        <rect
          className={`${styles.packet} ${packet.kind === 'load' ? styles.load : styles.store}`}
          key={i}
          x={packet.x - 8}
          y={packet.y}
          width="16"
          height="20"
          rx="3"
        />
      ))}
    </svg>
  )
}

export default function KernelFusionVisualizer() {
  const [t, setT] = useState(SEPARATE_END)
  const [running, setRunning] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const autoplayed = useRef(false)

  // Play once when the reader scrolls it into view.
  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || autoplayed.current) return
        autoplayed.current = true
        setT(0)
        setRunning(true)
      },
      { threshold: 0.35 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setT((prev) => {
        if (prev >= SEPARATE_END) {
          setRunning(false)
          return SEPARATE_END
        }
        return prev + TICK_STEP
      })
    }, TICK_MS)
    return () => clearInterval(id)
  }, [running])

  function replay() {
    autoplayed.current = true
    setT(0)
    setRunning(true)
  }

  // Separate kernels: one load, one compute, one store per op.
  const separatePackets: Packet[] = []
  let separateActive = -1
  let separateDone = 0
  let separateTrips = 0

  OPS.forEach((_, i) => {
    const start = i * KERNEL
    const computeAt = start + LOAD
    const storeAt = computeAt + COMPUTE

    if (t >= start && t < computeAt) {
      separatePackets.push({
        x: RAIL_X[i],
        y: up((t - start) / LOAD),
        kind: 'load'
      })
    } else if (t >= computeAt) {
      separateTrips += 1
    }

    if (t >= computeAt && t < storeAt) separateActive = i
    if (t >= storeAt) separateDone = i + 1

    if (t >= storeAt && t < start + KERNEL) {
      separatePackets.push({
        x: RAIL_X[i],
        y: down((t - storeAt) / STORE),
        kind: 'store'
      })
    } else if (t >= start + KERNEL) {
      separateTrips += 1
    }
  })

  // Fused: load once, chain every op in registers, store once.
  const fusedPackets: Packet[] = []
  const fusedStoreAt = LOAD + OPS.length * COMPUTE

  if (t < LOAD) {
    fusedPackets.push({ x: RAIL_X[0], y: up(t / LOAD), kind: 'load' })
  }
  if (t >= fusedStoreAt && t < FUSED_END) {
    fusedPackets.push({
      x: RAIL_X[2],
      y: down((t - fusedStoreAt) / STORE),
      kind: 'store'
    })
  }

  const fusedActive =
    t >= LOAD && t < fusedStoreAt ? Math.floor((t - LOAD) / COMPUTE) : -1
  const fusedDone =
    t >= fusedStoreAt ? OPS.length : Math.max(0, Math.ceil((t - LOAD) / COMPUTE))
  const fusedTrips = (t >= LOAD ? 1 : 0) + (t >= FUSED_END ? 1 : 0)

  return (
    <div className={styles.container} ref={rootRef}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>Kernel Fusion Visualizer</div>
        <div className={styles.headerDescription}>
          Each separate kernel makes its own round trip to HBM. Fusing them
          keeps the intermediates in registers, so the data is loaded once and
          stored once.
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.topRow}>
          <code className={styles.expr}>y = silu(h + bias) * scale</code>
          <button type="button" className={styles.replay} onClick={replay}>
            {running ? 'Playing' : 'Replay'}
          </button>
        </div>

        <div className={styles.panels}>
          <div className={styles.panel}>
            <div className={styles.panelHead}>Separate kernels</div>
            <Stage
              packets={separatePackets}
              active={separateActive}
              done={separateDone}
              rails={RAIL_X}
              chained={false}
              idle={false}
            />
            <div className={styles.caption}>
              <span>3 launches</span>
              <span className={styles.trips}>{separateTrips} HBM trips</span>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHead}>Fused kernel</div>
            <Stage
              packets={fusedPackets}
              active={fusedActive}
              done={fusedDone}
              rails={[RAIL_X[0], RAIL_X[2]]}
              chained
              idle={t >= FUSED_END && t < SEPARATE_END}
            />
            <div className={styles.caption}>
              <span>1 launch</span>
              <span className={styles.trips}>{fusedTrips} HBM trips</span>
            </div>
          </div>
        </div>

        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={`${styles.swatch} ${styles.load}`} aria-hidden="true" />
            Load
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.swatch} ${styles.computeSwatch}`} aria-hidden="true" />
            Compute
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.swatch} ${styles.store}`} aria-hidden="true" />
            Store
          </span>
        </div>

        <div className={styles.readout}>
          <span className={styles.metricValue}>3×</span>
          <span className={styles.metricText}>
            less HBM traffic for the same math. Six trips become two, and the
            two intermediates never exist in memory.
          </span>
        </div>
      </div>
    </div>
  )
}
