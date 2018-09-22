

void main(int argc, char** argv) {
  int i = 9;

  int i =
    6;

  int ar[2] = {1,
    2};

  for (int i = 0; i < 10; i++) {
    printf("%d", i);
    cout
      << "at 1"
      << "at 1"
      << std::end;
    cin
      >> i;
    cin >>
      j;
  }

  for (
    int i = 0;
    i < 10;
    i++)
    cout << i;


  for (int i = 0;
    i < 10; i++) {
      cout << i;
    }

  auto f1 = [](int x, int y) -> int {
    return x + y;
  }

  auto f2 = [](int x, int y)
    -> int {
      return x + y;
    }

  return
    1
      + 3;

  bool truth =
    (a(tree) &&
      b(tree)) ||
      (c(&self) &&
        d());
}


void main(int argc,
  char** argv) {
  int i = 9;
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

  if (no_compound_statement)
    printf("woot");
  else
    printf("what else?");

  if (alternate_style_indentation)
  {
    printf("still works");
  }

  else {
    printf("hmmm...");
  }

  int test_function = function_with_param(this_param,
    that_param
  );

  int test_function = function_with_param(
    this_param,
    that_param
  );

  int test_function = function_with_proper_indent(param1,
    param2,
  );

  return;
}


// https://github.com/atom/language-c/issues/28

struct rec {
  char id[26];
  struct year *ptr; };

struct day {
  int day;
  struct day *next;
};

struct movie
{
  char id[5];
  struct movie *next;
};


class Test {

public:
  void test();

private:
  void more();
};


static void destroy_value(Rule *rule) {
  switch (rule->type) {
    case Rule::BlankType: return rule->blank_.~Blank();
    case Rule::CharacterSetType: return rule->character_set_.~CharacterSet();
  }
}

Rule &Rule::operator=(const Rule &other) {
  destroy_value(this);
  type = other.type;
  switch (type) {
    case BlankType:
    new (&blank_) Blank(other.blank_);
    break;
    case CharacterSetType:
    new (&character_set_) CharacterSet(other.character_set_);
    break;
  }
  return *this;
}


new_rule.match(
  [elements](Choice choice) {
    for (auto &element : choice.elements) {
      add_choice_element(elements, element);
    }
  },

  [elements](auto rule) {
    for (auto &element : *elements) {
      if (element == rule) return;
    }
    elements->push_back(rule);
  }
);


Rule Rule::choice(const vector<Rule> &rules) {
  vector<Rule> elements;
  for (auto &element : rules) {
    add_choice_element(&elements, element);
  }
  return (elements.size() == 1) ? elements.front() : Choice{elements};
}

Rule Rule::repeat(const Rule &rule) {
  return rule.is<Repeat>() ? rule : Repeat{rule};
}

Rule Rule::seq(const vector<Rule> &rules) {
  Rule result;
  for (const auto &rule : rules) {
    rule.match(
      [](Blank) {},
      [&](Metadata metadata) {
        if (!metadata.rule->is<Blank>()) {
          result = Seq{result, rule};
        }
      },
      [&](auto) {
        if (result.is<Blank>()) {
          result = rule;
        } else {
          result = Seq{result, rule};
        }
      }
    );
  }
  return result;
}

namespace myspace {

size_t hash<CharacterSet>::operator()(const CharacterSet &character_set) const {
  size_t result = 0;
  for (uint32_t c : character_set.included_chars) {
    hash_combine(&result, c);
  }
}

}


enum TokenType {
  RAW_STRING_LITERAL,
  ANOTHER,
};

extern "C" {

void *tree_sitter_cpp_external_scanner_create() {
  return new Scanner();
}

[sym_raw_string_literal] = {
  .visible = true,
  .named = true,
};

static const TSSymbolMetadata ts_symbol_metadata[] = {
  [sym_raw_string_literal] = {
    .visible = true,
    .named = true,
  },
  [ts_builtin_sym_end] = {
    .visible = false,
    .named = true,
  },
}


} // extern "C"

/* Comment
  line
*/

void foo() {
  char** lookahead;
  if (4
    + 5 < 10) {
    pass;
  }

  if (4 + 5
    < 10) {
    pass;
  }

  doit
    .right
    .now();

  if (('0' <= lookahead && lookahead <= '9') ||
    ('a' <= lookahead && lookahead <= 'z'))
    ADVANCE();

}

struct AltStruct
{
  AltStruct(int x, double y):
    x_{x}
    , y_{y}
  {}

private:
  int x_;
  double y_;
};

BasicStruct var1{
  5,
  3.2};
AltStruct var2{2,
  4.3};


template <typename Second>
typedef SomeType<OtherType,
  Second,
  5> TypedefName;

// tuple types
typedef std::tuple <int,
  double, long &, const char *> test_tuple;
