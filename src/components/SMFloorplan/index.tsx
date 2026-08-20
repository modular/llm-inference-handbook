import { useState } from 'react'
import styles from './styles.module.css'

type RegionId = 'scheduler' | 'registers' | 'cuda' | 'tensor' | 'smem' | 'tma'

interface Region {
  id: RegionId
  name: string
  count: string
  role: string
}

// Figures describe an H100 (Hopper) SM.
const REGIONS: Record<RegionId, Region> = {
  scheduler: {
    id: 'scheduler',
    name: 'Warp scheduler',
    count: '4 per SM, one per processing block',
    role: 'Picks a ready warp each cycle and issues one instruction to it. Four schedulers let one SM issue up to four warp instructions per cycle.'
  },
  registers: {
    id: 'registers',
    name: 'Register file',
    count: '256 KB per SM, 64 KB per processing block',
    role: "Holds each thread's private working values. Register use per thread is often what caps how many warps stay resident."
  },
  cuda: {
    id: 'cuda',
    name: 'CUDA cores',
    count: '128 FP32 and 64 INT32 lanes per SM',
    role: 'General-purpose arithmetic. Elementwise work such as activations, normalization, and sampling runs here.'
  },
  tensor: {
    id: 'tensor',
    name: 'Tensor Core',
    count: '4 per SM, fourth generation on H100',
    role: 'A specialized execution unit. Dense matrix multiplications in prefill and projection layers typically use Tensor Cores.'
  },
  smem: {
    id: 'smem',
    name: 'L1 cache / shared memory',
    count: '256 KB per SM, shared by all four blocks',
    role: 'One SRAM pool split between hardware-managed L1 and programmer-managed shared memory.'
  },
  tma: {
    id: 'tma',
    name: 'Tensor Memory Accelerator',
    count: 'Introduced in Hopper',
    role: 'Copies tiles between HBM and shared memory in the background, so threads spend neither registers nor instructions on address arithmetic.'
  }
}

const BLOCKS = [0, 1, 2, 3]

export default function SMFloorplan() {
  const [selected, setSelected] = useState<RegionId>('tensor')
  const region = REGIONS[selected]

  function regionClass(id: RegionId) {
    return `${styles.region} ${id === selected ? styles.regionActive : ''}`
  }

  function regionProps(id: RegionId) {
    return {
      type: 'button' as const,
      className: regionClass(id),
      'aria-pressed': id === selected,
      onClick: () => setSelected(id)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          Streaming Multiprocessor Explorer
        </div>
        <div className={styles.headerDescription}>
          Select a unit to see how many an H100 SM has and what it does during
          inference. Every copy of that unit highlights at once
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.floorplan}>
          <div className={styles.smLabel}>One NVIDIA H100 SM</div>

          <div className={styles.blocks}>
            {BLOCKS.map((block) => (
              <div className={styles.block} key={block}>
                <div className={styles.blockLabel}>
                  Processing block {block}
                </div>

                <button {...regionProps('scheduler')}>Warp scheduler</button>
                <button {...regionProps('registers')}>
                  Register file <span className={styles.sub}>64 KB</span>
                </button>

                <div className={styles.lanes}>
                  <button {...regionProps('cuda')}>
                    CUDA cores <span className={styles.sub}>32 FP32</span>
                  </button>
                  <button {...regionProps('tensor')}>Tensor Core</button>
                </div>
              </div>
            ))}
          </div>

          <button {...regionProps('smem')}>
            L1 cache / shared memory <span className={styles.sub}>256 KB</span>
          </button>
          <button {...regionProps('tma')}>Tensor Memory Accelerator</button>
        </div>

        <div className={styles.readout} aria-live="polite">
          <div className={styles.readoutName}>{region.name}</div>
          <div className={styles.readoutCount}>{region.count}</div>
          <p className={styles.readoutRole}>{region.role}</p>
        </div>
      </div>

      <div className={styles.note}>
        This is a simplified floorplan. An SM also contains load/store units,
        special function units, texture units, and instruction caches, and the
        exact mix changes with every GPU generation.
      </div>
    </div>
  )
}
