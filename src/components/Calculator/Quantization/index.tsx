import { useState } from 'react';
import FormItem from '../FormItem';
import styles from './styles.module.css';

const MODEL_PRESETS = [
  { label: 'Custom', params: null as number | null },
  { label: 'Llama 3.2 3B', params: 3 },
  { label: 'Llama 3.1 8B', params: 8 },
  { label: 'Qwen2.5 32B', params: 32 },
  { label: 'Llama 3.3 70B', params: 70 },
  { label: 'Llama 3.1 405B', params: 405 },
  { label: 'DeepSeek-V3 671B', params: 671 },
];

const FORMATS = [
  { label: 'FP32', bits: 32, accuracyDrop: 'None' },
  { label: 'FP16 / BF16', bits: 16, accuracyDrop: 'Minimal' },
  { label: 'FP8 / INT8', bits: 8, accuracyDrop: 'Low' },
  { label: 'INT4', bits: 4, accuracyDrop: 'Moderate' },
  { label: 'INT2', bits: 2, accuracyDrop: 'High' },
];

function getBadgeClass(accuracyDrop: string) {
  switch (accuracyDrop) {
    case 'None':
      return styles.badgeNone;
    case 'Minimal':
      return styles.badgeMinimal;
    case 'Low':
      return styles.badgeLow;
    case 'Moderate':
      return styles.badgeModerate;
    case 'High':
      return styles.badgeHigh;
    default:
      return '';
  }
}

function formatMemory(gb: number): string {
  if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`;
  return `${+gb.toFixed(1)} GB`;
}

function QuantizationVisualizer() {
  const [preset, setPreset] = useState('Llama 3.1 8B');
  const [params, setParams] = useState(8);

  function handlePresetChange(label: string) {
    const found = MODEL_PRESETS.find((p) => p.label === label);
    if (!found) return;
    setPreset(label);
    if (found.params !== null) setParams(found.params);
  }

  function handleParamsChange(val: number) {
    setParams(val);
    setPreset('Custom');
  }

  return (
    <div className={styles.calculator}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={styles.headerIcon} />
          <span>Quantization Memory Impact (Weights Only)</span>
        </div>
        <div className={styles.headerDescription}>
          Compare model weight memory across quantization formats
        </div>
      </div>
      <div className={styles.body}>
        <div className={styles.presetSelector}>
          <span className={styles.presetLabel}>Quick preset:</span>
          <div className={styles.presetList}>
            {MODEL_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className={preset === p.label ? styles.presetActive : undefined}
                onClick={() => handlePresetChange(p.label)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.bodyContent}>
          <div className={styles.input}>
            <div className={styles.title}>Model Parameters</div>
            <FormItem
              title="Parameters (P)"
              description="Total number of model parameters in billions (e.g., 8 for a 8B model)"
            >
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={params}
                onChange={(e) => handleParamsChange(Number(e.target.value))}
              />
            </FormItem>
          </div>
          <div className={styles.chart}>
            <div className={styles.chartTitle}>Weights memory by format</div>
            <div className={styles.chartHeader}>
              <span className={styles.chartColLabel} />
              <span className={styles.chartColBar} />
              <span className={styles.chartColValue}>Memory</span>
              <span className={styles.chartColBadge}>Quality Impact</span>
            </div>
            {FORMATS.map((fmt) => {
              const memory = params * (fmt.bits / 8);
              const barPct = (fmt.bits / 32) * 100;
              return (
                <div className={styles.chartRow} key={fmt.label}>
                  <span className={styles.chartLabel}>{fmt.label}</span>
                  <div className={styles.chartBarTrack}>
                    <div
                      className={styles.chartBar}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                  <span className={styles.chartValue}>
                    {formatMemory(memory)}
                  </span>
                  <span
                    className={`${styles.badge} ${getBadgeClass(fmt.accuracyDrop)}`}
                  >
                    {fmt.accuracyDrop}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuantizationVisualizer;
