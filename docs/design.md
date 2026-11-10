# Interview Intel IL: System Design ו-Roadmap

Nov 10, 2026 · @Ziv

## יעד והיקף

**הבעיה:** אחרי 3.5 שנים בלי ראיונות, אין מקור אחד ועדכני שאומר מה שואלים היום בחברות הייטק בישראל. המידע קיים, אבל מפוזר בפוסטים, תגובות וכתבות, ונעלם מהפיד תוך ימים.

**הפתרון:** מערכת אישית שבה משתפים פריט לבוט טלגרם, מודל שפה הופך אותו לתובנות מובנות, ולפני ראיון מבקשים תדריך על חברה או תפקיד.

**היעד של ה-MVP:** להגיע מהר למצב שבו אתה משתמש במערכת בראיונות אמיתיים שלך. כל השאר נדחה.

**בתוך ההיקף**

- לכידה ידנית דרך בוט טלגרם: טקסט, קישור, צילום מסך
- חילוץ אוטומטי לתובנות מובנות, עם שמירת המקור הגולמי
- תדריך לפי חברה או תפקיד, עם קישורים למקורות
- דיווח אחרי ראיון שלך
- סט בדיקה (golden set) שמודד את איכות החילוץ

**מחוץ להיקף כרגע**

- סקרייפינג אוטומטי של לינקדאין או Glassdoor (תנאי שימוש, סיכון לחשבון)
- אתר, הרשמת משתמשים, תרומות של אחרים
- סימולציית ראיון
- חיפוש סמנטי (embeddings). מתחילים בסינון רגיל לפי חברה ותפקיד

## מילון מונחים

המילון חי ב-[`GLOSSARY.md`](../GLOSSARY.md) בשורש הריפו, והוא המקור היחיד למונחים. השמות שם הם גם שמות הטבלאות, הטיפוסים והטיקטים: Capture, Source, Interview Report, Insight, Extraction Run, Verdict, Speaker, Credibility, Stage, Format, Role, Seniority, Brief, Golden Set.

## System design

העיקרון המנחה: **קודם שומרים את הגולמי, אחר כך מחלצים.** הבוט עונה מיד, החילוץ רץ אחריו, ואפשר להריץ אותו מחדש על כל ה-Captures כשהפרומפט או הסכמה משתנים.

&#91;embedded content: ארכיטקטורה · 5 רכיבים ו-DB אחד\]

**זרימת לכידה**

1. אתה משתף לבוט טקסט, קישור או צילום מסך.
2. טלגרם שולח webhook ל-Worker. ה-Worker בודק שהשולח הוא אתה (allowlist של Telegram user id).
3. נשמר Capture, והתמונות (אם יש) עולות ל-object storage. אלבום של כמה צילומים הוא Capture אחד. אם ה-hash של התוכן כבר קיים, הבוט עונה «כבר שמור» ועוצר. אחרת הוא עונה «נשמר». קישור בלי טקסט נשמר, והבוט מבקש שתדביק את הטקסט או תשלח צילום.
4. בתוך `ctx.waitUntil`, ה-Extractor שולח את ה-Capture ל-Claude Haiku עם סכמת פלט מובנית. כל ניסיון נרשם כ-Extraction Run (הצליח / נכשל), וה-Insights נשמרים תחת הריצה.
5. הבוט שולח לך מה חולץ, עם כפתורי 👍 / 👎. ה-Verdict נשמר על הריצה, ו-👎 הופך את ה-Capture למועמד ל-Golden Set. אין עריכה ידנית של Insights.
6. cron שעתי אוסף Captures בלי ריצה מוצלחת ומנסה שוב, עד 3 כישלונות. ה-DB הוא התור, בלי תשתית queue נפרדת ([ADR-0002](adr/0002-immutable-captures-derived-status.md)).

**זרימת תדריך**

