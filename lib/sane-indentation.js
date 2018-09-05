const SaneIndentationView = require('./sane-indentation-view');

const originals = {};

// const log = console.log; // in dev
const log = () => {}; // in production


/** turn array into Map, for O(1) containment check */
const arrayToMap = (array) => {
  return array.reduce((acc, v) => {
      acc.set(v, true);
      return acc;
    }, new Map());
};


const suggestedIndentForBufferRow = (e, scopesToIndent, scopesToUnindent) => {
  /** this is the main function */
  return (row, tabLength, options) => {
    // log('sane', bufferRow, tabLength, options, e);
    // const self = e.languageMode;
    // const line = self.buffer.lineForRow(bufferRow)
    // const tokenizedLine = self.tokenizedLineForRow(bufferRow)
    // const iterator = tokenizedLine.getTokenIterator()
    // iterator.next()
    // const scopes = iterator.getScopes();

    // const indentation = suggestedIndentForTokenizedLineAtBufferRow.bind(e)(
    //     bufferRow,
    //     line,
    //     tokenizedLine,
    //     options,
    //     scopes,
    //     tabLength
    // );

    const scopes = e.scopeDescriptorForBufferPosition({
        row: row-1,
        column: e.lineLengthForScreenRow(row-1)
      }).scopes;
    // get tokens and check which ones are white space
    const tokens = e.tokensForScreenRow(row).map(
      (t) => {
        t.whitespace = !t.text.match(/\S/);
        return t;
      }
    );

    let indentation = null;
    // check how many scopes end right at the beginning of this row
    const firstNonwhitespaceTokenIndex = tokens.findIndex((t) => !t.whitespace);
    const endScopes = e.scopeDescriptorForBufferPosition({
        row,
        column: ( firstNonwhitespaceTokenIndex >= 0 ?
          // skip past all whitespace tokens and first non-whitespace token
          tokens.slice(0, firstNonwhitespaceTokenIndex + 1).reduce((acc, t) =>
            acc + t.text.length, 0)
          : 0 )
      }).scopes;
    const firstNonwhitespaceToken = (
      firstNonwhitespaceTokenIndex >= 0 ?
      tokens[firstNonwhitespaceTokenIndex].text : undefined );

    // read syntax tree; is that useful? #HERE; to use in console, use
    // l = atom.textEditors.editors.values().next().value.languageMode
    // l.getSyntaxNodeAtPosition({row: 1234, column: 234})
    const firstSyntaxNode = e.languageMode.getSyntaxNodeAtPosition(
      {row, column: ( firstNonwhitespaceTokenIndex >= 0 ?
        // skip past all whitespace tokens and first non-whitespace token
        tokens.slice(0, firstNonwhitespaceTokenIndex + 1).reduce((acc, t) =>
          acc + t.text.length, 0)
        : 0 )
      });

    log('scopes:', scopes, endScopes, tokens, firstSyntaxNode );

    // function to squash certain sequences of scope-scope or scope-token
    const squashPairs = [
      ['if_statement', {scope: 'statement_block'}],
      ['if_statement', {token: 'else'}],
      ['jsx_element', {scope: 'jsx_closing_element'}]
    ];
    const filterScopesToIndent = (scopes) => {
      // const filtered = scopes.filter(scope => scopesToIndent[scope]);
      return scopes.reduce((acc, s) => {
          let ignore = false; // do not ignore this scope
          squashPairs.forEach((pair) => {
              ignore |= (
                // it's a scope pattern and scope matches
                ( acc.last && acc.last == pair[0] && pair[1].scope && pair[1].scope == s)
                // or it's a token based pattern and token matches
                || (pair[0] == s && pair[1].token &&
                  firstNonwhitespaceToken &&
                  pair[1].token == firstNonwhitespaceToken)
              );
            });
          if (!ignore) {
            acc.list.push(s);
          }
          acc.last = s;
          return acc;
        }, {list: [], last: null}).list.filter(scope => scopesToIndent.get(scope));
    };


    const indentationScopes = filterScopesToIndent(scopes);
    const indentationEndScopes = filterScopesToIndent(endScopes);

    if (endScopes.length < scopes.length) {
      const endingScopes = scopes.slice(endScopes.length);
      const unindent = endingScopes.filter(scope => scopesToUnindent.get(scope));

      log('scopes to unindent', unindent);

      indentation = indentationScopes.length - unindent.length;
    } else {
      indentation = indentationScopes.length;
    }


    if (indentation !== null) {
      log('sane', scopes, indentationScopes, indentation);
      return indentation;
    } else {
      // log('no sane indentation patterns for mode, falling back to default');
      return originals[e.id].bind(e.languageMode)(bufferRow, options);
    }
  };
}


// --------------------------------------------------------

const SaneIndentation = {

  config: {
    test: {
      type: 'integer',
      default: 23,
      minimum: 1
    },
    javascript: {
      type: 'object',
      default: {
        scopes: {
          indent: [
            'array',
            'object',
            'arguments',
            // 'call_expression', // TODO: if opened on previous line (like firstLine.secondLine())
            // 'assignment_expression', // TODO: only when 'opened' on a previous line (and not a block)
            'statement_block',
            'if_statement',
            'class_body',
            'parenthesized_expression',
            'jsx_element',
            'switch_body',
            'switch_case',
            'switch_default'
          ],
          // these scopes, when ending on the current row, will unindent
          // current row already (not just the next)
          unindent: [
            'array',
            'object',
            'arguments',
            'statement_block',
            'class_body',
            'parenthesized_expression',
            'jsx_element',
            'jsx_closing_element',
            'switch_body'
          ]
        }
      }
    }
  },

  saneIndentationView: null,
  modalPanel: null,
  subscriptions: null,

  activate: function(state) {
    log('activating sanity');
    atom.config.set('core.useTreeSitterParsers', true);

    // this.saneIndentationView = new SaneIndentationView(state.saneIndentationViewState);
    // this.modalPanel = atom.workspace.addModalPanel({
    //   item: this.saneIndentationView.getElement(),
    //     visible: false
    //   });

    // this.subscriptions = new CompositeDisposable;
    // this.subscriptions.add(atom.commands.add('atom-workspace', {
    //       'sane-indentation:toggle': (function(_this) {
    //           return function() {
    //             return _this.toggle();
    //           };
    //         })(this)
    //     }));

    // watch editors; if new ones get added, monkey-patch them as well
    atom.workspace.observeTextEditors(function(e) {
        originals[e.id] = e.languageMode.suggestedIndentForBufferRow;

        const language = e.languageMode.grammar && e.languageMode.grammar.id;
        log('language', language);
        const config = atom.config.get(`sane-indentation.${language}`);
        if (config) {
          // turn into Maps
          const scopesToIndent = arrayToMap(config.scopes.indent);
          const scopesToUnindent = arrayToMap(config.scopes.unindent);

          e.languageMode.suggestedIndentForBufferRow =
          suggestedIndentForBufferRow(e, scopesToIndent, scopesToUnindent);
        } else {
          log(`no grammar defined for ${language}, leaving atom.io's indentation logic in place`);
        }
      });
  },


  deactivate: function() {
    log('back to insanity');
  },

  // serialize: function() {
  //   // return {
  //   //   saneIndentationViewState: this.saneIndentationView.serialize()
  //   //   };
  // },

  // toggle: function() {
  //   log('SaneIndentation was toggled again!');
  //   if (this.modalPanel.isVisible()) {
  //     return this.modalPanel.hide();
  //   } else {
  //     return this.modalPanel.show();
  //   }
  // }

};


module.exports = SaneIndentation;
