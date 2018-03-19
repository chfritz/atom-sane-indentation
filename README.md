# sane-indentation package

This package [monkey-patches](https://en.wikipedia.org/wiki/Monkey_patch) the
indentation logic in atom in an attempt to come up with something more, uhm,
sane. The main difference between the logic in this package and in the
[TextMateLanguageMode](https://github.com/atom/atom/blob/master/src/text-mate-language-mode.js#L97)
class (where the identation logic resides in atom) is that this package does a
strict count of opening and closing scopes and uses the tokenizer to identify
whether scope delimiters appear in a string or comment (in which case they are
ignored -- which seems sane). Hence the resulting indentation will never get out
of wack, meaning that the identation does not grow arbitrarily for longer files --
something that sometimes happens with the existing logic.

### Comparison

![Comparison](https://raw.githubusercontent.com/chfritz/atom-sane-indentation/master/comparison.png)

This package is transitional. Once we can come to an agreement on [how to move
forward with this in atom/atom](https://github.com/atom/atom/pull/10384) this package will go away.
