foo( 2,
  {
    sd,
    sdf
  },
  4
);
var zero;

foo( 2, {
    sd,
    sdf
  },
  4
);

foo( 2,
  {
    sd,
    sdf
  });

foo(2,
  4);

var zero;

var x = [
  3,
  4
];

// https://github.com/atom/atom/issues/6691
if (true) {
  foo();
  bar();
} else {
  foo();
  bar();
}

if (true)
  foo();
else
  bar();

const jsx = (
  <div
    title='start'
    >
    good
    <a>
      link
    </a>
    <i>
      sdfg
    </i>
    <div>
      sdf
    </div>
  </div>
);

const two = (
  <div>
    <b>
      test
    </b>
    <b>
      test
    </b>
  </div>
);

const x = {
  g: {
    a: 1,
    b: 2
  },
  h: {
    c: 3
  }
}

/* multi-line expressions */
req
  .shouldBeOne();
too.
  more.
  shouldBeOneToo;

const a =
  long_expression;

b =
  long;

b =
  3 + 5;

/**
  Comments
*/

while (mycondition) {
  sdfsdfg();
}

// --------------------------------------------------
// TODO:
foo({
    detect_symetric_opening_and_closing_scopes: 'indent me at 1'
  });

// --------------------------------------------------

// broken syntax: keep last line's indentation
if (true) {
foo({
a: 1,
}
