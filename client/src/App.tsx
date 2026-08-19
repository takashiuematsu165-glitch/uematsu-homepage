/**
 * デザイン方針: 既存の淡いブルー背景、ガラス調パネル、ブルー／ピンクのアクセントを維持し、
 * 情報の視認性と穏やかなマイクロインタラクションのみを改善する。
 */
import { useEffect, useState, type ReactNode } from "react";
import { Link, Route, Switch, useLocation, useParams } from "wouter";
import {
  ArrowRight,
  ArrowUpRight,
  AtSign,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Instagram,
  Link2,
  Mail,
  Menu,
  MessageCircle,
  Newspaper,
  Send,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

const PROFILE_IMAGE = "/manus-storage/profile-thumb_08cdcf09.png";
const HERO_ORBS = "/manus-storage/hero-tech-orbs_2762c120.png";
const CONTACT_MOTIF = "/manus-storage/contact-orbital-motif_46770c6d.png";
const SOCIAL_MOTIF = "/manus-storage/social-constellation-motif_31a02147.png";
const BRAND_MARK = "/manus-storage/brand-symbol_c84124f7.png";
const MICROCMS_DOMAIN = "1jzsnsr5i6";
const MICROCMS_API_KEY = "MBWNeoQ3aihAV1yIErRAkHv3l3wnRETvU1Qj";
const MICROCMS_NEWS_ENDPOINT = `https://${MICROCMS_DOMAIN}.microcms.io/api/v1/news`;

const navItems = [
  { href: "/", label: "Home" },
  { href: "/profile", label: "Profile" },
  { href: "/news", label: "News" },
  { href: "/sns", label: "SNS & Links" },
  { href: "/contact", label: "Contact" },
];

type NewsItem = {
  id: string;
  title?: string;
  publishedAt?: string;
  content?: string;
  excerpt?: string;
  summary?: string;
  description?: string;
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
          </nav>
          <p className="footer-note">© {new Date().getFullYear()} Koki Uematsu</p>
        </div>
      </footer>
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

function PageHero({ eyebrow, title, lead, motif }: { eyebrow: string; title: string; lead: string; motif?: string }) {
  return (
    <section className="page-hero">
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
  return (
    <Link className="news-card news-card--link" href={`/news/${encodeURIComponent(item.id)}`} data-reveal style={{ transitionDelay: delay }}>
      <span>{formatNewsDate(item.publishedAt) || "News"}</span>
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
            <Link className="text-link" href="/profile">プロフィールを見る <ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
          <Link className="profile-thumbnail" href="/profile" aria-label="植松康希のプロフィールを見る" data-reveal style={{ transitionDelay: "120ms" }}>
            <img src={PROFILE_IMAGE} alt="植松康希のプロフィール画像" />
            <span>Profile <ArrowUpRight size={17} aria-hidden="true" /></span>
          </Link>
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
      <section className="content-section">
        <article className="profile-card" data-reveal>
          <img src={PROFILE_IMAGE} alt="植松康希のプロフィール画像" />
          <div><Eyebrow>Koki Uematsu</Eyebrow><h2>植松康希</h2><p>パソコンに触れながら、興味を持ったことを試したり、考えたりしています。ここでは活動や発信先をまとめています。</p><ul className="tag-list"><li>Student</li><li>PC</li><li>Learning</li></ul></div>
        </article>
      </section>
    </AppShell>
  );
}

function NewsPage() {
  const news = useNewsList(20);
  return (
    <AppShell>
      <PageHero eyebrow="News" title="お知らせ" lead="サイトに関する更新や、これからの予定を掲載しています。" />
      <section className="content-section narrow-section">
        {news.status === "ready" ? <div className="news-list">{news.data.map((item, index) => <NewsCard key={item.id} item={item} delay={`${index * 60}ms`} />)}</div> : <NewsListState status={news.status} />}
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
  return href ? <a className="contact-card" data-reveal href={href} target="_blank" rel="noreferrer">{body}</a> : <div className="contact-card contact-card--inactive" data-reveal aria-label={`${name}: ${action}`}>{body}</div>;
}

function ContactPage() {
  return (
    <AppShell>
      <PageHero eyebrow="Contact" title="お問い合わせ" motif={CONTACT_MOTIF} lead="DMまたはメールでご連絡いただけます。急ぎの場合は、返信が比較的早いSNSのDMをご利用ください。" />
      <section className="content-section contact-section">
        <div className="contact-intro" data-reveal><ShieldCheck size={20} aria-hidden="true" /><p>連絡先の実URL・メールアドレスは、公開前に設定してください。設定後は、このまま各カードが連絡導線として機能します。</p></div>
        <div className="contact-grid">
          <ContactMethod icon={<Mail size={22} />} name="メール" detail="内容を整理して送る場合におすすめです。" timing="通常返信" action="メールアドレスを設定してください" tone="primary" />
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
  return href ? <a className="social-row" href={href} target="_blank" rel="noreferrer" data-reveal style={{ transitionDelay: delay }}>{content}</a> : <div className="social-row social-row--inactive" data-reveal style={{ transitionDelay: delay }} aria-label={`${service}: ${status}`}>{content}</div>;
}

function SocialPage() {
  return (
    <AppShell>
      <PageHero eyebrow="SNS & Links" title="SNS" motif={SOCIAL_MOTIF} lead="主に閲覧用・アイデア記録用として運用しています。なりすまし防止のため、公式アカウントはこのページから確認できます。" />
      <section className="content-section social-section">
        <div className="social-note" data-reveal><CheckCircle2 size={20} aria-hidden="true" /><p>このページに掲載しているものが公式アカウントです。各リンクは公開前に実URLを設定してください。</p></div>
        <div className="social-stack">
          <SocialLink icon={<Instagram size={23} />} service="Instagram" handle="@koki_uematsu" purpose="閲覧・発信・アイデア記録" status="リンク設定待ち" />
          <SocialLink icon={<MessageCircle size={23} />} service="X / Twitter" handle="@koki_uematsu" purpose="短いお知らせ・日々の記録" status="リンク設定待ち" delay="70ms" />
          <SocialLink icon={<Link2 size={23} />} service="Portfolio" handle="Web Portfolio" purpose="制作物やプロフィールのまとめ" status="リンク設定待ち" delay="140ms" />
        </div>
      </section>
    </AppShell>
  );
}

function NotFoundPage() {
  return <AppShell><section className="content-section not-found"><Eyebrow>404</Eyebrow><h1 className="page-title">ページが見つかりません</h1><Link className="pill-button pill-button--primary" href="/">ホームへ戻る <ArrowRight size={17} /></Link></section></AppShell>;
}

function Router() {
  return <Switch><Route path="/" component={HomePage} /><Route path="/profile" component={ProfilePage} /><Route path="/news/:id" component={NewsArticlePage} /><Route path="/news" component={NewsPage} /><Route path="/sns" component={SocialPage} /><Route path="/contact" component={ContactPage} /><Route component={NotFoundPage} /></Switch>;
}

export default function App() { return <Router />; }
