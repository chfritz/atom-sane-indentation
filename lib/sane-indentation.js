var SaneIndentation;
var SaneIndentationView = require('./sane-indentation-view');
var CompositeDisposable = require('atom').CompositeDisposable;
var OnigRegExp = require('oniguruma').OnigRegExp;

countRegex = function(regex, string, tokenized) {
  var count, isQuoted, m, ref, scopes;
  count = 0;
  m = regex.searchSync(string);

  while (m) {
    isQuoted = false;
    if (scopes = (ref = tokenized.tokenAtBufferColumn(m[0].start)) != null ?
      ref.scopes : void 0) {

      isQuoted = scopes.some(function(scope) {
          return scope.startsWith('string.quoted');
        });
    }

    if (!isQuoted) {
      count += 1;
    }
    m = regex.searchSync(string, m[0].start + 1);
  }
  return count;
};


getRegex = function(e, pattern) {
  var regex = atom.config.get('editor.sane.' + pattern, {
      scope: e.scopeDescriptorForBufferPosition(0).scopes
    });
  if (!regex) {
    // console.log("no sane indentation patterns for mode",
    // e.scopeDescriptorForBufferPosition(0).scopes, regex);
    return undefined;
  }
  return new OnigRegExp(regex);
};

/* this function returns a new function to use to overwrite the indentation
logic of language-mode */
function suggestedIndentForTokenizedLineAtBufferRow(e) {
  e.temporaryIndentations = {};
  return function(bufferRow, line, tokenizedLine, options) {
    // console.log(bufferRow, line, tokenizedLine, options)

    var decreaseIndentRegex, decreaseNextIndentRegex;
    var desiredIndentLevel, increaseIndentRegex, iterator;
    var precedingLine, precedingRow, ref, tokenizedPrecedingLine;

    iterator = tokenizedLine.getTokenIterator();
    iterator.next();
    // console.log(e.scopeDescriptorForBufferPosition(0));
    increaseIndentRegex = getRegex(e, 'increaseIndentPattern');
    if (!increaseIndentRegex) {
      // no sane indentation defined: use atom.io's default behavior
      return originals[e.id].call(e.languageMode, bufferRow, line, tokenizedLine, options);
    }
    decreaseIndentRegex = getRegex(e, 'decreaseIndentPattern');
    decreaseNextIndentRegex = getRegex(e, 'decreaseNextIndentPattern');
    // console.log("increase", increaseIndentRegex, "decrease", decreaseIndentRegex, "decreaseNext", decreaseNextIndentRegex);

    if (!decreaseNextIndentRegex) {
      decreaseNextIndentRegex = decreaseIndentRegex;
    }

    if ((ref = options != null ? options.skipBlankLines : void 0) != null ? ref : true) {
      precedingRow = this.buffer.previousNonBlankRow(bufferRow);
      if (precedingRow == null) {
        return 0;
      }
    } else {
      precedingRow = bufferRow - 1;
      if (precedingRow < 0) {
        return 0;
      }
    }

    desiredIndentLevel = this.editor.indentationForBufferRow(precedingRow);
    if (!increaseIndentRegex) {
      return desiredIndentLevel;
    }

    precedingLine = this.buffer.lineForRow(precedingRow);
    tokenizedPrecedingLine =
      this.editor.displayBuffer.tokenizedBuffer
    .buildTokenizedLineForRowWithText(precedingRow, precedingLine);

    if (!this.editor.isBufferRowCommented(precedingRow)) {
      if (increaseIndentRegex) {
        desiredIndentLevel +=
          countRegex(increaseIndentRegex, precedingLine, tokenizedPrecedingLine);
      }
      if (decreaseNextIndentRegex) {
        desiredIndentLevel -=
          countRegex(decreaseNextIndentRegex, precedingLine, tokenizedPrecedingLine);
      }
      if (decreaseIndentRegex &&
        countRegex(decreaseIndentRegex, precedingLine, tokenizedPrecedingLine)) {
        // account for dedentation that already happened in previous line
        desiredIndentLevel += 1;
      }

      // if preceding line ended with a cliff hanger, add temporary indentation
      var lastToken =
        tokenizedPrecedingLine.tokens[tokenizedPrecedingLine.tokens.length - 1];
      var firstToken =
        tokenizedLine.tokens[0];
      // ^ TODO: make this robust against comments
      var cliffHangers = atom.config.get('editor.sane.cliffTokens', {
          scope: e.scopeDescriptorForBufferPosition(0).scopes
        });
      // console.log(cliffHangers, lastToken);

      if (cliffHangers && cliffHangers.some(function(t) {
            return ((t == lastToken.value && firstToken.value != "}") // TODO
              || t == firstToken.value);
          })) {
        e.temporaryIndentations[bufferRow] = true;
        if (!e.temporaryIndentations[precedingRow]) {
          desiredIndentLevel += 1;
          // console.log("cliff hanger!");
        }
      } else if (e.temporaryIndentations[precedingRow]) {
        // temporary indentation is over
        desiredIndentLevel -= 1;
        // console.log("cliff hanger is over");
      }

    } else {

      // Comments:
      const increaseRegex = getRegex(e, 'comments.increase');
      const decreaseRegex = getRegex(e, 'comments.decrease');
      const decreaseNextRegex = getRegex(e, 'comments.decreaseNext');
      if (increaseRegex) {
        desiredIndentLevel +=
          countRegex(increaseRegex, precedingLine, tokenizedPrecedingLine);
      }
      if (decreaseNextRegex) {
        desiredIndentLevel -=
          countRegex(decreaseNextRegex, precedingLine, tokenizedPrecedingLine);
      }
      if (decreaseRegex) {
        if (countRegex(decreaseRegex, precedingLine, tokenizedPrecedingLine)) {
          desiredIndentLevel += 1;
        }

        if (countRegex(decreaseRegex, line, tokenizedLine)) {
          desiredIndentLevel -= 1;
        }
      }

      // console.log("commented", desiredIndentLevel, increaseRegex, decreaseRegex, decreaseNextRegex);
    }

    if (!this.buffer.isRowBlank(precedingRow)) {
      if (decreaseIndentRegex && countRegex(decreaseIndentRegex, line, tokenizedLine)) {
        desiredIndentLevel -= 1;
      }
    }
    // console.log("suggestedIndentForTokenizedLineAtBufferRow: rtv", desiredIndentLevel);

    return Math.max(desiredIndentLevel, 0);
  }
};

