# sane-indentation package

This package [monkey-patches](https://en.wikipedia.org/wiki/Monkey_patch) the
indentation logic in atom in an attempt to come up with something more, uhm,
sane. This is now using the output from the new tree-sitter parser to decide on
the right indentation.

This package is transitional. Once we merge this into atom core and the language
packages this package will go away.

See [sample.js](https://github.com/chfritz/atom-sane-indentation/blob/master/spec/fixtures/sample.js) for an example.

**Note, this package currently only works for JavaScript.**
