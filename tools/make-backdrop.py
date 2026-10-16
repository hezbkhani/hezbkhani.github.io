# Usage: python3 tools/make-backdrop.py backdrop.css
# Generates backdrop.css (theme ornaments as inline SVG with each theme's colours baked in).
import urllib.parse, sys
def svg(s):
    s = s.replace("\n", "").replace("  ", " ")
    s = "<svg xmlns='http://www.w3.org/2000/svg' " + s[5:]
    return "url(\"data:image/svg+xml," + urllib.parse.quote(s, safe="=:/ '-.,()") + "\")"

def corners(path_svg, size):
    # path_svg drawn for the top-left corner (RTL doesn't matter, symmetric); mirror for others
    tl = f"<svg viewBox='0 0 {size} {size}'>{path_svg}</svg>"
    tr = f"<svg viewBox='0 0 {size} {size}'><g transform='matrix(-1 0 0 1 {size} 0)'>{path_svg}</g></svg>"
    bl = f"<svg viewBox='0 0 {size} {size}'><g transform='matrix(1 0 0 -1 0 {size})'>{path_svg}</g></svg>"
    br = f"<svg viewBox='0 0 {size} {size}'><g transform='matrix(-1 0 0 -1 {size} {size})'>{path_svg}</g></svg>"
    return [svg(x) for x in (tl, tr, bl, br)]

def divider(c1, c2):
    return svg(f"<svg viewBox='0 0 160 12'><path d='M4 6H66M94 6H156' stroke='{c1}' stroke-width='1.2' stroke-linecap='round'/><circle cx='70' cy='6' r='1.6' fill='{c1}'/><circle cx='90' cy='6' r='1.6' fill='{c1}'/><path d='M80 0.5L85.5 6L80 11.5L74.5 6Z' fill='{c2}' stroke='{c1}' stroke-width='1'/></svg>")

T = {}
# 1) night: deep green + gold, lanterns, crescent
g, gr, cr = '#c9a14a', '#1f5a3a', '#f0d68a'
T['night'] = dict(
  vars=dict(paper='#fbf4e2', frame=gr, line='#9fb79f', gold=g, ink='#2b241a', ink2='#5b4f40', head=gr, base='#163423', theme='#1f5a3a'),
  top=svg(f"""<svg viewBox='0 0 120 44'><path d='M4 22H40M80 22H116' stroke='{g}' stroke-width='1.6'/><circle cx='44' cy='22' r='2' fill='{g}'/><circle cx='76' cy='22' r='2' fill='{g}'/>
<circle cx='60' cy='22' r='18' fill='{gr}' stroke='{g}' stroke-width='2.4'/><circle cx='60' cy='22' r='14.5' fill='none' stroke='{g}' stroke-width='.8' opacity='.7'/>
<path d='M63 11A11 11 0 1 0 63 33A9 9 0 1 1 63 11Z' fill='{cr}'/><path d='M66 17.5l1.1 2.4 2.6.3-1.9 1.8.5 2.6-2.3-1.3-2.3 1.3.5-2.6-1.9-1.8 2.6-.3z' fill='{cr}'/></svg>"""),
  corners=corners(f"<path d='M3 33V12A9 9 0 0 1 12 3H33' fill='none' stroke='{g}' stroke-width='2.2'/><path d='M9 33V16A7 7 0 0 1 16 9H33' fill='none' stroke='{g}' stroke-width='1' opacity='.75'/><circle cx='13' cy='13' r='2.6' fill='{g}'/>", 36),
  csize=36, tsize='120px 44px', toff='22px', radius='14px',
  divider=None)
# 2) sage: soft green, white blossoms, light and calm
s, sl = '#6b8a66', '#a9bca2'
petals = ''.join(f"<ellipse cx='20' cy='14' rx='3.2' ry='6' fill='{s}' transform='rotate({a} 20 22)'/>" for a in range(0, 360, 45))
T['sage'] = dict(
  vars=dict(paper='#fcfaf2', frame=s, line=sl, gold='#c6b98f', ink='#2e3329', ink2='#5d6656', head='#4b6b47', base='#c9d5c0', theme='#6b8a66'),
  top=svg(f"<svg viewBox='0 0 40 50'>{petals}<circle cx='20' cy='22' r='3.6' fill='#fcfaf2'/><circle cx='20' cy='22' r='1.6' fill='{s}'/><path d='M20 33V40' stroke='{s}' stroke-width='1.2'/><path d='M20 39L23 43.5L20 48L17 43.5Z' fill='{s}'/></svg>"),
  corners=None, tsize='40px 50px', toff='19px', radius='26px',
  sprig=svg(f"""<svg viewBox='0 0 70 44'><path d='M4 40C20 36 36 26 52 8' fill='none' stroke='{s}' stroke-width='1.4' stroke-linecap='round'/>
<path d='M18 34C14 26 18 20 24 18C26 26 22 32 18 34Z' fill='{s}' opacity='.85'/><path d='M30 28C32 20 38 17 44 18C40 25 36 28 30 28Z' fill='{s}' opacity='.7'/>
<path d='M38 20C36 12 40 6 46 4C48 12 44 17 38 20Z' fill='{s}' opacity='.85'/><g fill='#fff' stroke='{sl}' stroke-width='.6'><circle cx='52' cy='8' r='3'/><circle cx='26' cy='31' r='2.4'/><circle cx='12' cy='38' r='2'/></g></svg>"""),
  divider=divider(sl, '#fcfaf2'))
