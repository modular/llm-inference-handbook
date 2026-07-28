import { useState, useMemo } from 'react';
import styles from './styles.module.css';

type Vendor = 'NVIDIA' | 'AMD';
type SortCol = 'name' | 'vram' | 'bandwidth';
type SortDir = 'asc' | 'desc';
type VramFilter = 'all' | 'small' | 'medium' | 'large';

interface GPU {
  name: string;
  vendor: Vendor;
  vram: number; // GB, used for sorting/filtering
  vramDisplay: string; // shown in table
  bandwidthGBs: number; // GB/s, used for sorting
  bandwidthDisplay: string; // shown in table
  exampleLLMs: string[];
  notes: string;
}

const GPU_DATA: GPU[] = [
  {
    name: 'NVIDIA T4',
    vendor: 'NVIDIA',
    vram: 16,
    vramDisplay: '16 GB',
    bandwidthGBs: 320,
    bandwidthDisplay: '320 GB/s',
    exampleLLMs: ['Llama-2-7B (4-bit quantized)'],
    notes:
      'Entry-level data center GPU; cost-effective for small models (<10 GB)',
  },
  {
    name: 'NVIDIA L4',
    vendor: 'NVIDIA',
    vram: 24,
    vramDisplay: '24 GB',
    bandwidthGBs: 300,
    bandwidthDisplay: '300 GB/s',
    exampleLLMs: ['Llama-3-8B', 'Gemma-4-E4B', 'Qwen3.5-9B'],
    notes: 'Cost-efficient mid-range; widely available in cloud',
  },
  {
    name: 'NVIDIA A100',
    vendor: 'NVIDIA',
    vram: 80,
    vramDisplay: '40 / 80 GB',
    bandwidthGBs: 2000,
    bandwidthDisplay: '1.6–2.0 TB/s',
    exampleLLMs: [
      'Gemma-4-26B-A4B',
      'gpt-oss-20b',
      'gpt-oss-120b',
      'Llama-3.3-70B',
    ],
    notes:
      'Workhorse for medium to large models (>10GB) and complex computer vision tasks; strong CUDA ecosystem',
  },
  {
    name: 'NVIDIA H100',
    vendor: 'NVIDIA',
    vram: 80,
    vramDisplay: '80 GB',
    bandwidthGBs: 3350,
    bandwidthDisplay: '3.35 TB/s',
    exampleLLMs: [
      'Gemma-4-31B',
      'Qwen3.6-35B-A3B',
      'DeepSeek-V4-Flash',
      'MiMo-V2-Flash',
    ],
    notes:
      'Optimized for transformer inference; native FP8 support; excellent throughput at scale',
  },
  {
    name: 'NVIDIA H200',
    vendor: 'NVIDIA',
    vram: 141,
    vramDisplay: '141 GB',
    bandwidthGBs: 4800,
    bandwidthDisplay: '4.8 TB/s',
    exampleLLMs: [
      'MiniMax-M3',
      'MiMo-V2.5',
      'Kimi-K2.6',
      'Qwen3.5-397B-A17B',
      'Step 3.5 Flash',
    ],
    notes: 'High memory capacity; designed for frontier-scale LLMs',
  },
  {
    name: 'NVIDIA B200',
    vendor: 'NVIDIA',
    vram: 192,
    vramDisplay: '192 GB',
    bandwidthGBs: 8000,
    bandwidthDisplay: '8.0 TB/s',
    exampleLLMs: [
      'DeepSeek-V4-Flash',
      'DeepSeek-V4-Pro',
      'GLM-5.2',
      'MiniMax-M3',
      'MiMo-V2.5-Pro',
    ],
    notes:
      'Blackwell architecture; native FP4 support; massive throughput for trillion-parameter models',
  },
  {
    name: 'AMD MI250',
    vendor: 'AMD',
    vram: 128,
    vramDisplay: '128 GB',
    bandwidthGBs: 3200,
    bandwidthDisplay: '3.2 TB/s',
    exampleLLMs: ['Llama-3.1-8B', 'Qwen3.5-9B', 'Phi-3-medium', 'gemma-7b-it'],
    notes: 'Strong memory bandwidth; solid AMD mid-tier option',
  },
  {
    name: 'AMD MI300X',
    vendor: 'AMD',
    vram: 192,
    vramDisplay: '192 GB',
    bandwidthGBs: 5300,
    bandwidthDisplay: '5.3 TB/s',
    exampleLLMs: [
      'gpt-oss-120b',
      'MiniMax-M3',
      'DeepSeek-R1-0528',
      'MiMo-V2.5',
      'Qwen3.5-397B-A17B',
    ],
    notes: 'Large memory capacity; strong choice for large models',
  },
  {
    name: 'AMD MI325X',
    vendor: 'AMD',
    vram: 256,
    vramDisplay: '256 GB',
    bandwidthGBs: 6000,
    bandwidthDisplay: '6.0 TB/s',
    exampleLLMs: [
      'Gemma-4-31B',
      'MiniMax-M3',
      'DeepSeek-V3.2',
      'GLM-5.2',
      'Qwen3.5-397B-A17B',
    ],
    notes: '3rd Gen CDNA architecture; built for massive multi-GPU clusters',
  },
  {
    name: 'AMD MI355X',
    vendor: 'AMD',
    vram: 288,
    vramDisplay: '288 GB',
    bandwidthGBs: 8000,
    bandwidthDisplay: '8.0 TB/s',
    exampleLLMs: ['GLM-5.2', 'Kimi-K3', 'MiniMax-M3', 'MiMo-V2.5-Pro'],
    notes:
      '4th Gen CDNA architecture; FP4/FP6 support; competes with B200 for the largest open models',
  },
];

