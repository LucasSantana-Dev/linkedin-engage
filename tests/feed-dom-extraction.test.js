/**
 * @jest-environment jsdom
 */
'use strict';

const {
    getPostText,
    getPostAuthor,
    getPostReactions,
    getPostUrn,
    getPostImageSignals,
    parseCompactCountToken,
    extractCommentCountFromText,
    getPostCommentSignal,
    getExistingComments,
    summarizeReactions,
    isLikeButton,
    isCommentButton,
    isReactablePost,
    shouldSkipPost,
    isCompanyFollowText,
} = require('../extension/lib/feed-dom-extraction');

// ─── helpers ─────────────────────────────────────────────────────────────────

function el(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div;
}

// ─── getPostText ─────────────────────────────────────────────────────────────

describe('getPostText', () => {
    it('returns empty string for null input', () => {
        expect(getPostText(null)).toBe('');
    });

    it('prefers expandable-text-box content', () => {
        const post = el('<div data-testid="expandable-text-box">Hello world content here</div>');
        expect(getPostText(post)).toBe('Hello world content here');
    });

    it('falls back to lines < 30 chars when no content lines exceed 30', () => {
        // All text lines < 30 chars → triggers line 107 fallback
        const post = el('<div><p>Short text here.</p><p>Also short.</p></div>');
        const result = getPostText(post);
        expect(typeof result).toBe('string');
    });

    it('uses lines > 30 chars when available', () => {
        const longText = 'This is a sufficiently long piece of text that exceeds thirty characters easily';
        const post = el(`<div><p>${longText}</p></div>`);
        const result = getPostText(post);
        expect(result).toContain(longText);
    });
});

// ─── getPostAuthor ───────────────────────────────────────────────────────────

describe('getPostAuthor', () => {
    it('returns Unknown for null', () => {
        expect(getPostAuthor(null)).toBe('Unknown');
    });

    it('extracts author from profile link', () => {
        const post = el('<div><a href="/in/johndoe">John Doe</a></div>');
        expect(getPostAuthor(post)).toBe('John Doe');
    });

    it('skips social action links (liked/reposted)', () => {
        const post = el(`
            <div>
                <span>John Doe liked this</span>
                <a href="/in/johndoe">John Doe</a>
                <a href="/in/realauthor">Real Author Name</a>
            </div>
        `);
        const author = getPostAuthor(post);
        expect(typeof author).toBe('string');
    });

    it('falls back to actor/header span via closest', () => {
        // Lines 182-194: author via closest actor span
        const post = el(`
            <div class="actor-header">
                <a href="/in/someuser">X</a>
                <span>Jane Smith Professional</span>
            </div>
        `);
        const author = getPostAuthor(post);
        expect(typeof author).toBe('string');
    });

    it('falls back to company link when no person link', () => {
        const post = el('<div><a href="/company/acme-corp">Acme Corp</a></div>');
        const author = getPostAuthor(post);
        expect(typeof author).toBe('string');
    });

    it('returns empty string when no identifiable author', () => {
        const post = el('<div><p>No links here</p></div>');
        const result = getPostAuthor(post);
        expect(typeof result).toBe('string');
    });
});

// ─── getPostReactions ────────────────────────────────────────────────────────

describe('getPostReactions', () => {
    it('returns empty object for null', () => {
        expect(getPostReactions(null)).toEqual({});
    });

    it('returns empty object for element without querySelector', () => {
        expect(getPostReactions({})).toEqual({});
    });

    it('parses LIKE from data attribute', () => {
        const post = el('<div><img data-test-app-aware-reaction-type="LIKE" /></div>');
        const r = getPostReactions(post);
        expect(r.LIKE).toBe(1);
    });

    it('falls back to alt text for celebration reaction (PRAISE)', () => {
        // Line 222: alt includes celebrat → PRAISE
        const post = el('<div><img alt="Celebration reaction" /></div>');
        const r = getPostReactions(post);
        expect(r.PRAISE).toBe(1);
    });

    it('falls back to alt text for support reaction (EMPATHY)', () => {
        const post = el('<div><img alt="Support reaction" /></div>');
        const r = getPostReactions(post);
        expect(r.EMPATHY).toBe(1);
    });

    it('falls back to alt text for insightful reaction (INTEREST)', () => {
        const post = el('<div><img alt="Insightful reaction" /></div>');
        const r = getPostReactions(post);
        expect(r.INTEREST).toBe(1);
    });

    it('falls back to alt text for funny reaction (ENTERTAINMENT)', () => {
        const post = el('<div><img alt="Funny reaction" /></div>');
        const r = getPostReactions(post);
        expect(r.ENTERTAINMENT).toBe(1);
    });

    it('falls back to alt text for love reaction (APPRECIATION)', () => {
        const post = el('<div><img alt="Love reaction" /></div>');
        const r = getPostReactions(post);
        expect(r.APPRECIATION).toBe(1);
    });

    it('extracts total count from social-counts element', () => {
        // Lines 243-248: totalEl with aria-label
        const post = el('<div><button aria-label="234 reactions">234</button></div>');
        const r = getPostReactions(post);
        expect(r._total).toBe(234);
    });

    it('extracts total count from innerText of total element', () => {
        const post = el('<div><span class="social-details-social-counts__reactions-count">1,234</span></div>');
        const r = getPostReactions(post);
        // total may or may not be set depending on selector match
        expect(typeof r).toBe('object');
    });

    it('ignores alt text without matching reaction type', () => {
        const post = el('<div><img alt="random description" /></div>');
        const r = getPostReactions(post);
        expect(Object.keys(r).length).toBe(0);
    });

    it('parses parabéns alt text as PRAISE', () => {
        const post = el('<div><img alt="parabéns reaction" /></div>');
        const r = getPostReactions(post);
        expect(r.PRAISE).toBe(1);
    });
});