1. אתה שולח `/brief Wiz backend senior`.
2. שליפת ה-Insights הנוכחיים (מהריצה המוצלחת האחרונה של כל Capture) בשתי קבוצות: כל ה-Insights של החברה, ו-Insights כלליים (בלי חברה) על אותו Role או בלי Role מ-6 החודשים האחרונים. כל קבוצה ממוינת לפי Credibility ואז לפי `said_at`, ואם אין, לפי `captured_at`. חברה לא מוכרת: הבוט אומר זאת ושולח תדריך שוק בלבד.
3. Claude Sonnet מסכם ל-Brief. כל טענה בתדריך מצביעה על ה-Capture שממנו היא באה, וטענות שהתאריך שלהן משוער מסומנות. ה-Brief נרשם בטבלת `briefs` ולא משמש כ-cache.

**הרכיבים**

| רכיב | אחריות | טכנולוגיה מוצעת |
| --- | --- | --- |
| Bot | קבלת הודעות, פקודות, תשובות | Cloudflare Worker + Telegram Bot API |
| Extractor | Capture ← Insights. פונקציה אחת, בלי תלות בבוט | Claude Haiku, פלט מובנה לפי סכמת Zod |
| Briefer | Insights ← Brief | Claude Sonnet |
| DB | Captures, Insights, חברות, ריצות חילוץ | Postgres (Supabase) + Drizzle |
| Storage | צילומי מסך מקוריים | Supabase Storage |
| Sweeper | ניסיון חוזר ל-`pending`, ובהמשך איסוף ממקורות פתוחים | Cron Trigger על אותו Worker |
| Evals | הרצת ה-Golden Set והשוואה לצפוי | סקריפט מקומי |

**Seams לבדיקות.** שניים בלבד: הפונקציה `extract(capture)` של ה-Extractor, וה-handler של ה-webhook מקצה לקצה מול DB של בדיקות. ה-DB של הבדיקות הוא PGlite (Postgres ב-WASM בתוך תהליך הבדיקה), DB חדש לכל קובץ בדיקה, עם אותן מיגרציות. כל השאר נבדק דרכם.

## מודל נתונים

שש טבלאות ב-MVP. ערכי ה-enum באנגלית, הציטוטים בשפת המקור.

| טבלה | שדות עיקריים | הערות |
| --- | --- | --- |
| `captures` | id, kind (text / url / image), raw\_text, image\_paths\[\], source\_url, source\_type (… / interview\_report), content\_hash (unique), captured\_at | לא נמחק ולא משתנה. אין עמודת status: הסטטוס נגזר מ-`extraction_runs` ([ADR-0002](adr/0002-immutable-captures-derived-status.md)) |
| `extraction_runs` | id, capture\_id, model, prompt\_version, outcome (succeeded / failed), error, verdict (up / down / none), input\_tokens, output\_tokens, cost\_usd, created\_at | `prompt_version` הוא hash של טקסט הפרומפט וסכמת הפלט. רק הריצה המוצלחת האחרונה של Capture נוכחית |
| `insights` | id, extraction\_run\_id, company\_id (nullable), role, seniority, stage (nullable), format, ai\_allowed (yes / no / unknown), what\_is\_tested, questions\[\], quote, speaker\_role, speaker\_name, first\_hand, said\_at (nullable) | לכל היותר Stage אחד ל-Insight. Insight בלי חברה הוא חוקי: תובנה כללית על השוק. role ו-seniority מרשימה סגורה (ראו `GLOSSARY.md`) |
| `companies` | id, name, normalized\_name (unique), aliases\[\] | חברה חדשה נוצרת אוטומטית לפי שם מנורמל. aliases נכנסים בטיקט 9 |
| `golden_cases` | capture\_id, expected\_insights (jsonb), labelled\_at | מחוץ ל-git ([ADR-0005](adr/0005-public-repo-no-capture-content.md)). ה-eval runner קורא ישירות מכאן |
| `briefs` | id, query, company\_id, role, text, insight\_ids\[\], model, cost\_usd, created\_at | רישום בלבד, לא cache |

**חישוב Credibility (גרסה ראשונה, פשוטה בכוונה).** מחושב בקוד מתוך Source type, תפקיד ה-Speaker ו-first\_hand, ולא נשמר ולא מופק על ידי המודל ([ADR-0003](adr/0003-credibility-computed-not-extracted.md)):

- 5: Interview Report שלך
- 4: מנהל מגייס או מגייסת שמתארים את התהליך שלהם
- 3: מועמד שמתאר ראיון שעבר
- 2: כתבה עם ציטוט של איש תעשייה
- 1: דעה כללית בלי ניסיון ישיר

