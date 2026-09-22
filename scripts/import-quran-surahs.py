"""Refresh only the seven approved Surahs from their original public sources."""
import hashlib, json, subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_URL = 'https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=txt-2&agree=true'
CHAPTERS = [(90, 'البلد', 20), (89, 'الفجر', 30), (88, 'الغاشية', 26), (87, 'الأعلى', 19), (86, 'الطارق', 17), (85, 'البروج', 22), (84, 'الانشقاق', 25)]

def download(url):
    return subprocess.check_output(['curl', '-fLsS', '--max-time', '40', '-A', 'Mozilla/5.0', url])

def save(path, data):
    (ROOT / path).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

def main():
    raw = download(SOURCE_URL)
    text = raw.decode('utf-8-sig')
    assert 'Uthmani, Version 1.1' in text
    lines = text.splitlines()
    records = {}
    for line in lines:
        if line and line[0].isdigit():
            chapter, verse, value = line.split('|', 2)
            records.setdefault(int(chapter), []).append((int(verse), value, line))
    assert sum(map(len, records.values())) == 6236
    notice = '\n'.join(line for line in lines if line.startswith('#')) + '\n'
    basmala = records[1][0][1]
    reciters = json.loads(download('https://api.quran.com/api/v4/resources/recitations'))['recitations']
    reciter = next(r for r in reciters if r['id'] == 7)
    assert 'Afasy' in reciter['reciter_name'] and 'Mishari' in reciter['reciter_name']
    chapters = {c['id']: c for c in json.loads(download('https://api.quran.com/api/v4/chapters'))['chapters']}
    first_audio = json.loads(download('https://api.quran.com/api/v4/recitations/7/by_chapter/1?per_page=50'))['audio_files'][0]
    assert first_audio['verse_key'] == '1:1' and first_audio['url'] == 'Alafasy/mp3/001001.mp3'
    now = datetime.now(timezone.utc)
    catalog, source_records, evidence, pending = [], [], [], []
    for chapter_id, name, count in CHAPTERS:
        rows = records[chapter_id]
        assert chapters[chapter_id]['verses_count'] == count == len(rows)
        # The provider spells the UI title for 84 with an initial hamza.
        accepted_names = [name, 'الإنشقاق'] if chapter_id == 84 else [name]
        assert chapters[chapter_id]['name_arabic'] in accepted_names
        assert [v[0] for v in rows] == list(range(1, count + 1))
        assert rows[0][1].startswith(basmala + ' ')
        verses = [{'id': number, 'text': value} for number, value, _ in rows]
        verses[0] = {'id': 1, 'text': rows[0][1][len(basmala) + 1:], 'sourceRecord': rows[0][1]}
        chapter = {'chapter': chapter_id, 'name': name, 'source': 'https://tanzil.net', 'version': '1.1', 'script': 'uthmani', 'verses': verses, 'basmala': basmala, 'notice': notice}
        # Preserve the already-approved Al-Balad file byte for byte.
        if chapter_id == 90:
            existing = json.loads((ROOT / 'quran/data/90.json').read_text())
            assert existing['verses'] == verses and existing['basmala'] == basmala
        else:
            pending.append((f'quran/data/{chapter_id}.json', chapter))
        endpoint = f'https://api.quran.com/api/v4/recitations/7/by_chapter/{chapter_id}?per_page=50'
        audio = json.loads(download(endpoint))
        assert audio['pagination']['next_page'] is None and len(audio['audio_files']) == count
        files = []
        for number, item in enumerate(audio['audio_files'], 1):
            expected = f'Alafasy/mp3/{chapter_id:03}{number:03}.mp3'
            assert item['verse_key'] == f'{chapter_id}:{number}' and item['url'] == expected
            files.append({'id': number, 'url': 'https://verses.quran.com/' + item['url']})
        audio_path = 'data/audio.json' if chapter_id == 90 else f'data/audio-{chapter_id}.json'
        pending.append(('quran/' + audio_path, {'reader': 'مشاري راشد العفاسي', 'readerId': 7, 'provider': 'Quran Foundation', 'retrieved': now.isoformat(), 'expires': (now + timedelta(days=7)).isoformat(), 'verses': files, 'basmala': 'https://verses.quran.com/' + first_audio['url']}))
        catalog.append({'id': chapter_id, 'name': name, 'text': f'data/{chapter_id}.json', 'audio': audio_path})
        chapter_lines = [row[2] for row in rows]
        source_records.extend(chapter_lines)
        evidence.append({'chapter': chapter_id, 'name': name, 'verseCount': count, 'text_sha256': hashlib.sha256(('\n'.join(chapter_lines) + '\n').encode()).hexdigest(), 'audioEndpoint': endpoint, 'audioFilesVerified': count})
        print(f'Verified Surah {chapter_id}: {count} original verses and Alafasy audio URLs.', flush=True)
    # Do not write app data until every source has passed validation.
    for path, data in pending: save(path, data)
    save('quran/data/surahs.json', catalog)
    (ROOT / 'docs/quran-seven-surahs-source.txt').write_text('\n'.join(source_records) + '\n' + notice)
    save('docs/quran-seven-surahs-provenance.json', {'retrieved': now.isoformat(), 'textSource': SOURCE_URL, 'source_sha256': hashlib.sha256(raw).hexdigest(), 'version': '1.1', 'reciter': reciter, 'termsChecked': '2026-09-22', 'chapters': evidence})

if __name__ == '__main__': main()
