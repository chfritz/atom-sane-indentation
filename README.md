# sane-indentation package

This package [monkey-patches](https://en.wikipedia.org/wiki/Monkey_patch) the
indentation logic in atom in an attempt to come up with something more, uhm,
sane. The main difference betweenthe logic in this package and in the
[language-mode](https://github.com/atom/atom/blob/master/src/language-mode.coffee)
package (where the identation logic resides in atom) is that this package does a
strict count of opening and closing scopes and uses the tokenizer to identify
whether scope delimiters appear in a string or comment (in which case they are
ignored -- which seems sane). Hence the resulting indentation will never get out
of wack, meaning that the identation does not grow arbitrarily for longer files --
something that sometimes happens with the existing logic.

This package is transitional. Once we can come to an agreement on how to move
forward with this in atom/atom this package will go away.

<!-- ![A screenshot of your package](https://f.cloud.github.com/assets/69169/2290250/c35d867a-a017-11e3-86be-cd7c5bf3ff9b.gif) -->
