import { useState } from 'react'
import styles from './styles.module.css'

const HOURS_PER_MONTH = 730

const usd = (n: number, digits = 0) =>
  `$${n.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  })}`

function formatTokens(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  return `${(n / 1e6).toFixed(0)}M`
}

export default function InferenceCostCalculator() {
  const [gpuPrice, setGpuPrice] = useState(2)
  const [throughput, setThroughput] = useState(2500)
  const [utilization, setUtilization] = useState(30)
  const [overhead, setOverhead] = useState(10000)

  const validInputs = gpuPrice > 0 && throughput > 0
  const gpuBill = validInputs ? gpuPrice * HOURS_PER_MONTH : 0
  const totalCost = gpuBill + (Number.isNaN(overhead) ? 0 : overhead)
  const tokensPerMonth = validInputs
    ? throughput * (utilization / 100) * 3600 * HOURS_PER_MONTH
    : 0
  const costPerMillion = validInputs ? (totalCost * 1e6) / tokensPerMonth : 0
  const gpuOnlyPerMillion = validInputs ? (gpuBill * 1e6) / tokensPerMonth : 0
  const show = (value: string) => (validInputs ? value : '—')

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>Inference Cost Calculator</div>
        <div className={styles.headerDescription}>
          See how average throughput and extra monthly costs change the
          effective cost per 1M tokens.
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.grid}>
          <div>
            <label className={styles.label} htmlFor="ic-gpu-cost">
              GPU cost
            </label>
            <div className={styles.inputWrap}>
              <span className={styles.affix}>$</span>
              <input
                id="ic-gpu-cost"
                type="number"
                min={0.1}
                step={0.1}
                value={Number.isNaN(gpuPrice) ? '' : gpuPrice}
                onChange={e => setGpuPrice(parseFloat(e.target.value))}
                className={styles.numberInput}
              />
              <span className={styles.affix}>/hour</span>
            </div>
          </div>
          <div>
            <label className={styles.label} htmlFor="ic-throughput">
              Full-load throughput
            </label>
            <div className={styles.inputWrap}>
              <input
                id="ic-throughput"
                type="number"
                min={1}
                step={100}
                value={Number.isNaN(throughput) ? '' : throughput}
                onChange={e => setThroughput(parseFloat(e.target.value))}
                className={styles.numberInput}
              />
              <span className={styles.affix}>tok/s</span>
            </div>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="ic-overhead">
            Additional cost (e.g., infra, ops, eng, talent)
          </label>
          <div className={styles.inputWrap}>
            <span className={styles.affix}>$</span>
            <input
              id="ic-overhead"
              type="number"
              min={0}
              step={100}
              value={Number.isNaN(overhead) ? '' : overhead}
              onChange={e => setOverhead(parseFloat(e.target.value))}
              className={styles.numberInput}
            />
            <span className={styles.affix}>/month</span>
          </div>
        </div>

        <div className={styles.divider} />

        <label className={styles.sliderLabel} htmlFor="ic-utilization">
          Average share of full-load throughput: <strong>{utilization}%</strong>
        </label>
        <input
          id="ic-utilization"
          type="range"
          min={10}
          max={100}
          step={5}
          value={utilization}
          onChange={e => setUtilization(+e.target.value)}
          className={styles.slider}
        />
        <div className={styles.ticks}>
          <span>10%</span>
          <span>100%</span>
        </div>

        <div className={styles.divider} />

        <div className={styles.grid}>
          <div>
            <div className={styles.label}>Monthly GPU bill</div>
            <div className={styles.stat}>{show(usd(gpuBill))}</div>
          </div>
          <div>
            <div className={styles.label}>Total monthly cost</div>
            <div className={styles.stat}>{show(usd(totalCost))}</div>
          </div>
          <div>
            <div className={styles.label}>Tokens served per month</div>
            <div className={styles.stat}>
              {show(formatTokens(tokensPerMonth))}
            </div>
          </div>
          <div className={styles.result}>
            <div className={styles.label}>Effective cost per 1M tokens</div>
            <div className={styles.resultValue}>
              {show(usd(costPerMillion, 3))}
            </div>
            <div className={styles.resultNote}>
              GPU only: {show(usd(gpuOnlyPerMillion, 3))}
            </div>
          </div>
        </div>

        <div className={styles.caption}>
          This is an illustrative model, assuming the selected share of full-load
          throughput holds over {HOURS_PER_MONTH} hours a month.
        </div>
      </div>
    </div>
  )
}
