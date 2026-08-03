import { useState } from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

type Architecture = 'Dense' | 'MoE';
type Modality = 'Text' | 'Multimodal';
type BackendName = 'vLLM' | 'SGLang';

interface Model {
  name: string;
  family: string;
  company: string;
  architecture: Architecture;
  released: string; // YYYY-MM
  license: string;
  licenseUrl?: string; // link to the license text
  huggingface: string; // org/repo path on huggingface.co
  totalParams: string;
  activeParams?: string;
  contextLength: string;
  modality: Modality;
  modalityNote?: string;
  useCase?: string;
  precisions: string[];
  deployment: string[];
  vllmDocs?: string;
  sglangDocs: string;
}

interface Backend {
  name: BackendName;
  href: string;
  logoSrc: string;
}

function getBackends(
  model: Model,
  logos: Record<BackendName, string>
): Backend[] {
  return [
    {
      name: 'vLLM',
      href: model.vllmDocs ?? `https://recipes.vllm.ai/${model.huggingface}`,
      logoSrc: logos.vLLM,
    },
    {
      name: 'SGLang',
      href: model.sglangDocs,
      logoSrc: logos.SGLang,
    },
  ];
}

const MODELS: Model[] = [
  // ── DeepSeek ──
  {
    name: 'DeepSeek-V3.2',
    family: 'DeepSeek',
    company: 'DeepSeek',
    architecture: 'MoE',
    released: '2025-12',
    license: 'MIT',
    huggingface: 'deepseek-ai/DeepSeek-V3.2',
    totalParams: '685B',
    activeParams: '37B',
    contextLength: '128K',
    modality: 'Text',
    precisions: ['BF16', 'FP8'],
    deployment: ['8× H200', '8× B200', '8× MI300X'],
    sglangDocs:
      'https://docs.sglang.io/cookbook/autoregressive/DeepSeek/DeepSeek-V3_2',
  },
  {
    name: 'DeepSeek-R1-0528',
    family: 'DeepSeek',
    company: 'DeepSeek',
    architecture: 'MoE',
    released: '2025-05',
    license: 'MIT',
    huggingface: 'deepseek-ai/DeepSeek-R1-0528',
    totalParams: '685B',
    activeParams: '37B',
    contextLength: '128K',
    modality: 'Text',
    precisions: ['BF16', 'FP8'],
    deployment: ['8× H200', '8× B200', '8× MI300X'],
    sglangDocs:
      'https://docs.sglang.io/cookbook/autoregressive/DeepSeek/DeepSeek-R1',
  },
  {
    name: 'DeepSeek-V4-Pro',
    family: 'DeepSeek',
    company: 'DeepSeek',
    architecture: 'MoE',
    released: '2026-04',
    license: 'MIT',
    huggingface: 'deepseek-ai/DeepSeek-V4-Pro',
    totalParams: '1.6T',
    activeParams: '49B',
    contextLength: '1M',
    modality: 'Text',
    useCase: 'Advanced reasoning, coding, and long-horizon agent workflows',
    precisions: ['FP4 + FP8 Mixed'],
    deployment: ['8× H200', '8× B200'],
    sglangDocs:
      'https://docs.sglang.io/cookbook/autoregressive/DeepSeek/DeepSeek-V4',
  },
  {
    name: 'DeepSeek-V4-Flash-0731',
    family: 'DeepSeek',
    company: 'DeepSeek',
    architecture: 'MoE',
    released: '2026-07',
    license: 'MIT',
    huggingface: 'deepseek-ai/DeepSeek-V4-Flash-0731',
    totalParams: '284B',
    activeParams: '13B',
    contextLength: '1M',
    modality: 'Text',
    useCase: 'Cost-sensitive coding agents, tool use, and long-context automation',
    precisions: ['BF16', 'FP8'],
    deployment: ['8× H200', '8× MI325X'],
    vllmDocs: 'https://recipes.vllm.ai/deepseek-ai/DeepSeek-V4-Flash',
    sglangDocs:
      'https://docs.sglang.io/cookbook/autoregressive/DeepSeek/DeepSeek-V4',
  },
  {
    name: 'DeepSeek-V4-Flash',
    family: 'DeepSeek',
    company: 'DeepSeek',
    architecture: 'MoE',
    released: '2026-04',
    license: 'MIT',
    huggingface: 'deepseek-ai/DeepSeek-V4-Flash',
    totalParams: '284B',
    activeParams: '13B',
    contextLength: '1M',
    modality: 'Text',
    precisions: ['FP4 + FP8 Mixed'],
    deployment: ['4× H100', '4× B200'],
    sglangDocs:
      'https://docs.sglang.io/cookbook/autoregressive/DeepSeek/DeepSeek-V4',
  },

  // ── GLM ──
  {
    name: 'GLM-5.2',
    family: 'GLM',
    company: 'Zhipu AI',
    architecture: 'MoE',
    released: '2026-06',
    license: 'MIT',
    huggingface: 'zai-org/GLM-5.2',
    totalParams: '753B',
    activeParams: '40B',
    contextLength: '1M',
    modality: 'Text',
    useCase: 'Long-horizon agent workflows, reasoning, and coding',
    precisions: ['BF16', 'FP8'],
    deployment: ['8× H200', '8× B200', '8× MI355X'],
    sglangDocs: 'https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.2',
  },
  {
    name: 'GLM-5',
    family: 'GLM',
    company: 'Zhipu AI',
    architecture: 'MoE',
    released: '2026-02',
    license: 'MIT',
    huggingface: 'zai-org/GLM-5',
    totalParams: '754B',
    activeParams: '40B',
    contextLength: '198K',
    modality: 'Text',
    precisions: ['BF16', 'FP8'],
    deployment: ['8× H200', '8× B200', '8× MI355X'],
    sglangDocs: 'https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5',
  },
  {
    name: 'GLM-5.1',
    family: 'GLM',
    company: 'Zhipu AI',
    architecture: 'MoE',
    released: '2026-04',
    license: 'MIT',
    huggingface: 'zai-org/GLM-5.1',
    totalParams: '754B',
    activeParams: '40B',
    contextLength: '198K',
    modality: 'Text',
    useCase: 'Reasoning and coding assistants',
    precisions: ['BF16', 'FP8'],
    deployment: ['8× H200', '8× B200', '8× MI355X'],
    sglangDocs: 'https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.1',
  },

  // ── MiMo ──
  {
    name: 'MiMo-V2.5-Pro',
    family: 'MiMo',
    company: 'Xiaomi',
    architecture: 'MoE',
    released: '2026-04',
    license: 'MIT',
    huggingface: 'XiaomiMiMo/MiMo-V2.5-Pro',
    totalParams: '1.02T',
    activeParams: '42B',
    contextLength: '1M',
    modality: 'Text',
    useCase: 'Long-context reasoning and agent workloads',
    precisions: ['FP8'],
    deployment: ['2-node 8× H200'],
    sglangDocs:
      'https://docs.sglang.io/cookbook/autoregressive/Xiaomi/MiMo-V2.5',
  },
  {
    name: 'MiMo-V2.5',
    family: 'MiMo',
    company: 'Xiaomi',
    architecture: 'MoE',
    released: '2026-04',
    license: 'MIT',
    huggingface: 'XiaomiMiMo/MiMo-V2.5',
    totalParams: '310B',
    activeParams: '15B',
    contextLength: '1M',
    modality: 'Multimodal',
    modalityNote: 'Text, Image, Video, Audio',
    precisions: ['FP8'],
    deployment: ['8× H100', '4× B200'],
    sglangDocs:
      'https://docs.sglang.io/cookbook/autoregressive/Xiaomi/MiMo-V2.5',
  },

  // ── Kimi ──
  {
    name: 'Kimi-K2.6',
    family: 'Kimi',
    company: 'Moonshot AI',
    architecture: 'MoE',
    released: '2026-04',
    license: 'Modified MIT',
    huggingface: 'moonshotai/Kimi-K2.6',
    totalParams: '1T',
    activeParams: '32B',
    contextLength: '256K',
    modality: 'Multimodal',
    modalityNote: 'Text, Image, Video',
    useCase: 'Multimodal long-context agents and visual reasoning',
    precisions: ['INT4'],
    deployment: ['8× H200', '8× B300', '4× MI350X'],
    sglangDocs:
      'https://docs.sglang.io/cookbook/autoregressive/Moonshotai/Kimi-K2.6',
  },
  {
    name: 'Kimi-K2.5',
    family: 'Kimi',
    company: 'Moonshot AI',
    architecture: 'MoE',
    released: '2026-01',
    license: 'Modified MIT',
    huggingface: 'moonshotai/Kimi-K2.5',
    totalParams: '1T',
    activeParams: '32B',
    contextLength: '256K',
    modality: 'Multimodal',
    modalityNote: 'Text, Image, Video',
    precisions: ['INT4'],
    deployment: ['8× H200', '8× B300', '4× MI350X'],
    sglangDocs:
      'https://docs.sglang.io/cookbook/autoregressive/Moonshotai/Kimi-K2.5',
  },
  {
    name: 'Kimi-K2-Thinking',
    family: 'Kimi',
    company: 'Moonshot AI',
    architecture: 'MoE',
    released: '2025-11',
    license: 'Modified MIT',
    huggingface: 'moonshotai/Kimi-K2-Thinking',
    totalParams: '1T',
    activeParams: '32B',
    contextLength: '256K',
    modality: 'Text',
    precisions: ['INT4'],
    deployment: ['8× H200', '8× B200', '8× MI300X'],
    vllmDocs: 'https://recipes.vllm.ai/moonshotai/Kimi-K2-Thinking',
    sglangDocs:
      'https://docs.sglang.io/cookbook/autoregressive/Moonshotai/Kimi-K2',
  },

  // ── Ling ──
  {
    name: 'Ling-2.6-1T',
    family: 'Ling',
    company: 'InclusionAI',
    architecture: 'MoE',
    released: '2026-04',
    license: 'MIT',
    huggingface: 'inclusionAI/Ling-2.6-1T',
    totalParams: '1T',
    activeParams: '63B',
    contextLength: '256K',
    modality: 'Text',
    precisions: ['FP8'],
    deployment: ['2-node 8× H200'],
    vllmDocs: 'https://recipes.vllm.ai/inclusionAI/Ling-2.6-1T',
    sglangDocs:
      'https://docs.sglang.io/cookbook/autoregressive/InclusionAI/Ling-2.6',
  },
  {
    name: 'Ling-2.6-flash',
    family: 'Ling',
    company: 'InclusionAI',
    architecture: 'MoE',
    released: '2026-04',
    license: 'MIT',
    huggingface: 'inclusionAI/Ling-2.6-flash',
    totalParams: '104B',
    activeParams: '7.4B',
    contextLength: '128K',
    modality: 'Text',
    precisions: ['BF16'],
    deployment: ['4× H100', '4× H200'],
    vllmDocs: 'https://recipes.vllm.ai/inclusionAI/Ling-2.6-flash',
    sglangDocs:
      'https://docs.sglang.io/cookbook/autoregressive/InclusionAI/Ling-2.6',
  },

  // ── MiniMax ──
  {
    name: 'MiniMax-M3',
    family: 'MiniMax',
    company: 'MiniMax',
    architecture: 'MoE',
    released: '2026-06',
    license: 'MiniMax Community License',
    licenseUrl: 'https://huggingface.co/MiniMaxAI/MiniMax-M3/blob/main/LICENSE',
    huggingface: 'MiniMaxAI/MiniMax-M3',
    totalParams: '428B',
    activeParams: '23B',
    contextLength: '1M',
    modality: 'Multimodal',
    modalityNote: 'Text, Image, Video',
    precisions: ['BF16', 'MXFP8'],
    deployment: ['8× H200', '4× B200', '8× MI300X'],
    vllmDocs: 'https://recipes.vllm.ai/MiniMaxAI/MiniMax-M3',
    sglangDocs: 'https://docs.sglang.io/cookbook/autoregressive/MiniMax/MiniMax-M3',
  },
  {
    name: 'MiniMax-M2.7',
    family: 'MiniMax',
    company: 'MiniMax',
    architecture: 'MoE',
    released: '2026-03',
    license: 'Custom (Non-commercial)',
    licenseUrl: 'https://github.com/MiniMax-AI/MiniMax-M2.7/blob/main/LICENSE',
    huggingface: 'MiniMaxAI/MiniMax-M2.7',
    totalParams: '230B',
    activeParams: '10B',
    contextLength: '204.8K',
    modality: 'Text',
    precisions: ['FP8'],
    deployment: ['4× H100', '4× H200', '4× MI325X'],
    sglangDocs:
      'https://docs.sglang.io/cookbook/autoregressive/MiniMax/MiniMax-M2.7',
  },

  // ── Mistral ──
  {
    name: 'Mistral-Medium-3.5-128B',
    family: 'Mistral',
    company: 'Mistral AI',
    architecture: 'Dense',
    released: '2026-04',
    license: 'Modified MIT',
    huggingface: 'mistralai/Mistral-Medium-3.5-128B',
    totalParams: '128B',
    contextLength: '256K',
    modality: 'Multimodal',
    modalityNote: 'Text, Image',
    precisions: ['FP8'],
    deployment: ['4× H100', '4× H200', '2× B200'],
    vllmDocs: 'https://recipes.vllm.ai/mistralai/Mistral-Medium-3.5-128B',
    sglangDocs:
      'https://docs.sglang.io/cookbook/autoregressive/Mistral/Mistral-Medium-3.5',
  },

  // ── Gemma ──
  {
    name: 'gemma-4-12B-it',
    family: 'Gemma',
    company: 'Google',
    architecture: 'Dense',
    released: '2026-06',
    license: 'Apache 2.0',
    huggingface: 'google/gemma-4-12B-it',
    totalParams: '11.95B',
    contextLength: '256K',
    modality: 'Multimodal',
    modalityNote: 'Text, Image, Audio',
    precisions: ['BF16'],
    deployment: ['1× H100', '1× H200'],
    vllmDocs: 'https://recipes.vllm.ai/Google/gemma-4-12B-it',
    sglangDocs: 'https://docs.sglang.io/cookbook/autoregressive/Google/Gemma4',
  },
  {
    name: 'gemma-4-31B-it',
    family: 'Gemma',
    company: 'Google',
    architecture: 'Dense',
    released: '2026-04',
    license: 'Apache 2.0',
    huggingface: 'google/gemma-4-31b-it',
    totalParams: '30.7B',
    contextLength: '256K',
    modality: 'Multimodal',
    modalityNote: 'Text, Image',
    precisions: ['BF16'],
    deployment: ['2× H200', '1x MI325X', '1× TPU v7 Ironwood'],
    vllmDocs: 'https://recipes.vllm.ai/Google/gemma-4-31B-it',
    sglangDocs: 'https://docs.sglang.io/cookbook/autoregressive/Google/Gemma4',
  },
  {
    name: 'gemma-4-26B-A4B-it',
    family: 'Gemma',
    company: 'Google',
    architecture: 'MoE',
    released: '2026-04',
    license: 'Apache 2.0',
    huggingface: 'google/gemma-4-26b-a4b-it',
    totalParams: '25.2B',
    activeParams: '3.8B',
    contextLength: '256K',
    modality: 'Multimodal',
    modalityNote: 'Text, Image',
    precisions: ['BF16'],
    deployment: ['1× H200', '1x MI325X', '1× TPU v7 Ironwood'],
    vllmDocs: 'https://recipes.vllm.ai/Google/gemma-4-26B-A4B-it',
    sglangDocs: 'https://docs.sglang.io/cookbook/autoregressive/Google/Gemma4',
  },

  // ── OpenAI (gpt-oss) ──
  {
    name: 'gpt-oss-120b',
    family: 'gpt-oss',
    company: 'OpenAI',
    architecture: 'MoE',
    released: '2025-08',
    license: 'Apache 2.0',
    huggingface: 'openai/gpt-oss-120b',
    totalParams: '117B',
    activeParams: '5.1B',
    contextLength: '128K',
    modality: 'Text',
    precisions: ['MXFP4'],
    deployment: ['8× H100', '8× H200', '8× MI300X'],
    sglangDocs: 'https://docs.sglang.io/cookbook/autoregressive/OpenAI/GPT-OSS',
  },
  {
    name: 'gpt-oss-20b',
    family: 'gpt-oss',
    company: 'OpenAI',
    architecture: 'MoE',
    released: '2025-08',
    license: 'Apache 2.0',
    huggingface: 'openai/gpt-oss-20b',
    totalParams: '21B',
    activeParams: '3.6B',
    contextLength: '128K',
    modality: 'Text',
    precisions: ['MXFP4'],
    deployment: ['1× H100', '1× H200', '1× MI355X'],
    sglangDocs: 'https://docs.sglang.io/cookbook/autoregressive/OpenAI/GPT-OSS',
  },

  // ── Qwen ──
  {
    name: 'Qwen3.6-27B',
    family: 'Qwen',
    company: 'Alibaba',
    architecture: 'Dense',
    released: '2026-04',
    license: 'Apache 2.0',
    huggingface: 'Qwen/Qwen3.6-27B',
    totalParams: '27B',
    contextLength: '256K',
    modality: 'Multimodal',
    modalityNote: 'Text, Image, Video',
    precisions: ['BF16', 'FP8'],
    deployment: ['1× H100', '1× H200'],
    sglangDocs: 'https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.6',
  },
  {
    name: 'Qwen3.6-35B-A3B',
    family: 'Qwen',
    company: 'Alibaba',
    architecture: 'MoE',
    released: '2026-04',
    license: 'Apache 2.0',
    huggingface: 'Qwen/Qwen3.6-35B-A3B',
    totalParams: '35B',
    activeParams: '3B',
    contextLength: '256K',
    modality: 'Multimodal',
    modalityNote: 'Text, Image, Video',
    precisions: ['BF16', 'FP8'],
    deployment: ['1× H100', '1× H200'],
    sglangDocs: 'https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.6',
  },
  {
    name: 'Qwen3.5-397B-A17B',
    family: 'Qwen',
    company: 'Alibaba',
    architecture: 'MoE',
    released: '2026-02',
    license: 'Apache 2.0',
    huggingface: 'Qwen/Qwen3.5-397B-A17B',
    totalParams: '397B',
    activeParams: '17B',
    contextLength: '256K',
    modality: 'Multimodal',
    modalityNote: 'Text, Image, Video',
    precisions: ['BF16', 'FP8'],
    deployment: ['8× H100', '8× H200', '8× MI300X'],
    sglangDocs: 'https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.5',
  },
];

