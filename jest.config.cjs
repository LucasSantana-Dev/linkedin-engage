module.exports = {
    collectCoverageFrom: [
        'extension/lib/**/*.js'
    ],
    coveragePathIgnorePatterns: [
        '/node_modules/'
    ],
    coverageThreshold: {
        global: {
            statements: 96,
            branches: 85.7,
            functions: 99,
            lines: 97.5
        }
    },
    forceExit: true
};
