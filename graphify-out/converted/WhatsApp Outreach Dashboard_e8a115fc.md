<!-- converted from WhatsApp Outreach Dashboard.docx -->

# WhatsApp Outreach Dashboard — MVP Scope
## 1. هدف المشروع
بناء Dashboard بسيط لمستخدم واحد، لإدارة WhatsApp Outreach باستخدام الـ official WhatsApp Business Platform، الـDashboard بيسمحلك:
تستورد Leads من Excel أو CSV.
تبعت أول WhatsApp message.
تبعت Follow-ups تلقائياً إذا الشخص ما رد.
توقف الـFollow-ups لما يكون الرد فعلي وعادي من الشخص.
إذا كان الرد Auto Reply معروف أو متكرر، ما ينحسب كـReply فعلي وما يوقف الـFollow-ups.
تفتح المحادثة وتكمل معه يدوياً من داخل الـDashboard.

## 2. طريقة عمل النظام
الـWorkflow بيكون كالتالي:
بتستخدم الأداة الموجودة عندك لاستخراج معلومات الشركات من Google Maps.
الأداة بتطلعلك Excel أو CSV فيه الأسماء والأرقام والمعلومات.
بترفع الملف على الـDashboard.
الـLeads بيظهروا عندك داخل النظام.
بتحدد الرسالة الأولى وFollow-up #1 وFollow-up #2.
بتحدد بعد كم يوم بينبعت كل Follow-up.
النظام بيبعت الرسالة الأولى عن طريق WhatsApp Business Platform.
إذا الشخص ما رد، بينبعتله Follow-up #1 بعد المدة المحددة.
إذا بعده ما رد، بينبعتله Follow-up #2 بعد المدة المحددة.
إذا وصل Auto Reply معروف أو متكرر، النظام ما بيعتبره Reply فعلي وبيكمل الـSequence.
إذا وصل رد عادي من الشخص، كل الـAutomatic Follow-ups الخاصة فيه بتتوقف.
المحادثة بتظهر عندك داخل الـInbox.
من بعدها بتقدر تكمل الحكي معه يدوياً من الـDashboard.

## 3. الأشياء الموجودة بالـMVP
### Leads
Import من Excel أو CSV.
حفظ معلومات أساسية مثل اسم الشركة ورقم الهاتف.
عرض كل الـLeads داخل Table.
التعامل مع الأرقام غير الصحيحة أو المكررة.
عرض Status لكل Lead.
مثلاً:
New
Contacted
Waiting for Follow-up
Replied
Completed
Failed

### Campaign
بالـMVP رح يكون في Campaign أساسي واحد Active بنفس الوقت.
بتقدر تحدد:
Initial Message Template
Follow-up #1 Template
بعد كم يوم ينبعت Follow-up #1
Follow-up #2 Template
بعد كم يوم ينبعت Follow-up #2
Daily Sending Limit، مثلاً 150 رسالة باليوم
### WhatsApp Integration
النظام رح يكون مربوط برقم WhatsApp Business واحد Active بنفس الوقت عن طريق الـofficial WhatsApp Business Platform.
رح يدعم:
إرسال Approved WhatsApp Templates.
حفظ الرسائل المرسلة.
استقبال الردود من WhatsApp.
استقبال Basic Message Status مثل:
Sent
Delivered
Failed
تغيير الرقم الحالي وربط رقم جديد مكانه إذا احتجنا، بشرط يكون الرقم الجديد مسجّل ومفعّل على WhatsApp Business Platform عند Meta.
الـMVP ما بيدعم أكثر من WhatsApp Number شغالين بنفس الوقت.

### Auto Reply Detection
النظام رح يحاول يفرّق بين الرد العادي والـAuto Reply باستخدام Rules أو Patterns معروفة أو مضافة بالنظام.
مثلاً إذا وصل رد مثل:
Thanks for contacting us
We are currently unavailable
We will get back to you soon
شكراً لتواصلك معنا
نحن غير متاحين حالياً
النظام ممكن يعتبره Possible Auto Reply وما يوقف الـFollow-ups.
أما إذا وصل رد عادي من الشخص، الـSequence بتتوقف.
مهم: الـAuto Reply Detection هي Best-effort ومش مضمونة 100%، لأن WhatsApp مش دائماً بيعطي معلومة جاهزة تحدد إذا الرسالة Automated أو Human.

