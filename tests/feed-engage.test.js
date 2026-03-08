/**
 * @jest-environment jsdom
 */
const {
    getPostText,
    getPostAuthor,
    getPostUrn,
    isLikeButton,
    isCommentButton,
    getReactionType,
    isReactablePost,
    shouldSkipPost,
    buildCommentFromPost
} = require('../extension/lib/feed-utils');

afterEach(() => {
    document.body.textContent = '';
});

function createPost({ text, author, urn, buttons }) {
    const post = document.createElement('div');
    if (urn) post.setAttribute('data-urn', urn);

    if (author) {
        const actorSpan = document.createElement('span');
        actorSpan.className =
            'update-components-actor__name';
        const nameSpan = document.createElement('span');
        nameSpan.textContent = author;
        actorSpan.appendChild(nameSpan);
        post.appendChild(actorSpan);
    }

    if (text) {
        const textDiv = document.createElement('div');
        textDiv.className = 'feed-shared-text';
        textDiv.textContent = text;
        post.appendChild(textDiv);
    }

    if (buttons) {
        for (const b of buttons) {
            const btn = document.createElement('button');
            if (b.ariaLabel) {
                btn.setAttribute('aria-label', b.ariaLabel);
            }
            if (b.text) btn.textContent = b.text;
            if (b.pressed) {
                btn.setAttribute('aria-pressed', 'true');
            }
            if (b.disabled) btn.disabled = true;
            post.appendChild(btn);
        }
    }

    return post;
}

describe('getPostText', () => {
    it('extracts text from feed-shared-text', () => {
        const post = createPost({
            text: 'Great article about AI'
        });
        expect(getPostText(post)).toBe(
            'Great article about AI'
        );
    });

    it('extracts text from update-components-text', () => {
        const post = document.createElement('div');
        const div = document.createElement('div');
        div.className = 'update-components-text';
        div.textContent = 'Some update';
        post.appendChild(div);
        expect(getPostText(post)).toBe('Some update');
    });

    it('combines body text with article title', () => {
        const post = document.createElement('div');
        const body = document.createElement('div');
        body.className = 'feed-shared-text';
        body.textContent = 'Check out this article';
        post.appendChild(body);
        const title = document.createElement('span');
        title.className =
            'feed-shared-article__title';
        title.textContent =
            'Understanding .NET Architecture';
        post.appendChild(title);
        expect(getPostText(post)).toBe(
            'Check out this article ' +
            'Understanding .NET Architecture'
        );
    });

    it('extracts article title alone', () => {
        const post = document.createElement('div');
        const title = document.createElement('span');
        title.className =
            'update-components-article__title';
        title.textContent = 'DI Service Lifetimes';
        post.appendChild(title);
        expect(getPostText(post)).toBe(
            'DI Service Lifetimes'
        );
    });

    it('falls back to longest span[dir=ltr]', () => {
        const post = document.createElement('div');
        const s1 = document.createElement('span');
        s1.setAttribute('dir', 'ltr');
        s1.textContent = 'Short';
        const s2 = document.createElement('span');
        s2.setAttribute('dir', 'ltr');
        s2.textContent =
            'This is a much longer span of text';
        post.appendChild(s1);
        post.appendChild(s2);
        expect(getPostText(post)).toBe(
            'This is a much longer span of text'
        );
    });

    it('returns empty for null', () => {
        expect(getPostText(null)).toBe('');
    });

    it('returns empty for post with no text', () => {
        const post = document.createElement('div');
        expect(getPostText(post)).toBe('');
    });
});

describe('getPostAuthor', () => {
    it('extracts author name', () => {
        const post = createPost({ author: 'Jane Doe' });
        expect(getPostAuthor(post)).toBe('Jane Doe');
    });

    it('takes first line of multi-line name', () => {
        const post = createPost({
            author: 'John Smith\n1st degree'
        });
        expect(getPostAuthor(post)).toBe('John Smith');
    });

    it('returns Unknown for null', () => {
        expect(getPostAuthor(null)).toBe('Unknown');
    });

    it('returns Unknown when no author element', () => {
        const post = document.createElement('div');
        expect(getPostAuthor(post)).toBe('Unknown');
    });

    it('extracts from feed-shared-actor', () => {
        const post = document.createElement('div');
        const actor = document.createElement('span');
        actor.className = 'feed-shared-actor__name';
        const name = document.createElement('span');
        name.textContent = 'Bob';
        actor.appendChild(name);
        post.appendChild(actor);
        expect(getPostAuthor(post)).toBe('Bob');
    });
});

describe('getPostUrn', () => {
    it('extracts data-urn from post', () => {
        const post = createPost({
            urn: 'urn:li:activity:12345'
        });
        expect(getPostUrn(post)).toBe(
            'urn:li:activity:12345'
        );
    });

    it('extracts data-id when no data-urn', () => {
        const post = document.createElement('div');
        post.setAttribute('data-id', 'activity:67890');
        expect(getPostUrn(post)).toBe('activity:67890');
    });

    it('extracts from child element', () => {
        const post = document.createElement('div');
        const child = document.createElement('div');
        child.setAttribute(
            'data-urn', 'urn:li:ugcPost:111'
        );
        post.appendChild(child);
        expect(getPostUrn(post)).toBe(
            'urn:li:ugcPost:111'
        );
    });

    it('returns empty for null', () => {
        expect(getPostUrn(null)).toBe('');
    });

    it('returns empty when no urn/id', () => {
        const post = document.createElement('div');
        expect(getPostUrn(post)).toBe('');
    });
});

