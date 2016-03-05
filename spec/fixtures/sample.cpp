
class Test {

  public:
  void test();



  private:
  void more();


};

void main(int argc, char** argv) {


  return 1;
}


// from issue https://github.com/atom/atom/issues/6655

void main() {
  bool does_indentation_work = 1;
  if (does_indentation_work) {
    printf("woot");
  } else {
    printf("ugh");
  }

  if (alternate_style_indentation)
  {
    printf('still works');
  }

  else {
    printf('hmmm...');
  }

  int test_function = function_with_param(this_param,
    that_param
  ); // strange dedent after typing semicolon

  int test_function = function_with_param(
    this_param,
    that_param
  );

  int test_function = function_with_proper_indent(param1,
    param2,
  ); // strange dedent again
  uh_oh = 1;

  still_after_blank_line = 1;

  return;
}


// https://github.com/atom/language-c/issues/28

struct rec {
  char id[26];
  struct year *ptr; };

struct year {
  int year;
  struct year *next;
  struct day *ptr; };

struct day {
  int day;
  double expenses;
  struct movie *ptr;
  struct day *next; };

struct movie {
  char id[5];
  struct movie *next; };