**פרטיות.** `speaker_name` נשמר רק בשלב האישי. לפני שמישהו אחר רואה את הנתונים, השדה הזה וה-quote המילולי יורדים או עוברים אנונימיזציה.

## מבנה ה-repo

**מונו-ריפו אחד, pnpm workspaces, TypeScript.** הסיבה: סכמת ה-Insight משותפת לבוט, ל-Extractor, ל-evals ובעתיד לאתר. בריפו אחד שינוי בסכמה הוא commit אחד, וסוכן קוד רואה את כל ההקשר. כמה ריפוזיטוריז יוסיפו גרסאות ופרסום חבילות בלי שום תמורה למפתח יחיד.

```
interview-intel/
├── apps/
│   └── bot/              # Cloudflare Worker: webhook, commands, cron sweep
├── packages/
│   ├── domain/           # Zod schemas + types: Capture, Insight, Brief
│   ├── db/               # Drizzle schema, migrations, repositories
│   └── extractor/        # extract(capture), brief(insights), prompts
│       └── evals/        # golden set + runner, ליד הקוד שהם בודקים
├── docs/
│   ├── adr/              # החלטות ארכיטקטורה, קובץ קצר לכל אחת
│   └── agents/           # נכתב על ידי /setup-matt-pocock-skills
├── GLOSSARY.md
├── CLAUDE.md
├── .env.example
└── pnpm-workspace.yaml
```

**מה יתווסף בהמשך, ורק כשצריך:** `apps/web` לאתר, ו-`apps/collector` אם האיסוף ממקורות פתוחים יגדל מעבר ל-cron בתוך הבוט.

**שלוש חבילות ולא עשר.** כל חבילה חושפת ממשק קטן ומסתירה הרבה מאחוריו (deep modules). ה-Extractor חושף שתי פונקציות, וכל הפרומפטים, הקריאות ל-API והפרסור חיים בפנים.

הסקיל `setup-matt-pocock-skills` מזהה `pnpm-workspace.yaml` ומציע אז מילון נפרד לכל חבילה. כאן יש דומיין אחד, אז בוחרים single-context: קובץ `GLOSSARY.md` אחד בשורש.

## החלטות

כל שורה היא מועמדת ל-ADR קצר ב-`docs/adr/`. בפורמט של Matt Pocock, ADR הוא פסקה אחת: מה הוחלט ולמה.

**הוחלט**

| # | החלטה | למה |
| --- | --- | --- |
| 1 | מונו-ריפו אחד | סכמה משותפת, מפתח יחיד, הקשר מלא לסוכן |
| 2 | Capture נשמר לפני החילוץ ולא משתנה | חילוץ מחדש כשהפרומפט משתפר, ואפס אובדן מידע כשה-API נופל |
| 3 | ה-DB הוא התור (עמודת status + cron) | בנפח של עשרות פריטים ביום, queue הוא תשתית מיותרת |
| 4 | Postgres מהיום הראשון | חיפוש טקסט, pgvector ו-auth יידרשו בשלב הפלטפורמה, ומיגרציה מאוחרת יקרה יותר |
| 5 | לינקדאין נכנס רק בלכידה ידנית | תנאי השימוש אוסרים איסוף אוטומטי, והחשבון שלך חשוב בזמן חיפוש עבודה |
| 6 | Haiku לחילוץ, Sonnet לתדריך | המודל הזול ביותר שעובר את ה-Golden Set. ההחלטה נבחנת מחדש מול ה-evals |
| 7 | משתמש יחיד ב-allowlist | אין auth עד שלב הפלטפורמה |

**הוכרע ב-`/grill-with-docs` (10.11.2026)**