const VRAM_FILTERS: { label: string; value: VramFilter }[] = [
  { label: 'All', value: 'all' },
  { label: '≤ 24 GB', value: 'small' },
  { label: '40–80 GB', value: 'medium' },
  { label: '128 GB+', value: 'large' },
];

function matchesVram(gpu: GPU, filter: VramFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'small') return gpu.vram <= 24;
  if (filter === 'medium') return gpu.vram >= 40 && gpu.vram <= 80;
  if (filter === 'large') return gpu.vram >= 128;
  return true;
}

function GPUTable() {
  const [vendor, setVendor] = useState<'all' | Vendor>('all');
  const [vramFilter, setVramFilter] = useState<VramFilter>('all');
  const [sortCol, setSortCol] = useState<SortCol>('vram');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  function handleSort(col: SortCol) {
    if (col === sortCol) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  }

  const rows = useMemo(() => {
    const filtered = GPU_DATA.filter(
      (gpu) =>
        (vendor === 'all' || gpu.vendor === vendor) &&
        matchesVram(gpu, vramFilter)
    );
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortCol === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortCol === 'vram') cmp = a.vram - b.vram;
      else if (sortCol === 'bandwidth') cmp = a.bandwidthGBs - b.bandwidthGBs;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [vendor, vramFilter, sortCol, sortDir]);

  function SortIcon({ col }: { col: SortCol }) {
    if (sortCol !== col)
      return <span className={styles.sortIconInactive}>↕</span>;
    return (
      <span className={styles.sortIconActive}>
        {sortDir === 'asc' ? '↑' : '↓'}
      </span>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>GPU Comparison</div>
        <div className={styles.headerDescription}>
          Filter and sort data center GPUs by vendor or VRAM requirements
        </div>
      </div>
      <div className={styles.body}>
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Vendor:</span>
            {(['all', 'NVIDIA', 'AMD'] as const).map((v) => (
              <button
                key={v}
                type="button"
                className={`${styles.filterBtn} ${vendor === v ? styles.filterBtnActive : ''}`}
                onClick={() => setVendor(v)}
              >
                {v === 'all' ? 'All' : v}
              </button>
            ))}
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>VRAM:</span>
            {VRAM_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={`${styles.filterBtn} ${vramFilter === f.value ? styles.filterBtnActive : ''}`}
                onClick={() => setVramFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.tableWrapper}>
          {rows.length === 0 ? (
            <div className={styles.noResults}>
              No GPUs match the current filters.
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th
                    className={`${styles.th} ${styles.thSortable} ${sortCol === 'name' ? styles.thSorted : ''}`}
                    onClick={() => handleSort('name')}
                  >
                    GPU <SortIcon col="name" />
                  </th>
                  <th
                    className={`${styles.th} ${styles.thSortable} ${styles.thNum} ${sortCol === 'vram' ? styles.thSorted : ''}`}
                    onClick={() => handleSort('vram')}
                  >
                    VRAM <SortIcon col="vram" />
                  </th>
                  <th
                    className={`${styles.th} ${styles.thSortable} ${styles.thNum} ${sortCol === 'bandwidth' ? styles.thSorted : ''}`}
                    onClick={() => handleSort('bandwidth')}
                  >
                    Memory BW <SortIcon col="bandwidth" />
                  </th>
                  <th className={styles.th}>Example LLMs</th>
                  <th className={`${styles.th} ${styles.thNotes}`}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((gpu) => (
                  <tr key={gpu.name} className={styles.tr}>
                    <td className={styles.td}>
                      <span
                        className={`${styles.gpuName} ${
                          gpu.vendor === 'NVIDIA'
                            ? styles.vendorNVIDIA
                            : styles.vendorAMD
                        }`}
                      >
                        {gpu.name}
                      </span>
                    </td>
                    <td className={`${styles.td} ${styles.tdNum}`}>
                      {gpu.vramDisplay}
                    </td>
                    <td className={`${styles.td} ${styles.tdNum}`}>
                      {gpu.bandwidthDisplay}
                    </td>
                    <td className={styles.td}>
                      <span className={styles.llmList}>
                        {gpu.exampleLLMs.join(', ')}
                      </span>
                    </td>
                    <td className={`${styles.td} ${styles.tdNotes}`}>
                      {gpu.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default GPUTable;