const FAMILIES = [
  'All',
  'DeepSeek',
  'Gemma',
  'GLM',
  'gpt-oss',
  'Kimi',
  'Ling',
  'MiMo',
  'MiniMax',
  'Mistral',
  'Qwen',
] as const;
type Family = (typeof FAMILIES)[number];

function ModelExplorer() {
  const [family, setFamily] = useState<Family>('All');
  const [selected, setSelected] = useState<string>('DeepSeek-V4-Pro');

  function sortModels(models: Model[]) {
    return models.slice().sort((a, b) => {
      const fam = a.family.localeCompare(b.family, 'en', {
        sensitivity: 'base',
      });
      if (fam !== 0) return fam;
      return b.released.localeCompare(a.released);
    });
  }

  const visibleModels = sortModels(
    family === 'All' ? MODELS : MODELS.filter((m) => m.family === family)
  );

  const current =
    MODELS.find((m) => m.name === selected) ?? visibleModels[0] ?? MODELS[0];
  const logos: Record<BackendName, string> = {
    vLLM: useBaseUrl('/img/vllm-logo.svg'),
    SGLang: useBaseUrl('/img/sglang-logo.png'),
  };
  const familyLogos: Partial<Record<Family, string>> = {
    DeepSeek: useBaseUrl('/img/model-logos/deepseek.webp'),
    Gemma: useBaseUrl('/img/model-logos/gemma.webp'),
    GLM: useBaseUrl('/img/model-logos/glm.webp'),
    'gpt-oss': useBaseUrl('/img/model-logos/gpt-oss.webp'),
    Kimi: useBaseUrl('/img/model-logos/kimi.webp'),
    Ling: useBaseUrl('/img/model-logos/ling.webp'),
    MiMo: useBaseUrl('/img/model-logos/mimo.webp'),
    MiniMax: useBaseUrl('/img/model-logos/minimax.webp'),
    Mistral: useBaseUrl('/img/model-logos/mistral.webp'),
    Qwen: useBaseUrl('/img/model-logos/qwen.webp'),
  };
  const backends = getBackends(current, logos);

  function pickFamily(f: Family) {
    setFamily(f);
    if (f !== 'All') {
      const first = sortModels(MODELS.filter((m) => m.family === f))[0];
      if (first) setSelected(first.name);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>Model Explorer</div>
        <div className={styles.headerDesc}>
          Browse popular open-source LLMs and their architecture, scale,
          context, and typical GPU deployment.
        </div>
      </div>
      <div className={styles.body}>
        <div className={styles.familyRow}>
          {FAMILIES.map((f) => (
            <button
              key={f}
              type="button"
              className={`${styles.familyPill} ${family === f ? styles.familyPillActive : ''}`}
              onClick={() => pickFamily(f)}
            >
              {familyLogos[f] && (
                <img
                  className={styles.familyLogo}
                  src={familyLogos[f]}
                  alt=""
                  loading="lazy"
                  aria-hidden="true"
                />
              )}
              {f}
            </button>
          ))}
        </div>

        <div className={styles.split}>
          <div className={styles.list}>
            {visibleModels.map((m) => (
              <button
                key={m.name}
                type="button"
                className={`${styles.listItem} ${current.name === m.name ? styles.listItemActive : ''}`}
                onClick={() => setSelected(m.name)}
              >
                <span className={styles.listItemName}>{m.name}</span>
                <span
                  className={`${styles.archTag} ${m.architecture === 'MoE' ? styles.archMoE : styles.archDense}`}
                >
                  {m.architecture}
                </span>
              </button>
            ))}
          </div>

          <div className={styles.detail}>
            <div className={styles.detailHead}>
              <div className={styles.detailName}>
                {current.name}
                <a
                  className={styles.hfLink}
                  href={`https://huggingface.co/${current.huggingface}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View on Hugging Face"
                  aria-label={`View ${current.name} on Hugging Face`}
                >
                  🤗
                </a>
              </div>
              <div className={styles.detailMeta}>
                <span className={styles.companyTag}>{current.company}</span>
                <span className={styles.releasedTag}>{current.released}</span>
                <span
                  className={`${styles.archBadge} ${current.architecture === 'MoE' ? styles.archMoE : styles.archDense}`}
                >
                  {current.architecture}
                </span>
              </div>
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.stat}>
                <div className={styles.statLabel}>Total params</div>
                <div className={styles.statValue}>{current.totalParams}</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statLabel}>Active params</div>
                <div className={styles.statValue}>
                  {current.activeParams ?? (
                    <span className={styles.statMuted}>—</span>
                  )}
                </div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statLabel}>Context</div>
                <div className={styles.statValue}>{current.contextLength}</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statLabel}>Modality</div>
                <div className={styles.statValue}>
                  {current.modality}
                  {current.modalityNote && (
                    <span className={styles.statSub}>
                      {current.modalityNote}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.kvRow}>
              <span className={styles.kvLabel}>Precision</span>
              <div className={styles.chips}>
                {current.precisions.map((p) => (
                  <span key={p} className={styles.precisionChip}>
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <div className={styles.kvRow}>
              <span className={styles.kvLabel}>License</span>
              {current.licenseUrl ? (
                <a
                  className={`${styles.kvValue} ${styles.kvLink}`}
                  href={current.licenseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {current.license}
                </a>
              ) : (
                <span className={styles.kvValue}>{current.license}</span>
              )}
            </div>

            {current.useCase && (
              <div className={`${styles.kvRow} ${styles.useCaseRow}`}>
                <span className={styles.kvLabel}>Use Case</span>
                <span className={`${styles.kvValue} ${styles.useCaseValue}`}>
                  {current.useCase}
                </span>
              </div>
            )}

            <div className={styles.kvRow}>
              <span className={styles.kvLabel}>Backend</span>
              <div className={styles.backendLinks}>
                {backends.map((backend) => (
                  <a
                    key={backend.name}
                    className={styles.backendLink}
                    href={backend.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`${backend.name} docs for ${current.name}`}
                    aria-label={`${backend.name} docs for ${current.name}`}
                  >
                    <img
                      className={`${styles.backendLogo} ${backend.name === 'SGLang' ? styles.sglangLogo : ''}`}
                      src={backend.logoSrc}
                      alt={`${backend.name} logo`}
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            </div>

            <div className={styles.kvRow}>
              <span className={styles.kvLabel}>Hardware</span>
              <div className={styles.chips}>
                {current.deployment.map((d) => (
                  <span key={d} className={styles.deployChip}>
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModelExplorer;
