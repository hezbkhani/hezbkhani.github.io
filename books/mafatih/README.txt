مفاتیح‌الجنان (mafatih.js)

index.json: فهرست کتاب: chapters → parts → items. هر مورد یکی از این‌هاست:
  {key, title, audio?}  متن در <key>.json (همان قالب متن‌های chelleh: sections = [{ar, fa} | {note}]، audio = [{name, url}])
  {title, ref}          متنی که سایت از قبل در پوشه chelleh دارد (کمیل، سمات، توسل، عاشورا، کسا، عهد، مشلول)
  {title, surah}        سوره‌ای که در قرآن‌خوان سایت باز می‌شود

متن عربی و ترجمه فارسی استاد حسین انصاریان (همان متن erfan.ir)، از پایگاه داده github.com/kazemcodes/mafatih_db (type 3/mafatihdbv14.db).
بندهای «note» توضیحات فارسی خود شیخ عباس قمی در مفاتیح است.
صوت‌ها پیوند به shiavoice.com است (مهدی سماواتی، محسن فرهمند آزاد، علی فانی، حسین غریب)؛ فهرست در tools/mafatih/audio.json.
همه فایل‌ها را tools/mafatih/build.py از همان پایگاه داده می‌سازد:  python3 tools/mafatih/build.py mafatihdbv14.db