- [x] Cloudflare Workers + Supabase, עם חילוץ ב-`ctx.waitUntil`: [ADR-0001](adr/0001-cloudflare-workers-and-supabase.md)
- [x] Issue tracker: GitHub Issues (`docs/agents/issue-tracker.md`)
- [x] ריפו ציבורי, בלי תוכן של Captures ב-git: [ADR-0005](adr/0005-public-repo-no-capture-content.md)
- [x] קישור בלי טקסט: נשמר, והבוט מבקש להדביק טקסט או צילום. משיכת עמודים נדחית לטיקט 10
- [x] Capture לא משתנה, הסטטוס נגזר מ-Extraction Runs: [ADR-0002](adr/0002-immutable-captures-derived-status.md)
- [x] Credibility מחושב בקוד: [ADR-0003](adr/0003-credibility-computed-not-extracted.md)
- [x] לינקדאין ו-Glassdoor רק בלכידה ידנית: [ADR-0004](adr/0004-manual-capture-only-for-linkedin.md)
- [x] Evals: התאמה לפי (חברה, Stage), שדות סגורים בהשוואה מדויקת, שדות חופשיים ב-Sonnet judge (0/1). שער ה-merge: הציון לא יורד מתחת ל-`main`. סף מוחלט ייקבע אחרי שיהיו מספרים אמיתיים

## Roadmap

העבודה מחולקת לפרוסות אנכיות (tracer bullets): כל טיקט חותך דרך כל השכבות, מהבוט ועד ה-DB, ואפשר להדגים אותו לבד. אין שלב של «קודם כל ה-DB, אחר כך כל הבוט».

**שלב 1: MVP אישי**

| # | טיקט | חסום על ידי | מה עובד בסוף |
| --- | --- | --- | --- |
| 1 | שלד מהלך: הודעת טקסט נשמרת כ-Capture, כולל content hash וטבלת `extraction_runs` (ריקה) | — | שולח טקסט לבוט, רואה שורה ב-DB, מקבל «נשמר», ועל אותו טקסט שוב «כבר שמור». פרוס ורץ |
| 2 | חילוץ Insights מטקסט, עם כפתורי 👍 / 👎 ו-Verdict | 1 | הבוט עונה מה חילץ: חברה, פורמט, מה נבדק, מי אמר. 👎 מסמן מועמד ל-Golden Set |
| 3 | Golden Set ו-eval runner: טבלת `golden_cases` וכללי הציון | 2 | פקודה אחת מדפיסה ציון כללי וציון לכל שדה על 20 Captures מתויגים |
| 4 | לכידת צילום מסך, כולל אלבום כ-Capture אחד | 2 | צילומי פוסט ותגובות הופכים ל-Insights, התמונות נשמרות |
| 5 | פקודת `/brief`, עם רישום בטבלת `briefs` | 2 | תדריך לחברה או לתפקיד עם קישורים למקורות |
| 6 | עמידות ועלות: cron לניסיון חוזר עם תקרה של 3 כישלונות, פקודות `/failed` ו-`/cost` | 2 | כישלון API לא מאבד פריט, ורואים כמה הוצאת |
| 7 | Interview Report: שאלון קצר בבוט אחרי ראיון | 2 | הראיונות שלך נכנסים למאגר ב-Credibility 5 |

טיקט נוסף לשלב 1, **8: שרת MCP מעל ה-DB** (חסום על ידי 2). בסופו אתה שואל את Claude בצ׳אט או ב-Claude Code שאלות חופשיות על המאגר, בלי לבנות UI. בעקבות זה הטיקטים של שלב 2 ממוספרים 9 עד 13.

לטיקטים 7 ו-8, ולכל שלב 2, יש שאלות עיצוב פתוחות. כל אחד מהם יעבור `/grill-with-docs` משלו כשמתחילים אותו.

**סדר מוצע:** 1 ו-2 בסופ״ש הראשון, ומאותו רגע לוכדים פריטים אמיתיים. אחר כך 5, כי התדריך הוא הערך שאתה צריך לראיונות. אחר כך 3, כי רק אחרי כמה עשרות Captures אמיתיים יש ממה לבנות Golden Set. 4, 6, 7 ו-8 לפי מה שכואב.

**שלב 2: העשרה**