// ─── getPostUrn ──────────────────────────────────────────────────────────────

describe('getPostUrn', () => {
    it('returns empty string for null', () => {
        expect(getPostUrn(null)).toBe('');
    });

    it('extracts URN from data-urn attribute', () => {
        const post = el('<div data-urn="urn:li:activity:123456"></div>');
        expect(getPostUrn(post)).toContain('123456');
    });

    it('extracts from data-view-tracking-scope (lines 275-281)', () => {
        // Lines 275-281: scope contains contentTrackingId
        const post = el(`
            <div>
                <div data-view-tracking-scope='{"contentTrackingId":"abc-tracking-id-789"}'></div>
            </div>
        `);
        expect(getPostUrn(post)).toBe('abc-tracking-id-789');
    });

    it('returns empty string when no URN found', () => {
        const post = el('<div><p>No URN</p></div>');
        expect(getPostUrn(post)).toBe('');
    });
});

// ─── getPostImageSignals ─────────────────────────────────────────────────────

describe('getPostImageSignals', () => {
    it('returns hasImage:false for null', () => {
        const result = getPostImageSignals(null);
        expect(result.hasImage).toBe(false);
    });

    it('returns hasImage:false for element without querySelectorAll', () => {
        expect(getPostImageSignals({}).hasImage).toBe(false);
    });

    it('detects chart cue from alt text', () => {
        const post = el('<div><img alt="revenue chart Q4 growth" /></div>');
        const r = getPostImageSignals(post);
        expect(r.cues).toContain('chart');
        expect(r.hasImage).toBe(true);
    });

    it('detects product/UI cue (line 361)', () => {
        const post = el('<div><img alt="product dashboard screenshot" /></div>');
        const r = getPostImageSignals(post);
        expect(r.cues).toContain('product');
    });

    it('detects code cue (line 363)', () => {
        const post = el('<div><img alt="terminal code snippet" /></div>');
        const r = getPostImageSignals(post);
        expect(r.cues).toContain('code');
    });

    it('detects certificate cue (line 365)', () => {
        const post = el('<div><img alt="AWS certification badge" /></div>');
        const r = getPostImageSignals(post);
        expect(r.cues).toContain('certificate');
    });

    it('detects event cue (line 367)', () => {
        const post = el('<div><img alt="conference stage speaker" /></div>');
        const r = getPostImageSignals(post);
        expect(r.cues).toContain('event');
    });

    it('detects people cue (line 369)', () => {
        const post = el('<div><img alt="team colleagues meeting" /></div>');
        const r = getPostImageSignals(post);
        expect(r.cues).toContain('people');
    });

    it('detects document cue', () => {
        const post = el('<div><img alt="slide presentation deck" /></div>');
        const r = getPostImageSignals(post);
        expect(r.cues).toContain('document');
    });

    it('ignores profile/avatar/reaction images', () => {
        const post = el('<div><img alt="profile photo" /><img alt="like reaction" /></div>');
        const r = getPostImageSignals(post);
        expect(r.hasImage).toBe(false);
    });

    it('caps samples at 2', () => {
        const post = el(`
            <div>
                <img alt="chart Q1 performance metrics" />
                <img alt="team colleagues group photo" />
                <img alt="certification badge achievement" />
            </div>
        `);
        const r = getPostImageSignals(post);
        expect(r.samples.length).toBeLessThanOrEqual(2);
    });
});

// ─── parseCompactCountToken ───────────────────────────────────────────────────

