import re, sys, glob, os
AR = re.compile(r'[؀-ۿ]')
def parse(path):
    """Returns dict: head_ar, head_en, ar{n:text}, en{n:text}"""
    lines = open(path, encoding='utf-8').read().split('\n')
    head_ar, head_en, ar, en = [], [], {}, {}
    cur = None; mode = 'ar'; eng_n = None
    for ln in lines:
        s = ln.strip()
        if s.startswith('[^'): break
        if mode == 'ar':
            m = re.match(r'^>\s*\(\s*\d+\s*\)\s*(.*)', s)
            if m: cur = 'head'; head_ar.append(m.group(1)); continue
            m = re.match(r'^>\s*(\d+)\.\s*(.*)', s)
            if m: cur = int(m.group(1)); ar.setdefault(cur, []).append(m.group(2)); continue
            m = re.match(r'^(\d+)-\s*(.*)', s)
            if m and not AR.search(s): mode = 'en'; eng_n = int(m.group(1)); en[eng_n] = [m.group(2)]; continue
            if s in ('<blockquote dir="rtl">', '<p>', '</p>', '</blockquote>', '') or s.startswith('==') or s.startswith('--'): continue
            if AR.search(s):
                if cur == 'head': head_ar.append(s)
                elif cur is not None: ar[cur].append(s)
            elif cur == 'head' or (cur is None and head_ar):
                head_en.append(s)
            elif cur is not None and not re.match(r'^[A-Z0-9(].*\)$', s) and ar:
                pass
        else:
            m = re.match(r'^(\d+)-\s*(.*)', s)
            if m: eng_n = int(m.group(1)); en[eng_n] = [m.group(2)]; continue
            if s.startswith('<') or s.startswith('</') or s in ('<p>','</p>') : continue
            if AR.search(s) or s == '.' : continue
            if s and eng_n: en[eng_n].append(s)
    clean = lambda t: re.sub(r'\s+', ' ', re.sub(r'\[\^\d+\]', '', ' '.join(t))).strip()
    return dict(head_ar=clean(head_ar), head_en=clean(head_en), ar={k: clean(v) for k, v in ar.items()}, en={k: clean(v) for k, v in en.items()})
if __name__ == '__main__':
    d = parse(sys.argv[1])
    print(d['head_ar'][:200]); print(d['head_en'][:200]); print(len(d['ar']), len(d['en']), max(d['ar']), max(d['en'] or [0]))
    for k in [1, 2, max(d['ar'])]: print(k, d['ar'].get(k, '')[:150], '||', d['en'].get(k, '')[:150])
