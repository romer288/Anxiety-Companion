/**
 * Build script for preparing mobile app builds
 * 
 * This script:
 * 1. Builds the web app using Vite with mobile-specific configuration
 * 2. Copies the build to the Capacitor platforms
 * 3. Prepares the native projects for build
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

// Helper function to execute commands with better logging
function execute(command, description) {
  console.log(`\n${colors.bright}${colors.blue}${description}${colors.reset}`);
  console.log(`${colors.cyan}$ ${command}${colors.reset}`);
  
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`${colors.green}✓ Completed successfully${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ Failed: ${error.message}${colors.reset}`);
    return false;
  }
}

// Main build function
async function buildMobileApp() {
  console.log(`\n${colors.bright}${colors.magenta}====================================${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}  Building Anxiety Companion Mobile App${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}====================================${colors.reset}\n`);
  
  // Check if capacitor.config.ts exists
  if (!fs.existsSync('./capacitor.config.ts')) {
    console.error(`${colors.red}Error: capacitor.config.ts not found. Make sure you've initialized Capacitor.${colors.reset}`);
    return;
  }
  
  // Ensure the dist directory exists
  if (!fs.existsSync('./dist')) {
    fs.mkdirSync('./dist', { recursive: true });
  }
  
  // Step 1: Build the web app using Vite with mobile configuration
  if (!execute('npx vite build --config vite.capacitor.config.ts', 'Building web app for mobile')) {
    console.error(`${colors.red}Error building web app. Stopping.${colors.reset}`);
    return;
  }
  
  // Step 2: Add platforms if they don't exist
  if (!fs.existsSync('./android')) {
    execute('npx cap add android', 'Adding Android platform');
  }
  
  if (!fs.existsSync('./ios')) {
    execute('npx cap add ios', 'Adding iOS platform');
  }
  
  // Step 3: Copy web assets to native platforms and update native plugins
  if (!execute('npx cap sync', 'Syncing web code to native platforms')) {
    console.error(`${colors.red}Error syncing with native platforms. Stopping.${colors.reset}`);
    return;
  }
  
  // Step 4: Apply platform-specific adjustments
  
  // Android: Update AndroidManifest.xml with required permissions
  // This step is typically handled by Capacitor plugins, but we can add custom permissions here
  
  // iOS: Update Info.plist with required permissions
  // Again, most permissions are handled by Capacitor plugins
  
  console.log(`\n${colors.bright}${colors.green}====================================${colors.reset}`);
  console.log(`${colors.bright}${colors.green}  Mobile App Build Complete${colors.reset}`);
  console.log(`${colors.bright}${colors.green}====================================${colors.reset}\n`);
  
  console.log(`${colors.yellow}Next Steps:${colors.reset}`);
  console.log(`${colors.cyan}• For Android: Open the project in Android Studio:${colors.reset}`);
  console.log(`  npx cap open android`);
  console.log(`${colors.cyan}• For iOS: Open the project in Xcode:${colors.reset}`);
  console.log(`  npx cap open ios`);
  console.log(`${colors.cyan}• Complete the app store submission process as outlined in:${colors.reset}`);
  console.log(`  appstore-submission-guide.md\n`);
}

// Run the build process
buildMobileApp().catch(error => {
  console.error(`${colors.red}Unhandled error: ${error.message}${colors.reset}`);
  process.exit(1);
});