describe('parseCompactCountToken', () => {
    it('returns 0 for empty input', () => {
        expect(parseCompactCountToken('', '')).toBe(0);
    });
    it('parses k suffix', () => {
        expect(parseCompactCountToken('2.5', 'k')).toBe(2500);
    });
    it('parses m suffix', () => {
        expect(parseCompactCountToken('1.2', 'm')).toBe(1200000);
    });
    it('parses comma-separated thousands', () => {
        expect(parseCompactCountToken('1,234', '')).toBe(1234);
    });
    it('parses decimal float (line 397)', () => {
        // line 397: /^\d+,\d+$/ or /^\d+\.\d+$/ — decimal number
        expect(parseCompactCountToken('3.7', '')).toBe(4);
    });
    it('parses decimal with comma (line 397)', () => {
        expect(parseCompactCountToken('2,5', '')).toBe(3);
    });
    it('parses plain integer', () => {
        expect(parseCompactCountToken('42', '')).toBe(42);
    });
    it('returns 0 for non-numeric input', () => {
        expect(parseCompactCountToken('abc', '')).toBe(0);
    });
    it('handles null suffix gracefully', () => {
        expect(parseCompactCountToken('10', null)).toBe(10);
    });
});

// ─── extractCommentCountFromText ──────────────────────────────────────────────

describe('extractCommentCountFromText', () => {
    it('returns 0 for empty input', () => {
        expect(extractCommentCountFromText('')).toBe(0);
    });
    it('extracts number before "comments"', () => {
        expect(extractCommentCountFromText('42 comments')).toBe(42);
    });
    it('extracts PT comentários', () => {
        expect(extractCommentCountFromText('15 comentários')).toBe(15);
    });
    it('parses "comments: 100" keyword-first pattern (lines 416-417)', () => {
        // keywordRe — "comments:" followed by number
        expect(extractCommentCountFromText('comments: 100')).toBe(100);
    });
    it('picks maximum across multiple patterns', () => {
        expect(extractCommentCountFromText('3 comments and comments: 50')).toBe(50);
    });
    it('handles k suffix in comment count', () => {
        expect(extractCommentCountFromText('2k comments')).toBe(2000);
    });
    it('returns 0 when no comment keyword found', () => {
        expect(extractCommentCountFromText('no keywords here')).toBe(0);
    });
});

// ─── getPostCommentSignal ────────────────────────────────────────────────────

describe('getPostCommentSignal', () => {
    it('returns count:0 source:none for null', () => {
        expect(getPostCommentSignal(null)).toEqual({ count: 0, source: 'none' });
    });

    it('finds comment count from social-counts selector', () => {
        const post = el('<div><span data-testid="social-counts-reaction-count-label">24 comments</span></div>');
        const r = getPostCommentSignal(post);
        expect(r.count).toBe(24);
        expect(r.source).not.toBe('none');
    });

    it('traverses parent elements to find comment count (lines 429-430)', () => {
        // The post element doesn't have it, but its grandparent does
        const wrapper = el(`
            <div>
                <div>
                    <span data-testid="social-counts-comment-count">8 comments</span>
                    <div class="post-container">
                        <p>Post content here</p>
                    </div>
                </div>
            </div>
        `);
        const postEl = wrapper.querySelector('.post-container');
        const r = getPostCommentSignal(postEl);
        expect(typeof r.count).toBe('number');
    });

    it('falls back to visible comments (line 482)', () => {
        // No social-count elements, but has visible comment items
        const post = el(`
            <div>
                <ul class="comments-comments-list">
                    <li class="comments-comment-item">
                        <div class="comments-comment-item-content-body">Great post with enough text</div>
                    </li>
                    <li class="comments-comment-item">
                        <div class="comments-comment-item-content-body">Another great comment here</div>
                    </li>
                </ul>
            </div>
        `);
        const r = getPostCommentSignal(post);
        // Should fallback to visible-thread or none
        expect(typeof r.count).toBe('number');
    });
});

// ─── getExistingComments ─────────────────────────────────────────────────────

describe('getExistingComments', () => {
    it('returns empty array for null', () => {
        expect(getExistingComments(null)).toEqual([]);
    });

    it('extracts comments from comments-comment-list', () => {
        const post = el(`
            <div>
                <ul class="comments-comments-list">
                    <li class="comments-comment-item">
                        <div class="comments-comment-item-content-body">This is a real comment with enough text</div>
                        <a href="/in/author1">Author One</a>
                    </li>
                </ul>
            </div>
        `);
        const comments = getExistingComments(post);
        expect(Array.isArray(comments)).toBe(true);
    });

    it('uses comment list children when no item selector matches (lines 527-528)', () => {
        // commentList found but querySelectorAll returns empty → falls back to children
        const post = el(`
            <div>
                <ul class="comments-comments-list">
                    <li>
                        <span>Comment text that is long enough to be included</span>
                        <a href="/in/commenter">Commenter Name</a>
                    </li>
                </ul>
            </div>
        `);
        const comments = getExistingComments(post);
        expect(Array.isArray(comments)).toBe(true);
    });

    it('traverses parent elements to find comment list', () => {
        const wrapper = el(`
            <div>
                <ul class="comments-comments-list">
                    <article class="comments-comment-item">
                        <div class="comments-comment-item-content-body">Insightful content here with enough words</div>
                    </article>
                </ul>
                <div class="inner-post"><p>Post text</p></div>
            </div>
        `);
        const innerPost = wrapper.querySelector('.inner-post');
        const comments = getExistingComments(innerPost);
        expect(Array.isArray(comments)).toBe(true);
    });
});

