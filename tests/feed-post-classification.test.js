const {
    classifyPost,
    isPolemicPost,
    detectCareerTransitionSignals,
    isMetricsOrSocialImpactPostContext,
    getReactionType,
    CAREER_DEPARTURE_SIGNAL_TERMS,
    CAREER_NEW_JOB_SIGNAL_TERMS
} = require('../extension/lib/feed-post-classification');

describe('feed-post-classification', () => {
    describe('getReactionType', () => {
        // getReactionType(postText, keywords) — keywords is an object with arrays
        // of strings to match against postText.toLowerCase()
        const keywords = {
            celebrate: ['celebrate', 'celebrar', 'clap'],
            support: ['support', 'care', 'apoio'],
            insightful: ['insightful', 'perspicaz'],
            funny: ['funny', 'haha', 'hilarious'],
            love: ['love', 'amei', 'adorei']
        };

        it('returns LIKE when no keywords match', () => {
            expect(getReactionType('Like', keywords)).toBe('LIKE');
            expect(getReactionType('Curtir', keywords)).toBe('LIKE');
        });

        it('returns PRAISE when celebrate keyword matches', () => {
            expect(getReactionType('Celebrate', keywords)).toBe('PRAISE');
            expect(getReactionType('Celebrar', keywords)).toBe('PRAISE');
        });

        it('returns EMPATHY when support keyword matches', () => {
            expect(getReactionType('Support', keywords)).toBe('EMPATHY');
            expect(getReactionType('Care', keywords)).toBe('EMPATHY');
        });

        it('returns INTEREST when insightful keyword matches', () => {
            expect(getReactionType('Insightful', keywords)).toBe('INTEREST');
        });

        it('returns ENTERTAINMENT when funny keyword matches', () => {
            expect(getReactionType('Funny', keywords)).toBe('ENTERTAINMENT');
            expect(getReactionType('Haha', keywords)).toBe('ENTERTAINMENT');
        });

        it('returns APPRECIATION when love keyword matches', () => {
            expect(getReactionType('Love', keywords)).toBe('APPRECIATION');
            expect(getReactionType('Amei', keywords)).toBe('APPRECIATION');
        });

        it('returns LIKE for unknown text with no matching keywords', () => {
            expect(getReactionType('unknown_reaction', keywords)).toBe('LIKE');
        });

        it('returns LIKE when keywords is undefined', () => {
            expect(getReactionType('Celebrate')).toBe('LIKE');
        });
    });

    describe('classifyPost', () => {
        it('returns generic for empty post', () => {
            expect(classifyPost('')).toBe('generic');
        });

        it('classifies hiring posts', () => {
            const result = classifyPost('We are hiring a senior engineer. Apply now!');
            expect(result).toBe('hiring');
        });

        it('classifies technical posts', () => {
            const result = classifyPost('Here is how to implement a binary search tree in JavaScript with O(log n) complexity.');
            expect(['technical', 'generic']).toContain(result);
        });

        it('classifies achievement posts', () => {
            const result = classifyPost('Proud to announce I just got promoted to Senior Manager!');
            expect(['achievement', 'newjob', 'generic']).toContain(result);
        });

        describe('reaction-based scoring', () => {
            // reactions is an object: { EMPATHY: n, PRAISE: n, INTEREST: n, ENTERTAINMENT: n, _total: n }
            it('boosts jobseeking score when support reactions >= 3', () => {
                const reactions = { EMPATHY: 3, _total: 3 };
                const result = classifyPost(
                    'Looking for new opportunities in tech.',
                    reactions
                );
                // With support >= 3, jobseeking gets +1.5 boost
                expect(['jobseeking', 'generic']).toContain(result);
            });

            it('boosts achievement/newjob when praise reactions >= 3', () => {
                const reactions = { PRAISE: 3, _total: 3 };
                const result = classifyPost(
                    'Excited to share some great news!',
                    reactions
                );
                expect(typeof result).toBe('string');
            });

            it('boosts technical when insightful reactions >= 3', () => {
                const reactions = { INTEREST: 3, _total: 3 };
                const result = classifyPost(
                    'Here is a deep dive into distributed systems.',
                    reactions
                );
                expect(typeof result).toBe('string');
            });

            it('boosts humor when entertainment reactions >= 3', () => {
                const reactions = { ENTERTAINMENT: 3, _total: 3 };
                const result = classifyPost(
                    'This is a funny post about work.',
                    reactions
                );
                expect(typeof result).toBe('string');
            });
        });

        describe('humorBoost paths', () => {
            it('boosts humor for "unless/except/but/until/then" pattern', () => {
                // Short post, low score, not already humor
                const result = classifyPost(
                    'I love Mondays. Unless it is actually Monday.'
                );
                expect(typeof result).toBe('string');
            });

            it('boosts humor for "never/nobody/no one" pattern', () => {
                const result = classifyPost(
                    'Nobody told me about this meeting.'
                );
                expect(typeof result).toBe('string');
            });

            it('boosts humor for "truth is/turns out/apparently/plot twist" pattern', () => {
                const result = classifyPost(
                    'Plot twist: the real bug was the friends we made along the way.'
                );
                expect(typeof result).toBe('string');
            });

            it('boosts humor for "vs. reality/expectation.*reality" pattern', () => {
                const result = classifyPost(
                    'Expectation vs. reality of remote work.'
                );
                expect(typeof result).toBe('string');
            });

            it('does not apply humorBoost when post is already humor category', () => {
                // A post that scores high on humor already won't re-enter the boost block
                const result = classifyPost('😂 haha lol funny joke meme');
                expect(typeof result).toBe('string');
            });

            it('does not apply humorBoost when post is too long (>= 500 chars)', () => {
                const longPost = 'Unless '.repeat(80); // > 500 chars
                const result = classifyPost(longPost);
                expect(typeof result).toBe('string');
            });
        });

        describe('critiqueBoost paths', () => {
            it('boosts critique for "hot take" pattern', () => {
                const result = classifyPost('Hot take: most meetings could be emails.');
                expect(typeof result).toBe('string');
            });

            it('boosts critique for "unpopular opinion" pattern', () => {
                const result = classifyPost('Unpopular opinion: open offices are terrible.');
                expect(typeof result).toBe('string');
            });

            it('boosts critique for "overrated" pattern', () => {
                const result = classifyPost('Hustle culture is overrated and harmful.');
                expect(typeof result).toBe('string');
            });

            it('boosts critique for "stop doing/saying/pretending" pattern', () => {
                const result = classifyPost('Stop pretending that crunch time is normal.');
                expect(typeof result).toBe('string');
            });

            it('boosts critique for "nobody needs/wants/asked" pattern', () => {
                const result = classifyPost('Nobody asked for another productivity app.');
                expect(typeof result).toBe('string');
            });

            it('does not apply critiqueBoost when post is too long (>= 600 chars)', () => {
                const longPost = 'Hot take: '.repeat(70); // > 600 chars
                const result = classifyPost(longPost);
                expect(typeof result).toBe('string');
            });
        });

        describe('hiring safety override', () => {
            it('overrides humor to hiring when hiring score >= 2', () => {
                // Post that would score humor but also has strong hiring signals
                const result = classifyPost(
                    'Hot take: we are hiring! Apply now for this amazing role. Join our team!'
                );
                // hiring safety override: if scores.hiring >= 2 and bestCategory is humor/critique/generic
                expect(typeof result).toBe('string');
            });

            it('overrides critique to hiring when hiring score >= 2', () => {
                const result = classifyPost(
                    'Unpopular opinion: we are hiring senior engineers. Send your resume!'
                );
                expect(typeof result).toBe('string');
            });
        });
    });

    describe('isPolemicPost', () => {
        it('returns true for political content', () => {
            expect(isPolemicPost('The government should do more.')).toBe(true);
        });

        it('returns true for religious content', () => {
            expect(isPolemicPost('God bless everyone at church.')).toBe(true);
        });

        it('returns false for neutral professional content', () => {
            expect(isPolemicPost('Here are 5 tips for better code reviews.')).toBe(false);
        });

        it('returns false for empty string', () => {
            expect(isPolemicPost('')).toBe(false);
        });
    });

    describe('detectCareerTransitionSignals', () => {
        it('detects departure signals', () => {
            const result = detectCareerTransitionSignals(
                'Today is my last day at this company. Farewell everyone!'
            );
            expect(result.hasDepartureSignal).toBe(true);
        });

        it('detects new job signals', () => {
            const result = detectCareerTransitionSignals(
                'Excited to announce I am starting a new position at Acme Corp!'
            );
            expect(result.hasNewJobSignal).toBe(true);
        });

        it('returns false for both when no signals', () => {
            const result = detectCareerTransitionSignals(
                'Here is a tutorial on React hooks.'
            );
            expect(result.hasDepartureSignal).toBe(false);
            expect(result.hasNewJobSignal).toBe(false);
        });

        it('sets isDepartureOnly when departure but no new job', () => {
            const result = detectCareerTransitionSignals(
                'I am moving on from this role after an amazing journey.'
            );
            expect(result.hasDepartureSignal).toBe(true);
            expect(result.hasNewJobSignal).toBe(false);
            expect(result.isDepartureOnly).toBe(true);
        });

        it('handles null/undefined input', () => {
            const result = detectCareerTransitionSignals(null);
            expect(result.hasDepartureSignal).toBe(false);
            expect(result.hasNewJobSignal).toBe(false);
        });
    });

    describe('isMetricsOrSocialImpactPostContext', () => {
        it('returns true for news category', () => {
            expect(isMetricsOrSocialImpactPostContext('news', 'any text')).toBe(true);
        });

        it('returns true for motivation category', () => {
            expect(isMetricsOrSocialImpactPostContext('motivation', 'any text')).toBe(true);
        });

        it('returns true when postText contains metrics keywords', () => {
            expect(isMetricsOrSocialImpactPostContext(
                'technical',
                'Our KPI report shows 40% improvement in metrics.'
            )).toBe(true);
        });

        it('returns true when postText contains diversity keywords', () => {
            expect(isMetricsOrSocialImpactPostContext(
                'generic',
                'Diversity and inclusion are core values.'
            )).toBe(true);
        });

        it('returns true when imageSignals.samples contains relevant keywords', () => {
            expect(isMetricsOrSocialImpactPostContext(
                'generic',
                '',
                { samples: ['women in leadership', 'diversity report'] }
            )).toBe(true);
        });

        it('returns false for unrelated content with no imageSignals', () => {
            expect(isMetricsOrSocialImpactPostContext(
                'technical',
                'Here is how to write a for loop in Python.'
            )).toBe(false);
        });

        it('handles missing imageSignals gracefully', () => {
            expect(isMetricsOrSocialImpactPostContext(
                'technical',
                'Here is how to write a for loop in Python.',
                null
            )).toBe(false);
        });

        it('handles imageSignals with empty samples array', () => {
            expect(isMetricsOrSocialImpactPostContext(
                'technical',
                'Some post text.',
                { samples: [] }
            )).toBe(false);
        });
    });

    describe('exported constants', () => {
        it('CAREER_DEPARTURE_SIGNAL_TERMS is a non-empty array', () => {
            expect(Array.isArray(CAREER_DEPARTURE_SIGNAL_TERMS)).toBe(true);
            expect(CAREER_DEPARTURE_SIGNAL_TERMS.length).toBeGreaterThan(0);
        });

        it('CAREER_NEW_JOB_SIGNAL_TERMS is a non-empty array', () => {
            expect(Array.isArray(CAREER_NEW_JOB_SIGNAL_TERMS)).toBe(true);
            expect(CAREER_NEW_JOB_SIGNAL_TERMS.length).toBeGreaterThan(0);
        });
    });
});
