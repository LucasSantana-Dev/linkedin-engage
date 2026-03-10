var COMMENT_PATTERN_MEMORY_KEY = 'commentPatternMemoryV1';
var COMMENT_PATTERN_MEMORY_VERSION = 1;
var PATTERN_MEMORY_DECAY = 0.9;
var PATTERN_MEMORY_ALPHA = 0.25;

function getPatternBucketKey(lang, category) {
    var safeLang = (lang || 'en').toLowerCase();
    var safeCategory = (category || 'generic').toLowerCase();
    return safeLang + '|' + safeCategory;
}

function cloneObject(obj) {
    var out = {};
    var source = obj && typeof obj === 'object' ? obj : {};
    for (var [key, value] of Object.entries(source)) {
        out[key] = value;
    }
    return out;
}

function normalizeWeightedMap(input) {
    var out = {};
    if (!input) return out;
    if (Array.isArray(input)) {
        for (var item of input) {
            if (typeof item === 'string') {
                out[item] = (out[item] || 0) + 1;
                continue;
            }
            var text = item?.text || item?.key || '';
            var weight = Number(item?.weight || item?.value || 0);
            if (!text) continue;
            out[text] = (out[text] || 0) +
                (Number.isFinite(weight) && weight > 0 ? weight : 1);
        }
        return out;
    }
    if (typeof input === 'object') {
        for (var [key, value] of Object.entries(input)) {
            var weight = Number(value || 0);
            if (!Number.isFinite(weight) || weight <= 0) continue;
            out[key] = (out[key] || 0) + weight;
        }
    }
    return out;
}

function sortMapEntries(map, limit) {
    return Object.entries(map || {})
        .filter(function(item) {
            return Number.isFinite(item[1]) && item[1] > 0;
        })
        .sort(function(a, b) {
            if (b[1] !== a[1]) return b[1] - a[1];
            return a[0].localeCompare(b[0]);
        })
        .slice(0, limit || 20);
}

function mapFromEntries(entries) {
    var out = {};
    for (var [key, value] of entries) {
        out[key] = Math.round(value * 1000) / 1000;
    }
    return out;
}

function mergeWeightedMaps(existing, incoming, maxSize) {
    var out = {};
    var current = normalizeWeightedMap(existing);
    var next = normalizeWeightedMap(incoming);

    for (var [key, value] of Object.entries(current)) {
        var decayed = value * PATTERN_MEMORY_DECAY;
        if (decayed > 0.001) out[key] = decayed;
    }
    for (var [key, value] of Object.entries(next)) {
        var incomingWeight = value * PATTERN_MEMORY_ALPHA;
        out[key] = (out[key] || 0) + incomingWeight;
    }

    return mapFromEntries(sortMapEntries(out, maxSize));
}

function ema(previous, incoming) {
    var prev = Number(previous || 0);
    var next = Number(incoming || 0);
    if (!Number.isFinite(prev)) prev = 0;
    if (!Number.isFinite(next)) next = 0;
    if (prev === 0) return next;
    return Math.round((prev * (1 - PATTERN_MEMORY_ALPHA) +
        next * PATTERN_MEMORY_ALPHA) * 1000) / 1000;
}

function loadPatternBucket(memory, lang, category) {
    var key = getPatternBucketKey(lang, category);
    var buckets = memory?.buckets || {};
    var bucket = buckets[key] || null;
    if (!bucket) return null;
    return {
        key,
        ...bucket,
        openers: cloneObject(bucket.openers),
        ngrams: cloneObject(bucket.ngrams),
        intentMix: cloneObject(bucket.intentMix),
        styleMix: cloneObject(bucket.styleMix),
        lengthMix: cloneObject(bucket.lengthMix),
        rhythmMix: cloneObject(bucket.rhythmMix),
        toneMix: cloneObject(bucket.toneMix)
    };
}

function buildStyleMix(patternProfile) {
    var mix = {};
    var style = patternProfile?.styleFamily ||
        patternProfile?.recommended?.styleFamily;
    if (style) mix[style] = 1;
    return mix;
}

function buildLengthMix(patternProfile) {
    var mix = {};
    var lengthBand = patternProfile?.lengthBand ||
        patternProfile?.recommended?.lengthBand;
    if (lengthBand) mix[lengthBand] = 1;
    return mix;
}

function buildRhythmMix(patternProfile) {
    var mix = {};
    var rhythm = patternProfile?.punctuationRhythm ||
        patternProfile?.recommended?.punctuationRhythm;
    if (rhythm) mix[rhythm] = 1;
    return mix;
}

