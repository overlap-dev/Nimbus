import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: "Nimbus",
    description: "A Framework to build event-driven applications in the cloud.",
    themeConfig: {
        // https://vitepress.dev/reference/default-theme-config
        logo:
            "https://raw.githubusercontent.com/overlap-dev/Nimbus/main/media/Nimbus.svg",
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
                    text: "Guide",
                    items: [
                        {
                            text: "Project Structure",
                            link: "/guide/project-structure",
                        },
                        {
                            text: "Router",
                            link: "/guide/router",
                        },
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
                            text: "Repositories",
                            link: "/guide/repositories",
                        },
                    ],
                },

                {
                    text: "Packages",
                    items: [
                        {
                            text: "Oak",
                            link: "/guide/project-structure",
                        },
                        {
                            text: "MongoDB",
                            link: "/guide/commands",
                        },
                        {
                            text: "Utils",
                            link: "/guide/queries",
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