describe('isLikeButton', () => {
    it('matches Like button', () => {
        const btn = document.createElement('button');
        btn.setAttribute('aria-label', 'Like');
        expect(isLikeButton(btn)).toBe(true);
    });

    it('matches Gostei (PT)', () => {
        const btn = document.createElement('button');
        btn.setAttribute('aria-label', 'Gostei');
        expect(isLikeButton(btn)).toBe(true);
    });

    it('matches React button', () => {
        const btn = document.createElement('button');
        btn.setAttribute('aria-label', 'React Like');
        expect(isLikeButton(btn)).toBe(true);
    });

    it('matches Reagir (PT)', () => {
        const btn = document.createElement('button');
        btn.setAttribute('aria-label', 'Reagir');
        expect(isLikeButton(btn)).toBe(true);
    });

    it('rejects Comment button', () => {
        const btn = document.createElement('button');
        btn.setAttribute('aria-label', 'Comment');
        expect(isLikeButton(btn)).toBe(false);
    });

    it('rejects null', () => {
        expect(isLikeButton(null)).toBe(false);
    });
});

describe('isCommentButton', () => {
    it('matches Comment by aria-label', () => {
        const btn = document.createElement('button');
        btn.setAttribute('aria-label', 'Comment');
        expect(isCommentButton(btn)).toBe(true);
    });

    it('matches Comentar by aria-label', () => {
        const btn = document.createElement('button');
        btn.setAttribute('aria-label', 'Comentar');
        expect(isCommentButton(btn)).toBe(true);
    });

    it('matches Comment by text', () => {
        const btn = document.createElement('button');
        btn.textContent = 'Comment';
        expect(isCommentButton(btn)).toBe(true);
    });

    it('matches Comentar by text', () => {
        const btn = document.createElement('button');
        btn.textContent = 'Comentar';
        expect(isCommentButton(btn)).toBe(true);
    });

    it('rejects Like button', () => {
        const btn = document.createElement('button');
        btn.setAttribute('aria-label', 'Like');
        expect(isCommentButton(btn)).toBe(false);
    });

    it('rejects null', () => {
        expect(isCommentButton(null)).toBe(false);
    });
});

describe('feed engage integration', () => {
    it('reaction type based on post content', () => {
        const kw = {
            celebrate: ['congratulations', 'promotion'],
            insightful: ['insightful', 'research']
        };
        expect(getReactionType(
            'Congratulations on your promotion!', kw
        )).toBe('PRAISE');
        expect(getReactionType(
            'This research data is insightful', kw
        )).toBe('INTEREST');
        expect(getReactionType(
            'Just a regular post', kw
        )).toBe('LIKE');
    });

    it('skip filtering works with keywords', () => {
        expect(shouldSkipPost(
            'Check out this sponsored content', ['sponsored']
        )).toBe(true);
        expect(shouldSkipPost(
            'Great technical article', ['sponsored']
        )).toBe(false);
    });

    it('reactable post needs content', () => {
        const short = createPost({ text: 'Hi' });
        document.body.appendChild(short);
        expect(isReactablePost(short)).toBe(false);

        const long = createPost({
            text: 'A'.repeat(60)
        });
        document.body.appendChild(long);
        expect(isReactablePost(long)).toBe(true);
    });

    it('comment generation for feed posts', () => {
        const text =
            'Just deployed our new microservices ' +
            'architecture using Kubernetes and it ' +
            'reduced latency by 40%. The key was ' +
            'proper service mesh configuration.';
        const comment = buildCommentFromPost(text, null);
        expect(comment).toBeTruthy();
        expect(comment.length).toBeGreaterThan(10);
        expect(comment.length).toBeLessThan(200);
    });
});

describe('post element full flow', () => {
    it('extracts all metadata from complete post', () => {
        const post = createPost({
            text: 'Excited to share our latest project',
            author: 'Alice Chen',
            urn: 'urn:li:activity:99999',
            buttons: [
                { ariaLabel: 'Like' },
                { ariaLabel: 'Comment' }
            ]
        });
        document.body.appendChild(post);

        expect(getPostText(post)).toBe(
            'Excited to share our latest project'
        );
        expect(getPostAuthor(post)).toBe('Alice Chen');
        expect(getPostUrn(post)).toBe(
            'urn:li:activity:99999'
        );

        const btns = post.querySelectorAll('button');
        expect(isLikeButton(btns[0])).toBe(true);
        expect(isCommentButton(btns[1])).toBe(true);
    });

    it('handles post with no buttons', () => {
        const post = createPost({
            text: 'Text only post',
            author: 'Bob'
        });
        expect(getPostText(post)).toBe('Text only post');
        expect(getPostAuthor(post)).toBe('Bob');
        expect(getPostUrn(post)).toBe('');
    });

    it('handles post with only URN', () => {
        const post = document.createElement('div');
        post.setAttribute(
            'data-urn', 'urn:li:ugcPost:444'
        );
        expect(getPostText(post)).toBe('');
        expect(getPostAuthor(post)).toBe('Unknown');
        expect(getPostUrn(post)).toBe(
            'urn:li:ugcPost:444'
        );
    });
});

describe('duplicate URN tracking', () => {
    it('Set prevents duplicate processing', () => {
        const urns = new Set([
            'urn:li:activity:111',
            'urn:li:activity:222'
        ]);
        expect(urns.has('urn:li:activity:111'))
            .toBe(true);
        expect(urns.has('urn:li:activity:333'))
            .toBe(false);
        urns.add('urn:li:activity:333');
        expect(urns.has('urn:li:activity:333'))
            .toBe(true);
        expect(urns.size).toBe(3);
    });

    it('empty URN should not block processing', () => {
        const urns = new Set();
        const urn = '';
        if (urn) urns.add(urn);
        expect(urns.size).toBe(0);
    });
});
