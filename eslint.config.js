module.exports = [
    {
        ignores: [
            'node_modules/**',
            'dist/**',
            'coverage/**',
            'linkedin_session/**'
        ]
    },
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'script'
        },
        rules: {}
    }
];