### Automatic Follow-ups
النظام رح يتابع كل Lead لحاله.
مثلاً:
Initial Message
→ ما رد
Follow-up #1 → بعد 3 أيام
→ ما رد
Follow-up #2 → بعد 4 أيام
إذا وصل Auto Reply معروف:
→ Continue Automation
إذا وصل رد عادي:
Reply
→ Stop Automation
→ Cancel Remaining Follow-ups
→ Show Conversation in Inbox
بعد آخر Follow-up، إذا ما صار رد فعلي، الـSequence بتنتهي.

### Inbox
الـInbox بيسمحلك:
تشوف الأشخاص يلي ردوا.
تشوف Conversation History.
تفتح المحادثة.
تبعت Manual Reply من الـDashboard.
تضل كل الرسائل مرتبطة بالـLead الصحيح.
### Dashboard
رح يكون في Basic Statistics مثل:
Total Leads
Contacted Leads
Replied Leads
Waiting for Follow-up
Completed
Failed Messages
الهدف هون يكون عندك Overview واضح، مش Advanced Analytics.

## 4. الأشياء غير الموجودة بالـMVP
الـ$90 تشمل فقط الـMVP الموجود بهيدا الـScope.
الأشياء التالية غير مشمولة:
Google Maps Scraping Tool
تعديل أو بناء أداة استخراج المعلومات الموجودة عندك
Automatic Google Sheets Sync
أكثر من WhatsApp Number شغالين بنفس الوقت
Multiple Users
Employee Accounts
Roles & Permissions
Multi-tenant SaaS
AI Replies
AI Sales Agent
Advanced CRM
Drag-and-Drop Automation Builder
Unlimited Custom Workflows
Advanced Analytics
Billing & Subscriptions
Email أو SMS Integration
Advanced Lead Segmentation
Hosting Costs
Domain Costs
WhatsApp / Meta Fees
أي Third-party Service Fees
Ongoing Maintenance بعد فترة الدعم المتفق عليها
أي Feature جديدة خارج هيدا الـScope بتكون شغل إضافي ومنتفق عليها بشكل منفصل.

## 5. حدود المشروع
أداة Google Maps الموجودة عندك منفصلة عن المشروع.
المشروع بيبدأ من هون:
Google Maps Tool
→ Excel / CSV
→ Our Dashboard
→ WhatsApp Business Platform
→ Leads
يعني أنا مش مسؤول عن بناء أو تعديل أداة Google Maps.

## 6. WhatsApp ومتطلبات Meta
النظام رح يستخدم Official WhatsApp Business Platform.
أنا رح أتولى الـTechnical Setup لربط الرقم يلي بتعطيني ياه مع Meta وWhatsApp Business Platform ضمن المشروع.
من جهتك لازم يكون متوفر:
Meta / WhatsApp Business Account.
الرقم يلي بدك تربطه بالنظام.
أي Verification Code أو Approval تطلبه Meta.
أي Business Verification تطلبه Meta.
Access المطلوب حتى نقدر نعمل الـSetup.
دفع أي WhatsApp أو Meta Fees.
دفع أي Hosting أو Third-party Fees.
الـMeta Business Account والرقم بيضلوا ملكك وتحت سيطرتك.
الرسائل ممكن تنبعت فقط من رقم يكون هو نفسه مسجّل ومفعّل عند Meta على WhatsApp Business Platform.
يعني ما فينا نربط Number A ونرسل من Number B إلا إذا Number B كمان مسجّل ومفعّل عند Meta.
إذا احتجنا نغيّر الرقم، منقدر نربط رقم جديد مكان الرقم الحالي، بس تغيير الرقم ما بيضمن إنه أي Restriction أو Block من Meta يختفي، خصوصاً إذا المشكلة مرتبطة بالـBusiness Account أو بسبب مخالفة WhatsApp Policies.
كمان مسؤولية استخدام الأرقام والـLeads بتكون عندك.
يعني لازم تتأكد إن الأشخاص الموجودين بالـList مسموح التواصل معهم حسب WhatsApp Policies والقوانين المطلوبة، وإن أي Opt-in أو Consent مطلوب يكون موجود.
النظام نفسه ما بيضمن:
Meta Account Approval
Template Approval
WhatsApp Account Verification
عدم تقييد الحساب إذا تم مخالفة WhatsApp Policies
إزالة أي Restriction أو Block فقط بسبب تغيير الرقم
## 7. متى نعتبر الـMVP مكتمل؟
الـMVP بيكون Done لما نقدر نعمل الـWorkflow التالي بشكل صحيح:
نرفع Excel أو CSV صالح.
الـLeads يظهروا داخل النظام.
الأرقام المكررة أو غير الصحيحة يتم التعامل معها بشكل آمن.
نقدر نبعت Initial WhatsApp Template.
الرسالة تنحفظ ويظهر Status تبعها.
إذا الشخص ما رد، Follow-up #1 ينبعت تلقائياً بعد المدة المحددة.
إذا بعده ما رد، Follow-up #2 ينبعت تلقائياً.
إذا وصل Auto Reply معروف أو متكرر، ما يوقف الـFollow-up Sequence.
إذا وصل رد عادي من الشخص، باقي الـFollow-ups تتوقف.
الرد يظهر داخل الـInbox.
نقدر نشوف Conversation History.
نقدر نرد يدوياً من الـDashboard.
إذا Message فشلت، يظهر الـFailure بدل ما يختفي.
الرقم الحالي يكون مربوط بشكل صحيح مع WhatsApp Business Platform.
الـFull Workflow يشتغل بشكل صحيح على النسخة المنشورة.

