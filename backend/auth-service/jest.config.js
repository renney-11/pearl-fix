module.exports = {
  preset: 'ts-jest',  // Use ts-jest preset for TypeScript
  testEnvironment: 'node',  // Use Node.js environment for testing
  roots: ['<rootDir>/backend/auth-service/src/tests'],  // Point to the correct directory for tests
  transform: {
    '^.+\\.tsx?$': 'ts-jest',  // Use ts-jest to process .ts and .tsx files
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],  // Ignore these folders during testing
};
