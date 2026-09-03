const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('Starting Playwright browser for video recording...');
  
  // Ensure videos directory exists
  const videosDir = path.join(__dirname, 'videos');
  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir);
  }

  const browser = await chromium.launch({ headless: true });
  
  // Create a context with video recording enabled
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: videosDir,
      size: { width: 1280, height: 720 }
    }
  });

  const page = await context.newPage();
  
  try {
    console.log('Navigating to Home Page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    console.log('Navigating to Armory (Skins)...');
    await page.goto('http://localhost:3000/skins', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    console.log('Navigating to Leaderboard...');
    await page.goto('http://localhost:3000/leaderboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    console.log('Navigating to Game Arena...');
    await page.goto('http://localhost:3000/game', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Check if there is an "O'YINNI BOSHLASH" button (Start Game button)
    const playBtn = await page.$('button:has-text("BOSHLASH")');
    if (playBtn) {
       console.log('Clicking Start Game...');
       await playBtn.click();
    } else {
       // Try clicking anywhere to start if it's click-to-start
       await page.mouse.click(640, 360);
    }

    console.log('Recording gameplay for 15 seconds...');
    // Simulate some mouse movement for the game (aiming)
    for (let i = 0; i < 15; i++) {
       await page.mouse.move(640 + Math.sin(i) * 100, 360 + Math.cos(i) * 100);
       await page.waitForTimeout(1000);
    }
    
  } catch (err) {
    console.error('Error during recording:', err);
  } finally {
    console.log('Closing browser and finalizing video...');
    await context.close(); // Context must be closed to save video properly
    await browser.close();
    
    console.log(`Video has been saved in ${videosDir}`);
  }
})();