# 3) blue: slate blue + gold, arched top, star rosette
b, bg_ = '#4a6a8e', '#c9a35a'
star = "M30 4L36.5 15.5L49.5 10.5L44.5 23.5L56 30L44.5 36.5L49.5 49.5L36.5 44.5L30 56L23.5 44.5L10.5 49.5L15.5 36.5L4 30L15.5 23.5L10.5 10.5L23.5 15.5Z"
T['blue'] = dict(
  vars=dict(paper='#fdf8ec', frame=b, line='#9fb3c9', gold=bg_, ink='#26303b', ink2='#56606b', head='#36557a', base='#34506f', theme='#3e5f84'),
  top=svg(f"<svg viewBox='0 0 120 60'><path d='M4 30H34M86 30H116' stroke='{bg_}' stroke-width='1.6'/><path d='M30 30L34 26L38 30L34 34Z' fill='{bg_}'/><path d='M82 30L86 26L90 30L86 34Z' fill='{bg_}'/><g transform='translate(30 0)'><path d='{star}' fill='{b}' stroke='{bg_}' stroke-width='2'/><circle cx='30' cy='30' r='11' fill='#fdf8ec' stroke='{bg_}' stroke-width='1.6'/><path d='M30 22L33 27L38.5 27.5L34 31L35.5 36.5L30 33.5L24.5 36.5L26 31L21.5 27.5L27 27Z' fill='{b}'/></g></svg>"),
  corners=corners(f"<path d='M4 30C4 16 16 4 30 4' fill='none' stroke='{bg_}' stroke-width='1.6'/><path d='M10 30C10 19 19 10 30 10' fill='none' stroke='{b}' stroke-width='1' opacity='.7'/><path d='M6 6L11 3L16 6L11 9Z' fill='{bg_}'/>", 34),
  csize=34, tsize='120px 60px', toff='14px', radius='90px 90px 14px 14px',
  divider=divider(bg_, b))
# 4) garden: teal green + gold, cusped boxes with side medallions & blossoms
t_, tg = '#3c7a66', '#cdae6a'
flower = ''.join(f"<ellipse cx='14' cy='22.6' rx='2.4' ry='3.8' fill='#fbf3df' transform='rotate({a} 14 28)'/>" for a in range(0, 360, 72))
med = f"<path d='M14 1C20 10 27 18 27 28C27 38 20 46 14 55C8 46 1 38 1 28C1 18 8 10 14 1Z' fill='{t_}' stroke='{tg}' stroke-width='1.8'/><path d='M14 7C18.5 14 23 20 23 28C23 36 18.5 42 14 49C9.5 42 5 36 5 28C5 20 9.5 14 14 7Z' fill='none' stroke='{tg}' stroke-width='.8' opacity='.8'/>{flower}<circle cx='14' cy='28' r='2' fill='{tg}'/>"
T['garden'] = dict(
  vars=dict(paper='#fdf8e8', frame=t_, line='#8fb7a6', gold=tg, ink='#24302b', ink2='#55635c', head='#2e6957', base='#a8c2b1', theme='#3c7a66'),
  top=svg(f"<svg viewBox='0 0 44 22'><path d='M22 1L30 11L22 21L14 11Z' fill='{t_}' stroke='{tg}' stroke-width='1.5'/><circle cx='22' cy='11' r='2.2' fill='{tg}'/><circle cx='9' cy='11' r='2' fill='{tg}'/><circle cx='35' cy='11' r='2' fill='{tg}'/></svg>"),
  medL=svg(f"<svg viewBox='0 0 28 56'>{med}</svg>"),
  corners=None, tsize='44px 22px', toff='33px', radius='18px',
  divider=divider(tg, t_))