| # | טיקט | חסום על ידי | מה עובד בסוף |
| --- | --- | --- | --- |
| 9 | נרמול חברות וזיהוי כפילויות | 5 | אותו פוסט פעמיים לא נספר פעמיים |
| 10 | סוכן מתוזמן שאוסף פעם בשבוע ממקורות פתוחים (כתבות, RSS, תמלולי וידאו) | 3 | Captures חדשים נכנסים בלי שתיגע |
| 11 | סימולציית ראיון מתוך Brief | 5 | הבוט מראיין אותך לפי מה שידוע על החברה |
| 12 | דוח מגמות חודשי | 9 | מה השתנה החודש בפורמטים ובשאלות |
| 13 | תרגול אינטראקטיבי שנגזר מהמגמות: אם המאגר מראה שהפורמט הנפוץ הוא ראיון AI-assisted או ביקורת על קוד של AI, בונים תרגיל בפורמט הזה, עם משוב. זה ה-UI הראשון: `apps/web` | 11, 12 | אתה נבחן במה שבאמת שואלים היום |

**שלב 3: פלטפורמה לאחרים**

עדיין לא מפורק לטיקטים, וזה בכוונה. זה מאמץ שגדול מסשן אחד, והסקיל `/wayfinder` מיועד בדיוק לו: מפה של החלטות שנפתרות אחת אחת. ההחלטות שיחכו שם:

- מודל תרומות: «תן דיווח, קבל גישה», ואיך מוודאים שדיווח אמיתי
- אנונימיזציה והסרה לפי בקשה, וייעוץ משפטי לפני פתיחה
- אתר עם הרשמה, וחיפוש סמנטי
- האם הקהל הראשון הוא מועמדים או גם מגייסים

## איך מתחילים

הסקילים של Matt Pocock הם פקודות שרצות בתוך Claude Code בריפו שלך, וחלקם מראיינים אותך. המסמך הזה נכתב בפורמטים שלהם (מילון, ADR קצר, פרוסות אנכיות עם חסימות, seams לבדיקות), כך שהוא הקלט שלהם ולא תחליף להם.

**יום ראשון**

1. צור ריפו ריק ב-GitHub בשם `interview-intel` ושים בו את המסמך הזה כ-`docs/design.md` (ייצוא ל-Markdown מהתפריט כאן).
2. התקן את הסקילים: `claude plugin install mattpocock-skills@claude-plugins-official`
3. הרץ `/setup-matt-pocock-skills`. הוא שואל איפה הטיקטים חיים ואיפה המסמכים, וכותב את `docs/agents/`.
4. הרץ `/grill-with-docs` והפנה אותו ל-`docs/design.md`. הוא יתקוף את ההחלטות הפתוחות, ויכתוב תוך כדי כך את `GLOSSARY.md` ואת ה-ADRs.
5. הרץ `/to-spec` על שלב 1 בלבד, ואז `/to-tickets`. הוא יציג את הפירוק לאישורך לפני שהוא פותח issues.
6. הרץ `/wizard` להקמת החשבונות. הוא בונה סקריפט שמוביל אותך צעד אחרי צעד וכותב את הערכים ל-`.env`.

**החשבונות שה-wizard יעבור עליהם**

- [ ] טלגרם: בוט חדש דרך BotFather, וה-user id שלך ל-allowlist
- [ ] Claude Console: חשבון נפרד מהמנוי, מפתח API, ותקרת הוצאה חודשית נמוכה
- [ ] Supabase: פרויקט, connection string, bucket לצילומי מסך
- [ ] Cloudflare: חשבון, Worker, וסודות ה-Worker

את מפתח ה-API שמים בקובץ הסודות של הפרויקט ולא כמשתנה סביבה גלובלי במחשב. משתנה `ANTHROPIC_API_KEY` גלובלי גורם ל-Claude Code לחייב את ה-API במקום את המנוי.

**הלולאה לכל טיקט**

| שלב | סקיל | מה יוצא |
| --- | --- | --- |
| יישור קו לפני שינוי לא טריוויאלי | `/grill-with-docs` | החלטות חדות, מילון מעודכן |
| שאלת עיצוב פתוחה (למשל: איך נראה Brief טוב) | `/prototype` | קוד זריק שעונה על השאלה |
| מימוש | `/implement` עם `/tdd` | הטיקט עובד, עם בדיקות ב-seams שסוכמו |
| לפני merge | `/code-review` | ממצאים לתיקון |
| באג | `/diagnosing-bugs` | סיבת שורש לפני תיקון |

