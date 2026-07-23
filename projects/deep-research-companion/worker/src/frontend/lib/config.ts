export type NavItem = {
  href: string;
  label: string;
  external?: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export type SiteConfig = {
  name: string;
  description: string;
  url: string;
  author: {
    name: string;
    url: string;
  };
  links: {
    github: string;
  };
  /** Primary top-level links shown directly in the navbar. */
  navItems: NavItem[];
  /** Grouped destinations rendered as dropdown menus (desktop) / sections (mobile). */
  navGroups: NavGroup[];
};

export const siteConfig: SiteConfig = {
  name: "Deep Research Companion",
  description:
    "Multi-page edge frontend showcase using Astro, React, Shadcn UI, and assistant-ui with Cloudflare Agents SDK",
  url: "https://example.com",
  author: {
    name: "Author",
    url: "https://example.com",
  },
  links: {
    github: "https://github.com",
  },
  navItems: [
    { href: "/", label: "Research Library" },
  ],
  navGroups: [
    {
      label: "Config",
      items: [
        { href: "/config", label: "Configuration" },
        { href: "/config/tags", label: "Tags" },
      ],
    },
  ],
};
