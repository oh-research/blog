// 커스텀: 상단 헤더 (사이트명 + 카테고리 링크). Quartz 기본에 없음.
// 사용: quartz.layout.ts의 header 슬롯. 검색은 별도 Component.Search()를 같은 슬롯에 둔다.
import { FullSlug, pathToRoot, resolveRelative } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"

interface Options {
  /** 헤더에 노출할 카테고리 = content/ 바로 아래 폴더명. 순서대로 표시. */
  categories: string[]
}

export default ((opts: Options) => {
  const NavHeader: QuartzComponent = ({ fileData, cfg, displayClass }: QuartzComponentProps) => {
    const title = cfg?.pageTitle ?? i18n(cfg.locale).propertyDefaults.title
    const slug = fileData.slug!
    const current = slug.split("/")[0]

    return (
      <nav class={classNames(displayClass, "nav-header")} aria-label="site">
        <a class="site-title" href={pathToRoot(slug)}>
          {title}
        </a>
        <ul class="nav-links">
          {opts.categories.map((cat) => (
            <li>
              <a
                href={resolveRelative(slug, `${cat}/index` as FullSlug)}
                class={cat === current ? "active" : ""}
              >
                {cat}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    )
  }

  NavHeader.css = `
.nav-header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 1.75rem;
  row-gap: 0.4rem;
  flex: 1 1 auto;
  min-width: 0;
}

.nav-header .site-title {
  font-family: var(--titleFont);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--dark);
  white-space: nowrap;
}

.nav-header .nav-links {
  display: flex;
  flex-wrap: wrap;
  gap: 1.1rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-header .nav-links li {
  margin: 0;
}

.nav-header .nav-links a {
  color: var(--darkgray);
  font-weight: 500;
  font-size: 0.95rem;
}

.nav-header a:hover,
.nav-header .nav-links a.active {
  color: var(--secondary);
}
`
  return NavHeader
}) satisfies QuartzComponentConstructor<Options>
