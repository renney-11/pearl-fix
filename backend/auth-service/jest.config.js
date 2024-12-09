module.exports = {
  preset: 'ts-jest',  // Use ts-jest preset for TypeScript
  testEnvironment: 'node',  // Use Node.js environment for testing
  roots: ['<rootDir>/tests'],  // Point Jest to your 'tests' folder (adjust if your tests are located elsewhere)
  transform: {
    '^.+\\.tsx?$': 'ts-jest',  // Use ts-jest to process .ts and .tsx files
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],  // Ignore these folders during testing
};
