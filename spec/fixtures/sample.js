foo({
    sd,
    sdf
  },
  4
);

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

foo( 2, {
  sd,
  sdf
});

foo(2,
  4);

foo({
  detect_symetric_opening_and_closing_scopes: 'indent me at 1'
});


var x = [
  3,
  4
];

const y = [
  1
];

const j = [{
  a: 1
}];

let h = {
  a: [ 1,
    2 ],
  b: { j: [
      { l: 1 }]
  },
  c:
  { j: [
      { l: 1 }]
  },
};

const a =
  {
    b: 1
  };


/** if-then-else loops */
if (true)
  foo();
else
  bar();

if (true) {
  foo();
  bar();
} else {
  foo();
  bar();
}

// https://github.com/atom/atom/issues/6691
if (true)
{
  foo();
  bar();
}
else
{
  foo();
  bar();
}

const x = {
  g: {
    a: 1,
    b: 2
  },
  h: {
    c: 3
  }
}

/** While loops */
while (condition)
  inLoop();

while (mycondition) {
  sdfsdfg();
}

while (mycondition)
{
  sdfsdfg();
}

switch (e) {
  case 5:
  something();
  more();
  case 6:
  somethingElse();
  case 7:
  default:
  done();
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

b =
  3
  + 5;


/** JSX */
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

const a = (
  <img
    src='/img.jpg'
  />
);

const b = (
  <img
    src='/img.jpg' />
);

/**
  A comment, should be at 1
*/

// --------------------------------------------------
// TODO:

const two = (
  <div>
    {
      test && 'test'
    }
  </div>
);

/**
  Not ideal, but should be solved by parsing the delimiters:
should be at 1; */

// -------------------------------------------------

// broken syntax: keep last line's indentation
// (can we somehow force tree-sitter to re-parse just locally)
if (true) {
foo({
  a: 1,
}
