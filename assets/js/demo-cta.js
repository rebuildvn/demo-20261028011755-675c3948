/*
 * Demo conversion CTA: "happy with the demo?" buttons (hero + final section).
 *   [data-smeup-cta="contract"]    → dialog → lead type demo_contract_request (book the contract signing)
 *   [data-smeup-cta="cooperation"] → dialog → lead type demo_cooperation_request (talk / ask for changes)
 * No customer-site backend: both go to SMEUp Core, which alerts the Rebuild team and stamps the pipeline job.
 * The hero bar ([data-smeup-cta-reveal]) is rendered hidden and appears REVEAL_DELAY_MS after the visitor's
 * first interaction (scroll, click/tap, key press, or hovering the menu), so it doesn't greet them on load.
 * Events: demo_cta_clicked, contract_booking_started, cooperation_requested, lead_created.
 */
(function (window, document) {
  'use strict';

  var SMEUP = window.SMEUP;
  if (!SMEUP || !SMEUP.config.cta || !SMEUP.config.cta.enabled) {
    return;
  }

  var REVEAL_DELAY_MS = 10000;
  var lastTrigger = null;

  function revealAfterInteraction(elements) {
    if (!elements.length) {
      return;
    }

    var nav = document.querySelector('[data-site-header]');
    var started = false;

    function stop() {
      window.removeEventListener('scroll', start);
      document.removeEventListener('pointerdown', start);
      document.removeEventListener('keydown', start);
      if (nav) {
        nav.removeEventListener('pointerover', start);
      }
    }

    function start() {
      if (started) {
        return;
      }
      started = true;
      stop();
      window.setTimeout(function () {
        Array.prototype.forEach.call(elements, function (element) {
          element.hidden = false;
          element.classList.add('is-revealed');
        });
      }, REVEAL_DELAY_MS);
    }

    window.addEventListener('scroll', start, { passive: true });
    document.addEventListener('pointerdown', start);
    document.addEventListener('keydown', start);
    if (nav) {
      nav.addEventListener('pointerover', start);
    }
  }

  revealAfterInteraction(document.querySelectorAll('[data-smeup-cta-reveal]'));

  function openDialog(dialog) {
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
    var first = dialog.querySelector('input[name="name"]');
    if (first) {
      first.focus();
    }
  }

  function closeDialog(dialog) {
    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
    if (lastTrigger && lastTrigger.focus) {
      lastTrigger.focus();
    }
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-smeup-dialog]'), function (dialog) {
    var action = dialog.getAttribute('data-smeup-dialog');
    var form = dialog.querySelector('form[data-smeup-form]');

    if (form && SMEUP.bindForm) {
      SMEUP.bindForm(form, {
        onSuccess: function () {
          if (action === 'cooperation') {
            SMEUP.track('cooperation_requested', { placement: dialog.getAttribute('data-placement') || null });
          }
        }
      });
    }

    Array.prototype.forEach.call(dialog.querySelectorAll('[data-dialog-close]'), function (button) {
      button.addEventListener('click', function () { closeDialog(dialog); });
    });

    // Click on the backdrop closes the dialog.
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) {
        closeDialog(dialog);
      }
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-smeup-cta]'), function (button) {
    button.addEventListener('click', function () {
      var action = button.getAttribute('data-smeup-cta');
      var placement = button.getAttribute('data-cta-placement') || null;
      var dialog = document.getElementById('smeup-dialog-' + action);

      SMEUP.track('demo_cta_clicked', { action: action, placement: placement });

      if (!dialog) {
        return;
      }

      if (action === 'contract') {
        SMEUP.track('contract_booking_started', { placement: placement });
      }

      dialog.setAttribute('data-placement', placement || '');
      lastTrigger = button;
      openDialog(dialog);
    });
  });
})(window, document);
