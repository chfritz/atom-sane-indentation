const SaneIndentationView = require('./sane-indentation-view');

const originals = {};

const SaneIndentation = {

  saneIndentationView: null,
  modalPanel: null,
  subscriptions: null,

  activate: function(state) {
    console.log("activating sanity");

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

        e.languageMode.suggestedIndentForBufferRow =
        (row, tabLength, options) => {
          // console.log('sane', bufferRow, tabLength, options, e);
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

          // console.log(atom.config.get());
          let scopesToIndentArray = atom.config.get('editor.sane.scopes');
          if (!scopesToIndentArray) {
            console.log('(sane-indentation) no scopes defined');
            // return;
            scopesToIndentArray = [
              'array',
              'object',
              'arguments',
              // 'call_expression', // TODO: if opened on previous line (like firstLine.secondLine())
              // 'assignment_expression', // TODO: only when "opened" on a previous line (and not a block)
              'statement_block',
              // 'expression_statement',
              // 'if_statement',
              // TODO: condense an if_statement followed by a statement_block
              'class_body',
              'parenthesized_expression',
              'jsx_element',
              'switch_body',
              'switch_case'
            ];

            // these scopes, when ending on the current row, will unindent
            // current row already (not just the next)
            // TODO: right now, this will also produce
            // [
            //   'correct',
            // 'incorrect']
            scopesToUnindentArray = [
              'array',
              'object',
              'arguments',
              'statement_block',
              'class_body',
              'parenthesized_expression',
              'jsx_element',
              'switch_body'
            ];
          }
          // console.log(scopesToIndentArray);
          // turn into object
          const scopesToIndent = scopesToIndentArray.reduce((acc, v) => {
              acc[v] = true;
              return acc;
        }, {});

          const scopesToUnindent = scopesToUnindentArray.reduce((acc, v) => {
              acc[v] = true;
              return acc;
        }, {});

          // const scopes = (row > 0 ?
          //   e.scopeDescriptorForBufferPosition({
          //       row: row-1,
          //       column: e.lineLengthForScreenRow(row-1)
          //       }).scopes
          //   :
          //   e.scopeDescriptorForBufferPosition({row, column: 0}).scopes
          //   );
          const scopes = e.scopeDescriptorForBufferPosition({
              row: row-1,
              column: e.lineLengthForScreenRow(row-1)
          }).scopes;
          const endScopes = e.scopeDescriptorForBufferPosition({
              row,
              column: e.lineLengthForScreenRow(row)
              }).scopes;

          const indentationScopes = scopes.filter(scope => scopesToIndent[scope]);
          const indentationEndScopes = endScopes.filter(scope => scopesToIndent[scope]);

          let indentation = null;
          if (endScopes.length < scopes.length) {
            const endingScopes = scopes.slice(endScopes.length);
            const unindent = endingScopes.filter(scope => scopesToUnindent[scope]);

            console.log('scopes to unindent', unindent);

            indentation = indentationScopes.length - unindent.length;
            } else {
            indentation = indentationScopes.length;
          }

          if (indentation !== null) {
            console.log('sane', scopes, indentationScopes, indentation);
            return indentation;
            } else {
            // console.log("no sane indentation patterns for mode, falling back to default");
            return originals[e.id].bind(e.languageMode)(bufferRow, options);
            }
          };

        });
  },


  deactivate: function() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    return this.saneIndentationView.destroy();
  },

  // serialize: function() {
  //   // return {
  //   //   saneIndentationViewState: this.saneIndentationView.serialize()
  //   //   };
  // },

  // toggle: function() {
  //   console.log('SaneIndentation was toggled again!');
  //   if (this.modalPanel.isVisible()) {
  //     return this.modalPanel.hide();
  //   } else {
  //     return this.modalPanel.show();
  //   }
  // }

};


module.exports = SaneIndentation;
