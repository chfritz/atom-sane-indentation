
const log = console.debug; // in dev
// const log = () => {}; // in production

/** turn array into Map, for O(1) containment check */
const arrayToMap = (array) => {
  return array.reduce((acc, v) => {
      acc.set(v, true);
      return acc;
    }, new Map());
};

/** Language specific special conditions that, when met by a node whose parent
  starts on the previous row, will cause an indentation. Example else-if:
  if (test)
    more()
  else if (test2)
    andmore()

  TODO: it would be nice to further reify this, i.e., make it declarative.
 */
const previousRowConditions = {

  'source.js': (node) => ( false
    // (node.parent.type == 'while_statement' && node.type != 'statement_block')
      // ||
    // (node.parent.type == 'jsx_self_closing_element' && node.type != '/')
      // || (node.parent.type == 'if_statement'
      //   && (!(node.type == 'if_statement'
      //       && node.previousSibling.type == 'else'
      //       && node.previousSibling.startPosition.row == node.startPosition.row)
      //     /* not an else-if */
      //   )
      //   && node.type != 'statement_block'
      //   && node.type != 'else')
  ),

  // 'source.js': [
  //   { $and: [
  //     { 'parent.type': 'while_statement' },
  //     { $not: {'type': 'statement_block'}}
  //   ]},
  //   { $and: [
  //     {'parent.type': 'jsx_self_closing_element'}
  //     {$not: { type: '/' }}
  //   ]},
  //   {$and: [{'parent.type': 'if_statement'},
  //       {$not: {$and: [{type: 'if_statement'},
  //         {'previousSibling.type': 'else'},
  //         {'previousSibling.startPosition.row': {$node: 'startPosition.row'}}
  //       ]}} /* not an else-if */
  //       ,
  //       {$not: {type: 'statement_block'}},
  //       {$not: {type: 'else'}}
  //   }
  // ],


  'source.python': (node) => (
    ( node.parent.type == 'if_statement'
      && node.type != 'elif_clause'
      && node.type != 'else_clause')

      || ( node.parent.type == 'while_statement'
        && node.type != 'else_clause')

      || (node.parent.type == 'try_statement'
        && node.type != 'except_clause'
        && node.type != 'finally_clause'
        && node.type != 'else_clause')
  ),

  'source.cpp': (node) => (
    (node.parent.type == 'while_statement' && node.type != 'compound_statement')
      || (node.parent.type == 'if_statement'
        && (!(node.type == 'if_statement'
            && node.previousSibling.type == 'else'
            && node.previousSibling.startPosition.row == node.startPosition.row)
          /* not an else-if */
        )
        && node.type != 'compound_statement'
        && node.type != 'else')
  ),
};

previousRowConditions['source.c'] =
  previousRowConditions['source.cpp'];


/** Walk up the tree. Everytime we meet a scope type, check whether we
  are coming from the first (resp. last) child. If so, we are opening
  (resp. closing) that scope, i.e., do not count it. Otherwise, add 1.

  This is the core function.

  It might make more sense to reverse the direction of this walk, i.e.,
  go from root to leaf instead.
*/
const treeWalk = (node, scopes, previousRowConditions, lastScope = null) => {
  if (node == null || node.parent == null) {
    return 0;
  } else {

    let increment = 0;

    const notFirstOrLastSibling =
      (node.previousSibling != null && node.nextSibling != null);

    const isScope = scopes.indent.get(node.parent.type);
    (notFirstOrLastSibling && isScope && increment++);

    const isScope2 = scopes.indentExceptFirst.get(node.parent.type);
    (!increment && isScope2 && node.previousSibling != null && increment++);

    const isScope3 = scopes.indentExceptFirstOrBlock.get(node.parent.type);
    (!increment && isScope3 && node.previousSibling != null && increment++);

    // apply current row, single line, type-based rules, e.g., 'else' or 'private:'
    let typeDent = 0;
    scopes.types.indent.get(node.type) && typeDent++;
    scopes.types.outdent.get(node.type) && increment && typeDent--;
    increment += typeDent;

    // check whether the last (lower) indentation happend due to a scope that
    // started on the same row and ends directly before this.
    // TODO: this currently only works for scopes that have a single-character
    // closing delimiter (like statement_blocks, but not HTML, for instance).
    if (lastScope && increment > 0
        && // previous scope was a two-sided scope, reduce if starts on same row
        // and ends right before
        ((node.parent.startPosition.row == lastScope.node.startPosition.row
            && (node.parent.endIndex <= lastScope.node.endIndex + 1))
          // || false)) {
          || (isScope3 && lastScope.node.endIndex == node.endIndex) )
    ) {

      log('ignoring repeat', node.parent.type, lastScope.node.type);
      increment = 0;
    }


    // Adjusting based on node parent
    if (previousRowConditions
      && node.parent.startPosition.row < node.startPosition.row
      && previousRowConditions(node)) {
      log(`node adjustment -- previous row condition met`);
      increment += 1;
    }

    log('treewalk', {node, lastScope, notFirstOrLastSibling, type: node.parent.type, increment});
    const newLastScope = (isScope || isScope2 ? {node: node.parent} : lastScope);
    return treeWalk(node.parent, scopes, previousRowConditions, newLastScope) + increment;
  }
};



