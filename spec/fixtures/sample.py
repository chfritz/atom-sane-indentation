x = {
    "a": 1,
    'b': 2
}

x = [
    3,
    4
]

x = [
    (sname, pname)
    for (sno, sname) in suppliers
    for (pno, pname) in parts
    for (sp_sno, sp_pno) in suppart
    if sno == sp_sno and pno == sp_pno
]

def testing_indentation_in_199(some_var):
    first_line = "auto complete enabled by default?"
    second_line = func_indentation(bracket_matched,
        but_indentation,
        still_broken,
    )

    third_line = alt_indentation(
        long_param_list,
        still_not_working,
    )

    fourth_line = existing_indentation('auto ident paste not turned on',
        'so this is expected')
    this_is_not = 'indent error!'


    fourth_line = existing_indentation('retry last pasting',
        'this works fine')
    raise IndentationError('ARGH!')

    enter_does_not_clear = 'still bad'

    even_with_blank_line = 'tab puts here'

    if test:
        more()
        foo()

    if this_works:
        no_surprise = True
        test()
    else:
        same_here = 'yep'

    if check_nested_indent is not None:
        basic_indent = True
    elif can_you_hear_me_now == False:
        also_works = True
    else:
        more()

    another_test = 'split_line' + \
        'should be indented' + \
        'at least once'

    return check_this

def still_indented(other_var):
    '''Yay.'''
    indentation = 'hopelessly broken'

if test:
    doit

stopit

while something():
    x = 1
    g = 2

while 0:
    x = 1
    g = 2
else:
    x = 2
    g = 4


def set_password(args):
    password = args.password
    while not password  :
        password1 = getpass("" if args.quiet else "Provide password: ")
        password_repeat = getpass("" if args.quiet else "Repeat password:  ")
        if password1 != password_repeat:
            print("Passwords do not match, try again")
        elif len(password1) < 4:
            print("Please provide at least 4 characters")
        else:
            password = password1

    password_hash = passwd(password)
    cfg = BaseJSONConfigManager(config_dir=jupyter_config_dir())
    cfg.update('jupyter_notebook_config', {
        'NotebookApp': {
            'password': password_hash,
        }
    })
    if not args.quiet:
        print("password stored in config dir: %s" % jupyter_config_dir())

def main(argv):
    parser = argparse.ArgumentParser(argv[0])
    subparsers = parser.add_subparsers()
    parser_password = subparsers.add_parser('password', help='sets a password for your notebook server')
    parser_password.add_argument("password", help="password to set, if not given, a password will be queried for (NOTE: this may not be safe)",
        nargs="?")
    parser_password.add_argument("--quiet", help="suppress messages", action="store_true")
    parser_password.set_defaults(function=set_password)
    args = parser.parse_args(argv[1:])
    args.function(args)

## Comments
# sfg
#
class TokenTests(unittest.TestCase):

    def testBackslash(self):
        # Backslash means line continuation:
        x = 1 \
            + 1
        self.assertEquals(x, 2, 'backslash for line continuation')

        # Backslash does not means continuation in comments :\
        x = 0
        self.assertEquals(x, 0, 'backslash ending comment')


for s in '9223372036854775808', '0o2000000000000000000000', \
        '0x10000000000000000', \
        '0b100000000000000000000000000000000000000000000000000000000000000':
    try:
        x = eval(s)
    except OverflowError:
        self.fail("OverflowError on huge integer literal %r" % s)


try:
    1/0
except ZeroDivisionError:
    pass
else:
    pass

try: 1/0
except EOFError: pass
except TypeError as msg: pass
except RuntimeError as msg: pass
except: pass
else: pass
try: 1/0
except (EOFError, TypeError, ZeroDivisionError): pass
try: 1/0
except (EOFError, TypeError, ZeroDivisionError) as msg: pass
try: pass
finally: pass

# ---------------------------------------------
# TODO
