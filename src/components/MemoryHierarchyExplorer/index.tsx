import { type CSSProperties, useState } from 'react'
import styles from './styles.module.css'

type LevelId = 'registers' | 'shared' | 'l1' | 'l2' | 'hbm'

interface Level {
  id: LevelId
  label: string
  location: string
  scope: string
  explanation: string
  color: string
  tint: string
}

const LEVELS: Level[] = [
  {
    id: 'registers',
    label: 'Registers',
    location: 'Inside an SM',
    scope: 'One thread',
    explanation:
      "Private storage for each thread. Other threads can't directly access another thread's registers and must communicate through shared memory, global memory, or warp shuffles.",
    color: '#7c3aed',
    tint: 'rgba(124, 58, 237, 0.14)'
  },
  {
    id: 'shared',
    label: 'Shared memory',
    location: 'Inside an SM',
    scope: 'One block',
    explanation:
      'Threads in one block can cooperate on a tile and reuse the same data before the block finishes.',
    color: '#2563eb',
    tint: 'rgba(37, 99, 235, 0.13)'
  },
  {
    id: 'l1',
    label: 'L1 cache',
    location: 'Inside an SM',
    scope: 'One SM',
    explanation:
      'Hardware can serve a cached line to work running on the same SM without another trip down the hierarchy.',
    color: '#0891b2',
    tint: 'rgba(8, 145, 178, 0.13)'
  },
  {
    id: 'l2',
    label: 'L2 cache',
    location: 'On the GPU die',
    scope: 'Every SM',
    explanation:
      'One shared cache can capture reuse across blocks and SMs before a request reaches off-chip memory.',
    color: '#d97706',
    tint: 'rgba(217, 119, 6, 0.14)'
  },
  {
    id: 'hbm',
    label: 'HBM',
    location: 'Off-chip',
    scope: 'The full GPU',
    explanation:
      'Large tensors live here. An L2 miss requires fetching data from off-chip HBM. Tiling and fusion reduce these round-trips.',
    color: '#ea580c',
    tint: 'rgba(234, 88, 12, 0.14)'
  }
]

const SMS = Array.from({ length: 4 }, (_, index) => index)
const BLOCKS = Array.from({ length: 2 }, (_, index) => index)
const THREADS = Array.from({ length: 8 }, (_, index) => index)
const HBM_BANKS = Array.from({ length: 8 }, (_, index) => index)

export default function MemoryHierarchyExplorer() {
  const [selected, setSelected] = useState<LevelId>('shared')
  const level = LEVELS.find((candidate) => candidate.id === selected)!
  const levelStyle = {
    '--level-color': level.color,
    '--level-tint': level.tint
  } as CSSProperties

  return (
    <div className={styles.container} style={levelStyle}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>GPU Memory Explorer</div>
        <div className={styles.headerDescription}>
          Select a memory space to see where data lives and how far reuse can
          reach.
        </div>
        <div className={styles.direction} aria-hidden="true">
          <span>Closer to compute</span>
          <span className={styles.directionLine} />
          <span>Farther from compute</span>
        </div>
      </div>

      <div className={styles.levels} aria-label="Memory space" role="group">
        {LEVELS.map((candidate, index) => (
          <button
            key={candidate.id}
            type="button"
            className={`${styles.levelButton} ${candidate.id === selected ? styles.levelButtonActive : ''}`}
            aria-pressed={candidate.id === selected}
            onClick={() => setSelected(candidate.id)}
          >
            <span className={styles.levelNumber}>{index + 1}</span>
            {candidate.label}
          </button>
        ))}
      </div>

      <div className={styles.body}>
        <div className={styles.diagram}>
          <div
            className={`${styles.die} ${selected === 'l2' ? styles.regionActive : ''}`}
          >
            <div className={styles.regionHeader}>
              <span className={styles.regionTag}>On-chip</span>
              <span>GPU die</span>
            </div>

            <div className={styles.smGrid}>
              {SMS.map((sm) => {
                const activeSM = selected === 'l1' && sm === 0

                return (
                  <div
                    key={sm}
                    className={`${styles.sm} ${activeSM ? styles.regionActive : ''}`}
                  >
                    <div className={styles.smHeader}>
                      <span>SM {sm}</span>
                      <span
                        className={`${styles.l1} ${activeSM ? styles.memoryActive : ''}`}
                      >
                        L1
                      </span>
                    </div>

                    <div className={styles.blockGrid}>
                      {BLOCKS.map((block) => {
                        const activeBlock =
                          selected === 'shared' && sm === 0 && block === 0

                        return (
                          <div
                            key={block}
                            className={`${styles.block} ${activeBlock ? styles.regionActive : ''}`}
                          >
                            <div className={styles.blockHeader}>
                              <span>Block {block}</span>
                              <span
                                className={`${styles.smem} ${activeBlock ? styles.memoryActive : ''}`}
                              >
                                SMEM
                              </span>
                            </div>
                            <div className={styles.threads}>
                              {THREADS.map((thread) => {
                                const activeThread =
                                  selected === 'registers' &&
                                  sm === 0 &&
                                  block === 0 &&
                                  thread === 0

                                return (
                                  <span
                                    key={thread}
                                    className={`${styles.thread} ${activeThread ? styles.threadActive : ''}`}
                                    title={
                                      activeThread
                                        ? 'Register value held by one thread'
                                        : undefined
                                    }
                                  />
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            <div
              className={`${styles.l2} ${selected === 'l2' ? styles.memoryActive : ''}`}
            >
              <span>L2 cache</span>
              <span>shared by every SM</span>
            </div>
          </div>

          <div className={styles.bus}>
            <span />
            <span>memory bus</span>
            <span />
          </div>

          <div
            className={`${styles.hbm} ${selected === 'hbm' ? styles.regionActive : ''}`}
          >
            <div className={styles.hbmLabel}>
              <span className={styles.regionTag}>Off-chip</span>
              <strong>HBM</strong>
            </div>
            <div className={styles.hbmBanks} aria-hidden="true">
              {HBM_BANKS.map((bank) => (
                <span
                  key={bank}
                  className={selected === 'hbm' ? styles.memoryActive : ''}
                />
              ))}
            </div>
            <span className={styles.hbmContents}>
              weights · KV cache · activations
            </span>
          </div>
        </div>

        <div className={styles.readout} aria-live="polite">
          <div className={styles.location}>{level.location}</div>
          <div className={styles.readoutMain}>
            <span className={styles.tile} aria-hidden="true" />
            <div>
              <div className={styles.readoutLabel}>Reuse scope</div>
              <div className={styles.scope}>{level.scope}</div>
            </div>
          </div>
          <p>{level.explanation}</p>
        </div>
      </div>

      <div className={styles.takeaway}>
        <span>Key trade-off</span>
        Moving data closer to compute makes access faster, but narrows the group
        that can reuse the same value.
      </div>
    </div>
  )
}