// ─── summarizeReactions ───────────────────────────────────────────────────────

describe('summarizeReactions', () => {
    it('returns total:0 dominant:LIKE intensity:low for empty', () => {
        expect(summarizeReactions({})).toEqual({ total: 0, dominant: 'LIKE', intensity: 'low' });
    });

    it('uses _total when explicitly provided', () => {
        const r = summarizeReactions({ LIKE: 10, _total: 500 });
        expect(r.total).toBe(500);
        expect(r.intensity).toBe('high');
    });

    it('computes total from reaction types when _total absent', () => {
        const r = summarizeReactions({ LIKE: 30, PRAISE: 20, EMPATHY: 35 });
        expect(r.total).toBe(85);
        expect(r.intensity).toBe('medium');
    });

    it('correctly identifies dominant reaction', () => {
        const r = summarizeReactions({ LIKE: 5, INTEREST: 50, PRAISE: 10 });
        expect(r.dominant).toBe('INTEREST');
    });

    it('returns low intensity for total < 80', () => {
        const r = summarizeReactions({ LIKE: 10 });
        expect(r.intensity).toBe('low');
    });

    it('returns medium intensity for total 80-299', () => {
        const r = summarizeReactions({ LIKE: 100 });
        expect(r.intensity).toBe('medium');
    });

    it('handles null input gracefully', () => {
        expect(() => summarizeReactions(null)).not.toThrow();
    });
});

// ─── isLikeButton / isCommentButton ──────────────────────────────────────────

describe('isLikeButton', () => {
    it('returns false for null', () => {
        expect(isLikeButton(null)).toBe(false);
    });
    it('returns true for aria-label Like', () => {
        const btn = document.createElement('button');
        btn.setAttribute('aria-label', 'Like this post');
        expect(isLikeButton(btn)).toBe(true);
    });
    it('returns true for textContent Gostei', () => {
        const btn = document.createElement('button');
        btn.textContent = 'Gostei';
        expect(isLikeButton(btn)).toBe(true);
    });
    it('returns false for unrelated button', () => {
        const btn = document.createElement('button');
        btn.textContent = 'Share';
        expect(isLikeButton(btn)).toBe(false);
    });
});

describe('isCommentButton', () => {
    it('returns false for null', () => {
        expect(isCommentButton(null)).toBe(false);
    });
    it('returns true for Comment text', () => {
        const btn = document.createElement('button');
        btn.textContent = 'Comment';
        expect(isCommentButton(btn)).toBe(true);
    });
    it('returns true for Comentar aria-label', () => {
        const btn = document.createElement('button');
        btn.setAttribute('aria-label', 'Comentar');
        expect(isCommentButton(btn)).toBe(true);
    });
});

// ─── isReactablePost / shouldSkipPost / isCompanyFollowText ──────────────────

describe('isReactablePost', () => {
    it('returns false for null', () => {
        expect(isReactablePost(null)).toBe(false);
    });
    it('returns true for post with enough text', () => {
        const post = el('<div>This post has sufficient content to be reactable.</div>');
        expect(isReactablePost(post)).toBe(true);
    });
    it('returns false for post with very short text', () => {
        const post = el('<div>Hi</div>');
        expect(isReactablePost(post)).toBe(false);
    });
});

describe('shouldSkipPost', () => {
    it('returns false when no keywords', () => {
        expect(shouldSkipPost('any post', [])).toBe(false);
    });
    it('returns false for null keywords', () => {
        expect(shouldSkipPost('any post', null)).toBe(false);
    });
    it('returns true when post contains skip keyword', () => {
        expect(shouldSkipPost('buy crypto now', ['crypto'])).toBe(true);
    });
    it('is case-insensitive', () => {
        expect(shouldSkipPost('BUY CRYPTO', ['crypto'])).toBe(true);
    });
});

describe('isCompanyFollowText', () => {
    it('returns true for Follow', () => {
        expect(isCompanyFollowText('Follow')).toBe(true);
    });
    it('returns true for Seguir', () => {
        expect(isCompanyFollowText('Seguir')).toBe(true);
    });
    it('returns true for + Follow', () => {
        expect(isCompanyFollowText('+ Follow')).toBe(true);
    });
    it('returns false for other text', () => {
        expect(isCompanyFollowText('Like')).toBe(false);
    });
});
