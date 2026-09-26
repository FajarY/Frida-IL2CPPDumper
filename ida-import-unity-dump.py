# Warning: Slopped
# IDA 9.x importer for the Frida dump.cs
# File -> Script file... -> pick this, then pick dump.cs
#
# Trusts dump.cs over IDA's own analysis:
#   1. every method / accessor RVA in the dump becomes the start of its own function
#   2. no function is allowed to run past the next known start (fixes merged functions)
#   3. Throw* helpers are marked noreturn so IDA stops falling through them
#   4. functions get Class$$Method names and the C# declaration as a comment
#
# The dump.cs lines this reads:
#   //Assembly: Assembly-CSharp.dll
#   public class Bullet : MonoBehaviour
#       <tab>//offset: 0x.. offset_base:0x.. virtual: 0x.. virtual_base: 0x..
#       <tab>public System.Void Update()
#       <tab>//get_base: 0x.. set_base: 0x..
#       <tab>public System.Single Speed { get; set; }
#       <tab>//add_base: 0x.. remove_base: 0x.. raise_base: 0x..
#       <tab>public event System.Action OnHit;

import string

import ida_bytes
import ida_funcs
import ida_kernwin
import ida_name
import idaapi

NAME_CHARS = set(string.ascii_letters + string.digits + "_$")
NO_RVA = ("none", "invalid", "?")


def sanitize(name):
    """Keep letters, digits, _ and $ (Il2CppDumper-style Class$$Method); replace the rest."""
    return "".join(c if c in NAME_CHARS else "_" for c in name)


def value_after(line, key):
    """The whitespace-delimited word that follows `key`.

    Handles both 'offset_base:0x123' and 'get_base: 0x123'.
    Returns None if the key isn't on the line.
    """
    at = line.find(key)
    if at < 0:
        return None

    rest = line[at + len(key):].lstrip()
    end = 0
    while end < len(rest) and not rest[end].isspace():
        end += 1
    return rest[:end]


def word_before(decl, marker):
    """The last word of `decl` before `marker`, e.g. the method name before '('."""
    at = decl.find(marker)
    if at < 0:
        return None

    words = decl[:at].split()
    return words[-1] if words else None


def class_name_of(line):
    """'    public sealed class Bullet : MonoBehaviour' -> 'Bullet'; None if not a class line."""
    for keyword in (" class ", " interface "):
        at = line.find(keyword)
        if at < 0:
            continue

        rest = line[at + len(keyword):]
        colon = rest.find(" : ")
        if colon >= 0:
            rest = rest[:colon]
        words = rest.split()
        return words[0] if words else None
    return None


def is_noreturn(name):
    """ThrowHelper$$Anything, or Anything$$ThrowSomething -- IDA falls through these."""
    sep = name.find("$$")
    if sep < 0:
        return False

    cls = name[:sep]
    method = name[sep + 2:]

    if cls == "ThrowHelper":
        return True
    return method.startswith("Throw") and len(method) > 5 and method[5].isupper()


