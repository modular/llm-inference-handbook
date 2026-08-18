import { useState } from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

type ProfileId = 'explorer' | 'api' | 'builder' | 'scaler' | 'leader';

interface Question {
  text: string;
  options: { label: string; scores: Partial<Record<ProfileId, number>> }[];
}

interface Profile {
  subtitle: string;
  title: string;
  description: string;
  chapters: { title: string; description: string; href: string }[];
}

// ── Data ──────────────────────────────────────────────────────────────────────

const QUESTIONS: Question[] = [
  {
    text: 'How are you currently running LLMs?',
    options: [
      {
        label: 'Via a managed API (OpenAI, Anthropic, etc.)',
        scores: { api: 2, leader: 1 },
      },
      {
        label: 'Self-hosted on my own infrastructure',
        scores: { builder: 2, scaler: 1 },
      },
      { label: 'Still evaluating options', scores: { explorer: 2 } },
    ],
  },
  {
    text: "What's your biggest concern right now?",
    options: [
      {
        label: 'Understanding how LLMs work under the hood',
        scores: { explorer: 2 },
      },
      { label: 'Reducing inference cost', scores: { scaler: 2, api: 1 } },
      {
        label: 'Lowering latency for my application',
        scores: { builder: 2, api: 1 },
      },
      {
        label: 'Scaling to handle more traffic',
        scores: { scaler: 2, builder: 1 },
      },
    ],
  },
  {
    text: 'What best describes your role?',
    options: [
      {
        label: 'Developer building an AI application',
        scores: { builder: 2, api: 1 },
      },
      {
        label: 'Infrastructure or platform engineer',
        scores: { scaler: 2, builder: 1 },
      },
      { label: 'Technical lead or engineering manager', scores: { leader: 3 } },
      { label: 'Researcher or learner', scores: { explorer: 2 } },
    ],
  },
];

const PROFILE_IDS: ProfileId[] = [
  'explorer',
  'api',
  'builder',
  'scaler',
  'leader',
];