var originals = {};

module.exports = SaneIndentation = {

  saneIndentationView: null,
  modalPanel: null,
  subscriptions: null,

  activate: function(state) {

    this.saneIndentationView = new SaneIndentationView(state.saneIndentationViewState);
    this.modalPanel = atom.workspace.addModalPanel({
        item: this.saneIndentationView.getElement(),
        visible: false
      });

    this.subscriptions = new CompositeDisposable;
    this.subscriptions.add(atom.commands.add('atom-workspace', {
          'sane-indentation:toggle': (function(_this) {
              return function() {
                return _this.toggle();
              };
            })(this)
          }));

    atom.workspace.observeTextEditors(function(e) {
        // var config = atom.config.get('editor.sane.increaseIndentPattern', {
        //   scope: e.scopeDescriptorForBufferPosition(0).scopes
        // });
        // console.log(e.id);
        originals[e.id] = e.languageMode.suggestedIndentForTokenizedLineAtBufferRow;
        // var config = atom.config.get('source.js.editor.sane.increaseIndentPattern');
        // if (config) {
        e.languageMode.suggestedIndentForTokenizedLineAtBufferRow =
          suggestedIndentForTokenizedLineAtBufferRow(e);
        // } else {
        //   console.log("no sane indentation patterns for mode",
        //     e.scopeDescriptorForBufferPosition(0).scopes, config);
        // }
      });
  },

  deactivate: function() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    return this.saneIndentationView.destroy();
  },

  serialize: function() {
    return {
      saneIndentationViewState: this.saneIndentationView.serialize()
      };
  },

  toggle: function() {
    console.log('SaneIndentation was toggled!');
    if (this.modalPanel.isVisible()) {
      return this.modalPanel.hide();
    } else {
      return this.modalPanel.show();
    }
  }

};
