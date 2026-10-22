"""Rebuild the licensed subset and comparison candidates. Local preprocessing only.
Requires rapidfuzz and numpy; source downloads stay outside this repository.
"""
from pathlib import Path
import csv, json, re, sys, hashlib, unicodedata
ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT.parent / 'vocab-sources'
sys.path.insert(0, str(ROOT.parent / 'vocab-deps'))
from rapidfuzz import process
from rapidfuzz.distance import OSA, Levenshtein
import numpy as np

def clean(text):
    return unicodedata.normalize('NFC', re.sub('[\u200b-\u200d\ufeff]', '', text)).strip()

def read_groups():
    groups = []; current = None
    for line in (ROOT / 'content/word-groups.txt').read_text(encoding='utf-8').splitlines():
        line = clean(line)
        if not line or line.startswith('#'): continue
        if line.startswith('@ '):
            ident, kind, title, contrast = [x.strip() for x in line[2:].split('|')]
            current = dict(id=ident, kind=kind, title=title, contrast=contrast, entries=[], questions=[])
            groups.append(current)
        else:
            word, pos, meaning, focus, sentence, zh = [x.strip() for x in line.split('|')]
            assert re.fullmatch('[a-z]+', word), word
            entry = dict(word=word, pos=pos, meaning=meaning, focus=focus, sentence=sentence, zh=zh)
            # A heteronym's example may use a different reading from the dictionary's first entry.
            if current['id'] == 'objective-family' and word == 'object':
                entry['ipa'] = 'əbˈdʒekt'
                entry['ipaLabel'] = '本句动词读音（英）'
            if current['id'] == 'desert-group' and word == 'desert':
                entry['ipa'] = 'ˈdezət'
                entry['ipaLabel'] = '本句名词读音（英）'
            current['entries'].append(entry)
            pattern = r'\b' + re.escape(word) + r'\b'
            assert len(re.findall(pattern, sentence, re.I)) == 1, (word, sentence)
            current['questions'].append(dict(id=ident + ':' + word, group=ident, target=word,
                sentence=re.sub(pattern, '____', sentence, count=1, flags=re.I), intent=zh,
                options=[], answer=[word], explanation=contrast))
    for group in groups:
        options = [x['word'] for x in group['entries']]
        assert len(options) == len(set(options)) and len(options) >= 2
        for question in group['questions']: question['options'] = options
    # Accept real overlap instead of teaching that legitimate alternatives are errors.
    alternatives = {
        'assure-group:ensure': (['ensure', 'insure'], '本句表示确保结果，ensure 是常见写法；某些尤其美式用法中 insure that 也表示确保，因此也接受。表示投保时用 insure；向人保证常用 assure。'),
        'constitute-family:institution': (['institution', 'institute'], 'institution 是机构，institute 可指研究所、学院，也可能提供培训。在本句所给背景下两者都可成立。constitute 是动词构成。'),
        'constitute-family:institute': (['institute', 'institution'], 'institute 通常具体指研究所或学院；institution 是更宽泛的机构。仅凭这句话不能排除 institution，因此两者都接受。'),
        'preserve-group:preserve': (['preserve', 'conserve'], '保护历史建筑时 preserve 和 conserve 都有合理用法，因此两者都接受。reserve 则侧重预留或预订。'),
        'alternate-group:alternative': (['alternative', 'alternate'], 'alternative 是这里最常见的替代选择表达；部分尤其美式用法中 alternate 也可作替代方案这一名词，因此接受这两种写法。')
    }
    for group in groups:
        for question in group['questions']:
            if question['id'] in alternatives:
                question['answer'], question['explanation'] = alternatives[question['id']]
    return groups

groups = read_groups()
affixes = json.loads((ROOT / 'content/word-affixes.json').read_text(encoding='utf-8'))
forced = {x['word'] for g in groups for x in g['entries']} | {w for a in affixes for w in a['words']}
rows = {}
with (SOURCES / 'ECDICT-ecdict.csv').open(encoding='utf-8', newline='') as file:
    for row in csv.DictReader(file):
        word = row['word']
        if re.fullmatch('[a-z]+', word) and row['translation']:
            if word in forced or 'ky' in row['tag'].split(): rows[word] = row
assert not forced - rows.keys(), 'Missing words: ' + repr(forced - rows.keys())
def rank(word):
    r = rows[word]
    values = [int(r[k]) for k in ['frq', 'bnc'] if r[k].isdigit() and int(r[k]) > 0]
    return (min(values) if values else 999999, word)