**כלל אחד לחילוץ:** כל שינוי בפרומפט או במודל עובר דרך ה-eval runner לפני merge. זה ההרגל שמראיינים מחפשים היום, והפרויקט הזה נותן לך סיפור אמיתי לספר עליו.

## דגש: לעבוד כמו ב-2026

לפרויקט יש שתי מטרות שוות משקל: מאגר ידע עדכני על ראיונות, וניסיון מעשי בשיטות העבודה שעליהן שואלים היום. לכן כל שיטה ממופה כאן לטיקט שבו תתרגל אותה. כשצריך לבחור בין שתי דרכים לממש משהו, בוחרים בזו שמלמדת יותר, בתנאי שהיא לא מעכבת את ה-MVP.

| שיטה | איפה בפרויקט | מה תוכל להראות |
| --- | --- | --- |
| פיתוח עם סוכן: spec, טיקטים קטנים, מימוש על ידי הסוכן, ביקורת שלך על כל diff | כל הטיקטים | היסטוריית issues ו-PRs שמספרת איך עבדת |
| Context engineering: `CLAUDE.md` קצר, מילון, ADRs | יום ראשון | ריפו שסוכן נכנס אליו ומבין את הדומיין |
| פלט מובנה עם ולידציית סכמה | טיקט 2 | חילוץ שלא נשבר על קלט מלוכלך |
| Evals כשער לפני merge | טיקט 3 | ציון לפני ואחרי לכל שינוי פרומפט |
| קלט חזותי (vision) | טיקט 4 | צילום מסך הופך לנתונים |
| ניתוב מודלים לפי עלות ואיכות, prompt caching, batch | טיקטים 2, 5, 6 | השוואת Haiku מול Sonnet על ה-Golden Set, במספרים |
| מעקב עלות ותצפית על קריאות LLM | טיקט 6 | עלות לפריט ולחודש מתוך הנתונים שלך |
| שרת MCP: חשיפת המאגר ככלי לסוכנים | טיקט 8 | שואלים את Claude על המאגר בשפה חופשית |
| סוכן ב-CI שסוקר כל PR | אחרי טיקט 1 | ביקורת אוטומטית לפני הביקורת שלך |
| סוכן מתוזמן | טיקט 10 | איסוף שבועי שרץ לבד |
| כתיבת סקיל משלך | אחרי טיקט 3 | סקיל `/add-golden-case` שמוסיף Capture מתויג ל-Golden Set |

**יומן החלטות.** אחרי כל טיקט, שורה אחת ב-`docs/journal.md`: מה ניסית, מה נכשל, מה המספרים. בראיון, הסיפורים האלה שווים יותר מהקוד עצמו.

## עיצוב ו-UI

בשלב 1 אין UI משלך: הממשק הוא טלגרם. העיצוב נכנס בטיקט 13 (`apps/web`) ובשלב 3. הסקילים מותקנים כבר ביום הראשון ורשומים ב-`CLAUDE.md`, כדי שכל מסך ראשון ייבנה איתם.

