ساختن quran/aghaei.json (زمان شروع و پایان هر آیه در فایل‌های جزء audio/aghaei/joz01.mp3 تا joz30.mp3)

پیش‌نیاز: ffmpeg، و pip install torch torchaudio transformers (نسخه CPU کافی است).
۱. python3 emit.py audio/aghaei <پوشه_خروجی>      احتمال حروف هر ۲۰ میلی‌ثانیه صوت با مدل jonatasgrosman/wav2vec2-large-xlsr-53-arabic (روی ۴ هسته CPU حدود ۵ دقیقه برای هر جزء)
۲. python3 align.py . <پوشه_خروجی> all.json        هم‌ترازی متن (quran/p) با صوت؛ استعاذه و بسم‌الله اول هر فایل، صدق‌الله آخر آن و دعای ختم آخر جزء ۳۰ هم در متن گذاشته می‌شود
۳. python3 build.py all.json audio/aghaei quran/aghaei.json   مرز هر دو آیه پشت سر هم یکی می‌شود تا پخش پیوسته بماند
