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

foo(2,
  4);

foo({
    a: 1
  });

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

// TODO:
req.
shouldBeOne().
shouldBeOneToo;

html = (
  <div>
    good
    </div title='bad'>
);

// broken syntax: just keep indentation from last line that worked?
if (true) {
foo({
where_should_this_go: 1,
