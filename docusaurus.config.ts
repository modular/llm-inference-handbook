import type { Config } from '@docusaurus/types'
import type * as Preset from '@docusaurus/preset-classic'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { themes as prismThemes } from 'prism-react-renderer'

const tailwindConfig = require('./src/plugins/tailwind-config')

const config: Config = {
  title: 'LLM Inference Handbook',
  tagline:
    'A practical handbook for engineers building, optimizing, scaling, and operating LLM inference systems in production.',
  favicon: 'images/favicon.ico',

  url: 'https://handbook.modular.com',
  baseUrl: '/',
  trailingSlash: true,

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en']
  },

  markdown: {
    format: 'mdx'
  },

  headTags: [
    {
      tagName: 'script',
      attributes: {
        src: '/gtm-init.js'
      }
    }
  ],

  scripts: [
    {
      src: '/customerio.js',
      defer: true
    }
  ],

  plugins: [
    'docusaurus-plugin-sass',
    tailwindConfig,
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [
          {
            from: '/inference-optimization/flashattention',
            to: '/kernel-optimization/flashattention'
          },
          {
            from: '/kernel-optimization/frameworks-and-tools',
            to: '/kernel-optimization/kernel-optimization-tools'
          },
          {
            from: '/inference-optimization/llm-inference-metrics',
            to: '/llm-inference-basics/llm-inference-metrics'
          }
        ]
      }
    ],
    [
      'docusaurus-markdown-source-plugin',
      {
        docsPath: '/',
        fullyQualifiedLinks: true,
        directive:
          '> For the complete documentation index, see [llms.txt](/llms.txt).\n' +
          '> Markdown versions of all pages are available by appending .md to any URL.',
        htmlDirective:
          'IMPORTANT: To view this page as Markdown, append `.md` to the URL.\n' +
          'For the complete documentation index, see <a href="/llms.txt">llms.txt</a>.',
        containerSelector: '.doc-actions',
        copyButtonText: 'Copy as Markdown',
        copiedButtonText: 'Copied!'
      }
    ],
    [
      'docusaurus-plugin-llms',
      {
        title: 'LLM Inference Handbook',
        description:
          'A practical handbook for engineers building, optimizing, scaling, and operating LLM inference systems in production.',
        rootContent:
          'Markdown versions of all pages are available by appending `.md` to any URL.\n\n' +
          '- [LLM Inference Handbook](https://handbook.modular.com/index.md): A practical handbook for engineers building, optimizing, scaling, and operating LLM inference systems in production.\n',
        generateLLMsFullTxt: false,
        excludeImports: true,
        docsDir: 'docs',
        ignoreFiles: [
          '**/LICENSE',
          '**/README.md',
          '**/img/**',
          'adr/**',
          'index.md'
        ],
        includeOrder: [
          'getting-started/**/*',
          'llm-inference-basics/**/*',
          'inference-optimization/**/*',
          'kernel-optimization/**/*',
          'model-preparation/**/*',
          'model-interaction/**/*',
          'infrastructure-and-operations/**/*'
        ],
        includeUnmatchedLast: true
      }
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        routeBasePath: '/',
        path: './docs',
        sidebarPath: './sidebars.ts',
        editUrl: 'https://github.com/modular/llm-inference-handbook/edit/main/',
        breadcrumbs: true,
        exclude: ['**/README.md', '**/LICENSE', 'adr/**'],
        remarkPlugins: [remarkMath],
        rehypePlugins: [rehypeKatex],
        sidebarItemsGenerator: async (args) => {
          const { defaultSidebarItemsGenerator } = args
          const items = await defaultSidebarItemsGenerator(args)

          return items.map((item) => {
            if (item.customProps?.collapsed !== undefined) {
              return {
                ...item,
                collapsed: Boolean(item.customProps?.collapsed)
              }
            }
            return item
          })
        },
        admonitions: {
          keywords: ['experiment'],
          extendDefaults: true
        }
      }
    ],
    function gtmNoScriptPlugin() {
      return {
        name: 'llm-handbook-gtm-noscript',
        injectHtmlTags() {
          return {
            preBodyTags: [
              {
                tagName: 'noscript',
                innerHTML:
                  '<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-NP3FRS6S" height="0" width="0" style="display:none;visibility:hidden"></iframe>'
              }
            ]
          }
        }
      }
    }
  ],

  presets: [
    [
      'classic',
      {
        docs: false,
        theme: {
          customCss: ['./src/css/custom.scss']
        },
        blog: false
      } satisfies Preset.Options
    ]
  ],

  stylesheets: [
    {
      href: 'https://cdn.jsdelivr.net/npm/katex@0.13.24/dist/katex.min.css',
      type: 'text/css',
      integrity:
        'sha384-odtC+0UGzzFL/6PNoE8rX/SPcQDXBJ+uRepguP4QkPCm2LBxH3FA3y+fKSiJ+AmM',
      crossorigin: 'anonymous'
    }
  ],

  themeConfig: {
    image: 'img/handbook-meta-image.png',
    navbar: {
      logo: {
        alt: 'Modular',
        src: 'images/modular-logo-black.svg',
        srcDark: 'images/modular-logo-white.svg',
        href: 'https://www.modular.com',
        target: '_self',
        width: 104,
        height: 16
      },
      items: [
        {
          href: 'https://console.modular.com/signup?utm_source=llm_handbook',
          label: 'Sign up',
          position: 'right',
          className: 'navbar-btn-primary'
        }
      ]
    },
    footer: {
      logo: {
        alt: 'Modular',
        src: 'images/modular-logo-black.svg',
        srcDark: 'images/modular-logo-white.svg',
        href: 'https://www.modular.com'
      },
      links: [
        {
          items: [
            {
              label: 'Models',
              href: 'https://www.modular.com/models'
            },
            {
              label: 'Blog',
              href: 'https://www.modular.com/blog'
            },
            {
              label: 'Community',
              href: 'https://www.modular.com/community'
            },
            {
              label: 'GitHub',
              href: 'https://github.com/modular/llm-inference-handbook'
            },
            {
              label: 'Contact',
              href: 'https://www.modular.com/request-demo?utm_source=llm_handbook'
            }
          ]
        }
      ],
      copyright: `© ${new Date().getFullYear()} Modular Inc`
    },
    prism: {
      additionalLanguages: ['bash'],
      theme: prismThemes.github,
      darkTheme: prismThemes.oneDark
    },
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true
    },
    algolia: {
      appId: 'YKT8GOY8JO',
      // DocSearch runs in the browser, so this key ships to the client and must
      // stay read-only (search ACL). Never replace it with an admin or
      // write-capable key.
      apiKey: 'afcc1015b8a021c0e5bd3292da05d2cb',
      indexName: 'inference-handbook',
      contextualSearch: true,
      searchPagePath: 'search',
      insights: false,
      placeholder: 'Search the handbook',
      translations: {
        button: {
          buttonText: 'Search the handbook',
          buttonAriaLabel: 'Search the handbook'
        }
      }
    }
  } satisfies Preset.ThemeConfig,

  future: {
    faster: {
      rspackBundler: true,
      rspackPersistentCache: true,
      swcJsLoader: true,
      swcJsMinimizer: true,
      swcHtmlMinimizer: true,
      lightningCssMinimizer: true,
      mdxCrossCompilerCache: true
    }
  }
}

export default config
