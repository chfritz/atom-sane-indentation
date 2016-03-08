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
  return new OnigRegExp(atom.config.get('editor.sane.' + pattern, {
        scope: e.scopeDescriptorForBufferPosition(0).scopes
      }));
};

/* this function returns a new function to use to overwrite the indentation
logic of language-mode */
function suggestedIndentForTokenizedLineAtBufferRow(e) {
  return function(bufferRow, line, tokenizedLine, options) {

    var decreaseIndentRegex, decreaseNextIndentRegex;
    var desiredIndentLevel, increaseIndentRegex, iterator;
    var precedingLine, precedingRow, ref, tokenizedPrecedingLine;

    iterator = tokenizedLine.getTokenIterator();
    iterator.next();
    // console.log(e.scopeDescriptorForBufferPosition(0));
    increaseIndentRegex = getRegex(e, 'increaseIndentPattern');
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

    if (!this.editor.isBufferRowCommented(precedingRow)) {
      precedingLine = this.buffer.lineForRow(precedingRow);
      tokenizedPrecedingLine = this.editor.displayBuffer.tokenizedBuffer.buildTokenizedLineForRowWithText(precedingRow, precedingLine);
      if (increaseIndentRegex) {
        desiredIndentLevel += countRegex(increaseIndentRegex, precedingLine, tokenizedPrecedingLine);
      }
      if (decreaseNextIndentRegex) {
        desiredIndentLevel -= countRegex(decreaseNextIndentRegex, precedingLine, tokenizedPrecedingLine);
      }
      if (decreaseIndentRegex && countRegex(decreaseIndentRegex, precedingLine, tokenizedPrecedingLine)) {
        desiredIndentLevel += 1;
      }
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
        e.languageMode.suggestedIndentForTokenizedLineAtBufferRow = suggestedIndentForTokenizedLineAtBufferRow(e);
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
