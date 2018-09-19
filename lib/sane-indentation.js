const SaneIndentationView = require('./sane-indentation-view');

const log = console.debug; // in dev
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
const treeWalk = (node, scopesToIndent, lastScope = null) => {
  if (node == null || node.parent == null) {
    log('treewalk complete');
    return 0;
  } else {

    const notFirstOrLastSibling =
      (node.previousSibling != null && node.nextSibling != null);

    const isScope = scopesToIndent.get(node.parent.type);
    let increment = (notFirstOrLastSibling && isScope ? 1 : 0 );

    // check whether the last indentation happend due to a scope that started
    // on the same row and ends directly after this.
    // TODO: this currently only works for scopes that have a single-character
    // closing delimiter (like statement_blocks, but not HTML, for instance).
    if (lastScope
      && increment > 0
      && node.parent.startPosition.row == lastScope.node.startPosition.row
      && node.parent.endIndex == lastScope.node.endIndex + 1) {
      log('ignoring repeat', node.parent.type, lastScope);
      increment = 0;
    }

    // Adjusting based on node parent
    if (node.parent.startPosition.row < node.startPosition.row
      && (node.parent.type == 'member_expression'
        || node.parent.type == 'assignment_expression'
        || node.parent.type == 'expression_statement'
        || node.parent.type == 'variable_declarator'
        || (node.parent.type == 'if_statement'
          && (!(node.type == 'if_statement'
            && node.previousSibling.type == 'else'
            && node.previousSibling.startPosition.row == node.startPosition.row)
            /* not an else-if */
          )
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
    const newLastScope = (isScope ? {node: node.parent} : lastScope);
    return treeWalk(node.parent, scopesToIndent, newLastScope) + increment;
  }
};


const suggestedIndentForBufferRow = (e, scopesToIndent) => {
  log({e, scopesToIndent});

  // Given a position, walk up the syntax tree, to find the highest level
  // node that still starts here. This is to identify the column where this
  // node (e.g., an HTML closing tag) ends.
  const getHighestSyntaxNodeAtPosition = (row, column = null) => {
    if (column == null) {
      // Find the first character on the row that is not whitespace + 1
      column = e.lineTextForBufferRow(row).search(/\S/) + 1;
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

  // -----------------------------------------------------------

  /* This approach is simpler and robust against parse errors */
  return (row, tabLength, options) => {

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
}


// --------------------------------------------------------

const SaneIndentation = {

  config: {
    javascript: {
      type: 'object',
      default: {
        scopes: {
          indent: [
            'array',
            'object',
            'arguments',
            'statement_block',
            'class_body',
            'parenthesized_expression',
            'jsx_element',
            'jsx_opening_element',
            'jsx_expression',
            'switch_body',
            'comment',
          ]
        }
      }
    },
    html: {
      type: 'object',
      default: {
        scopes: {
          indent: [
            'element',
            'start_tag',
            'end_tag',
            'self_closing_tag',
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

          e.languageMode.suggestedIndentForBufferRow =
            suggestedIndentForBufferRow(e, scopesToIndent);
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