selected = set(forced)
for word in sorted(rows, key=rank):
    if len(selected) >= 3600: break
    selected.add(word)
assert len(selected) == 3600
ordered = sorted(selected, key=rank)
phones = {}
with (SOURCES / 'cmudict-cmudict.dict').open(encoding='utf-8') as file:
    for line in file:
        if not line.strip() or line.startswith(';;;'): continue
        spelling, _, phonemes = line.strip().partition(' ')
        word = re.sub(r'\(\d+\)$', '', spelling)
        if word in selected:
            tokens = tuple(re.sub(r'\d', '', x) for x in phonemes.split('#')[0].split())
            if tokens and word not in phones: phones[word] = tokens

entries_by_word = {}
for g in groups:
    for entry in g['entries']: entries_by_word.setdefault(entry['word'], entry)
words = []
first_group_ipa = {'generalization': 'ˌdʒenərəlaɪˈzeɪʃən', 'generalize': 'ˈdʒenərəlaɪz', 'generally': 'ˈdʒenərəli'}
for i, word in enumerate(ordered):
    r = rows[word]; translation = clean(r['translation'].replace('\\n', '\n'))
    word_groups = [g['id'] for g in groups if any(e['word'] == word for e in g['entries'])]
    primary = entries_by_word.get(word)
    if primary:
        senses = list(dict.fromkeys(e['pos']+' '+e['meaning'] for g in groups for e in g['entries'] if e['word']==word))
        translation = '\n'.join(senses)
    words.append(dict(word=word, ipa=first_group_ipa.get(word, clean(r['phonetic']).replace("'", 'ˈ').replace(',', 'ˌ').replace(':', 'ː').replace('ә','ə')),
        meaning=translation, brief=primary['meaning'] if primary else translation.split('\n')[0],
        meaningSource='curated' if primary else 'ECDICT',
        pos=primary['pos'] if primary else '', exam='ky' in r['tag'].split(), rank=i+1,
        groups=word_groups, shape=[], sound=[], hasSound=word in phones))

# Candidate matches are search aids, not assertions that two words are interchangeable.
shape = process.cdist(ordered, ordered, scorer=OSA.distance, score_cutoff=3, dtype=np.uint8)
sound_words = [w for w in ordered if w in phones]
sound = process.cdist([phones[w] for w in sound_words], [phones[w] for w in sound_words],
                      scorer=Levenshtein.distance, score_cutoff=2, dtype=np.uint8)
sound_index = {w: i for i, w in enumerate(sound_words)}
for i, word in enumerate(ordered):
    matches = []
    for j in np.flatnonzero(shape[i] <= 3):
        other = ordered[j]; dist = int(shape[i,j]); size = max(len(word), len(other))
        if i == j or min(len(word),len(other)) < 3: continue
        if dist / size > .34 or (size < 7 and dist > 1): continue
        matches.append((dist / size, dist, int(j), other))
    words[i]['shape'] = [m[3] for m in sorted(matches)[:8]]
    if word in sound_index:
        p = sound_index[word]; matches = []
        for q in np.flatnonzero(sound[p] <= 2):
            other = sound_words[q]; dist = int(sound[p,q]); size = max(len(phones[word]),len(phones[other]))
            if word == other or (dist and (size < 4 or dist / size > .34)): continue
            matches.append((dist / size, dist, rank(other), other))
        words[i]['sound'] = [m[3] for m in sorted(matches)[:8]]

meta = dict(version=1, title='词辨 · 考研易混词', wordCount=len(words), groupCount=len(groups),
    questionCount=sum(len(g['questions']) for g in groups), examTagged=sum(w['exam'] for w in words),
    soundCoverage=len(phones), selection='按开源词典 ky 标记与通用词频选取，优先纳入重点辨析和词族补充；不是官方3600词表或真题频率榜。',
    sources=[json.loads((SOURCES/(name+'-revision.json')).read_text()) for name in ['ECDICT','cmudict']])
result = dict(meta=meta, words=words, groups=groups, affixes=affixes)
dest = ROOT / 'dist/words'
(dest / 'data.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
for name in ['ECDICT','cmudict']:
    (dest / 'licenses' / (name+'.txt')).write_bytes((SOURCES/(name+'-LICENSE')).read_bytes())
(ROOT / 'content/words-source-summary.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(meta,ensure_ascii=True,indent=2))
