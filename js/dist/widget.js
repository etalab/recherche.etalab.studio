"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _createForOfIteratorHelper(o) { if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (o = _unsupportedIterableToArray(o))) { var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e2) { throw _e2; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var it, normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e3) { didErr = true; err = _e3; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(n); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

/**
 * Declarations
 */
var remoteUrl = "//recherche.etalab.studio";
var datasetsUrl = "".concat(remoteUrl, "/datasets.json");
var dom = {
  container: document.querySelector('.navbar-static-top .container')
};
Object.assign(dom, {
  search: dom.container.querySelector('[type=search]'),
  categories: dom.container.querySelector('nav.sidebar.panel.collapse.subnav-collapse'),
  contribute: dom.container.querySelector('.call-to-action')
});
Object.assign(dom, {
  closeButton: injectCloseButton(),
  cardsList: injectCardList()
});
var cardTemplate = "<div class=\"col-xs-12 col-md-4 col-sm-6\" id=\"{{ id }}\">\n<a class=\"card dataset-card\" href=\"{{ page }}\">\n  <div class=\"card-logo\">\n    <img alt=\"{{ title }}\"\n      src=\"{{ logo_url }}\" width=\"70\" height=\"70\">\n  </div>\n  {{ certified_img }}\n  <div class=\"card-body\">\n    <h4>{{ title }}</h4>\n    <div class=\"clamp-3\">{{ excerpt }}</div>\n  </div>\n</a>\n</div>";
var searcher = new LunrSearch();
hackDom();
injectStylesheet();
listenFocus();
listenSubmit();
injectLunr(function () {
  init();
  listenSearch();
});

function injectStylesheet() {
  var style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = "".concat(remoteUrl, "/css/widget.css");
  document.head.appendChild(style);
}

function injectLunr(callback) {
  // Lunr injection must be performed step by step.
  var lunrScript = document.createElement('script');
  lunrScript.src = "".concat(remoteUrl, "/js/lunr.js");
  lunrScript.onload = loadStemmer;
  document.head.appendChild(lunrScript);

  function loadStemmer() {
    var lunrStemmerScript = document.createElement('script');
    lunrStemmerScript.src = "".concat(remoteUrl, "/js/lunr.stemmer.support.js");
    lunrStemmerScript.onload = loadLunrFr;
    document.head.appendChild(lunrStemmerScript);
  }

  function loadLunrFr() {
    var lunrFrScript = document.createElement('script');
    lunrFrScript.src = "".concat(remoteUrl, "/js/lunr.fr.js");
    lunrFrScript.onload = callback;
    document.head.appendChild(lunrFrScript);
  }
}

function injectCloseButton() {
  var button = document.createElement('button');
  button.classList.add('close');
  dom.categories.parentNode.insertBefore(button, dom.categories);
  button.addEventListener('click', disableWidget);
  return button;
}

function injectCardList() {
  var div = document.createElement('div');
  div.classList.add('card-list', 'card-list--columned');
  dom.categories.parentNode.insertBefore(div, dom.categories);
  return div;
}

function listenFocus() {
  dom.search.addEventListener('focus', enableWidget);
}

function listenSubmit() {
  dom.search.closest('form').addEventListener('submit', function (event) {
    stats('form', 'submit');
  });
}

function enableWidget() {
  dom.container.classList.add('focused');
  dom.categories.classList.add('fadeout');
  dom.contribute.classList.add('fadeout');
  stats('widget', 'open');
}

function disableWidget() {
  dom.container.classList.remove('focused');
  dom.categories.classList.remove('fadeout');
  dom.contribute.classList.remove('fadeout');
  stats('widget', 'close');
}

function listenSearch() {
  dom.search.addEventListener('keyup', function () {
    var text = event.target.value;
    if (search) search(text);
    updateInterface(text);
  });
}

function listenCardsClick() {
  Array.from(dom.cardsList.querySelectorAll('a.card')).forEach(function (a) {
    a.addEventListener('click', function (event) {
      stats('click', event.currentTarget.href);
    });
  });
}

function init() {
  return _init.apply(this, arguments);
}

