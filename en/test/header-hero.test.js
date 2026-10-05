// test/header-hero.test.js -- the Header & Hero manager (Dashboard > Header & Hero).
// Covers the settings model (validation, escaping, defaults), the public templates,
// the save path, and the admin page's wiring. Visual layout was checked by hand in a
// real browser; this suite does not prove pixels.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  FIELDS, HEADER_HERO_KEYS, parseHeaderHero, defaultHeaderHero, sanitizeHeaderHeroInput,
  headerHeroTemplateVars, headerHeroDefaultsForAdmin, jsonForScript, cleanLink, cleanColor
} from '../worker/header-hero.js';
import { getSiteSettings } from '../worker/site-settings.js';
import { Renderer } from '../worker/render.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const renderer = new Renderer({}, new Request('https://example.test/en'));
const fill = (tpl, data) => renderer.replaceVariables(tpl, data);
let originCounter = 0;
const nextOrigin = () => `https://t${++originCounter}.example.test`;
const rows = (obj) => ({ prepare: () => ({ all: async () => ({ results: Object.entries(obj).map(([key, value]) => ({ key, value })) }), bind() { return this; } }) });

describe('defaults reproduce the site as it was', () => {
  const hh = defaultHeaderHero();
  const v = headerHeroTemplateVars(hh);

  test('hero text, button and layout match the previous hardcoded defaults', () => {
    assert.equal(hh.heroEnabled, true);
    assert.equal(hh.heroBadge, 'Find Your Perfect Casino');
    assert.equal(hh.heroTitle, 'Find Your Perfect Casino');
    assert.match(hh.heroSubtitle, /\{\{casino_count\}\}\+ casinos worldwide/);
    assert.equal(hh.heroButtonText, 'Browse Casinos');
    assert.equal(hh.heroButtonUrl, '/en/casino');
    assert.equal(hh.heroAlignment, 'center');
    assert.equal(hh.heroOverlay, true);
    assert.equal(hh.heroOverlayOpacity, 45);
    assert.match(v.hh_hero_html, /class="hero hero--h-standard/);
    assert.match(v.hh_hero_html, /<a href="\/en\/casino" class="btn btn--primary btn--lg">Browse Casinos<\/a>/);
  });

  test('header defaults: sticky, standard height, search and login shown, no extras', () => {
    assert.equal(hh.headerSticky, true);
    assert.equal(hh.headerHeight, 'default');
    assert.equal(hh.showSearch, true);
    assert.equal(hh.showAuth, true);
    assert.equal(hh.ctaEnabled, false);
    assert.equal(hh.announceEnabled, false);
    assert.equal(v.hh_announce_html, '');
    assert.equal(v.hh_cta, false);
    assert.match(v.hh_css, /--hh-header-h:68px/);
    assert.doesNotMatch(v.hh_css, /--hh-header-bg/);
  });
});

describe('validation', () => {
  test('unknown choices fall back to the default', () => {
    const hh = parseHeaderHero({ site_header_height: 'huge', theme_header_style: 'neon', site_hero_alignment: 'justify', site_hero_height: 'x' });
    assert.equal(hh.headerHeight, 'default');
    assert.equal(hh.headerStyle, 'default');
    assert.equal(hh.heroAlignment, 'center');
    assert.equal(hh.heroHeight, 'standard');
  });

  test('numbers are clamped; booleans accept true/false strings', () => {
    assert.equal(parseHeaderHero({ site_hero_overlay_opacity: '500' }).heroOverlayOpacity, 85);
    assert.equal(parseHeaderHero({ site_hero_overlay_opacity: '-9' }).heroOverlayOpacity, 0);
    assert.equal(parseHeaderHero({ site_hero_overlay_opacity: 'abc' }).heroOverlayOpacity, 45);
    assert.equal(parseHeaderHero({ site_header_sticky: 'false' }).headerSticky, false);
    assert.equal(parseHeaderHero({ site_hero_enabled: 'false' }).heroEnabled, false);
    assert.equal(parseHeaderHero({ site_hero_enabled: 'garbage' }).heroEnabled, true);
  });

  test('only safe links are accepted', () => {
    for (const ok of ['/en/casino', '#top', 'https://example.com/a?b=1', 'mailto:a@b.co', 'tel:+250788000000']) assert.equal(cleanLink(ok), ok, ok);
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', '//evil.test', 'ftp://x', 'java\nscript:1', '/a b', '/"onmouseover="x', "/x'y", '<b>']) assert.equal(cleanLink(bad), '', bad);
  });

  test('only safe colours are accepted', () => {
    for (const ok of ['#fff', '#1a1a1a', '#1a1a1a80', 'rgb(10, 20, 30)', 'rgba(0,0,0,.5)', 'hsl(200 50% 40%)']) assert.equal(cleanColor(ok), ok, ok);
    for (const bad of ['red', 'url(x)', 'expression(1)', '#12', 'rgb(1,2,3);color:red', '#fff;}body{display:none']) assert.equal(cleanColor(bad), '', bad);
  });

  test('text is trimmed, flattened to one line and length-limited', () => {
    const hh = parseHeaderHero({ site_announce_text: '  Hello\n\nworld  ' + 'x'.repeat(400) });
    assert.ok(hh.announceText.startsWith('Hello world'));
    assert.ok(hh.announceText.length <= 160);
  });

  test('highlights: at most 4 lines of 60 characters', () => {
    const hh = parseHeaderHero({ site_hero_highlights: Array.from({ length: 9 }, (_, i) => `Line ${i}${'y'.repeat(100)}`).join('\n') });
    const lines = hh.heroHighlights.split('\n');
    assert.equal(lines.length, 4);
    assert.ok(lines.every((l) => l.length <= 60));
  });

  test('a cleared title, subtitle or button falls back to the default instead of showing nothing', () => {
    const hh = parseHeaderHero({ site_hero_title: '', site_hero_button_text: '  ', site_hero_button_url: 'javascript:1' });
    assert.equal(hh.heroTitle, 'Find Your Perfect Casino');
    assert.equal(hh.heroButtonText, 'Browse Casinos');
    assert.equal(hh.heroButtonUrl, '/en/casino');
  });

  test('a background picture must be an http(s) address or an on-site path', () => {
    assert.equal(parseHeaderHero({ site_hero_image: 'https://cdn.test/h.jpg' }).heroImage, 'https://cdn.test/h.jpg');
    assert.equal(parseHeaderHero({ site_hero_image: '/static/h.jpg' }).heroImage, '/static/h.jpg');
    assert.equal(parseHeaderHero({ site_hero_image: 'mailto:a@b.co' }).heroImage, '');
    assert.equal(parseHeaderHero({ site_hero_image: 'javascript:1' }).heroImage, '');
    assert.equal(parseHeaderHero({ site_hero_image: '#x' }).heroImage, '');
  });
});

describe('escaping (the template engine does not escape for us)', () => {
  const nasty = '<script>alert(1)</script> "quoted" & \'single\'';
  const v = headerHeroTemplateVars(parseHeaderHero({
    site_announce_enabled: 'true', site_announce_text: nasty, site_announce_link_text: nasty, site_announce_url: '/ok',
    site_hero_title: nasty, site_hero_subtitle: nasty, site_hero_description: nasty, site_hero_badge: nasty,
    site_hero_highlights: nasty, site_hero_button_text: nasty, site_hero_button2_text: nasty, site_hero_button2_url: '/two',
    site_header_cta_enabled: 'true', site_header_cta_text: nasty, site_header_cta_url: '/cta',
    site_header_login_label: nasty, site_header_search_placeholder: nasty
  }));

  test('no raw angle brackets or quotes survive in any generated markup', () => {
    for (const [key, value] of Object.entries(v)) {
      if (typeof value !== 'string') continue;
      assert.doesNotMatch(value, /<script/i, key);
      const text = value.replace(/<\/?[a-z][^<>]*>/gi, '');
      assert.ok(!/[<>]/.test(text), `${key}: ${text.slice(0, 80)}`);
    }
    assert.match(v.hh_hero_html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(v.hh_announce_html, /&quot;quoted&quot;/);
    assert.match(v.hh_cta_text, /&lt;script&gt;/);
    assert.match(v.hh_announce_html, /&#39;single&#39;/);
  });

  test('a hero picture address cannot break out of its CSS url()', () => {
    const w = headerHeroTemplateVars(parseHeaderHero({ site_hero_image: 'https://x.test/a(b).jpg' }));
    assert.match(w.hh_hero_html, /url\('https:\/\/x\.test\/a%28b%29\.jpg'\)/);
  });
});

describe('generated markup', () => {
  test('announcement bar: link and close button only when set; id changes with the message', () => {
    const base = { site_announce_enabled: 'true', site_announce_text: 'Hello' };
    const a = headerHeroTemplateVars(parseHeaderHero(base));
    assert.doesNotMatch(a.hh_announce_html, /hh-announce__link|data-announce-close.*aria/s.test('') ? /x/ : /hh-announce__link/);
    assert.match(a.hh_announce_html, /data-announce-close/);
    const b = headerHeroTemplateVars(parseHeaderHero({ ...base, site_announce_dismissible: 'false', site_announce_link_text: 'Go', site_announce_url: '/go' }));
    assert.match(b.hh_announce_html, /href="\/go"/);
    assert.doesNotMatch(b.hh_announce_html, /data-announce-close/);
    const c = headerHeroTemplateVars(parseHeaderHero({ ...base, site_announce_text: 'Changed' }));
    assert.notEqual(a.hh_announce_html.match(/data-announce-id="([^"]+)"/)[1], c.hh_announce_html.match(/data-announce-id="([^"]+)"/)[1]);
  });

  test('announcement needs both the switch and a message', () => {
    assert.equal(headerHeroTemplateVars(parseHeaderHero({ site_announce_enabled: 'true' })).hh_announce_html, '');
    assert.equal(headerHeroTemplateVars(parseHeaderHero({ site_announce_text: 'Hi' })).hh_announce_html, '');
  });

  test('header call to action needs switch, text and a valid address', () => {
    assert.equal(headerHeroTemplateVars(parseHeaderHero({ site_header_cta_enabled: 'true', site_header_cta_text: 'Go' })).hh_cta, false);
    const ok = headerHeroTemplateVars(parseHeaderHero({ site_header_cta_enabled: 'true', site_header_cta_text: 'Go', site_header_cta_url: '/x', site_header_cta_new_tab: 'true', site_header_cta_style: 'outline' }));
    assert.equal(ok.hh_cta, true);
    assert.equal(ok.hh_cta_class, 'btn--outline');
    assert.match(ok.hh_cta_target, /target="_blank" rel="noopener"/);
  });

  test('hero options change classes and variables', () => {
    const v = headerHeroTemplateVars(parseHeaderHero({
      site_hero_height: 'screen', site_hero_text_theme: 'dark', site_hero_bg_mode: 'brand', site_hero_overlay_opacity: '20',
      site_hero_alignment: 'left', site_header_height: 'tall', site_header_logo_size: 'lg', theme_header_background: '#112233', site_hero_bg_color: '#445566'
    }));
    assert.match(v.hh_hero_html, /hero--h-screen hero--text-dark hero--focus-center hero--bg-brand/);
    assert.match(v.hh_hero_html, /hero-content--left/);
    assert.match(v.hh_css, /--hh-header-h:84px/);
    assert.match(v.hh_css, /--hh-logo:52px/);
    assert.match(v.hh_css, /--hh-header-bg:#112233/);
    assert.match(v.hh_css, /--hh-hero-bg:#445566/);
    assert.match(v.hh_css, /--hh-hero-overlay:0\.20/);
  });

  test('a picture replaces the background mode; overlay can be switched off', () => {
    const v = headerHeroTemplateVars(parseHeaderHero({ site_hero_image: 'https://x.test/h.jpg', site_hero_bg_mode: 'brand', site_hero_overlay: 'false' }));
    assert.match(v.hh_hero_html, /hero--image/);
    assert.doesNotMatch(v.hh_hero_html, /hero--bg-brand/);
    assert.doesNotMatch(v.hh_hero_html, /hero-overlay/);
  });

  test('hero can be hidden, and badge / button toggles work', () => {
    assert.equal(headerHeroTemplateVars(parseHeaderHero({ site_hero_enabled: 'false' })).hh_hero_html, '');
    const v = headerHeroTemplateVars(parseHeaderHero({ site_hero_badge_enabled: 'false', site_hero_button_enabled: 'false' }));
    assert.doesNotMatch(v.hh_hero_html, /hero-badge/);
    assert.doesNotMatch(v.hh_hero_html, /btn--primary/);
    assert.doesNotMatch(v.hh_hero_html, /hero-actions/);
  });

  test('the casino-count token in the subtitle is left for the page to fill in', () => {
    const v = headerHeroTemplateVars(defaultHeaderHero());
    assert.equal(fill(v.hh_hero_html, { casino_count: 42 }).includes('42+ casinos worldwide'), true);
  });
});

describe('public templates', () => {
  const header = read('templates/layout/header.html');
  const home = read('templates/pages/home.html');
  const base = read('templates/layout/base.html');

  test('no template nests {{#if}} blocks (the engine cannot handle that)', () => {
    for (const [name, src] of [['header', header], ['home', home]]) {
      let depth = 0;
      for (const m of src.matchAll(/\{\{#if\b|\{\{\/if\}\}/g)) {
        depth += m[0].startsWith('{{#') ? 1 : -1;
        assert.ok(depth >= 0 && depth <= 1, `${name}: nested or unbalanced {{#if}}`);
      }
      assert.equal(depth, 0, `${name}: unbalanced`);
    }
  });

  test('header keeps every id the scripts rely on, by default', () => {
    const html = fill(header, headerHeroTemplateVars(defaultHeaderHero()));
    for (const id of ['mainNav', 'searchInput', 'searchResults', 'mobileSearchBtn', 'mobileSearchContainer', 'mobileSearchInput', 'mobileSearchClose', 'mobileSearchResults', 'headerLoginBtn', 'headerLogoutBtn', 'headerDashboardBtn', 'navToggle']) {
      assert.match(html, new RegExp(`id="${id}"`), id);
    }
    assert.match(html, /placeholder="Search casinos\.\.\."/);
    assert.match(html, />\s*Login\s*</);
    assert.doesNotMatch(html, /\{\{|\}\}/);
  });

  test('header without search or sign-in buttons drops that markup', () => {
    const html = fill(header, headerHeroTemplateVars(parseHeaderHero({ site_header_show_search: 'false', site_header_show_auth: 'false' })));
    for (const id of ['searchInput', 'mobileSearchBtn', 'mobileSearchContainer', 'headerLoginBtn']) assert.doesNotMatch(html, new RegExp(`id="${id}"`), id);
    assert.match(html, /id="navToggle"/);
  });

  test('logo modes remove the image or the name from the markup', () => {
    const data = { site_name: 'Acme', site_logo: '/l.png', header_nav: '' };
    assert.doesNotMatch(fill(header, { ...data, ...headerHeroTemplateVars(parseHeaderHero({ site_header_logo_mode: 'text' })) }), /logo-icon/);
    assert.doesNotMatch(fill(header, { ...data, ...headerHeroTemplateVars(parseHeaderHero({ site_header_logo_mode: 'logo' })) }), /logo-text/);
  });

  test('the header carries the announcement bar and the optional button', () => {
    const v = headerHeroTemplateVars(parseHeaderHero({ site_announce_enabled: 'true', site_announce_text: 'Sale', site_header_cta_enabled: 'true', site_header_cta_text: 'Join', site_header_cta_url: '/join' }));
    const html = fill(header, v);
    assert.ok(html.indexOf('hh-announce') < html.indexOf('<header'));
    assert.match(html, /<a href="\/join" class="btn btn--primary header-cta">Join<\/a>/);
  });

  test('homepage uses the generated hero', () => {
    assert.match(home, /^\{\{\{hh_hero_html\}\}\}/);
    assert.doesNotMatch(home, /site_hero_/);
  });

  test('base layout loads the stylesheet, variables, body classes and scripts', () => {
    assert.match(base, /\/static\/css\/header-hero\.css/);
    assert.match(base, /\{\{\{hh_css\}\}\}/);
    assert.match(base, /\{\{hh_body_class\}\}/);
    assert.match(base, /\/static\/js\/header-hero\.js/);
    assert.match(base, /\/static\/js\/header-hero-admin\.js/);
  });
});

describe('loading from the settings table', () => {
  test('getSiteSettings exposes headerHero with saved values applied', async () => {
    const s = await getSiteSettings(rows({ site_hero_title: 'Welcome', site_header_height: 'tall', site_announce_enabled: 'true', site_announce_text: 'Hi' }), nextOrigin(), {});
    assert.equal(s.headerHero.heroTitle, 'Welcome');
    assert.equal(s.headerHero.headerHeight, 'tall');
    assert.equal(s.headerHero.announceEnabled, true);
  });

  test('with no database it falls back to the defaults', async () => {
    const s = await getSiteSettings(null, nextOrigin(), {});
    assert.deepEqual(s.headerHero, defaultHeaderHero());
  });

  test('values saved before this feature (blank hero fields) still render the defaults', async () => {
    const s = await getSiteSettings(rows({ site_hero_title: '', site_hero_badge: '', site_hero_subtitle: '', site_hero_button_text: '', site_hero_button_url: '', site_hero_enabled: 'true', site_hero_overlay: 'true' }), nextOrigin(), {});
    assert.equal(s.headerHero.heroTitle, 'Find Your Perfect Casino');
    assert.equal(s.headerHero.heroButtonUrl, '/en/casino');
    assert.equal(s.headerHero.heroOverlay, true);
  });

  test('the render pipeline passes the variables to every template', () => {
    const src = read('worker/render.js');
    assert.match(src, /\.\.\.headerHeroTemplateVars\(site\.headerHero\)/);
  });
});

describe('saving', () => {
  test('sanitizeHeaderHeroInput cleans this feature\'s keys and leaves others alone', () => {
    const out = sanitizeHeaderHeroInput({
      site_hero_alignment: 'diagonal', site_hero_overlay_opacity: '999', site_header_cta_url: 'javascript:alert(1)',
      theme_header_background: 'red;}', site_hero_enabled: true, site_name: 'Keep <me>', footer_disclaimer: '  untouched  '
    });
    assert.equal(out.site_hero_alignment, 'center');
    assert.equal(out.site_hero_overlay_opacity, '85');
    assert.equal(out.site_header_cta_url, '');
    assert.equal(out.theme_header_background, '');
    assert.equal(out.site_hero_enabled, 'true');
    assert.equal(out.site_name, 'Keep <me>');
    assert.equal(out.footer_disclaimer, '  untouched  ');
  });

  test('every value it returns is a string', () => {
    const body = Object.fromEntries(HEADER_HERO_KEYS.map((k) => [k, undefined]));
    for (const value of Object.values(sanitizeHeaderHeroInput(body))) assert.equal(typeof value, 'string');
  });

  test('the save endpoint routes the body through the sanitizer', () => {
    const api = read('worker/api.js');
    assert.match(api, /sanitizeHeaderHeroInput\(body\)/);
    assert.match(api, /requireRole\(user, "editor"\)/);
  });

  test('saving the general Settings page can no longer switch the hero off', () => {
    const js = read('static/js/admin.js');
    assert.match(js, /if \(heroEnabled\) \{\s*payload\.site_hero_enabled/);
    const html = read('templates/pages/admin/settings.html');
    assert.doesNotMatch(html, /name="site_hero_/);
    assert.match(html, /href="\/en\/dashboard\/header-hero"/);
  });
});

describe('admin page', () => {
  const page = read('templates/pages/admin/header-hero.html');
  const names = [...page.matchAll(/\sname="([a-z0-9_]+)"/g)].map((m) => m[1]).filter((n) => n !== 'hh_device');

  test('every setting has a control, and every control is a known setting', () => {
    assert.deepEqual([...new Set(names)].sort(), [...HEADER_HERO_KEYS].sort());
  });

  test('radio/select values offered are all allowed by the model', () => {
    for (const field of FIELDS.filter((f) => f.type === 'enum')) {
      const offered = [...page.matchAll(new RegExp(`name="${field.key}" value="([^"]+)"`, 'g'))].map((m) => m[1]);
      assert.deepEqual(offered.sort(), [...field.values].sort(), field.key);
    }
  });

  test('is wired: route, controller, navigation entry', () => {
    assert.match(read('worker/routes.js'), /"\/en\/dashboard\/header-hero"\) return \{ type: "dashboardHeaderHero" \}/);
    assert.match(read('worker/index.js'), /case "dashboardHeaderHero":\s*return renderDashboardHeaderHero/);
    assert.match(read('worker/controllers.js'), /renderAdminPage\(request, env, "admin\/header-hero\.html"/);
    assert.match(read('templates/layout/admin-nav.html'), /href="\/en\/dashboard\/header-hero"/);
  });

  test('defaults JSON survives the template engine intact', () => {
    const json = jsonForScript(headerHeroDefaultsForAdmin());
    const out = fill('<script type="application/json" id="x">{{{hh_defaults_json}}}</script>', { hh_defaults_json: json });
    const parsed = JSON.parse(out.replace(/^<[^>]+>/, '').replace(/<\/script>$/, ''));
    assert.deepEqual(parsed, headerHeroDefaultsForAdmin());
    assert.match(parsed.site_hero_subtitle, /\{\{casino_count\}\}/);
  });

  test('the admin script avoids dynamic-code sinks and only calls the settings endpoints', () => {
    const js = stripComments(read('static/js/header-hero-admin.js'));
    assert.doesNotMatch(js, /innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function/);
    const urls = [...js.matchAll(/fetch\("([^"]+)"/g)].map((m) => m[1]);
    assert.ok(urls.length >= 2);
    for (const u of urls) assert.match(u, /^\/en\/api\/v1\/settings\/(get|save)$/);
  });

  test('the public script avoids dynamic-code sinks', () => {
    assert.doesNotMatch(stripComments(read('static/js/header-hero.js')), /innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function/);
  });

  test('the stylesheet\'s admin rules are scoped and it declares no global element rules', () => {
    const css = read('static/css/header-hero.css').replace(/\/\*[\s\S]*?\*\//g, '').replace(/@[a-z-]+[^{;]*\{/g, '');
    const selectors = [...css.matchAll(/(^|\})\s*([^{}@][^{}]*)\{/g)].flatMap((m) => m[2].split(',').map((s) => s.trim())).filter(Boolean);
    for (const sel of selectors) {
      assert.ok(/^(:root|\.|\.hh-|\.hero|\.site-header|\.hh-)/.test(sel) || /^\.(hh|hero|site-header)/.test(sel) || sel.startsWith('.') || /^(fieldset|body)\.hh-/.test(sel), `unscoped selector: ${sel}`);
    }
  });

  test('the preset names offered exist in the script', () => {
    const js = read('static/js/header-hero-admin.js');
    for (const m of page.matchAll(/data-preset="([a-z]+)"/g)) assert.match(js, new RegExp(`\\b${m[1]}:`), m[1]);
  });
});

describe('navigation', () => {
  test('the new entry is the only link added to the admin menu', () => {
    const nav = read('templates/layout/admin-nav.html');
    const hrefs = [...nav.matchAll(/<a\s+href="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(hrefs.filter((h) => h === '/en/dashboard/header-hero').length, 1);
  });
});
