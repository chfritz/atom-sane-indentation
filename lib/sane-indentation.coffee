SaneIndentationView = require './sane-indentation-view'
{CompositeDisposable} = require 'atom'
{OnigRegExp} = require 'oniguruma'

module.exports = SaneIndentation =
  saneIndentationView: null
  modalPanel: null
  subscriptions: null

  activate: (state) ->
    @saneIndentationView = new SaneIndentationView(state.saneIndentationViewState)
    @modalPanel = atom.workspace.addModalPanel(item: @saneIndentationView.getElement(), visible: false)

    # Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    @subscriptions = new CompositeDisposable

    # Register command that toggles this view
    @subscriptions.add atom.commands.add 'atom-workspace', 'sane-indentation:toggle': => @toggle()

    atom.workspace.observeTextEditors (e) ->
      e.languageMode.__proto__.suggestedIndentForTokenizedLineAtBufferRow = (bufferRow, line, tokenizedLine, options) ->

        # Count the number of occurence of regex in string, given its tokenized
        # version, and ignoring any occurence that start inside a quoted string
        countRegex = (regex, string, tokenized) ->
          count = 0
          m = regex.searchSync(string)
          while (m)
            isQuoted = false
            if scopes = tokenized.tokenAtBufferColumn(m[0].start)?.scopes
              isQuoted = scopes.some (scope) -> scope.startsWith('string.quoted')
              # console.log quoted
            count += 1 unless isQuoted
            m = regex.searchSync(string, m[0].start + 1)
          count

        # console.log tokenizedLine
        iterator = tokenizedLine.getTokenIterator()
        iterator.next()
        # scopeDescriptor = new ScopeDescriptor(scopes: iterator.getScopes())
        # scopeDescriptor = ".source.js"

        # TODO
        # increaseIndentRegex = @increaseIndentRegexForScopeDescriptor(scopeDescriptor)
        # decreaseIndentRegex = @decreaseIndentRegexForScopeDescriptor(scopeDescriptor)
        # decreaseNextIndentRegex = @decreaseNextIndentRegexForScopeDescriptor(scopeDescriptor)
        increaseIndentRegex = new OnigRegExp("[\\{\\[\\(]")
        decreaseIndentRegex = new OnigRegExp("^\\s*[\\}\\]\\)]")
        decreaseNextIndentRegex = new OnigRegExp("[\\}\\]\\)]")

        if not decreaseNextIndentRegex
          decreaseNextIndentRegex = decreaseIndentRegex

        if options?.skipBlankLines ? true
          precedingRow = @buffer.previousNonBlankRow(bufferRow)
          return 0 unless precedingRow?
        else
          precedingRow = bufferRow - 1
          return 0 if precedingRow < 0

        desiredIndentLevel = @editor.indentationForBufferRow(precedingRow)
        return desiredIndentLevel unless increaseIndentRegex

        unless @editor.isBufferRowCommented(precedingRow)
          precedingLine = @buffer.lineForRow(precedingRow)
          tokenizedPrecedingLine =
            @editor.displayBuffer.tokenizedBuffer
            .buildTokenizedLineForRowWithText(precedingRow, precedingLine)

          # console.log "preceding", tokenizedPrecedingLine

          # desiredIndentLevel += 1 if increaseIndentRegex?.testSync(precedingLine)
          if increaseIndentRegex
            desiredIndentLevel += countRegex(increaseIndentRegex, precedingLine, tokenizedPrecedingLine)
          # desiredIndentLevel -= 1 if decreaseNextIndentRegex?.testSync(precedingLine)
          if decreaseNextIndentRegex
            desiredIndentLevel -= countRegex(decreaseNextIndentRegex, precedingLine, tokenizedPrecedingLine)
          # we need to add back one if we already closed one scope on the previous line itself
          if decreaseIndentRegex and countRegex(decreaseIndentRegex, precedingLine, tokenizedPrecedingLine)
            desiredIndentLevel += 1

        unless @buffer.isRowBlank(precedingRow)
          # desiredIndentLevel -= 1 if decreaseIndentRegex?.testSync(line)
          if decreaseIndentRegex and countRegex(decreaseIndentRegex, line, tokenizedLine)
            desiredIndentLevel -= 1
          # desiredIndentLevel -= countRegex(decreaseIndentRegex, line) if decreaseIndentRegex

        console.log("suggestedIndentForTokenizedLineAtBufferRow: rtv", desiredIndentLevel)
        Math.max(desiredIndentLevel, 0)



  deactivate: ->
    @modalPanel.destroy()
    @subscriptions.dispose()
    @saneIndentationView.destroy()

  serialize: ->
    saneIndentationViewState: @saneIndentationView.serialize()

  toggle: ->
    console.log 'SaneIndentation was toggled!'

    if @modalPanel.isVisible()
      @modalPanel.hide()
    else
      @modalPanel.show()
