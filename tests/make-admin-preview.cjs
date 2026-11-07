// Writes a private preview of the Admin page, on made-up accounts, into the folder it is given:
// the real index.html, script.js and styles.css, with the Supabase client swapped for the stand-in.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const out = process.argv[2];
if (!out) throw new Error('Usage: node tests/make-admin-preview.cjs <folder>');
fs.mkdirSync(out, { recursive: true });
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const swap = (from, to) => {
  if (!html.includes(from)) throw new Error(`index.html no longer has: ${from}`);
  html = html.replace(from, to);
};
html = html.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2"><\/script>\s*/, '');
html = html.replace(/<script src="config\.js\?v=\d+"><\/script>/, '<script src="admin-groups-mock.js"></script>');
swap('<title>هيا نتعلم</title>', '<title>إدارة المجموعات</title>');
swap('</head>', `<style>
      .preview-banner { background: #151c2e; color: #fff; font-family: "Cairo", "Geeza Pro", system-ui, sans-serif; font-size: 0.86rem; font-weight: 800; line-height: 1.6; padding: 8px 16px; text-align: center; }
    </style>
  </head>`);
swap('<body>', '<body>\n    <p class="preview-banner">معاينة ببيانات تجريبية: الأسماء وهمية، ولا شيء هنا يغيّر الموقع الحقيقي. تحديث الصفحة يرجع البيانات كما كانت.</p>');
fs.writeFileSync(path.join(out, 'index.html'), html);
for (const file of ['script.js', 'styles.css']) fs.copyFileSync(path.join(root, file), path.join(out, file));
fs.copyFileSync(path.join(__dirname, 'admin-groups-mock.js'), path.join(out, 'admin-groups-mock.js'));
console.log(`Preview written to ${out}`);
