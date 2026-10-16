import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"
import * as Component from "./quartz/components"

/**
 * Quartz 4 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "Oh-Research Blog",
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "google",
      tagId: "G-ZB140MEDPC",
    },
    locale: "ko-KR",
    // baseUrl: "oh-research.github.io/blog",
    baseUrl: "blog.ohsemin.com",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "created", // 블로그: 대표 날짜 = 작성일 (PLAN.md 디자인 결정 7)
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "IBM Plex Sans KR",
        body: "IBM Plex Sans KR",
        code: "IBM Plex Mono",
      },
      // 라이트 고정. darkMode는 타입상 필수라 lightMode와 같은 값을 넣는다 (토글 없음).
      colors: {
        lightMode: {
          light: "#fcfcfc",
          lightgray: "#e6eaee",
          gray: "#8a96a3",
          darkgray: "#2a3540",
          dark: "#0f1b2d",
          secondary: "#1e6fd9",
          tertiary: "#5b9bd5",
          highlight: "rgba(30, 111, 217, 0.08)",
          textHighlight: "#cfe5ff88",
        },
        darkMode: {
          light: "#fcfcfc",
          lightgray: "#e6eaee",
          gray: "#8a96a3",
          darkgray: "#2a3540",
          dark: "#0f1b2d",
          secondary: "#1e6fd9",
          tertiary: "#5b9bd5",
          highlight: "rgba(30, 111, 217, 0.08)",
          textHighlight: "#cfe5ff88",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-light", // 다크 모드 없음
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      // "N개 항목" 문구 제거 (PLAN.md 디자인 결정 9)
      Plugin.FolderPage({ pageBody: Component.FolderContent({ showFolderCount: false }) }),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      // Comment out CustomOgImages to speed up build time
      Plugin.CustomOgImages(),
    ],
  },
}

export default config