const PROFILES: Record<ProfileId, Profile> = {
  explorer: {
    subtitle: 'Building your mental model',
    title: 'Start with the foundations',
    description:
      "You're building intuition for how LLMs work. These sections give you the clearest path from zero to confident.",
    chapters: [
      {
        title: 'What is LLM inference?',
        description: 'The core concept, explained from first principles',
        href: '/llm-inference-basics/what-is-llm-inference',
      },
      {
        title: 'How does an LLM work?',
        description: 'Tokenization, attention, prefill, decode — step by step',
        href: '/llm-inference-basics/how-does-llm-inference-work',
      },
      {
        title: 'Training vs. inference',
        description: 'Key differences and why inference is its own challenge',
        href: '/llm-inference-basics/training-inference-differences',
      },
      {
        title: 'Key inference metrics',
        description: 'What to actually measure: TTFT, TPOT, throughput, etc.',
        href: '/llm-inference-basics/llm-inference-metrics',
      },
      {
        title: 'GPU architecture fundamentals',
        description:
          'Threads, warps, SMs, and memory — the hardware LLMs run on',
        href: '/kernel-optimization/gpu-architecture-fundamentals',
      },
      {
        title: 'Kernel optimization for LLM inference',
        description: 'What GPU kernels are and why they matter for inference',
        href: '/kernel-optimization/kernel-optimization-for-llm-inference',
      },
    ],
  },
  api: {
    subtitle: 'Using managed APIs',
    title: 'Optimize your API usage',
    description:
      "You're shipping with a managed API. These sections help you understand what's under the hood and when self-hosting starts to make sense.",
    chapters: [
      {
        title: 'Serverless vs. self-hosted',
        description: 'When to switch, what you gain, what you give up',
        href: '/getting-started/serverless-vs-self-hosted-llm-inference',
      },
      {
        title: 'Key inference metrics',
        description:
          'Metrics that matter to your SLO: TTFT, TPOT, goodput, etc.',
        href: '/llm-inference-basics/llm-inference-metrics',
      },
      {
        title: 'Quantization',
        description: 'Lower cost and memory without hurting quality much',
        href: '/model-preparation/llm-quantization',
      },
      {
        title: 'Prompt engineering',
        description: 'Reduce token usage and improve output quality',
        href: '/model-interaction/prompt-engineering',
      },
    ],
  },
  builder: {
    subtitle: 'Running your own stack',
    title: 'Tune your self-hosted setup',
    description:
      "You're running your own infrastructure and want to squeeze out more performance. These sections are your best levers.",
    chapters: [
      {
        title: 'Continuous batching',
        description: 'A major throughput lever in LLM serving',
        href: '/inference-optimization/static-dynamic-continuous-batching',
      },
      {
        title: 'Speculative decoding',
        description: 'Up to 3× faster generation with the right draft model',
        href: '/inference-optimization/speculative-decoding',
      },
      {
        title: 'KV cache offloading',
        description: 'Handle longer contexts without running out of VRAM',
        href: '/inference-optimization/kv-cache-offloading',
      },
      {
        title: 'Choosing an inference framework',
        description: 'MAX, vLLM, SGLang, TensorRT LLM — what fits your needs',
        href: '/getting-started/choosing-the-right-inference-framework',
      },
      {
        title: 'FlashAttention',
        description:
          'Faster, memory-efficient attention, a classic kernel-level win',
        href: '/kernel-optimization/flashattention',
      },
      {
        title: 'Kernel optimization tools',
        description:
          'CUDA, Triton, TVM, Mojo, MAX — learn which layer to reach for first',
        href: '/kernel-optimization/kernel-optimization-tools',
      },
    ],
  },
  scaler: {
    subtitle: 'Operating at scale',
    title: 'Scale without breaking things',
    description:
      "You're managing traffic, cost, and reliability at scale. These sections talk about the infrastructure-level topics directly.",
    chapters: [
      {
        title: 'Parallelism strategies',
        description: 'TP, PP, DP, EP — how to split models across GPUs',
        href: '/inference-optimization/data-tensor-pipeline-expert-hybrid-parallelism',
      },
      {
        title: 'Prefix caching',
        description:
          'Eliminate redundant computation on shared prompt prefixes',
        href: '/inference-optimization/prefix-caching',
      },
      {
        title: 'Prefill-decode disaggregation',
        description:
          'Separate the two phases to eliminate scheduling conflicts',
        href: '/inference-optimization/prefill-decode-disaggregation',
      },
      {
        title: 'Inference routing',
        description:
          'Route requests based on cache locality, load, memory pressure, and more',
        href: '/inference-optimization/inference-routing',
      },
      {
        title: 'FlashAttention',
        description:
          'Cut attention memory pressure to fit more concurrent requests',
        href: '/kernel-optimization/flashattention',
      },
      {
        title: 'Kernel optimization tools',
        description:
          'Pick the right layer of the stack for kernel optimization',
        href: '/kernel-optimization/kernel-optimization-tools',
      },
    ],
  },
  leader: {
    subtitle: 'Setting technical direction',
    title: 'Make the right architectural calls',
    description:
      "You're evaluating options and setting direction. These sections give you the context to make sound build-vs-buy decisions and set realistic targets.",
    chapters: [
      {
        title: 'Serverless vs. self-hosted',
        description: 'Cost, control, and compliance tradeoffs laid out clearly',
        href: '/getting-started/serverless-vs-self-hosted-llm-inference',
      },
      {
        title: 'GPU memory requirements',
        description: 'Estimate VRAM needs before committing to hardware',
        href: '/getting-started/calculating-gpu-memory-for-llms',
      },
      {
        title: 'Key inference metrics',
        description: 'The numbers your team should be tracking and optimizing',
        href: '/llm-inference-basics/llm-inference-metrics',
      },
      {
        title: 'Choosing an inference framework',
        description:
          'How the major frameworks compare on features and maturity',
        href: '/getting-started/choosing-the-right-inference-framework',
      },
      {
        title: 'Kernel optimization for LLM inference',
        description: 'Why kernels matter and when custom kernel work pays off',
        href: '/kernel-optimization/kernel-optimization-for-llm-inference',
      },
      {
        title: 'GPU architecture fundamentals',
        description:
          'The hardware model behind every capacity and cost decision',
        href: '/kernel-optimization/gpu-architecture-fundamentals',
      },
    ],
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function StackQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);

  const isDone = step >= QUESTIONS.length;
  const question = !isDone ? QUESTIONS[step] : null;

  function selectAnswer(optionIdx: number) {
    const next = [...answers.slice(0, step), optionIdx];
    setAnswers(next);
    setStep(step + 1);
  }

  function computeProfile(): ProfileId {
    const scores = Object.fromEntries(
      PROFILE_IDS.map((id) => [id, 0])
    ) as Record<ProfileId, number>;
    answers.forEach((optIdx, qIdx) => {
      for (const [id, pts] of Object.entries(
        QUESTIONS[qIdx].options[optIdx].scores
      )) {
        scores[id as ProfileId] += pts!;
      }
    });
    return PROFILE_IDS.reduce(
      (best, id) => (scores[id] > scores[best] ? id : best),
      PROFILE_IDS[0]
    );
  }

  function reset() {
    setStep(0);
    setAnswers([]);
  }

  const profile = isDone ? PROFILES[computeProfile()] : null;
  const base = useBaseUrl('/').replace(/\/$/, ''); // e.g. '/llm'

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>Where are you in the stack?</div>
        <div className={styles.headerDesc}>
          3 questions · find your most relevant starting point
        </div>
      </div>

      <div className={styles.body}>
        {/* ── Step indicator ── */}
        <div className={styles.stepper}>
          {QUESTIONS.map((_, i) => (
            <div key={i} className={styles.stepItem}>
              <div
                className={`${styles.stepDot}
                ${i < step || isDone ? styles.stepDone : ''}
                ${i === step && !isDone ? styles.stepActive : ''}
              `}
              >
                {i < step || isDone ? '✓' : i + 1}
              </div>
              <div
                className={`${styles.stepLine} ${i < step || isDone ? styles.stepLineDone : ''}`}
              />
            </div>
          ))}
          <div
            className={`${styles.stepDot} ${isDone ? styles.stepResultDot : ''}`}
          >
            Result
          </div>
        </div>

        {/* ── Question ── */}
        {question && (
          <div className={styles.questionWrap}>
            <div className={styles.questionMeta}>
              Question {step + 1} of {QUESTIONS.length}
            </div>
            <div className={styles.questionText}>{question.text}</div>
            <div className={styles.options}>
              {question.options.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  className={styles.option}
                  onClick={() => selectAnswer(i)}
                >
                  <span className={styles.optionText}>{opt.label}</span>
                  <span className={styles.optionArrow}>→</span>
                </button>
              ))}
            </div>
            {step > 0 && (
              <button
                type="button"
                className={styles.backBtn}
                onClick={() => setStep(step - 1)}
              >
                ← Back
              </button>
            )}
          </div>
        )}

        {/* ── Result ── */}
        {isDone && profile && (
          <div className={styles.result}>
            <div className={styles.resultIntro}>
              <div className={styles.resultSubtitle}>{profile.subtitle}</div>
              <div className={styles.resultTitle}>{profile.title}</div>
              <div className={styles.resultDesc}>{profile.description}</div>
            </div>
            <div className={styles.chapterGrid}>
              {profile.chapters.map((ch) => (
                <a
                  key={ch.href}
                  href={base + ch.href}
                  className={styles.chapterCard}
                >
                  <div className={styles.chapterTitle}>{ch.title}</div>
                  <div className={styles.chapterDesc}>{ch.description}</div>
                  <div className={styles.chapterArrow}>→</div>
                </a>
              ))}
            </div>
            <button type="button" className={styles.retakeBtn} onClick={reset}>
              ↺ Retake quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