function _init() {
  _init = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
    var populars, q;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return loadPopularDatasets();

          case 2:
            populars = _context.sent;
            loadCards(populars);
            listenCardsClick();
            searcher.index(populars);
            q = new URLSearchParams(location.search).get('q');
            stats('widget', 'load');

            if (q) {
              dom.search.value = q;
              search(q);
              enableWidget();
            }

          case 9:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));
  return _init.apply(this, arguments);
}

function hackDom() {
  // Some CSS in non-overridable due to `!important` which heavy selectors
  dom.categories.id = 'categories-node'; // Deactivate the suggestion dropdown

  dom.container.querySelector('.dropdown-menu.suggestion').remove(); // Unsassign Vue

  dom.search.__v_model.unbind();
}

function loadPopularDatasets() {
  return _loadPopularDatasets.apply(this, arguments);
}

function _loadPopularDatasets() {
  _loadPopularDatasets = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2() {
    var response;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return fetch(datasetsUrl);

          case 2:
            response = _context2.sent;
            _context2.next = 5;
            return response.json();

          case 5:
            return _context2.abrupt("return", _context2.sent);

          case 6:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));
  return _loadPopularDatasets.apply(this, arguments);
}

function loadCards(datasets) {
  var _iterator = _createForOfIteratorHelper(datasets.entries()),
      _step;

  try {
    var _loop = function _loop() {
      var _step$value = _slicedToArray(_step.value, 2),
          i = _step$value[0],
          dataset = _step$value[1];

      if (!dataset.logo_url) dataset.logo_url = '';

      if (dataset.certified) {
        dataset.certified_img = "<img\n        src=\"https://static.data.gouv.fr/_themes/gouvfr/img/certified-stamp.png\"\n        alt=\"certified\" class=\"certified\"\n      >";
      } else {
        dataset.certified_img = '';
      }

      var content = cardTemplate.replace(/\{\{\s*(.*)\s*}}/g, function (_, match) {
        return dataset[match.trim()];
      });
      dom.cardsList.innerHTML += content.trim();

      if (i >= 6) {
        dom.cardsList.lastChild.classList.add('hidden');
      }
    };

    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      _loop();
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
}

function updateCardsDisplay(ids) {
  Array.from(dom.cardsList.children).forEach(function (card) {
    if (ids.includes(card.id)) card.classList.remove('hidden');else card.classList.add('hidden');
  });
}

function updateInterface(q) {
  var params = new URLSearchParams(location.search);
  params.set('q', q);
  var qs = Array.from(params).map(function (pair) {
    return "".concat(pair[0], "=").concat(pair[1]);
  }).join('&');
  window.history.pushState({}, '', "?".concat(qs));
}

function search(text) {
  var matches = searcher.search(text);
  stats('search', text);
  updateCardsDisplay(matches.slice(0, 12).map(function (m) {
    return m.ref;
  }));
}

function LunrSearch() {}

function cleanupDiacritic(builder) {
  function pipelineFunction(token) {
    return token.update(function () {
      return normalizeText(String(token));
    });
  }

  lunr.Pipeline.registerFunction(pipelineFunction, 'cleanupDiacritic');
  builder.pipeline.after(lunr.stemmer, pipelineFunction);
  builder.searchPipeline.before(lunr.stemmer, pipelineFunction);
}

LunrSearch.prototype.index = function (docs) {
  this._index = lunr(function () {
    var _this = this;

    this.use(cleanupDiacritic);
    this.ref('id');
    this.field('acronym');
    this.field('title');
    this.field('excerpt');
    this.field('source');
    docs.forEach(function (d) {
      var tmp = {
        id: d.id,
        keywords: [d.source, d.title, d.source, d.excerpt].join(' ')
      };

      _this.add(d);
    });
  });
};

function normalizeText(text) {
  return text && text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

LunrSearch.prototype.search = function (text) {
  text = text.split(/\s+/g).reduce(function (acc, w) {
    var requirement = w.length > 3 ? '+' : '';
    var fuzziness = '';
    if (w.length <= 4 && acc.length > 0) fuzziness = '*';else if (w.length > 4) fuzziness = '~2';
    if (w) acc.push("".concat(requirement).concat(w).concat(fuzziness));
    return acc;
  }, []).join(' ');
  return this._index.search(text);
};

function stats(category, action) {
  if (typeof Piwik === 'undefined') return;
  var t = Piwik.getTracker();
  t.trackEvent("Recherche/".concat(category), action);
}