class Importer:
    def __init__(self):
        self.base = idaapi.get_imagebase()
        self.entries = {}
        self.extra = {}
        self.skipped = 0
        self.split = 0
        self.clamped = 0
        self.noreturn = 0
        self.failed = 0

    def ea_from(self, rva_text):
        if rva_text is None or rva_text in NO_RVA:
            return None
        try:
            rva = int(rva_text, 16)
        except ValueError:
            return None
        
        if rva <= 0 or rva >= 1 << 40:
            return None

        ea = self.base + rva
        if not ida_bytes.is_mapped(ea):
            return None
        return ea

    def collect(self, rva_text, name, comment):
        ea = self.ea_from(rva_text)
        if ea is None:
            self.skipped += 1
            return

        if ea in self.entries:
            self.extra.setdefault(ea, []).append("also: " + comment)
            return

        self.entries[ea] = (name, comment)

    def parse(self, path):
        with open(path, "r", encoding="utf-8", errors="replace") as fp:
            lines = fp.read().splitlines()

        assembly = ""
        cls = ""
        i = 0
        total = len(lines)

        while i < total:
            if i % 5000 == 0:
                if ida_kernwin.user_cancelled():
                    raise KeyboardInterrupt
                ida_kernwin.replace_wait_box("Parsing dump.cs... %d/%d" % (i, total))

            line = lines[i]
            stripped = line.lstrip("\t")
            indent = len(line) - len(stripped)

            if indent == 0 and stripped.startswith("//Assembly: "):
                assembly = stripped[len("//Assembly: "):].strip()
                i += 1
                continue

            if indent == 0:
                found = class_name_of(line)
                if found is not None:
                    cls = found
                    i += 1
                    continue

            if not stripped.startswith("//"):
                i += 1
                continue

            decl = lines[i + 1].strip() if i + 1 < total else ""
            comment = "%s :: %s\n%s" % (assembly, cls, decl)

            if stripped.startswith("//offset:") and "offset_base:" in stripped:
                method = word_before(decl, "(") or "unknown"
                self.collect(value_after(stripped, "offset_base:"),
                             "%s$$%s" % (cls, method), comment)
                i += 2
                continue

            if stripped.startswith("//get_base:"):
                prop = word_before(decl, "{") or "unknown"
                self.collect(value_after(stripped, "get_base:"),
                             "%s$$get_%s" % (cls, prop), comment)
                self.collect(value_after(stripped, "set_base:"),
                             "%s$$set_%s" % (cls, prop), comment)
                i += 2
                continue

            if stripped.startswith("//add_base:"):
                evt = decl.rstrip(";").split()[-1] if decl else "unknown"
                self.collect(value_after(stripped, "add_base:"),
                             "%s$$add_%s" % (cls, evt), comment)
                self.collect(value_after(stripped, "remove_base:"),
                             "%s$$remove_%s" % (cls, evt), comment)
                self.collect(value_after(stripped, "raise_base:"),
                             "%s$$raise_%s" % (cls, evt), comment)
                i += 2
                continue

            i += 1

    def ensure_starts(self, starts):
        for n, ea in enumerate(starts):
            if n % 2000 == 0:
                if ida_kernwin.user_cancelled():
                    raise KeyboardInterrupt
                ida_kernwin.replace_wait_box("Fixing function starts... %d/%d" % (n, len(starts)))

            f = ida_funcs.get_func(ea)
            if f is not None and f.start_ea == ea:
                continue

            if f is not None:
                ida_funcs.set_func_end(f.start_ea, ea)
                self.split += 1

            if not ida_funcs.add_func(ea):
                self.failed += 1

    def clamp_ends(self, starts):
        for n in range(len(starts) - 1):
            ea, nxt = starts[n], starts[n + 1]
            f = ida_funcs.get_func(ea)
            if f is None or f.start_ea != ea:
                continue
            if f.end_ea > nxt:
                ida_funcs.set_func_end(ea, nxt)
                self.clamped += 1

    def mark_noreturn(self):
        for ea, (name, _) in self.entries.items():
            if not is_noreturn(name):
                continue
            f = ida_funcs.get_func(ea)
            if f is None or (f.flags & ida_funcs.FUNC_NORET):
                continue
            f.flags |= ida_funcs.FUNC_NORET
            ida_funcs.update_func(f)
            self.noreturn += 1

    def apply_names(self):
        for ea, (name, comment) in self.entries.items():
            ida_name.set_name(ea, sanitize(name), ida_name.SN_NOWARN | ida_name.SN_NOCHECK | ida_name.SN_FORCE)

            f = ida_funcs.get_func(ea)
            if f is None:
                continue
            text = comment
            if ea in self.extra:
                text += "\n" + "\n".join(self.extra[ea])
            ida_funcs.set_func_cmt(f, text, True)

    def run(self, path):
        ida_kernwin.show_wait_box("Importing dump.cs...")
        try:
            self.parse(path)
            starts = sorted(self.entries)

            self.ensure_starts(starts)
            self.apply_names()
            self.mark_noreturn()

            ida_kernwin.replace_wait_box("Clamping...")
            self.clamp_ends(starts)

        except KeyboardInterrupt:
            print("[*] cancelled")
        finally:
            ida_kernwin.hide_wait_box()

        print("[*] %d functions, split %d, clamped %d, noreturn %d, add_func failed %d, skipped %d"
              % (len(self.entries), self.split, self.clamped,
                 self.noreturn, self.failed, self.skipped))


def main():
    path = ida_kernwin.ask_file(0, "*.cs", "Select dump.cs")
    if not path:
        return
    print("[*] image base %#x" % idaapi.get_imagebase())
    Importer().run(path)

main()