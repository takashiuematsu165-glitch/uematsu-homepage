/**
 * デザイン方針: 既存の淡いブルー背景、ガラス調パネル、ブルー／ピンクのアクセントを維持し、
 * 情報の視認性と穏やかなマイクロインタラクションのみを改善する。
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, Route, Router as WouterRouter, Switch, useLocation, useParams } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import {
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  AtSign,
  BookOpen,
  Briefcase,
  CheckCircle2,
  CircleAlert,
  CircleUserRound,
  Code2,
  Clock3,
  Copy,
  Instagram,
  Link2,
  LoaderCircle,
  Mail,
  Menu,
  MessageCircle,
  Music2,
  Newspaper,
  Send,
  ShieldCheck,
  Video,
  X,
} from "lucide-react";

const STATIC_ASSET_BASE = `${import.meta.env.BASE_URL}assets/`;
const PROFILE_IMAGE = `${STATIC_ASSET_BASE}profile-thumb.png`;
const HERO_ORBS = `${STATIC_ASSET_BASE}hero-tech-orbs.webp`;
const CONTACT_MOTIF = `${STATIC_ASSET_BASE}contact-orbital-motif.webp`;
const SOCIAL_MOTIF = `${STATIC_ASSET_BASE}social-constellation-motif.webp`;
const BRAND_MARK = `${STATIC_ASSET_BASE}brand-symbol.webp`;
const MICROCMS_DOMAIN = "1jzsnsr5i6";
const MICROCMS_API_KEY = "MBWNeoQ3aihAV1yIErRAkHv3l3wnRETvU1Qj";
const MICROCMS_NEWS_ENDPOINT = `https://${MICROCMS_DOMAIN}.microcms.io/api/v1/news`;
const COOKIE_CONSENT_NAME = "koki_cookie_consent";
const COOKIE_SETTINGS_EVENT = "koki:open-cookie-settings";
const GOOGLE_ANALYTICS_MEASUREMENT_ID = "G-S6GMRTWF52";
const EMAIL_GATE_ENDPOINT = "https://uematsu-email-gate.takashiuematsu165.workers.dev";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/profile", label: "Profile" },
  { href: "/news", label: "News" },
  { href: "/sns", label: "SNS & Links" },
  { href: "/contact", label: "Contact" },
];

type CookieConsentChoice = "accepted" | "rejected";

function getCookie(name: string) {
  const prefix = `${encodeURIComponent(name)}=`;
  const found = document.cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(prefix));
  return found ? decodeURIComponent(found.slice(prefix.length)) : "";
}

function saveCookieConsent(choice: CookieConsentChoice) {
  const oneYearInSeconds = 60 * 60 * 24 * 365;
  const secureAttribute = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${encodeURIComponent(COOKIE_CONSENT_NAME)}=${encodeURIComponent(choice)}; Path=/; Max-Age=${oneYearInSeconds}; SameSite=Lax${secureAttribute}`;
}

function getGoogleAnalyticsWindow() {
  return window as Window & { dataLayer?: IArguments[]; gtag?: (...args: unknown[]) => void };
}

function loadAnalyticsAfterConsent() {
  if (document.querySelector("script[data-consent-google-analytics='true']")) return;
  const analyticsWindow = getGoogleAnalyticsWindow();
  analyticsWindow.dataLayer ??= [];
  analyticsWindow.gtag = function (..._args: unknown[]) {
    analyticsWindow.dataLayer?.push(arguments);
  };
  analyticsWindow.gtag("js", new Date());
  analyticsWindow.gtag("config", GOOGLE_ANALYTICS_MEASUREMENT_ID, { send_page_view: false });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GOOGLE_ANALYTICS_MEASUREMENT_ID)}`;
  script.dataset.consentGoogleAnalytics = "true";
  document.head.appendChild(script);
  trackPageView();
}

function revokeGoogleAnalyticsConsent() {
  const analyticsWindow = getGoogleAnalyticsWindow();
  analyticsWindow.gtag?.("consent", "update", { analytics_storage: "denied" });
  document.cookie.split(";").map((item) => item.trim().split("=")[0]).filter((name) => name.startsWith("_ga")).forEach((name) => {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
  });
}

function trackAnalyticsEvent(eventName: string, parameters: Record<string, string | number | boolean>) {
  if (getCookie(COOKIE_CONSENT_NAME) !== "accepted") return false;
  if (!document.querySelector("script[data-consent-google-analytics='true']")) return false;
  getGoogleAnalyticsWindow().gtag?.("event", eventName, parameters);
  return true;
}

function getAnalyticsPagePath() {
  return window.location.hash.replace(/^#/, "") || "/";
}

function trackPageView() {
  const analyticsWindow = getGoogleAnalyticsWindow() as ReturnType<typeof getGoogleAnalyticsWindow> & { __kokiLastTrackedPagePath?: string };
  const pagePath = getAnalyticsPagePath();
  if (analyticsWindow.__kokiLastTrackedPagePath === pagePath) return;
  const wasTracked = trackAnalyticsEvent("page_view", {
    page_path: pagePath,
    page_location: window.location.href,
    page_title: document.title,
  });
  if (wasTracked) analyticsWindow.__kokiLastTrackedPagePath = pagePath;
}

type NewsItem = {
  id: string;
  title?: string;
  publishedAt?: string;
  content?: string;
  excerpt?: string;
  summary?: string;
  description?: string;
  category?: NewsCategory | NewsCategory[] | null;
};

type NewsCategory = {
  id: string;
  name?: string;
};

type FetchState<T> = {
  status: "loading" | "ready" | "empty" | "error";
  data: T;
};

function formatNewsDate(date?: string) {
  if (!date) return "";
  const parsed = new Date(date);
  return Number.isNaN(parsed.valueOf()) ? "" : parsed.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function textFromHtml(value?: string) {
  if (!value) return "";
  const text = new DOMParser().parseFromString(value, "text/html").body.textContent?.replace(/\s+/g, " ").trim() ?? "";
  return text.length > 92 ? `${text.slice(0, 92)}…` : text;
}

function newsExcerpt(item: NewsItem) {
  return textFromHtml(item.excerpt || item.summary || item.description || item.content) || "お知らせの詳細をご覧ください。";
}

function categoryOf(item: NewsItem) {
  const category = Array.isArray(item.category) ? item.category[0] : item.category;
  return category?.id ? category : null;
}

function sanitizeArticleHtml(value?: string) {
  if (!value) return "";
  const documentFragment = new DOMParser().parseFromString(value, "text/html");
  documentFragment.querySelectorAll("script, style, iframe, object, embed, link").forEach((element) => element.remove());
  documentFragment.querySelectorAll("*").forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const normalizedValue = attribute.value.trim().toLowerCase();
      if (name.startsWith("on") || name === "style" || (name === "href" && normalizedValue.startsWith("javascript:")) || (name === "src" && normalizedValue.startsWith("javascript:"))) {
        element.removeAttribute(attribute.name);
      }
    });
  });
  return documentFragment.body.innerHTML;
}

function useNewsList(limit: number) {
  const [state, setState] = useState<FetchState<NewsItem[]>>({ status: "loading", data: [] });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading", data: [] });
    fetch(`${MICROCMS_NEWS_ENDPOINT}?limit=${limit}&orders=-publishedAt`, {
      headers: { "X-MICROCMS-API-KEY": MICROCMS_API_KEY },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("news fetch failed");
        return response.json() as Promise<{ contents?: NewsItem[] }>;
      })
      .then((payload) => {
        const contents = Array.isArray(payload.contents) ? payload.contents : [];
        setState({ status: contents.length ? "ready" : "empty", data: contents });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ status: "error", data: [] });
      });
    return () => controller.abort();
  }, [limit]);

  return state;
}

function useCategoryList() {
  const [state, setState] = useState<FetchState<NewsCategory[]>>({ status: "loading", data: [] });

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${MICROCMS_NEWS_ENDPOINT.replace(/\/news$/, "/categories")}?limit=100&orders=publishedAt`, {
      headers: { "X-MICROCMS-API-KEY": MICROCMS_API_KEY },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("category fetch failed");
        return response.json() as Promise<{ contents?: NewsCategory[] }>;
      })
      .then((payload) => {
        const contents = Array.isArray(payload.contents) ? payload.contents : [];
        setState({ status: contents.length ? "ready" : "empty", data: contents });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ status: "error", data: [] });
      });
    return () => controller.abort();
  }, []);

  return state;
}

function useNewsArticle(id?: string) {
  const [state, setState] = useState<FetchState<NewsItem | null>>({ status: "loading", data: null });

  useEffect(() => {
    if (!id) {
      setState({ status: "error", data: null });
      return;
    }
    const controller = new AbortController();
    setState({ status: "loading", data: null });
    fetch(`${MICROCMS_NEWS_ENDPOINT}/${encodeURIComponent(id)}`, {
      headers: { "X-MICROCMS-API-KEY": MICROCMS_API_KEY },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("article fetch failed");
        return response.json() as Promise<NewsItem>;
      })
      .then((article) => setState({ status: "ready", data: article }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ status: "error", data: null });
      });
    return () => controller.abort();
  }, [id]);

  return state;
}

function useRevealOnScroll() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealed = new WeakSet<HTMLElement>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add("is-visible");
            revealed.add(entry.target as HTMLElement);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -28px" },
    );

    const observe = (item: HTMLElement) => {
      if (revealed.has(item)) return;
      if (reduceMotion) {
        item.classList.add("is-visible");
        revealed.add(item);
        return;
      }
      observer.observe(item);
    };
    const observeReveals = (root: ParentNode) => {
      if (root instanceof HTMLElement && root.hasAttribute("data-reveal")) observe(root);
      root.querySelectorAll<HTMLElement>("[data-reveal]").forEach(observe);
    };

    observeReveals(document);
    const mutationObserver = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) observeReveals(node);
      }));
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, []);
}

function AppShell({ children }: { children: ReactNode }) {
  useRevealOnScroll();
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const scrollMilestonesRef = useRef(new Set<number>());

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    const closeOnResize = () => {
      if (window.innerWidth > 920) setMenuOpen(false);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", closeOnResize, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", closeOnResize);
    };
  }, []);

  useEffect(() => {
    scrollMilestonesRef.current.clear();
    trackPageView();

    const trackScrollDepth = () => {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollableHeight <= 0) return;
      const progress = Math.min(100, Math.round((window.scrollY / scrollableHeight) * 100));
      [25, 50, 75, 90].forEach((milestone) => {
        if (progress < milestone || scrollMilestonesRef.current.has(milestone)) return;
        scrollMilestonesRef.current.add(milestone);
        trackAnalyticsEvent("scroll_depth", { percent_scrolled: milestone, page_path: getAnalyticsPagePath() });
      });
    };

    trackScrollDepth();
    window.addEventListener("scroll", trackScrollDepth, { passive: true });
    return () => window.removeEventListener("scroll", trackScrollDepth);
  }, [location]);

  useEffect(() => {
    const trackLinkClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>("a");
      if (!link) return;
      const socialNetwork = link.dataset.analyticsSocial;
      const contactMethod = link.dataset.analyticsContactMethod;
      const ctaName = link.dataset.analyticsCta;
      const newsId = link.dataset.analyticsNewsId;
      const newsTitle = link.dataset.analyticsNewsTitle;
      const href = link.getAttribute("href") || "";
      const linkText = link.textContent?.replace(/\s+/g, " ").trim() || "未設定";
      const navigationArea = link.closest(".site-header") ? "header" : link.closest(".site-footer") ? "footer" : "content";
      if (socialNetwork) {
        trackAnalyticsEvent("social_link_click", { social_network: socialNetwork, link_location: "sns_page" });
      }
      if (contactMethod) {
        trackAnalyticsEvent("contact_method_click", { contact_method: contactMethod, link_location: "contact_page" });
      }
      if (ctaName) {
        trackAnalyticsEvent("cta_click", { cta_name: ctaName, page_path: getAnalyticsPagePath() });
      }
      if (newsId) {
        trackAnalyticsEvent("news_article_click", { article_id: newsId, article_title: newsTitle || "お知らせ", page_path: getAnalyticsPagePath() });
      }
      if (["/contact", "#/contact"].includes(href)) {
        const linkLocation = navigationArea === "header" ? "header_navigation" : navigationArea === "footer" ? "footer_navigation" : "content";
        trackAnalyticsEvent("contact_page_click", { link_location: linkLocation });
      }
      if (navigationArea !== "content") {
        trackAnalyticsEvent("site_navigation_click", { navigation_area: navigationArea, destination: href || "/", link_text: linkText });
      }
      const isExternalHttpLink = (link.protocol === "http:" || link.protocol === "https:") && link.origin !== window.location.origin;
      if (isExternalHttpLink) {
        trackAnalyticsEvent("outbound_link_click", { link_domain: link.hostname, link_text: linkText, page_path: getAnalyticsPagePath() });
      }
    };
    document.addEventListener("click", trackLinkClick, true);
    return () => document.removeEventListener("click", trackLinkClick, true);
  }, []);

  const isActive = (href: string) => (href === "/" ? location === "/" : location.startsWith(href));

  return (
    <div className="site-shell">
      <header className={`site-header ${scrolled ? "site-header--scrolled" : ""}`}>
        <div className="header-inner">
          <Link href="/" className="brand" aria-label="植松康希 ホームへ">
            <img className="brand-mark" src={BRAND_MARK} alt="" aria-hidden="true" />
            <span className="brand-copy"><strong>植松康希</strong><span>Koki Uematsu</span></span>
          </Link>
          <button
            className="menu-button"
            type="button"
            aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={19} strokeWidth={2.4} /> : <Menu size={20} strokeWidth={2.4} />}
            <span>Menu</span>
          </button>
          <nav id="primary-navigation" className={`main-nav ${menuOpen ? "main-nav--open" : ""}`} aria-label="メインナビゲーション">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={isActive(item.href) ? "is-current" : ""} aria-current={isActive(item.href) ? "page" : undefined} onClick={() => setMenuOpen(false)}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand"><strong>植松康希</strong><span>Koki Uematsu</span></div>
          <nav className="footer-nav" aria-label="フッターナビゲーション">
            {navItems.slice(1).map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
            <Link href="/privacy">Privacy Policy</Link>
            <button className="footer-cookie-settings" type="button" onClick={() => window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT))}>Cookie設定</button>
          </nav>
          <p className="footer-note">© {new Date().getFullYear()} Koki Uematsu</p>
        </div>
      </footer>
      <BackToTop />
      <CookieConsent />
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setVisible(window.scrollY > 420);
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  const returnToTop = () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    trackAnalyticsEvent("back_to_top_click", { page_path: getAnalyticsPagePath(), scroll_position: Math.round(window.scrollY) });
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  };

  return <button className={`back-to-top ${visible ? "back-to-top--visible" : ""}`} type="button" aria-label="ページの先頭へ戻る" onClick={returnToTop}><ArrowUp size={18} aria-hidden="true" /><span>Top</span></button>;
}

function CookieConsent() {
  const [choice, setChoice] = useState<CookieConsentChoice | null>(() => {
    const saved = getCookie(COOKIE_CONSENT_NAME);
    return saved === "accepted" || saved === "rejected" ? saved : null;
  });
  const [isOpen, setIsOpen] = useState(() => !choice);

  useEffect(() => {
    if (choice === "accepted") loadAnalyticsAfterConsent();
    if (choice === "rejected") revokeGoogleAnalyticsConsent();
  }, [choice]);

  useEffect(() => {
    const openSettings = () => setIsOpen(true);
    window.addEventListener(COOKIE_SETTINGS_EVENT, openSettings);
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, openSettings);
  }, []);

  const setConsent = (nextChoice: CookieConsentChoice) => {
    saveCookieConsent(nextChoice);
    setChoice(nextChoice);
    setIsOpen(false);
  };

  if (!isOpen) return null;
  const isSettings = choice !== null;
  return (
    <aside className="cookie-banner" role="dialog" aria-live="polite" aria-label="Cookieの設定">
      <div className="cookie-banner__copy"><div className="cookie-banner__heading"><span className="cookie-banner__seal"><ShieldCheck size={19} aria-hidden="true" /></span><div><p className="cookie-banner__eyebrow">Privacy controls</p><h2>{isSettings ? "Cookieの設定を変更" : "Cookieの利用について"}</h2></div></div><p>本サイトでは、利用状況の把握と改善のためにGoogle アナリティクスのCookieを使用します。同意を選んだ場合のみ、Google アナリティクスを読み込みます。</p></div>
      <div className="cookie-banner__actions"><Link className="cookie-policy-link" href="/privacy"><span>プライバシーポリシー</span><ArrowRight size={15} aria-hidden="true" /></Link><div className="cookie-banner__choices"><button className="cookie-button cookie-button--secondary" type="button" onClick={() => setConsent("rejected")}>拒否する</button><button className="cookie-button cookie-button--primary" type="button" onClick={() => setConsent("accepted")}>同意する</button></div></div>
    </aside>
  );
}

function PageHero({ eyebrow, title, lead, motif, pageClassName = "" }: { eyebrow: string; title: string; lead: string; motif?: string; pageClassName?: string }) {
  return (
    <section className={`page-hero ${pageClassName}`}>
      {motif && <img className="page-hero__motif" src={motif} alt="" aria-hidden="true" />}
      <div className="page-hero__inner">
        <div data-reveal>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="page-title">{title}</h1>
        </div>
        <p className="page-lead" data-reveal style={{ transitionDelay: "90ms" }}>{lead}</p>
      </div>
    </section>
  );
}

function NewsCard({ item, delay }: { item: NewsItem; delay?: string }) {
  const category = categoryOf(item);
  return (
    <Link className="news-card news-card--link" href={`/news/${encodeURIComponent(item.id)}`} data-reveal data-analytics-news-id={item.id} data-analytics-news-title={item.title || "お知らせ"} style={{ transitionDelay: delay }}>
      <span>{formatNewsDate(item.publishedAt) || "News"}</span>
      {category?.name && <span className="news-category">{category.name}</span>}
      <h3>{item.title || "お知らせ"}</h3>
      <p>{newsExcerpt(item)}</p>
      <span className="news-card__action">続きを読む <ArrowRight size={16} aria-hidden="true" /></span>
    </Link>
  );
}

function NewsListState({ status, compact = false }: { status: FetchState<NewsItem[]>["status"]; compact?: boolean }) {
  if (status === "loading") return <div className={`news-state ${compact ? "news-state--compact" : ""}`} data-reveal><Newspaper size={19} aria-hidden="true" /><p>お知らせを読み込み中です。</p></div>;
  if (status === "empty") return <div className="news-state" data-reveal><Newspaper size={19} aria-hidden="true" /><p>お知らせはまだありません。</p></div>;
  return <div className="news-state news-state--error" data-reveal><CircleAlert size={19} aria-hidden="true" /><p>お知らせを取得できませんでした。時間をおいて再度お試しください。</p></div>;
}

function LatestNews() {
  const news = useNewsList(2);
  return (
    <section className="content-section news-preview">
      <div className="section-heading" data-reveal>
        <div><Eyebrow>News</Eyebrow><h2>お知らせ</h2></div>
        <Link className="inline-link" href="/news">一覧を見る <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      {news.status === "ready" ? <div className="news-grid">{news.data.map((item, index) => <NewsCard key={item.id} item={item} delay={`${index * 70}ms`} />)}</div> : <NewsListState status={news.status} compact />}
    </section>
  );
}

function HomePage() {
  return (
    <AppShell>
      <section className="hero">
        <img className="hero-orbs" src={HERO_ORBS} alt="" aria-hidden="true" />
        <div className="hero-inner">
          <div className="hero-copy hero-copy--panel" data-reveal>
            <Eyebrow>Official Profile Site</Eyebrow>
            <h1 className="hero-title">植松康希</h1>
            <p className="hero-lead">Koki Uematsu。勉強に苦しみながらパソコンを触る学生です。</p>
            <Link className="text-link" href="/profile" data-analytics-cta="hero_profile">プロフィールを見る <ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      <LatestNews />
    </AppShell>
  );
}

function ProfilePage() {
  return (
    <AppShell>
      <PageHero eyebrow="Profile" title="プロフィール" lead="興味のあること、普段取り組んでいることを、少しずつまとめています。" />
      <section className="content-section profile-section">
        <article className="profile-card" data-reveal>
          <img src={PROFILE_IMAGE} alt="植松康希のプロフィール画像" />
          <div><Eyebrow>Koki Uematsu</Eyebrow><h2>植松康希</h2><p>パソコンに触れながら、興味を持ったことを試したり、考えたりしています。ここでは活動や発信先をまとめています。</p><ul className="tag-list"><li>Student</li><li>PC</li><li>Learning</li></ul></div>
        </article>
      </section>
    </AppShell>
  );
}

function NewsPage() {
  const news = useNewsList(100);
  const categories = useCategoryList();
  const [activeCategory, setActiveCategory] = useState("all");
  const categoryOptions = categories.status === "ready" ? categories.data : [];
  const hasUncategorizedNews = news.data.some((item) => !categoryOf(item));
  const filteredNews = activeCategory === "all" ? news.data : activeCategory === "uncategorized" ? news.data.filter((item) => !categoryOf(item)) : news.data.filter((item) => categoryOf(item)?.id === activeCategory);

  useEffect(() => {
    const categoryStillExists = activeCategory === "all" || activeCategory === "uncategorized" ? activeCategory !== "uncategorized" || hasUncategorizedNews : categoryOptions.some((category) => category.id === activeCategory);
    if (!categoryStillExists) setActiveCategory("all");
  }, [activeCategory, categoryOptions, hasUncategorizedNews]);

  return (
    <AppShell>
      <PageHero eyebrow="News" title="お知らせ" lead="サイトに関する更新や、これからの予定を掲載しています。" />
      <section className="content-section narrow-section">
        {news.status === "ready" ? <>
          <div className="category-filter" data-reveal aria-label="お知らせのカテゴリーで絞り込む">
            <span className="category-filter__label">カテゴリー</span>
            <div className="category-filter__controls" role="group" aria-label="カテゴリー">
              <button type="button" className={activeCategory === "all" ? "is-active" : ""} aria-pressed={activeCategory === "all"} onClick={() => setActiveCategory("all")}>すべて</button>
              {categoryOptions.map((category) => <button key={category.id} type="button" className={activeCategory === category.id ? "is-active" : ""} aria-pressed={activeCategory === category.id} onClick={() => setActiveCategory(category.id)}>{category.name || "名称未設定"}</button>)}
              {hasUncategorizedNews && <button type="button" className={activeCategory === "uncategorized" ? "is-active" : ""} aria-pressed={activeCategory === "uncategorized"} onClick={() => setActiveCategory("uncategorized")}>未分類</button>}
            </div>
          </div>
          <p className="news-count" data-reveal>{filteredNews.length}件のお知らせ</p>
          {filteredNews.length ? <div className="news-list">{filteredNews.map((item, index) => <NewsCard key={item.id} item={item} delay={`${index * 60}ms`} />)}</div> : <div className="news-state" data-reveal><Newspaper size={19} aria-hidden="true" /><p>このカテゴリーのお知らせはまだありません。</p></div>}
        </> : <NewsListState status={news.status} />}
      </section>
    </AppShell>
  );
}

function NewsArticlePage() {
  const { id } = useParams<{ id: string }>();
  const article = useNewsArticle(id);

  return (
    <AppShell>
      <section className="content-section article-section">
        {article.status === "loading" && <div className="news-state" data-reveal><Newspaper size={19} aria-hidden="true" /><p>記事を読み込み中です。</p></div>}
        {article.status === "error" && <div className="news-state news-state--error" data-reveal><CircleAlert size={19} aria-hidden="true" /><p>記事を取得できませんでした。</p><Link className="text-link" href="/news">お知らせ一覧へ戻る <ArrowRight size={17} /></Link></div>}
        {article.status === "ready" && article.data && <article className="article-card" data-reveal><p className="eyebrow">{formatNewsDate(article.data.publishedAt) || "News"}</p><h1 className="article-title">{article.data.title || "お知らせ"}</h1><div className="article-body" dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(article.data.content || article.data.description || "") }} /><Link className="text-link" href="/news">お知らせ一覧へ戻る <ArrowRight size={17} /></Link></article>}
      </section>
    </AppShell>
  );
}

type ContactMethodProps = {
  icon: ReactNode;
  name: string;
  detail: string;
  timing: string;
  action: string;
  tone: "primary" | "secondary" | "muted";
  href?: string;
};

function ContactMethod({ icon, name, detail, timing, action, tone, href }: ContactMethodProps) {
  const body = <><div className="contact-card__top"><span className={`contact-icon contact-icon--${tone}`}>{icon}</span><span className="contact-status"><Clock3 size={14} aria-hidden="true" />{timing}</span></div><div><h2>{name}</h2><p>{detail}</p></div><span className="contact-action">{action}{href ? <ArrowUpRight size={17} aria-hidden="true" /> : <CircleAlert size={17} aria-hidden="true" />}</span></>;
  return href ? <a className="contact-card" data-reveal data-analytics-contact-method={name} href={href} target="_blank" rel="noreferrer">{body}</a> : <div className="contact-card contact-card--inactive" data-reveal aria-label={`${name}: ${action}`}>{body}</div>;
}

type RecaptchaApi = {
  ready: (callback: () => void) => void;
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
};

type EmailGateStatus = "idle" | "loading" | "verifying" | "revealed" | "error";

function getRecaptcha() {
  return (window as Window & { grecaptcha?: { enterprise?: RecaptchaApi } }).grecaptcha?.enterprise;
}

function loadRecaptchaScript(siteKey: string) {
  const current = getRecaptcha();
  if (current) return Promise.resolve(current);
  return new Promise<RecaptchaApi>((resolve, reject) => {
    let settled = false;
    let attempts = 0;
    let script = document.querySelector<HTMLScriptElement>("script[data-email-gate-recaptcha='true']");
    const finish = (api: RecaptchaApi) => {
      if (settled) return;
      settled = true;
      window.clearInterval(polling);
      resolve(api);
    };
    const fail = () => {
      if (settled) return;
      settled = true;
      window.clearInterval(polling);
      script?.remove();
      reject(new Error("reCAPTCHAの読み込みに失敗しました。"));
    };
    const check = () => {
      const api = getRecaptcha();
      if (api) finish(api);
      else if (++attempts >= 80) fail();
    };
    const polling = window.setInterval(check, 100);
    if (!script) {
      script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(siteKey)}&hl=ja`;
      script.async = true;
      script.defer = true;
      script.dataset.emailGateRecaptcha = "true";
      document.head.appendChild(script);
    }
    script.addEventListener("error", fail, { once: true });
    check();
  });
}

function EmailAddressGate() {
  const [status, setStatus] = useState<EmailGateStatus>("idle");
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");

  const verifyToken = async (token: string) => {
    setStatus("verifying");
    setNotice("");
    try {
      const response = await fetch(`${EMAIL_GATE_ENDPOINT}/api/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const payload = await response.json() as { grant?: string; error?: string };
      if (!response.ok || !payload.grant) throw new Error(payload.error || "verification_failed");
      const emailResponse = await fetch(`${EMAIL_GATE_ENDPOINT}/api/email`, {
        method: "POST",
        headers: { Authorization: `Bearer ${payload.grant}` },
      });
      const emailPayload = await emailResponse.json() as { email?: string; error?: string };
      if (!emailResponse.ok || !emailPayload.email) throw new Error(emailPayload.error || "email_unavailable");
      setEmail(emailPayload.email);
      setStatus("revealed");
      trackAnalyticsEvent("email_recaptcha_verified", { page_path: getAnalyticsPagePath() });
    } catch {
      setStatus("error");
      setNotice("認証を確認できませんでした。もう一度お試しください。");
      trackAnalyticsEvent("email_recaptcha_failed", { page_path: getAnalyticsPagePath() });
    }
  };

  const startChallenge = async () => {
    setStatus("loading");
    setNotice("");
    setEmail("");
    try {
      const response = await fetch(`${EMAIL_GATE_ENDPOINT}/api/config`);
      const payload = await response.json() as { siteKey?: string };
      if (!response.ok || !payload.siteKey) throw new Error("config_unavailable");
      trackAnalyticsEvent("email_recaptcha_started", { page_path: getAnalyticsPagePath() });
      const recaptcha = await loadRecaptchaScript(payload.siteKey);
      const token = await new Promise<string>((resolve, reject) => {
        recaptcha.ready(() => {
          void recaptcha.execute(payload.siteKey!, { action: "email_reveal" }).then(resolve).catch(reject);
        });
      });
      await verifyToken(token);
    } catch {
      setStatus("error");
      setNotice("認証を開始できませんでした。ブラウザの追跡防止・広告ブロック設定を確認して、もう一度お試しください。");
      trackAnalyticsEvent("email_recaptcha_failed", { page_path: getAnalyticsPagePath() });
    }
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setNotice("メールアドレスをコピーしました。");
      trackAnalyticsEvent("email_address_copied", { page_path: getAnalyticsPagePath() });
    } catch {
      setNotice("コピーできませんでした。表示されたメールアドレスを選択してコピーしてください。");
    }
  };

  return (
    <article className="contact-card contact-card--email" data-reveal>
      <div className="contact-card__top"><span className="contact-icon contact-icon--primary"><Mail size={22} /></span><span className="contact-status"><ShieldCheck size={14} aria-hidden="true" />認証後に表示</span></div>
      <div><h2>メール</h2><p>内容を整理して送る場合におすすめです。メールアドレスは認証後に表示されます。</p></div>
      {status === "revealed" ? <div className="email-gate__revealed"><a className="email-gate__address" href={`mailto:${email}`} data-analytics-contact-method="メール">{email}</a><button className="email-gate__button email-gate__button--copy" type="button" onClick={() => void copyEmail()}><Copy size={16} aria-hidden="true" />メールアドレスをコピー</button></div> : <div className="email-gate__challenge"><button className="email-gate__button" type="button" onClick={() => void startChallenge()} disabled={status === "loading" || status === "verifying"}>{status === "loading" || status === "verifying" ? <><LoaderCircle className="email-gate__spinner" size={16} aria-hidden="true" />認証を確認中</> : "メールアドレスをコピー"}</button>{status === "error" && <button className="email-gate__retry" type="button" onClick={() => void startChallenge()}>認証をやり直す</button>}</div>}
      {notice && <p className={`email-gate__notice ${status === "error" ? "is-error" : ""}`} aria-live="polite">{notice}</p>}
    </article>
  );
}

function ContactPage() {
  return (
    <AppShell>
      <PageHero eyebrow="Contact" title="お問い合わせ" motif={CONTACT_MOTIF} lead="DMまたはメールでご連絡いただけます。急ぎの場合は、返信が比較的早いSNSのDMをご利用ください。" />
      <section className="content-section contact-section">
        <div className="contact-intro" data-reveal><ShieldCheck size={20} aria-hidden="true" /><p>メールアドレスはreCAPTCHA認証後に表示されます。SNSの実URLは設定後、このまま各カードが連絡導線として機能します。</p></div>
        <div className="contact-grid">
          <EmailAddressGate />
          <ContactMethod icon={<Instagram size={22} />} name="Instagram DM" detail="比較的早い返信を希望する場合におすすめです。" timing="比較的早め" action="Instagramリンクを設定してください" tone="secondary" />
          <ContactMethod icon={<MessageCircle size={22} />} name="X DM" detail="短い相談や確認の連絡にご利用ください。" timing="比較的早め" action="Xリンクを設定してください" tone="primary" />
          <ContactMethod icon={<Send size={22} />} name="LINE公式アカウント" detail="連絡用の公式アカウントです。" timing="通常返信" action="LINEリンクを設定してください" tone="secondary" />
          <ContactMethod icon={<AtSign size={22} />} name="TikTok DM" detail="アカウントはありますが、返信に時間がかかる場合があります。" timing="返信が遅め" action="TikTokリンクを設定してください" tone="muted" />
          <ContactMethod icon={<Clock3 size={22} />} name="Discord" detail="現在は準備中です。公開までしばらくお待ちください。" timing="準備中" action="現在は利用できません" tone="muted" />
        </div>
      </section>
    </AppShell>
  );
}

type SocialLinkProps = { icon: ReactNode; service: string; handle: string; purpose: string; status: string; href?: string; delay?: string };
function SocialLink({ icon, service, handle, purpose, status, href, delay }: SocialLinkProps) {
  const content = <><span className="social-icon">{icon}</span><span className="social-copy"><span className="social-copy__top"><strong>{service}</strong><span>{status}</span></span><span>{purpose}</span></span><span className="social-handle">{handle}</span>{href ? <ArrowUpRight className="social-arrow" size={20} aria-hidden="true" /> : <CircleAlert className="social-arrow social-arrow--muted" size={19} aria-hidden="true" />}</>;
  return href ? <a className="social-row" href={href} target="_blank" rel="noreferrer" data-reveal data-analytics-social={service} style={{ transitionDelay: delay }}>{content}</a> : <div className="social-row social-row--inactive" data-reveal style={{ transitionDelay: delay }} aria-label={`${service}: ${status}`}>{content}</div>;
}

function SocialPage() {
  return (
    <AppShell>
      <PageHero eyebrow="SNS & Links" title="SNS" motif={SOCIAL_MOTIF} lead="閲覧用・発信・アイデア記録など、用途ごとにSNSをまとめています。なりすまし防止のため、公式リンクはこのページから確認できます。" />
      <section className="content-section social-section">
        <div className="social-note" data-reveal><CheckCircle2 size={20} aria-hidden="true" /><p>利用中のサービスだけ実URLを設定して公開できます。URL未設定の項目はリンク設定待ちとして表示し、誤ったアカウントへ移動しないようにしています。</p></div>
        <div className="social-groups">
          <section className="social-group"><p className="social-group__title">SNS・コミュニティ</p><div className="social-stack">
            <SocialLink icon={<Instagram size={23} />} service="Instagram" handle="@koki_uematsu" purpose="閲覧・発信・アイデア記録" status="リンク設定待ち" />
            <SocialLink icon={<MessageCircle size={23} />} service="X / Twitter" handle="@koki_uematsu" purpose="短いお知らせ・日々の記録" status="リンク設定待ち" delay="50ms" />
            <SocialLink icon={<CircleUserRound size={23} />} service="Facebook" handle="Facebook Page" purpose="活動や更新のお知らせ" status="リンク設定待ち" delay="100ms" />
            <SocialLink icon={<AtSign size={23} />} service="Threads" handle="Threads Account" purpose="気軽な近況や短い発信" status="リンク設定待ち" delay="150ms" />
            <SocialLink icon={<Music2 size={23} />} service="TikTok" handle="TikTok Account" purpose="短い動画・アイデア記録" status="リンク設定待ち" delay="200ms" />
            <SocialLink icon={<Video size={23} />} service="YouTube" handle="YouTube Channel" purpose="動画・制作記録" status="リンク設定待ち" delay="250ms" />
            <SocialLink icon={<MessageCircle size={23} />} service="LINE公式アカウント" handle="LINE Official" purpose="連絡・お知らせの受け取り" status="リンク設定待ち" delay="300ms" />
            <SocialLink icon={<MessageCircle size={23} />} service="Discord" handle="Discord Server" purpose="コミュニティ・チャット" status="準備中" delay="350ms" />
          </div></section>
          <section className="social-group"><p className="social-group__title">作品・プロフィール</p><div className="social-stack">
            <SocialLink icon={<BookOpen size={23} />} service="note" handle="note Account" purpose="文章・考え・活動記録" status="リンク設定待ち" />
            <SocialLink icon={<Code2 size={23} />} service="GitHub" handle="GitHub Profile" purpose="コード・制作プロジェクト" status="リンク設定待ち" delay="50ms" />
            <SocialLink icon={<Briefcase size={23} />} service="LinkedIn" handle="LinkedIn Profile" purpose="経歴・つながり" status="リンク設定待ち" delay="100ms" />
            <SocialLink icon={<Link2 size={23} />} service="Portfolio" handle="Web Portfolio" purpose="制作物やプロフィールのまとめ" status="リンク設定待ち" delay="150ms" />
          </div></section>
        </div>
      </section>
    </AppShell>
  );
}

function PrivacyPage() {
  return (
    <AppShell>
      <PageHero eyebrow="Privacy Policy" title="プライバシーポリシー" pageClassName="page-hero--privacy" lead="本サイトにおける個人情報およびアクセス情報の取り扱いについてお知らせします。" />
      <section className="content-section policy-section">
        <article className="policy-card" data-reveal>
          <p className="policy-updated">最終更新日：2026年8月19日</p>
          <p>植松康希（以下「運営者」）は、本サイトを利用する方のプライバシーを尊重し、個人情報および関連する情報を適切に取り扱います。</p>

          <section><h2>1. 取得する情報</h2><p>お問い合わせやSNSのダイレクトメッセージを通じて、氏名、メールアドレス、送信内容などの情報をご本人から提供いただく場合があります。また、サイトの利用状況を把握するため、閲覧したページ、利用日時、端末やブラウザに関する情報など、個人を直接特定しないアクセス情報を取得する場合があります。</p></section>
          <section><h2>2. 利用目的</h2><p>取得した情報は、お問い合わせへの対応、必要な連絡、本サイトの表示・安全性・使いやすさの改善、および不正利用の防止のために使用します。これらの目的に必要な範囲を超えて利用することはありません。</p></section>
          <section><h2>3. Google アナリティクスとCookie</h2><p>本サイトでは、利用状況の把握と改善のためにGoogle アナリティクスを利用します。初回表示時にCookieの利用について選択いただき、「同意する」を選んだ場合に限り、測定ID G-S6GMRTWF52によるGoogle アナリティクスを読み込みます。拒否した場合および選択前は、Google アナリティクスを読み込みません。選択内容はブラウザのCookieに保存され、フッターの「Cookie設定」からいつでも変更できます。Cookieはブラウザの設定により無効化できますが、一部の機能や表示に影響する場合があります。</p></section>
          <section><h2>4. 外部サービスの利用</h2><p>本サイトでは、お知らせの表示にmicroCMSを利用しています。また、メールアドレスの表示・コピーを保護するため、Google reCAPTCHAおよびCloudflare Workersを利用しています。「メールアドレスをコピー」を選択した場合、reCAPTCHAの認証応答をCloudflare Workers経由で検証し、認証が成功した場合だけメールアドレスを表示します。SNSページから外部のSNSやサービスへ移動できるリンクを掲載する場合もあります。外部サービス上での情報の取り扱いについては、それぞれのサービスが定めるプライバシーポリシーをご確認ください。</p></section>
          <section><h2>5. 第三者提供</h2><p>法令に基づく場合、人の生命・身体・財産の保護に必要な場合、またはご本人の同意をいただいた場合を除き、取得した個人情報を第三者へ提供しません。</p></section>
          <section><h2>6. 安全管理</h2><p>個人情報への不正なアクセス、紛失、改ざん、漏えいなどを防ぐため、情報の性質に応じた合理的な安全管理措置を講じます。</p></section>
          <section><h2>7. 開示・訂正・削除等のご相談</h2><p>ご自身の情報について、開示、訂正、削除、利用停止などをご希望の場合は、本人確認を行ったうえで、合理的な範囲で対応します。</p></section>
          <section><h2>8. お問い合わせ先</h2><p>本ポリシーおよび個人情報の取り扱いに関するご連絡は、<Link className="policy-link" href="/contact">お問い合わせページ</Link>からお願いいたします。</p></section>
          <section><h2>9. 本ポリシーの変更</h2><p>法令の改正、サービス内容の変更、その他必要に応じて、本ポリシーを見直し更新することがあります。変更後の内容は、本ページに掲載した時点から適用されます。</p></section>
        </article>
      </section>
    </AppShell>
  );
}

function NotFoundPage() {
  return <AppShell><section className="content-section not-found"><Eyebrow>404</Eyebrow><h1 className="page-title">ページが見つかりません</h1><Link className="pill-button pill-button--primary" href="/">ホームへ戻る <ArrowRight size={17} /></Link></section></AppShell>;
}

function Router() {
  return <Switch><Route path="/" component={HomePage} /><Route path="/profile" component={ProfilePage} /><Route path="/news/:id" component={NewsArticlePage} /><Route path="/news" component={NewsPage} /><Route path="/sns" component={SocialPage} /><Route path="/contact" component={ContactPage} /><Route path="/privacy" component={PrivacyPage} /><Route component={NotFoundPage} /></Switch>;
}

export default function App() { return <WouterRouter hook={useHashLocation}><Router /></WouterRouter>; }
