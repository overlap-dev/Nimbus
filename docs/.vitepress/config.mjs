import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Nimbus",
  description: "A Framework to build event-driven applications in the cloud.",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: "/Nimbus.svg",
    search: {
      provider: "local",
    },
    markdown: {
      image: {
        lazyLoading: true,
      },
    },

    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/quickstart" },
      { text: "Reference", link: "/reference/commands" },
    ],

    sidebar: {
      guide: [
        {
          text: "What is Nimbus?",
          link: "/guide/what-is-nimbus",
        },
        {
          text: "Quickstart",
          link: "/guide/quickstart",
        },

        {
          text: "Core Concepts",
          items: [
            {
              text: "Commands",
              link: "/guide/commands",
            },
            {
              text: "Events",
              link: "/guide/events",
            },
            {
              text: "Queries",
              link: "/guide/queries",
            },
            {
              text: "Pure Core",
              link: "/guide/pure-core",
            },
            {
              text: "Imperative Shell",
              link: "/guide/imperative-shell",
            },
          ],
        },

        {
          text: "Infrastructure as Code",
          items: [
            {
              text: "Pulumi",
              link: "/guide/pulumi",
            },
          ],
        },
      ],

      reference: [
        {
          text: "Core",
          items: [
            {
              text: "Commands",
              link: "/reference/commands",
            },
          ],
        },
      ],
    },

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/overlap-dev/Nimbus",
      },
    ],

    footer: {
      message:
        'Released under the <a href="https://github.com/overlap-dev/Nimbus/blob/main/LICENSE">MIT License</a>.',
      copyright:
        'Copyright © 2024-present <a href="https://overlap.at">Overlap GmbH & Co KG</a>',
    },
  },
});
