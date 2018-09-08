const SaneIndentationView = require('./sane-indentation-view');

 const log = console.log; // in dev
// const log = () => {}; // in production


/** turn array into Map, for O(1) containment check */
const arrayToMap = (array) => {
  return array.reduce((acc, v) => {
      acc.set(v, true);
      return acc;
    }, new Map());
};

/** remove maximal shared prefix
e.g.: removeSharedPrefix([1,2,3,4,5], [1,2,3,5]) == [1,2,3]
*/
const removeSharedPrefix = (list, prefix) => {
  let i;
  for (i = 0; i < prefix.length && list[i] == prefix[i]; i++) {}
  return list.slice(i);
};

const suggestedIndentForBufferRow = (e, scopesToIndent, scopesToUnindent) => {
  log({e, scopesToIndent, scopesToUnindent});

  // function to squash certain sequences of scope-scope or scope-token
  const filterScopesToIndent = (scopes, syntaxNode) => {
    const squashPairs = [
      ['if_statement', {scope: 'statement_block'}],
      ['if_statement', {node: 'else'}],
      // ['jsx_element', {node: 'jsx_closing_element'}]
    ];
    // const filtered = scopes.filter(scope => scopesToIndent[scope]);
    return scopes.reduce((acc, s) => {
        let ignore = false; // do not ignore this scope
        squashPairs.forEach((pair) => {
            ignore |= (
              // it's a scope pattern and scope matches
              ( acc.last && acc.last == pair[0] && pair[1].scope && pair[1].scope == s)
              // or it's a node-type based pattern and token matches
              || (pair[0] == s && pair[1].node &&
                // firstNonwhitespaceToken &&
                // pair[1].token == firstNonwhitespaceToken)
                syntaxNode &&
                pair[1].node == syntaxNode.type)
            );
          });
        if (!ignore) {
          acc.list.push(s);
          }
        acc.last = s;
        return acc;
      }, {list: [], last: null}).list.filter(scope => scopesToIndent.get(scope));
  };

    /** this is the main function */
  return (row, tabLength, options) => {

    const previousIndentation = e.indentationForBufferRow(Math.max(row - 1, 0));

    const scopes = e.scopeDescriptorForBufferPosition({
        row: row-1,
        column: e.lineLengthForScreenRow(row-1)
      }).scopes;

    if (scopes.includes('ERROR')) {
      log('error parsing code, keeping current indentation for now', scopes);
      return previousIndentation;
    }

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
    // skip past all whitespace tokens and first non-whitespace token
    let column = ( firstNonwhitespaceTokenIndex >= 0 ?
      // skip past all whitespace tokens and first non-whitespace token
      tokens.slice(0, firstNonwhitespaceTokenIndex + 1).reduce((acc, t) =>
        acc + t.text.length, 0)
      : 0 );

    let syntaxNode;
    // l = atom.textEditors.editors.values().next().value.languageMode
    // l.getSyntaxNodeAtPosition({row: 1234, column: 234})
    if (firstNonwhitespaceTokenIndex >= 0) {
      syntaxNode = e.languageMode.getSyntaxNodeAtPosition({row, column});
      // Now we walk up the syntax tree, to find the highest level node that still
      // starts here. This is to identify the column where this node (e.g., an
      // HTML closing tag) ends.
      while (syntaxNode.parent
        && syntaxNode.parent.startPosition.row == syntaxNode.startPosition.row
        && syntaxNode.parent.startPosition.column == syntaxNode.startPosition.column) {
        syntaxNode = syntaxNode.parent;
      }
      // move column to end of that syntax node
      column = syntaxNode.endPosition.column;
    }

    const endScopes = e.scopeDescriptorForBufferPosition({
        row,
        column
      }).scopes;
    const indentationScopes = filterScopesToIndent(scopes, syntaxNode);

    log('scopes:', {scopes, indentationScopes, endScopes, syntaxNode} );

    if (endScopes.length < scopes.length) {
      // a scope may have ended
      const endingScopes = removeSharedPrefix(scopes, endScopes);
      const filteredEndingScopes = filterScopesToIndent(endingScopes, syntaxNode);
      const unindent = endingScopes.filter(scope => scopesToUnindent.get(scope));
      log('scopes to unindent', unindent);

      indentation = indentationScopes.length - unindent.length;

    } else {

      indentation = indentationScopes.length;
    }

    // syntaxNode based adjustments:
    if (syntaxNode && syntaxNode.parent
        && syntaxNode.parent.startPosition.row < row) {

      if (syntaxNode.parent.type == 'member_expression'
          || syntaxNode.parent.type == 'assignment_expression'
          || syntaxNode.parent.type == 'expression_statement'
          || syntaxNode.parent.type == 'lexical_declaration'
        ) {
        log(`syntaxNode adjustment -- ${syntaxNode.parent.type}`);
        indentation += 1;
      }

    }

    log('sane', indentation);
    return indentation;
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
