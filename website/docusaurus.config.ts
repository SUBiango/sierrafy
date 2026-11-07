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
        /**
         * The build log at docs.sierrafy.dev/log. Entries record a decision,
         * a trade-off or a mistake, with the numbers behind it.
         *
         * Docs own `routeBasePath: '/'`, so the blog takes `/log`. Every
         * `on*` setting below is set to 'throw' for the same reason as
         * `onBrokenLinks`: these are mistakes that are invisible in a built
         * site and obvious in a failed build.
         */
        blog: {
          path: './blog',
          routeBasePath: 'log',
          blogTitle: 'Build log',
          blogDescription:
            'The decisions behind Sierrafy, the trade-offs, the mistakes and the numbers.',
          blogSidebarTitle: 'All entries',
          blogSidebarCount: 'ALL',
          postsPerPage: 10,
          showReadingTime: true,
          editUrl: 'https://github.com/SUBiango/sierrafy/tree/main/website/',
          // Authors and tags are declared in blog/authors.yml and blog/tags.yml.
          onInlineAuthors: 'throw',
          onInlineTags: 'throw',
          // An entry with no <!-- truncate --> marker dumps its whole body onto
          // the index page, which is how a build log stops being skimmable.
          onUntruncatedBlogPosts: 'throw',
          feedOptions: {
            type: ['rss', 'atom'],
            title: 'Sierrafy build log',
            description:
              'The decisions behind Sierrafy, the trade-offs, the mistakes and the numbers.',
            copyright:
              'Sierrafy build log. An independent open-source project, not an NCRA product.',
            xslt: true,
          },
        },
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
        { to: '/log', label: 'Build log', position: 'left' },
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
            { label: 'Build log', to: '/log' },
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