| סקיל | מה הוא נותן | התקנה |
| --- | --- | --- |
| [emil-design-eng](https://www.skills.sh/emilkowalski/skills/emil-design-eng) | גישת design engineering של Emil Kowalski: ליטוש, עיצוב קומפוננטות, החלטות אנימציה | `npx skills add https://github.com/emilkowalski/skills --skill emil-design-eng` |
| [better-ui](https://www.skills.sh/jakubkrehel/skills/better-ui) | ערכים מדויקים לרדיוסים, צללים, יישור אופטי, מצבי אייקונים ותנועה. מופעל אחרי שהאינטראקציה עובדת | `npx skills add https://github.com/jakubkrehel/skills --skill better-ui` |
| [Taste Skill](https://www.tasteskill.dev/) (design-taste-frontend) | כיוון אמנותי ובדיקה עצמית בדפדפן אמיתי. מכוון לדפי נחיתה ולעיצוב מחדש | `npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"` |

**איך משלבים**

- emil-design-eng ו-better-ui משלימים זה את זה, ושניהם פעילים בכל עבודת UI ב-`apps/web`.
- Taste Skill נכנס רק לדף הנחיתה בשלב 3. הוא מכתיב כיוון סגנוני שלם, ושני מנועי סגנון באותו מסך מתנגשים. הוא דורש Node 22 ומעלה ודפדפן Chromium מותקן.
- סקיל הוא קובץ הוראות שהסוכן שלך מבצע. קוראים את ה-`SKILL.md` לפני התקנה, ובודקים את קובץ הרישיון בריפו.

**רישוי.** שלושתם מותקנים בלי תשלום מריפו ציבורי ב-GitHub. Taste Skill מתואר כקוד פתוח, ומקור צד שלישי מדווח על רישיון MIT. לשני האחרים, דף skills.sh לא מציין רישיון.

**עקרונות העיצוב של הפרויקט**

- נקי ושקט: הרבה רווח, טיפוגרפיה שנושאת את ההיררכיה, צבע מבטא אחד
- עברית ו-RTL כברירת מחדל, ולא כתוספת מאוחרת
- מצב בהיר ומצב כהה מהמסך הראשון
- תנועה קצרה ושימושית בלבד, וכיבוד של prefers-reduced-motion
- כל טענה על המסך מציגה את המקור וה-Credibility שלה

## טיוטת CLAUDE.md

קובץ פתיחה לשורש הריפו. `/setup-matt-pocock-skills` יוסיף לו בעצמו את הבלוק `## Agent skills`.

```markdown
# Interview Intel IL

Personal knowledge base of how Israeli tech companies interview in 2026.
Captures come in through a Telegram bot, an LLM extracts structured
Insights, and Briefs are generated per company or role.

## Read first
- GLOSSARY.md: use these terms exactly (Capture, Insight, Brief...)
- docs/design.md: system design and roadmap
- docs/adr/: decisions already made; do not relitigate without asking

## Stack
TypeScript, pnpm workspaces, Cloudflare Workers, Postgres (Supabase),
Drizzle, Zod, Claude API (Haiku for extraction, Sonnet for briefs).

## Rules
- A Capture is saved before extraction and never mutated.
- Any change to a prompt, schema or model runs the eval suite first.
  Report the score before and after.
- Tests go at two seams only: extract(capture) and the webhook handler.
- One ticket per session. Keep diffs small. Ask before adding a dependency.
- No automated scraping of LinkedIn or Glassdoor. Manual capture only.
- Secrets live in .dev.vars / Worker secrets, never in code or shell env.
- After each ticket, add one line to docs/journal.md.

## UI work (apps/web)
- Use the emil-design-eng and better-ui skills for every UI change.
- Use design-taste-frontend only for the marketing landing page.
- Clean, quiet, modern: generous spacing, one accent colour,
  typography carries hierarchy.
- Hebrew and RTL by default. Light and dark from the first screen.
- Motion is short and purposeful; respect prefers-reduced-motion.
- Every claim on screen shows its Source and Credibility.
```

## עלויות צפויות

החישובים לפי מחירון ה-API נכון ל-10.11.2026, ובהנחות גודל שלי. ה-`extraction_runs` יחליף את ההנחות במספרים אמיתיים.

| פעולה | מודל ומחיר למיליון טוקנים | הנחה | עלות |
| --- | --- | --- | --- |
| חילוץ Capture | Haiku 5.5: $0.10 קלט, $0.50 פלט | 3,000 קלט, 1,000 פלט | כ-$0.0008 |
| Brief | Sonnet 5.5: $2 קלט, $10 פלט | 20,000 קלט, 2,000 פלט | כ-$0.06 |
| הרצת Golden Set | Haiku 5.5 | 20 Captures | כ-$0.02 |

חודש עם 300 Captures, 30 Briefs ו-20 הרצות eval יוצא בסביבות $2.5. צילומי מסך יקרים יותר מטקסט, ואת הפער תראה ב-`/cost`.

**אירוח:** Telegram Bot API חינמי. ל-Cloudflare Workers ול-Supabase יש שכבות חינם שאמורות להספיק לנפח הזה. את המכסות העדכניות שלהן לא אימתתי, וה-wizard הוא המקום לבדוק אותן.

## מקורות

- [mattpocock/skills](https://github.com/mattpocock/skills)
- [Claude Platform pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [Use Claude Code with your Pro, Max, or Ultra plan](https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan)
