"""Attach textbook prose to the existing outline, preserving IDs and printed pages.

The source is the user's PDF. Reading text is organised scan text, not a claim
that every line is a separately verified verbatim definition.
"""
import json
import re
import sys
from pathlib import Path
from difflib import SequenceMatcher
from concurrent.futures import ProcessPoolExecutor

ROOT = Path(__file__).resolve().parent.parent
DOC = None
FIXES = {
    '能最': '能量', '能址': '能量', '能拯': '能量', '能趾': '能量', '能痲': '能量',
    '数批': '数量', '数最': '数量', '数址': '数量', '质批': '质量', '质址': '质量',
    '摄氧撮': '摄氧量', '摄氧最': '摄氧量', '通气最': '通气量', '运动鼠': '运动量',
    '运动最': '运动量', '力最': '力量', '力址': '力量', '力扯': '力量', '力痲': '力量',
    '基千': '基于', '对千': '对于', '用千': '用于', '在千': '在于', '由千': '由于',
    '属千': '属于', '过千': '过于', '高千': '高于', '低千': '低于', '施加千': '施加于',
    '巳经': '已经', '自已': '自己', '人休': '人体', '气休': '气体', '内分地': '内分泌',
    '阙强度': '阈强度', '阔强度': '阈强度', '闾强度': '阈强度', '阙值': '阈值',
    '阔值': '阈值', '闾值': '阈值', '阙刺激': '阈刺激', '阙下': '阈下', '闾下': '阈下',
    '阙上': '阈上', '闾上': '阈上', '无氧阙': '无氧阈', '乳酸阙': '乳酸阈',
    '力蜇': '力量', '胆碱酣酶': '胆碱酯酶', '觉泡': '囊泡', '血红蛋自': '血红蛋白',
    '收缩压カ': '收缩压力', '待续': '持续', '技木': '技术', '支待': '支持', '维待': '维持',
    '大屈': '大量', '能扯': '能量', '能撮': '能量', '腺昔': '腺苷', '腺什': '腺苷',
    '腺仵': '腺苷', '腺嗦呤': '腺嘌呤', '磷酸酷键': '磷酸酯键', '道要': '重要',
    '高度焦中': '高度集中', '拈抗': '拮抗', '周闱': '周围', '跟脏': '跟腱',
    '心肌收缩力显': '心肌收缩力量', '心肌收缩力被': '心肌收缩力量', '允盈': '充盈',
    '腿器官': '腱器官', '骸关节': '髋关节',
    '闾刺激': '阈刺激', '阙电位': '阈电位', '含扯': '含量', '含址': '含量',
    '含痲': '含量', '能矗': '能量', '储扯': '储量', '储撮': '储量', '贮撮': '贮量',
    '贮备址': '贮备量', '数社': '数量', '心输出扯': '心输出量', '负荷鼠': '负荷量',
    '消秏': '消耗', '由丁': '由于', '源千': '源于', '分布千': '分布于',
}


def clean(text):
    text = re.sub(r'(?<=[\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])', '', text.strip())
    text = re.sub(r'\s+([，。；：、）])', r'\1', text)
    text = re.sub(r'([（])\s+', r'\1', text)
    for a, b in FIXES.items():
        text = text.replace(a, b)
    return text


def norm(text):
    text = clean(text)
    return re.sub(r'[^\u4e00-\u9fffA-Za-z0-9]', '', text).lower()


def topic(text):
    return re.sub(r'^(?:第[一二三四五六七八九十0-9]+[章节]|[一二三四五六七八九十0-9]+)', '', norm(text))


def init(source):
    global DOC
    import logging
    from pypdf import PdfReader
    logging.getLogger('pypdf').setLevel(logging.ERROR)
    DOC = PdfReader(source)


