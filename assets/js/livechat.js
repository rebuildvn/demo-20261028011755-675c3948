/*
 * SMEUp Live Chat (livechat.smess.vn, Chatwoot-compatible website widget).
 * Needs only the PUBLIC website token of the client's inbox (SMEUP_SITE.livechat.websiteToken).
 * The visitor is tagged with site_id / client_id so conversations show which website they came from.
 * Without a token (local preview, not provisioned yet) a fallback button opens the contact form.
 * The widget (~1.7 MB of CSS, JS and fonts) loads on the visitor's first scroll / tap / key, or at once when the chat
 * bubble is tapped: until then a light bubble stands in, so the page itself stays fast (Google measures it untouched).
 *
 * Events: livechat_opened, livechat_started, livechat_message_sent (best effort, from widget events).
 */
(function (window, document) {
  'use strict';

  var SMEUP = window.SMEUP;
  if (!SMEUP) {
    return;
  }

  var config = SMEUP.config;
  var livechat = config.livechat || {};
  var lastOpenedAt = 0;
  var started = false;
  var startedAt = 0;

  function trackOpened(mode) {
    // The widget can report one open twice (bubble click + SDK event): count it once.
    if (Date.now() - lastOpenedAt < 2000) {
      return;
    }
    lastOpenedAt = Date.now();
    SMEUP.track('livechat_opened', { mode: mode });
  }

  function fallback() {
    if (document.querySelector('[data-chat-fallback]')) {
      return;
    }
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'chat-fallback';
    button.setAttribute('data-chat-fallback', '');
    button.setAttribute('aria-label', config.locale === 'vi' ? 'Nhắn tin cho chúng tôi' : 'Message us');
    button.textContent = '💬';
    button.addEventListener('click', function () {
      trackOpened('fallback');
      var contact = document.getElementById('contact');
      var message = document.getElementById('contact-message');
      if (contact) {
        contact.scrollIntoView({ behavior: 'smooth' });
      }
      if (message) {
        window.setTimeout(function () { message.focus({ preventScroll: true }); }, 400);
      }
    });
    document.body.appendChild(button);
  }

  if (!livechat.websiteToken || !livechat.baseUrl) {
    fallback();
    return;
  }

  var baseUrl = String(livechat.baseUrl).replace(/\/+$/, '');

  window.chatwootSettings = {
    locale: config.locale || 'vi',
    position: 'right',
    type: 'standard',
    launcherTitle: config.locale === 'vi' ? 'Nhắn tin cho chúng tôi' : 'Chat with us'
  };

  window.addEventListener('chatwoot:ready', function () {
    if (!window.$chatwoot) {
      return;
    }
    try {
      window.$chatwoot.setCustomAttributes({
        site_id: config.siteId || '',
        client_id: config.clientId || '',
        smeup_session_id: SMEUP.sessionId,
        landing_page: window.location.href.slice(0, 255),
        demo: Boolean(config.demo)
      });
    } catch (e) {
      /* older widget versions */
    }
  });

  window.addEventListener('chatwoot:opened', function () {
    trackOpened('widget');
  });

  document.addEventListener('click', function (event) {
    var bubble = event.target && event.target.closest ? event.target.closest('.woot-widget-bubble') : null;
    if (bubble) {
      window.setTimeout(function () {
        if (!window.$chatwoot || window.$chatwoot.isOpen !== false) {
          trackOpened('widget');
        }
      }, 50);
    }
  });

  window.addEventListener('chatwoot:on-start-conversation', function () {
    started = true;
    startedAt = Date.now();
    SMEUP.track('livechat_started', {});
    // The first visitor message opens the conversation; some widget versions report it only here.
    SMEUP.track('livechat_message_sent', { first: true });
  });

  window.addEventListener('chatwoot:on-message', function (event) {
    var message = event.detail || {};
    // message_type 0 = incoming, i.e. written by the visitor.
    if (message.message_type !== 0 || Date.now() - startedAt < 3000) {
      return;
    }
    if (!started) {
      started = true;
      SMEUP.track('livechat_started', {});
    }
    SMEUP.track('livechat_message_sent', { first: false });
  });

  window.addEventListener('chatwoot:error', fallback);

  var loaded = false;
  var openWhenReady = false;
  var placeholder = null;

  function load() {
    if (loaded) {
      return;
    }
    loaded = true;
    var script = document.createElement('script');
    script.src = baseUrl + '/packs/js/sdk.js';
    script.async = true;
    script.defer = true;
    script.onload = function () {
      if (window.chatwootSDK) {
        window.chatwootSDK.run({ websiteToken: livechat.websiteToken, baseUrl: baseUrl });
      } else {
        fallback();
      }
    };
    script.onerror = fallback;
    document.body.appendChild(script);
  }

  window.addEventListener('chatwoot:ready', function () {
    if (placeholder && placeholder.parentNode) {
      placeholder.parentNode.removeChild(placeholder);
    }
    if (openWhenReady && window.$chatwoot) {
      window.$chatwoot.toggle('open');
    }
  });

  // The light stand-in bubble: tapping it loads the chat and opens it.
  placeholder = document.createElement('button');
  placeholder.type = 'button';
  placeholder.className = 'chat-fallback';
  placeholder.setAttribute('data-chat-launcher', '');
  placeholder.setAttribute('aria-label', window.chatwootSettings.launcherTitle);
  placeholder.textContent = '💬';
  placeholder.addEventListener('click', function () {
    trackOpened('widget');
    openWhenReady = true;
    load();
  });
  document.body.appendChild(placeholder);

  ['scroll', 'pointerdown', 'touchstart', 'keydown'].forEach(function (type) {
    window.addEventListener(type, load, { once: true, passive: true });
  });
})(window, document);