const suggestedIndentForBufferRow = (e, scopes, previousRowConditions = null) => {

  log({e, scopes});

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
      while (syntaxNode && syntaxNode.parent
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
    const currentIndentation = e.indentationForBufferRow(row);

    const syntaxNode = getHighestSyntaxNodeAtPosition(row);
    if (!syntaxNode) {
      return 0;
    }
    let indentation = treeWalk(syntaxNode, scopes, previousRowConditions);

    // // apply current row, single line, type-based rules, e.g., 'else' or 'private:'
    // scopes.types.indent.get(syntaxNode.type) && indentation++;
    // scopes.types.outdent.get(syntaxNode.type) && indentation--;

    // Special case for comments
    if (syntaxNode.type == 'comment'
      && syntaxNode.startPosition.row < row
      && syntaxNode.endPosition.row > row) {
      indentation += 1;
    }

    if (options && options.preserveLeadingWhitespace) {
      indentation -= currentIndentation;
    }

    return indentation;
  };
}


// --------------------------------------------------------

const SaneIndentation = {

  config: {
    'source.js': {
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
          ],
          indentExceptFirst: [
            'member_expression',
            'assignment_expression',
            'expression_statement',
            'variable_declarator',
            'lexical_declaration',
            'binary_expression',
            'jsx_self_closing_element',
          ],
          indentExceptFirstOrBlock: [
            'if_statement',
            'else',
            'while_statement'
          ]
        },
        types: { // for current node types, current line only
          indent: [],
          outdent: [
            'else'
          ]
        }
      }
    },

    'text.html.basic': {
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
    },

    'source.python': {
      type: 'object',
      default: {
        scopes: {
          indent: [
            'argument_list',
            'dictionary',
            'list',
            'list_comprehension',
          ],
          indentExceptFirst: [
            'function_definition',
            'for_statement',
            'class_definition',
            'elif_clause',
            'else_clause',
            'expression_list',
            'binary_operator',
            'except_clause',
          ]
        }
      }
    },

    'source.cpp': {
      type: 'object',
      default: {
        scopes: {
          indent: [
            'compound_statement',
            'argument_list',
            'field_declaration_list',
            'enumerator_list',
            'parameter_list',
            'initializer_list',
          ],
          indentExceptFirst: [
            'for_statement',
            'return_statement',
            'shift_expression',
            'call_expression',
            'field_expression',
            'logical_expression',
            'math_expression',
            'relational_expression',
            'assignment_expression',
            'lambda_expression',
            'field_initializer_list',
            'template_argument_list',
            'init_declarator',
          ],
        },
        types: { // for current node types, current line only
          indent: [],
          outdent: [
            'access_specifier'
          ]
        }
      }
    },

    'source.c': {
      type: 'object',
      default: {
        scopes: {
          indent: [
            'compound_statement',
            'argument_list',
            'field_declaration_list',
            'enumerator_list',
            'parameter_list',
            'initializer_list',
          ],
          indentExceptFirst: [
            'for_statement',
            'return_statement',
            'shift_expression',
            'call_expression',
            'field_expression',
            'logical_expression',
            'math_expression',
            'relational_expression',
            'assignment_expression',
            'field_initializer_list',
            'init_declarator',
          ],
        }
      }
    },
  },

  activate: function(state) {
    log('activating sanity');
    atom.config.set('core.useTreeSitterParsers', true);

    // watch editors; if new ones get added, monkey-patch them as well
    atom.workspace.observeTextEditors((e) => {
      if (e.languageMode.treeIndenter) {
        log('treeIndenter already defined; sanity already provided, skipping');
        return;
      }

      const language = e.languageMode.grammar && e.languageMode.grammar.id;
      log('language', language);
      const config = atom.config.get(`sane-indentation.${language}`);
      if (config) {
        // turn into Maps
        const scopes = {
          indent: arrayToMap(config.scopes.indent),
          indentExceptFirst: arrayToMap(config.scopes.indentExceptFirst || []),
          indentExceptFirstOrBlock: arrayToMap(config.scopes.indentExceptFirstOrBlock || []),
          types: {
            indent: arrayToMap(config.types && config.types.indent || []),
            outdent: arrayToMap(config.types && config.types.outdent || [])
          }
        }

        e.languageMode.suggestedIndentForBufferRow =
          suggestedIndentForBufferRow(e, scopes, previousRowConditions[language]);
      } else {
        log(`no grammar defined for ${language}, leaving atom.io's indentation logic in place`);
      }

    });
  },

  deactivate: function() {
    log('back to insanity');
  },

};


module.exports = SaneIndentation;
