const navToggleButton = document.querySelector('.nav-toggle');
const navMenu = document.getElementById('nav-menu');
const yearSpan = document.getElementById('year');

if (navToggleButton && navMenu) {
  navToggleButton.addEventListener('click', () => {
    const willOpen = !navMenu.classList.contains('open');
    navMenu.classList.toggle('open', willOpen);
    navToggleButton.setAttribute('aria-expanded', String(willOpen));
  });
}

if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}

const newsletterForm = document.getElementById('newsletter');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = newsletterForm.querySelector('input[type="email"]');
    if (!input) return;
    const isValid = /.+@.+\..+/.test(input.value);
    if (!isValid) {
      alert("Le format de l'adresse email n'est pas valide.");
      input.focus();
      return;
    }
    alert('Votre inscription à la newsletter a bien été enregistrée.');
    input.value = '';
  });
}

// Auto-update Today's News with Indian headlines (daily)
(function setupIndianNewsAutoUpdate() {
  const NEWS_CACHE_KEY = 'bharat4u.newsCache.v1';
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const newsSection = document.getElementById('news');
  if (!newsSection) return;

  const grid = newsSection.querySelector('.card-grid');
  if (!grid) return;

  function renderNewsCards(items) {
    if (!Array.isArray(items) || items.length === 0) return;
    const limited = items.slice(0, 8);
    const fragment = document.createDocumentFragment();
    limited.forEach((item) => {
      const article = document.createElement('article');
      article.className = 'card';

      const imageUrl = (item.enclosure && (item.enclosure.link || item.enclosure.url)) || item.thumbnail || item.enclosureUrl || 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=1200&auto=format&fit=crop';
      const titleText = item.title || 'Untitled';
      const linkUrl = item.link || '#';

      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = 'News';
      img.loading = 'lazy';

      const body = document.createElement('div');
      body.className = 'card-body';

      const h3 = document.createElement('h3');
      h3.textContent = titleText;

      const a = document.createElement('a');
      a.href = linkUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'link';
      a.textContent = 'B4U';

      body.appendChild(h3);
      body.appendChild(a);
      article.appendChild(img);
      article.appendChild(body);
      fragment.appendChild(article);
    });

    grid.innerHTML = '';
    grid.appendChild(fragment);
  }

  function loadFromCache() {
    try {
      const raw = localStorage.getItem(NEWS_CACHE_KEY);
      if (!raw) return null;
      const cached = JSON.parse(raw);
      if (!cached || !cached.timestamp || !Array.isArray(cached.items)) return null;
      const isFresh = Date.now() - cached.timestamp < ONE_DAY_MS;
      return isFresh ? cached.items : null;
    } catch {
      return null;
    }
  }

  function saveToCache(items) {
    try {
      localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), items }));
    } catch {
      // ignore quota or serialization errors
    }
  }

  async function fetchRssAsJson(rssUrl) {
    const endpoint = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(rssUrl);
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error('RSS proxy error');
    return response.json();
  }

  async function fetchIndianHeadlines() {
    const rssFeeds = [
      'https://www.thehindu.com/news/national/feeder/default.rss',
      'https://indianexpress.com/section/india/feed/',
      'https://feeds.feedburner.com/ndtvnews-top-stories'
    ];

    try {
      const results = await Promise.allSettled(rssFeeds.map(fetchRssAsJson));
      const items = results
        .filter((r) => r.status === 'fulfilled' && r.value && Array.isArray(r.value.items))
        .flatMap((r) => r.value.items)
        .filter(Boolean)
        .sort((a, b) => new Date(b.pubDate || b.published || 0) - new Date(a.pubDate || a.published || 0));
      if (items.length > 0) {
        saveToCache(items);
        renderNewsCards(items);
      }
    } catch (err) {
      // If all fetches fail, keep existing static content
      console.error('Failed to load news:', err);
    }
  }

  const cached = loadFromCache();
  if (cached) {
    renderNewsCards(cached);
  } else {
    fetchIndianHeadlines();
  }
})();

(function setupPodcastVideoSearch() {
  const podcastSection = document.getElementById('podcast');
  if (!podcastSection) return;
  const cards = Array.from(podcastSection.querySelectorAll('.trip-card'));
  if (!cards.length) return;

  const CACHE_KEY_PREFIX = 'bharat4u.podcast.video.';

  function getCachedVideoId(title) {
    try {
      const raw = localStorage.getItem(CACHE_KEY_PREFIX + title);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !obj.id || !obj.t) return null;
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - obj.t > sevenDays) return null;
      return obj.id;
    } catch {
      return null;
    }
  }

  function setCachedVideoId(title, id) {
    try {
      localStorage.setItem(CACHE_KEY_PREFIX + title, JSON.stringify({ id, t: Date.now() }));
    } catch {}
  }

  async function searchYouTubeVideoId(query) {
    const endpoint = 'https://piped.video/api/v1/search?q=' + encodeURIComponent(query) + '&region=IN&filter=videos';
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error('Video search failed');
    const list = await res.json();
    const item = Array.isArray(list) ? list.find((x) => x && (x.id || (x.url && x.url.includes('watch')))) : null;
    if (!item) return null;
    if (item.id) return item.id;
    try {
      const url = new URL('https://youtube.com' + item.url);
      return url.searchParams.get('v');
    } catch {
      return null;
    }
  }

  // Simple modal
  function ensureModal() {
    let modal = document.getElementById('b4u-video-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'b4u-video-modal';
    modal.className = 'b4u-modal hidden';
    modal.innerHTML = '<div class="b4u-backdrop"></div><div class="b4u-dialog"><button class="b4u-close" aria-label="Close">×</button><div class="b4u-frame"></div></div>';
    document.body.appendChild(modal);
    const close = () => hideModal();
    modal.querySelector('.b4u-backdrop').addEventListener('click', close);
    modal.querySelector('.b4u-close').addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    return modal;
  }

  function showModalWithVideo(videoId) {
    const modal = ensureModal();
    const frameWrap = modal.querySelector('.b4u-frame');
    frameWrap.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.src = 'https://www.youtube.com/embed/' + encodeURIComponent(videoId) + '?autoplay=1&rel=0';
    frameWrap.appendChild(iframe);
    modal.classList.remove('hidden');
  }

  function hideModal() {
    const modal = document.getElementById('b4u-video-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    const frameWrap = modal.querySelector('.b4u-frame');
    if (frameWrap) frameWrap.innerHTML = '';
  }

  cards.forEach((card) => {
    const titleEl = card.querySelector('h3');
    const play = card.querySelector('a.button');
    if (!titleEl || !play) return;
    const title = titleEl.textContent.trim();
    play.addEventListener('click', async (e) => {
      e.preventDefault();
      let vid = getCachedVideoId(title);
      if (!vid) {
        try {
          vid = await searchYouTubeVideoId(title + ' India');
          if (vid) setCachedVideoId(title, vid);
        } catch (err) {
          console.error(err);
        }
      }
      if (vid) {
        showModalWithVideo(vid);
      } else {
        alert('Sorry, no video found for this topic right now.');
      }
    });
  });
})();

