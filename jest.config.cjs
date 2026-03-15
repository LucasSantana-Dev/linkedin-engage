module.exports = {
    collectCoverageFrom: [
        'extension/lib/**/*.js'
    ],
    coveragePathIgnorePatterns: [
        '/node_modules/'
    ],
    coverageThreshold: {
        global: {
            statements: 90,
            branches: 76,
            functions: 96,
            lines: 92
        }
    },
    forceExit: true
};