function buildToneMix(patternProfile) {
    var mix = {};
    var tone = patternProfile?.toneIntensity ||
        patternProfile?.recommended?.toneIntensity;
    if (tone) mix[tone] = 1;
    return mix;
}

function mergePatternBucket(memory, lang, category, patternProfile, nowIso) {
    var state = memory && typeof memory === 'object'
        ? {
            version: COMMENT_PATTERN_MEMORY_VERSION,
            updatedAt: memory.updatedAt || null,
            buckets: cloneObject(memory.buckets)
        }
        : {
            version: COMMENT_PATTERN_MEMORY_VERSION,
            updatedAt: null,
            buckets: {}
        };

    var key = getPatternBucketKey(lang, category);
    var current = loadPatternBucket(state, lang, category) || {};
    var profile = patternProfile || {};
    var now = nowIso || new Date().toISOString();

    state.buckets[key] = {
        key,
        updatedAt: now,
        samples: Number(current.samples || 0) +
            Number(profile.analyzedCount || 0),
        confidenceEma: ema(current.confidenceEma,
            Number(profile.patternConfidence || 0)),
        riskEma: ema(current.riskEma,
            Number(profile?.riskMarkers?.riskRate || 0) * 100),
        openers: mergeWeightedMaps(
            current.openers,
            profile.openers,
            12
        ),
        ngrams: mergeWeightedMaps(
            current.ngrams,
            profile.topNgrams,
            24
        ),
        intentMix: mergeWeightedMaps(
            current.intentMix,
            profile.intentMix,
            10
        ),
        styleMix: mergeWeightedMaps(
            current.styleMix,
            buildStyleMix(profile),
            6
        ),
        lengthMix: mergeWeightedMaps(
            current.lengthMix,
            buildLengthMix(profile),
            4
        ),
        rhythmMix: mergeWeightedMaps(
            current.rhythmMix,
            buildRhythmMix(profile),
            6
        ),
        toneMix: mergeWeightedMaps(
            current.toneMix,
            buildToneMix(profile),
            6
        )
    };
    state.updatedAt = now;
    return state;
}

function topKeys(map, limit) {
    return sortMapEntries(map, limit).map(
        function(item) { return item[0]; }
    );
}

function pickTop(map, fallback) {
    var top = topKeys(map, 1)[0];
    return top || fallback || null;
}

function mergeUnique(a, b, max) {
    var out = [];
    var seen = new Set();
    for (var item of (a || []).concat(b || [])) {
        if (!item) continue;
        if (seen.has(item)) continue;
        seen.add(item);
        out.push(item);
        if (out.length >= (max || 6)) break;
    }
    return out;
}

function buildPatternGuidance(patternProfile, bucket) {
    var profile = patternProfile || {};
    var learned = bucket || {};
    var recommended = profile.recommended || {};

    var preferredOpeners = mergeUnique(
        (profile.openers || []).map(function(item) {
            return typeof item === 'string'
                ? item : item?.text || '';
        }),
        topKeys(learned.openers, 4),
        6
    );
    var topNgrams = mergeUnique(
        (profile.topNgrams || []).map(function(item) {
            return typeof item === 'string'
                ? item : item?.text || '';
        }),
        topKeys(learned.ngrams, 8),
        12
    );

    var lengthBand = recommended.lengthBand ||
        profile.lengthBand || pickTop(learned.lengthMix, 'short');
    var toneIntensity = recommended.toneIntensity ||
        profile.toneIntensity || pickTop(learned.toneMix, 'low');
    var punctuationRhythm = recommended.punctuationRhythm ||
        profile.punctuationRhythm ||
        pickTop(learned.rhythmMix, 'balanced');
    var styleFamily = recommended.styleFamily ||
        profile.styleFamily || pickTop(learned.styleMix, 'neutral-ack');

    return {
        lengthBand,
        toneIntensity,
        punctuationRhythm,
        styleFamily,
        allowQuestion: false,
        allowEmoji: recommended.allowEmoji === true,
        maxEmoji: Number(recommended.maxEmoji || 0),
        preferredOpeners,
        topNgrams,
        patternConfidence: Number(profile.patternConfidence || 0),
        bucketConfidence: Number(learned.confidenceEma || 0),
        lowSignal: Number(profile.patternConfidence || 0) > 0 &&
            Number(profile.patternConfidence || 0) < 60
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        COMMENT_PATTERN_MEMORY_KEY,
        COMMENT_PATTERN_MEMORY_VERSION,
        getPatternBucketKey,
        loadPatternBucket,
        mergePatternBucket,
        buildPatternGuidance,
        mergeWeightedMaps,
        normalizeWeightedMap,
        topKeys
    };
}
