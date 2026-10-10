import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

/**
 * The docs are their own Netlify site at docs.sierrafy.dev, separate from the
 * hand-built landing page at sierrafy.dev.
 *
 * Keeping them apart means the landing page deploys with no build step and no
 * dependencies, and `baseUrl` stays '/', so assets are referenced relative to
 * the site root and the build can be served from any directory.
 */
const config: Config = {
  title: 'Sierrafy',
  tagline: 'Identity verification for Sierra Leone, built in the open',
  favicon: 'img/favicon.svg',

  url: 'https://docs.sierrafy.dev',
  baseUrl: '/',

  organizationName: 'SUBiango',
  projectName: 'sierrafy',

  // A broken link shipped to a docs site is worse than a failed build.
  onBrokenLinks: 'throw',
  markdown: { hooks: { onBrokenMarkdownLinks: 'throw' } },

  i18n: { defaultLocale: 'en', locales: ['en'] },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/SUBiango/sierrafy/tree/main/website/',
        },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: { defaultMode: 'dark', respectPrefersColorScheme: true },
    navbar: {
      title: 'sierrafy',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://sierrafy.dev/',
          label: 'sierrafy.dev',
          position: 'right',
        },
        {
          href: 'https://github.com/SUBiango/sierrafy',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Install', to: '/install' },
            { label: 'NIN validation', to: '/nin-validation' },
            { label: 'Scope', to: '/scope' },
          ],
        },
        {
          title: 'Project',
          items: [
            { label: 'GitHub', href: 'https://github.com/SUBiango/sierrafy' },
            {
              label: 'Changelog',
              href: 'https://github.com/SUBiango/sierrafy/blob/main/CHANGELOG.md',
            },
            {
              label: 'Contributing',
              href: 'https://github.com/SUBiango/sierrafy/blob/main/CONTRIBUTING.md',
            },
          ],
        },
      ],
      copyright:
        'MIT licensed. An independent open-source project, not an NCRA product.',
    },
    prism: { additionalLanguages: ['bash', 'json'] },
  } satisfies Preset.ThemeConfig,
};

export default config;