out = []
out.append("""/* زمینه‌های صفحه اول: هر بار که سایت باز می‌شود یکی از چهار زمینه (پوشه bg/) انتخاب می‌شود
   و کادرهای صفحه (panel) با رنگ و تزئین همان زمینه، مرتب و یکی‌یکی وارد می‌شوند.
   انتخاب زمینه: اسکریپت کوچک داخل <head> در index.html (برای دیدن یک زمینه خاص: ‎?bg=night|sage|blue|garden‎)؛ حرکت ورود: backdrop.js
   این فایل با tools/make-backdrop.py ساخته شده تا رنگ هر زمینه داخل نقش‌های SVG باشد؛ با دست هم می‌شود ویرایشش کرد. */
html[data-bg] body{background:var(--t-base);position:relative}
html[data-bg] body::before{content:"";position:fixed;inset:0;z-index:-2;background:var(--t-img) center top/cover no-repeat}
/* صفحه پهن (رایانه): تصویر کامل در وسط، دو طرف همان تصویر محو */
@media (min-aspect-ratio:4/5){
  html[data-bg] body::before{inset:-40px;filter:blur(24px) saturate(1.05) brightness(.92)}
  html[data-bg] body::after{content:"";position:fixed;inset:0;z-index:-1;background:var(--t-img) center top/max(780px,calc(var(--t-ratio) * 100vh)) auto no-repeat;box-shadow:inset 0 0 60px #0003}
}
html[data-bg] .site-foot{background:radial-gradient(farthest-side,var(--t-veil) 45%,transparent);text-shadow:0 0 10px var(--t-paper),0 0 4px var(--t-paper),0 0 2px var(--t-paper)}
html[data-bg] .site-foot .today{color:var(--t-ink);font-weight:600}
html[data-bg] .shell .panel .tagline{color:var(--t-head)}
/* کادرها */
html[data-bg] .shell .panel{position:relative;background:var(--t-paper);color:var(--t-ink);text-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;
  border:2px solid var(--t-gold);border-radius:var(--t-radius);padding:30px 28px 26px;margin-bottom:40px;
  box-shadow:inset 0 0 0 5px var(--t-paper),inset 0 0 0 6.5px var(--t-frame),inset 0 0 0 9px var(--t-paper),inset 0 0 0 10px var(--t-line),0 12px 32px rgba(0,0,0,.2)}
html[data-bg] .shell .panel::before{content:"";position:absolute;pointer-events:none;inset:-44px -12px -12px;background-repeat:no-repeat;background-position:var(--t-orn-pos);background-size:var(--t-orn-size)}
html[data-bg] .shell .panel h2{color:var(--t-head);text-align:center}
html[data-bg] .shell .panel>h2::after,html[data-bg] .shell .panel>.chl-head>h2::after{content:"";display:block;width:160px;height:12px;margin:0 auto;background:var(--t-div) center/contain no-repeat}
html[data-bg] .shell .panel>.chl-head{justify-content:center}
html[data-bg] .shell .panel :is(.hint,.lead,.x-prog,.x-deadline,.chl-fold summary){color:var(--t-ink2);text-shadow:none}
html[data-bg] .shell .panel :is(.x-link,.intro-acc button){color:var(--t-head);text-shadow:none}
html[data-bg] .shell .panel .chl-adm h4{color:var(--t-head);text-shadow:none}
html[data-bg] .shell .panel .x-bar{background:var(--t-line)}
html[data-bg] .shell .panel .x-spin{border-color:var(--t-line);border-top-color:var(--t-frame)}
html[data-bg] .shell .panel .intro-notice{border-right-color:var(--t-frame)}
html[data-bg] .shell .panel .intro-notice b{color:var(--t-head)}
html[data-bg] .shell .panel button:not(:is(.intro-light,.reg-light,.chs-alt,.rm-ghost,.x-link,.rd,[data-hz-change])){background:var(--t-frame)}
html[data-bg] .shell .panel button:not(:is(.intro-light,.reg-light,.chs-alt,.rm-ghost,.x-link,.rd,[data-hz-change])):hover:not(:disabled){filter:brightness(.88)}
html[data-bg] .shell .panel button:is(.intro-light,.reg-light,.chs-alt,.rm-ghost){color:var(--t-head);border-color:var(--t-frame)}
html[data-bg] .shell .panel :is(.hz-mine,.current-group){background:var(--t-frame)}
@media(max-width:600px){
  html[data-bg] .shell .panel{padding:28px 18px 22px;margin-bottom:34px}
  html[data-bg] .shell{padding:0 4px}
}
/* حرکت ورود کادرها (فقط وقتی backdrop.js کلاس bgx-anim را گذاشته باشد) */
.bgx-anim .shell>.panel:not(.bgx-in),.bgx-anim header:not(.bgx-in){opacity:0}
.bgx-anim .shell>.panel.bgx-in:not(.bgx-done){animation:var(--t-anim) .8s cubic-bezier(.2,.75,.25,1) both;animation-delay:var(--bgx-d,0ms)}
.bgx-anim .shell>.panel.bgx-in:not(.bgx-done)::before{animation:bgxOrn .7s ease-out both;animation-delay:calc(var(--bgx-d,0ms) + 350ms)}
.bgx-anim header.bgx-in:not(.bgx-done){animation:bgxDown .9s cubic-bezier(.2,.75,.25,1) both}
@keyframes bgxDown{from{opacity:0;transform:translateY(-18px)}to{opacity:1;transform:none}}
@keyframes bgxOrn{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:none}}
@keyframes bgxRise{from{opacity:0;transform:translateY(34px)}to{opacity:1;transform:none}}
@keyframes bgxSoft{from{opacity:0;transform:translateY(10px) scale(.985);filter:blur(6px)}to{opacity:1;transform:none;filter:none}}
@keyframes bgxOpen{from{opacity:0;transform:perspective(900px) rotateX(-16deg) translateY(18px);transform-origin:50% 0}to{opacity:1;transform:none;transform-origin:50% 0}}
@keyframes bgxUnfold{0%{opacity:0;transform:scale(.9,.55)}60%{opacity:1;transform:scale(1.015,1.02)}100%{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.bgx-anim .shell>.panel:not(.bgx-in),.bgx-anim header:not(.bgx-in){opacity:1}.bgx-anim *{animation:none!important}}
""")
RATIO=dict(night='.667',sage='.667',blue='.708',garden='.563')
VEIL=dict(night='#fbf4e2cc',sage='#fcfaf2bf',blue='#fdf8ecd0',garden='#fdf8e8d9')
anim = dict(night='bgxRise', sage='bgxSoft', blue='bgxOpen', garden='bgxUnfold')
for k, d in T.items():
    v = d['vars']
    layers, pos, size = [d['top']], [f"center top {d['toff']}"], [d['tsize']]
    if d.get('corners'):
        c = d['csize']
        layers += d['corners']; pos += ['left top 32px', 'right top 32px', 'left bottom', 'right bottom']; size += [f'{c}px {c}px'] * 4
    if k == 'sage':
        layers.append(d['sprig']); pos.append('left 6px bottom 2px'); size.append('70px 44px')
    if k == 'garden':
        layers += [d['medL'], d['medL'], d['top']]; pos += ['left 0 top calc(50% + 16px)', 'right 0 top calc(50% + 16px)', 'center bottom 1px']; size += ['28px 56px', '28px 56px', d['tsize']]
    if k == 'blue':
        # the arched top: corners only at the bottom
        layers = [layers[0]] + layers[3:]; pos = [pos[0]] + pos[3:]; size = [size[0]] + size[3:]
    out.append(f"/* {k} */\nhtml[data-bg={k}]{{--t-img:url('bg/{k}.webp');" + ''.join(f"--t-{n}:{x};" for n, x in v.items() if n != 'theme') +
               f"--t-radius:{d['radius']};--t-ratio:{RATIO[k]};--t-veil:{VEIL[k]};--t-anim:{anim[k]};--t-orn-pos:{','.join(pos)};--t-orn-size:{','.join(size)}}}")
    out.append(f"html[data-bg={k}] .shell .panel::before{{background-image:{','.join(layers)}}}")
    if d.get('divider'):
        out.append(f"html[data-bg={k}]{{--t-div:{d['divider']}}}")
# night: the heading sits on a green banner like the one in the picture
out.append("""html[data-bg=night] .shell .panel h2{display:table;margin:2px auto 12px;padding:0 34px;background:linear-gradient(#26663f,#1a4a30);color:#f6e3ad;border:1.5px solid var(--t-gold);border-radius:12px;box-shadow:inset 0 0 0 3px #1f5a3a,inset 0 0 0 4px #c9a14a99,0 3px 8px #0003;line-height:1.7}
html[data-bg=night] .shell .panel>h2::after,html[data-bg=night] .shell .panel>.chl-head>h2::after{display:none}
html[data-bg=garden] .shell .panel{padding-inline:34px}
@media(max-width:600px){html[data-bg=night] .shell .panel h2{padding:0 22px}html[data-bg=garden] .shell .panel{padding-inline:26px}}""")
open(sys.argv[1], 'w').write('\n'.join(out) + '\n')