## 8. السعر
السعر الكامل لهيدا الـMVP:
$90 USD
السعر بيشمل فقط الأشياء المذكورة بهيدا الـScope.
أي Feature أو Change كبيرة خارج الـScope بدها اتفاق وسعر منفصل.

9. الدفع
## طريقة الدفع:
## تم استلام الدفعة الأولى بقيمة $45 قبل بدء التطوير.
## المبلغ المتبقي هو $45، ويتم دفعه بعد الموافقة النهائية وقبل Final Handover.
## بالتالي:
## Total Project Price: $90
## Paid: $45
## Remaining: $45
## التطوير يبدأ بعد:
## الموافقة على الـMVP Scope.
## استلام الدفعة الأولى بقيمة $45.
## توفر الـMeta / WhatsApp Access المطلوب.

## 10. مدة التنفيذ
المدة المتوقعة:
تقريباً 10–14 يوم على الأكثر
المدة بتبدأ بعد ما يكون متوفر:
Project Approval
Meta / WhatsApp Access
المعلومات المطلوبة
أي إعدادات أساسية لازمة للبدء
إذا صار تأخير من Meta أو WhatsApp مثل:
Account Verification
Number Registration
Template Approval
Third-party Service Delay
هيدا التأخير ما بينحسب كتأخير بالتطوير لأنه خارج سيطرتي.


## 11. التعديلات أثناء التطوير
إذا Feature موجودة بالـScope وما عم تشتغل بالشكل المتفق عليه، هيدا Bug وبيتم إصلاحه ضمن المشروع.
أما إذا طلبنا:
Feature جديدة
Workflow جديد
Integration جديد
تغيير كبير بالسلوك المتفق عليه
هيدا بيعتبر Additional Work، ومنتفق عليه بشكل منفصل من ناحية السعر والوقت.

## 12. الدعم بعد التسليم
بعد Final Delivery بيكون في شهر دعم للمشاكل اللي ظهرت بالمنتج.
هالفترة مخصصة فقط لإصلاح المشاكل الموجودة بالFeatures المتفق عليها بالـMVP.
ما بتشمل:
Features جديدة
تعديلات جديدة
مشاكل Meta أو WhatsApp
تغييرات بخدمات Third-party
Ongoing Maintenance

## 13. التسليم النهائي
بعد دفع المبلغ الكامل، يتم تسليم الـDeliverables المتفق عليها والـAccess المطلوب للنسخة النهائية.
كل Business Data الخاصة فيك بتضل ملكك.

## 14. الموافقة
بالموافقة على هيدا الـScope، منكون متفقين على:
هيدا هو الـMVP المطلوب.
السعر الكامل هو $90.
طريقة الدفع هي $45 قبل بدء التطوير و$45 قبل Final Handover.
الـMVP بيدعم WhatsApp Number واحد Active بنفس الوقت.
الرقم ممكن يتغيّر لاحقاً، بشرط يكون الرقم الجديد مسجّل ومفعّل على Meta.
أي شيء خارج الـScope هو Additional Work.
مدة التنفيذ المتوقعة تقريباً 10–14 يوم بعد توفر كل الـAccess المطلوب.
WhatsApp / Meta / Hosting / Third-party Fees مش داخلة بالسعر.
مسؤولية الـLeads والـConsent والالتزام بسياسات WhatsApp بتكون على العميل.
أنا رح أتولى الـTechnical Setup لربط الرقم مع Meta، بينما ملكية الرقم والـMeta Business Account بتضل للعميل.
Auto Reply Detection موجودة كـBest-effort ومش مضمونة 100%.
تم استلام الدفعة الأولى بقيمة $45، والمبلغ المتبقي $45 يُدفع قبل Final Handover.