// On This Day in Bharat's History — auto update daily
(function setupOnThisDayIndia() {
  const boardSection = document.getElementById('board');
  if (!boardSection) return;
  const container = boardSection.querySelector('.testimonials');
  if (!container) return;

  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const CACHE_KEY = `bharat4u.onthisday.v1.${mm}-${dd}`;
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  function saveCache(items) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), items }));
    } catch {}
  }

  function loadCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.items || !parsed.t) return null;
      if (Date.now() - parsed.t > ONE_DAY_MS) return null;
      return parsed.items;
    } catch {
      return null;
    }
  }

  function render(items) {
    if (!Array.isArray(items) || items.length === 0) return;
    const fragment = document.createDocumentFragment();
    items.slice(0, 6).forEach((ev) => {
      const block = document.createElement('blockquote');
      const p = document.createElement('p');
      const year = ev.year ? `${ev.year} — ` : '';
      p.textContent = `${year}${ev.text}`;
      const footer = document.createElement('footer');
      const a = document.createElement('a');
      a.href = ev.link || '#';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = ev.source || 'Wikipedia';
      footer.appendChild(a);
      block.appendChild(p);
      block.appendChild(footer);
      fragment.appendChild(block);
    });
    container.innerHTML = '';
    container.appendChild(fragment);
  }

  async function fetchOnThisDay() {
    const url = `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${mm}/${dd}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('onthisday fetch failed');
    const data = await res.json();
    const items = (data.events || []).map((e) => {
      const page = (e.pages && e.pages[0]) || {};
      return {
        year: e.year,
        text: e.text || page.extract || page.description || '',
        link: page.content_urls && page.content_urls.desktop && page.content_urls.desktop.page,
        source: page.normalizedtitle || 'Wikipedia'
      };
    });
    // Filter India-related content
    const INDIA_REGEX = /(\bIndia\b|\bIndian\b|\bBharat\b|Delhi|Mumbai|Calcutta|Kolkata|Chennai|Hyderabad|Punjabi|Marathi|Hindu|Hindustan|Gandhi|Nehru|Ambedkar|Punjab|Gujarat|Maharashtra|Tamil Nadu|Kerala|Bengaluru|Bangalore)/i;
    const filtered = items.filter((e) => INDIA_REGEX.test(e.text || '') || INDIA_REGEX.test(e.source || ''))
      .sort((a, b) => a.year - b.year);
    return filtered;
  }

  const cached = loadCache();
  if (cached) {
    render(cached);
  } else {
    fetchOnThisDay()
      .then((items) => {
        if (items && items.length) {
          saveCache(items);
          render(items);
        }
      })
      .catch((err) => {
        console.error('Failed to load On This Day events:', err);
      });
  }
})();

// EmailJS integration for direct send
// Replace these with your EmailJS credentials
const EMAILJS_SERVICE_ID = 'service_1w26rqc';
const EMAILJS_TEMPLATE_ID = 'template_q8to9bl';
const EMAILJS_PUBLIC_KEY = 'iHWSBMsFSBhea-HKT';

// Collaborate form: send via EmailJS
const collabForm = document.getElementById('collab-form');
if (collabForm) {
  if (window.emailjs) {
    window.emailjs.init(EMAILJS_PUBLIC_KEY);
  }
  collabForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = (document.getElementById('collab-name') || {}).value || '';
    const email = (document.getElementById('collab-email') || {}).value || '';
    const subject = (document.getElementById('collab-subject') || {}).value || '';
    const message = (document.getElementById('collab-message') || {}).value || '';

    const isValidEmail = /.+@.+\..+/.test(email);
    if (!isValidEmail) {
      alert('Please enter a valid email.');
      return;
    }

    if (!window.emailjs || !EMAILJS_PUBLIC_KEY) {
      alert('Email sending is not configured. Please set EmailJS keys.');
      return;
    }

    const templateParams = {
      from_name: name,
      from_email: email,
      subject,
      message,
      to_email: 'gahoisanskar714@gmail.com',
    };

    const submitButton = collabForm.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
      .then(() => {
        alert('Thanks! Your message has been sent.');
        collabForm.reset();
      })
      .catch((err) => {
        console.error(err);
        alert('Sorry, there was an error sending your message.');
      })
      .finally(() => {
        if (submitButton) submitButton.disabled = false;
      });
  });
}


