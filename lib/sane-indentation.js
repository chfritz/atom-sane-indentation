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


/** Walk up the tree. Everytime we meet a scope type, check whether we
  are coming from the first (resp. last) child. If so, we are opening
  (resp. closing) that scope, i.e., do not count it. Otherwise, add 1.
*/
const treeWalk = (node, scopesToIndent, lastWasScope) => {
  if (node == null || node.parent == null) {
    log('treewalk complete');
    return 0;
  } else {

    const notFirstOrLastSibling =
      (node.previousSibling != null && node.nextSibling != null);

    const isScope = scopesToIndent.get(node.parent.type);
    let increment = (
      notFirstOrLastSibling && isScope ? 1
      : 0 );

    // check whether the las indentation happend due to a scope that started
    // on the same row and ends directly after this.
    // TODO: this currently only works for scopes that have a single-character
    // closing delimiter (like statement_blocks, but not HTML, for instance).
    if (lastWasScope
      && increment > 0
      && node.parent.startPosition.row == node.startPosition.row
      && node.parent.endIndex == node.endIndex + 1) {
      increment = 0;
    }

    // Adjusting based on node parent
    if (node.parent.startPosition.row < node.startPosition.row
      && (node.parent.type == 'member_expression'
        || node.parent.type == 'assignment_expression'
        || node.parent.type == 'expression_statement'
        || node.parent.type == 'variable_declarator'
        || (node.parent.type == 'if_statement'
          && node.type != 'statement_block'
          && node.type != 'else')
        || (node.parent.type == 'while_statement'
          && node.type != 'statement_block')
        || (node.parent.type == 'jsx_self_closing_element'
          && node.type != '/')
        || node.parent.type == 'lexical_declaration')) {

      log(`node adjustment -- ${node.parent.type}`);
      increment += 1;
    }

    log('treewalk', {node, notFirstOrLastSibling, type: node.parent.type, increment});
    return treeWalk(node.parent, scopesToIndent, isScope) + increment;
  }
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

  /** Find the first character on the row that is not whitespace */
  const getIndexOfFirstCharacterOnRow = (row) => {
    const line = e.lineTextForBufferRow(row);
    return line.search(/\S/);
  }

  // Given a position, walk up the syntax tree, to find the highest level
  // node that still starts here. This is to identify the column where this
  // node (e.g., an HTML closing tag) ends.
  const getHighestSyntaxNodeAtPosition = (row, column = null) => {
    if (column == null) {
      column = getIndexOfFirstCharacterOnRow(row) + 1;
    }

    let syntaxNode;
    if (column >= 0) {
      syntaxNode = e.languageMode.getSyntaxNodeAtPosition({row, column});
      while (syntaxNode.parent
        && syntaxNode.parent.startPosition.row == syntaxNode.startPosition.row
        && syntaxNode.parent.endPosition.row == syntaxNode.startPosition.row
        && syntaxNode.parent.startPosition.column == syntaxNode.startPosition.column
      ) {
        syntaxNode = syntaxNode.parent;
      }
      return syntaxNode;
    }
  }


  /** this is the main function */
  const firstVersion = (row, tabLength, options) => {

    const previousIndentation = e.indentationForBufferRow(Math.max(row - 1, 0));

    const scopes = e.scopeDescriptorForBufferPosition({
        row: row - 1,
        column: e.lineLengthForScreenRow(row - 1)
      }).scopes;

    if (scopes.includes('ERROR')) {
      log('error parsing code, keeping current indentation for now', scopes);
      return previousIndentation;
    }

    // get tokens and check which ones are white space
    // const tokens = e.tokensForScreenRow(row).map((t) => {
    //     t.whitespace = !t.text.match(/\S/);
    //     return t; });
    //
    // const firstNonwhitespaceTokenIndex = tokens.findIndex((t) => !t.whitespace);
    // // skip past all whitespace tokens and first non-whitespace token
    // let column = ( firstNonwhitespaceTokenIndex >= 0 ?
    //   // skip past all whitespace tokens and first non-whitespace token
    //   tokens.slice(0, firstNonwhitespaceTokenIndex+1).reduce((acc, t) =>
    //     acc + t.text.length, 0)
    //   : 0 );
    let column = getIndexOfFirstCharacterOnRow(row);
    const syntaxNode = getHighestSyntaxNodeAtPosition(row, column)
    syntaxNode && (column = syntaxNode.endPosition.column);

    const indentationScopes = filterScopesToIndent(scopes, syntaxNode);
    let indentation = indentationScopes.length

    // -- Adjustments

    // Adjusting for ending scopes
    const endScopes = e.scopeDescriptorForBufferPosition({row,column}).scopes;
    if (endScopes.length < scopes.length) {
      // a scope may have ended
      const endingScopes = removeSharedPrefix(scopes, endScopes);
      const filteredEndingScopes = filterScopesToIndent(endingScopes, syntaxNode);
      const unindent = endingScopes.filter(scope => scopesToUnindent.get(scope));
      log('scopes to unindent', unindent);

      indentation -= unindent.length;
    }

    // Adjusting based on syntaxNode parent
    if (syntaxNode && syntaxNode.parent
        && syntaxNode.parent.startPosition.row < row) {

      if (syntaxNode.parent.type == 'member_expression'
          || syntaxNode.parent.type == 'assignment_expression'
          || syntaxNode.parent.type == 'expression_statement'
          || syntaxNode.parent.type == 'variable_declarator'
          || syntaxNode.parent.type == 'lexical_declaration'
        ) {
        log(`syntaxNode adjustment -- ${syntaxNode.parent.type}`);
        indentation += 1;
      }
    }

    // Adjust for sequential scopes (starting and ending simultaneously)


    log('sane', {scopes, indentationScopes, endScopes, syntaxNode, indentation});
    return indentation;
  };

  // -----------------------------------------------------------

  /* This approach is simpler and robust against parse errors */
  const secondVersion = (row, tabLength, options) => {

    const previousRow = Math.max(row - 1, 0);
    const previousIndentation = e.indentationForBufferRow(previousRow);

    const syntaxNode = getHighestSyntaxNodeAtPosition(row);
    let indentation = treeWalk(syntaxNode, scopesToIndent);

    // Special case for comments
    if (syntaxNode.type == 'comment'
      && syntaxNode.startPosition.row < row
      && syntaxNode.endPosition.row > row) {
      indentation += 1;
    }

    return indentation;
  };

  // return firstVersion;
  return secondVersion;
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
            // 'if_statement',
            'class_body',
            'parenthesized_expression',
            'jsx_element',
            'jsx_opening_element',
            'switch_body',
            'comment'
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
            'switch_body',
            'comment'
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