def read_page(page):
    items = []
    def visitor(text, cm, tm, font, size):
        x, y = tm[4] * cm[0] + cm[4], tm[5] * cm[3] + cm[5]
        if text.strip() and 48 <= y <= 766 and 38 <= x <= 557:
            for line in text.splitlines():
                if line.strip():
                    items.append((round(y, 1), round(x, 1), line.strip()))
    DOC.pages[page + 13].extract_text(visitor_text=visitor)
    items.sort(key=lambda p: (-p[0], p[1]))
    merged = []
    for y, x, text in items:
        if merged and abs(merged[-1]['y'] - y) < 2.5:
            merged[-1]['text'] += ' ' + text
        else:
            merged.append({'page': page, 'x': x, 'y': y, 'text': text})
    long = [p['x'] for p in merged if len(re.findall(r'[\u4e00-\u9fff]', p['text'])) >= 22]
    left = sorted(long)[min(len(long)-1, max(0, len(long)//5))] if long else 60
    for line in merged:
        line['indent'] = line['x'] - left > 12
        line['text'] = clean(line['text'])
    return merged


def paragraphs(lines, include_title=''):
    result, current, used, previous_page, graphic = [], '', [], None, False
    if include_title:
        current = clean(include_title)
    def flush():
        nonlocal current
        text = current.strip()
        han = len(re.findall(r'[\u4e00-\u9fff]', text))
        grammatical = bool(re.search(r'是|为|使|可|能|具有|作用|包括|取决于|称为|增加|减少|变化|调节', text))
        if han >= 8 and (re.search(r'[。！？；：]$', text) or han >= 35 and grammatical):
            # Mathematical letter spacing is OCR typography, not word boundaries.
            text = re.sub(r'(?<=\d)\s+(?=\d)', '', text)
            text = re.sub(r'\(\s*([a-zA-Z][a-zA-Z\s-]{5,})\s*\)', '', text)
            def english(match):
                inner = match[1]
                if re.search(r'[\u4e00-\u9fff0-9]', inner) or re.fullmatch(r'[A-Z\s-]{1,8}', inner):
                    return match[0]
                return '' if len(re.findall('[a-zA-Z]', inner)) >= 5 else match[0]
            text = re.sub(r'[（(]([^()（）]*)[)）]', english, text)
            text = text.replace('＂', '”')
            if not re.search(r'[。！？；：]$', text):
                text += '。'
            result.append(text)
        current = ''
    for line in lines:
        text = line['text']
        if re.search(r'推荐读物|参考文献|复习思考|思考[题舰]', text):
            break
        if re.match(r'^第[一二三四五六七八九十0-9]+[章节]', text):
            break
        if re.match(r'^(?:图|表)\s*[1-9lI］]+\s*[-—－.]', text):
            graphic = True
            continue
        han = len(re.findall(r'[\u4e00-\u9fff]', text))
        if han < 2:
            continue
        if han < 12 and not re.search('[。！？；]$', text):
            continue
        if han / max(1, len(text)) < .45 and han < 20:
            continue
        if graphic:
            if han >= 22 and re.search('是|为|使|可|能|具有|包括|取决于|增加|减少|变化|调节', text):
                graphic = False
            else:
                continue
        if not re.search('[，。；：]', text) and (han < 16 or len(re.findall(r'\d', text)) >= 4):
            continue
        if re.search(r'[↑↓／%％]', text) and han < 15:
            continue
        if re.search(r'[▇▆▅▄▃▂▁■□匮黜屠矗]', text) and len(text) < 15:
            continue
        numbered = bool(re.match(r'^(?:[一二三四五六七八九十]+[、．]|[（(][一二三四五六七八九十0-9]+[）)]|\d+[.．])', text))
        continuing = previous_page != line['page'] and current and not re.search(r'[。！？：；]$', current)
        if current and (numbered or line['indent'] and re.search(r'[。！？；：]$', current)) and not continuing:
            flush()
        current += text
        used.append(line['page'])
        previous_page = line['page']
    flush()
    return result, sorted(set(used))


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    cache = ROOT / 'build/physiology-source-lines.json'
    if cache.exists():
        pages = json.loads(cache.read_text(encoding='utf-8'))
    else:
        source = str(Path(sys.argv[1]).resolve(strict=True))
        with ProcessPoolExecutor(max_workers=3, initializer=init, initargs=(source,)) as pool:
            pages = list(pool.map(read_page, range(1, 361), chunksize=8))
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_text(json.dumps(pages, ensure_ascii=False), encoding='utf-8')
    lines = [line for page in pages for line in page]
    for line in lines:
        line['text'] = clean(line['text'])
    positions = {}
    for i, line in enumerate(lines):
        positions.setdefault(line['page'], []).append(i)
    target = ROOT / 'content/knowledge-physiology-full.json'
    data = json.loads(target.read_text(encoding='utf-8'))
    nodes = [n for n in data['nodes'] if n['original'] and n['kind'] not in ('chapter',)]
    found, inline, missing = {}, {}, []
    for node in nodes:
        page = node['printedPages'][0]
        title = clean(node['title'])
        wanted = norm(title)
        candidates = positions.get(page, [])
        exact = [i for i in candidates if norm(lines[i]['text']) == wanted]
        if not exact:
            exact = [i for i in candidates if topic(lines[i]['text']) == topic(title)]
        if not exact:
            exact = [i for i in candidates if norm(lines[i]['text']).startswith(wanted) and len(wanted) >= 4]
            if exact:
                inline[node['id']] = True
        if not exact:
            exact = [i for i in candidates if norm(re.split('[：:]', lines[i]['text'])[0]) == wanted]
            if exact:
                inline[node['id']] = True
        if not exact and node['kind'] != 'section':
            nearby = positions.get(page-1, []) + positions.get(page+1, [])
            exact = [i for i in nearby if norm(lines[i]['text']) == wanted or norm(re.split('[：:]', lines[i]['text'])[0]) == wanted]
            if exact:
                inline[node['id']] = bool(re.search('[：:]', lines[exact[0]]['text']))
        if exact:
            found[node['id']] = exact[0]
            continue
        scored = [(SequenceMatcher(None, wanted, norm(lines[i]['text'])).ratio(), i) for i in candidates]
        scored.sort(reverse=True)
        score, best = scored[0] if scored else (0, 0)
        if score >= .72:
            found[node['id']] = best
        elif node['kind'] == 'section':
            # Known catalog boundaries also stop the preceding section's prose.
            found[node['id']] = candidates[0]
        else:
            missing.append({'id': node['id'], 'title': title, 'page': page, 'candidate': lines[best]['text'], 'score': score})
    cuts = sorted(set(found.values()))
    for node in nodes:
        if node['kind'] == 'section':
            continue
        node['body'] = []
        start = found.get(node['id'])
        if start is None:
            continue
        node['title'] = clean(node['title'])
        node['printedPages'] = [lines[start]['page']]
        end = next((i for i in cuts if i > start), len(lines))
        fragment = lines[start + 1:end]
        is_sentence = node['kind'] == 'point' and (len(node['title']) > 35 or bool(re.search('[，；]', node['title'])))
        lead = lines[start]['text'] if is_sentence else ''
        if node['id'] in inline and not is_sentence:
            colon = re.search('[：:]', lines[start]['text'])
            if colon:
                lead = lines[start]['text'][colon.end():]
        body, used = paragraphs(fragment, lead)
        if body:
            node['body'] = body
            node['sourceTextPages'] = sorted(set([node['printedPages'][0]] + used))
            node['sourceStatus'] = '依据教材扫描文字分项整理，非逐字核校定义'
        if is_sentence:
            node['readingRole'] = 'paragraph'
    children = {n['parentId'] for n in data['nodes']}
    leaves = [n for n in nodes if n['id'] not in children]
    report = {'matched': len(found), 'unmatched': missing, 'emptyLeaves': [{'id': n['id'], 'title': n['title'], 'page': n['printedPages'][0]} for n in leaves if not n['body']], 'textCharacters': sum(len(''.join(n['body'])) for n in nodes)}
    (ROOT / 'build/physiology-text-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    target.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: len(v) if isinstance(v, list) else v for k,v in report.items()}, ensure_ascii=False))
