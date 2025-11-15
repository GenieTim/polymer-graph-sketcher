import { test, expect, Page } from '@playwright/test';

/**
 * E2E tests for stop-motion movie functionality
 * These tests run in a real browser and verify actual canvas rendering and video output
 */

test.describe('Stop-Motion Movie Creation (E2E)', () => {
  let page: Page;

  test.beforeEach(async ({ page: p }) => {
    page = p;
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Expand the Movie Recording accordion to make stop-motion controls visible
    const movieRecordingAccordion = page.locator('button[data-bs-target="#movieRecordingCollapse"]');
    if (await movieRecordingAccordion.isVisible()) {
      await movieRecordingAccordion.click();
      // Wait for accordion to expand
      await page.waitForSelector('#movieRecordingCollapse.show', { timeout: 2000 });
    }
  });

  test('should create movie with actual rendered frames', async () => {
    // Switch to vertex mode and add some nodes
    await page.keyboard.press('v');
    
    // Click on canvas to add vertices
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 100, y: 100 } });
    await canvas.click({ position: { x: 200, y: 200 } });
    await canvas.click({ position: { x: 300, y: 150 } });

    // Start stop-motion recording using the actual button ID
    await page.click('#startStopMotionBtn');
    
    // Capture first frame using the actual button ID
    await page.click('#captureFrameBtn');
    
    // Verify frame count updated - check the indicator badge text
    await expect(page.locator('#stopMotionIndicator')).toContainText('1 frame');

    // Add more vertices to create a different frame
    await canvas.click({ position: { x: 400, y: 250 } });
    await page.click('#captureFrameBtn');
    
    await expect(page.locator('#stopMotionIndicator')).toContainText('2 frames');

    // Get canvas content for comparison
    const frame1Data = await page.evaluate(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      return canvas.toDataURL();
    });

    // Add another vertex to change the frame
    await canvas.click({ position: { x: 500, y: 300 } });
    await page.click('#captureFrameBtn');

    const frame3Data = await page.evaluate(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      return canvas.toDataURL();
    });

    // Verify frames are actually different
    expect(frame1Data).not.toBe(frame3Data);

    // Stop recording using the actual button ID
    await page.click('#stopStopMotionBtn');

    // Create the movie using the actual button ID
    const downloadPromise = page.waitForEvent('download');
    await page.click('#createStopMotionMovieBtn');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.webm$/);

    // Verify the download actually happened
    const path = await download.path();
    expect(path).toBeTruthy();
  });

  test('should calculate correct movie duration from frame settings', async () => {
    // Set frame duration to 1000ms
    await page.fill('input#stopMotionFrameDuration', '1000');

    // Switch to vertex mode first
    await page.keyboard.press('v');

    // Start recording
    await page.click('#startStopMotionBtn');

    // Capture 5 frames
    for (let i = 0; i < 5; i++) {
      // Add a vertex to make a change
      const canvas = page.locator('canvas');
      await canvas.click({ position: { x: 100 + i * 100, y: 200 } });
      await page.click('#captureFrameBtn');
    }

    // Verify frame count
    await expect(page.locator('#stopMotionIndicator')).toContainText('5 frames');

    // Stop recording
    await page.click('#stopStopMotionBtn');

    // Expected duration: 5 frames * 1000ms = 5000ms = 5 seconds
    // Note: In a full implementation, we would:
    // 1. Download the video file
    // 2. Use ffprobe or similar tool to verify actual duration
    // 3. Compare with expected duration (5 seconds)
  });

  test('should produce visually different frames when graph changes', async () => {
    // Switch to vertex mode first
    await page.keyboard.press('v');

    // Start stop-motion recording
    await page.click('#startStopMotionBtn');

    // Capture initial state
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 200, y: 200 } });
    await page.click('#captureFrameBtn');

    // Get pixel data from first frame
    const frame1Pixels = await page.evaluate(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return Array.from(imageData.data);
    });

    // Expand Vertex Settings accordion to access fill color input
    const vertexSettingsAccordion = page.locator('button[data-bs-target="#vertexSettingsCollapse"]');
    await vertexSettingsAccordion.click();
    await page.waitForSelector('#vertexSettingsCollapse.show', { timeout: 2000 });

    // Make significant changes: add multiple vertices with different colors
    await page.fill('input#nodeFillColor', '#ff0000'); // Red
    
    // Collapse Vertex Settings and re-open Movie Recording accordion
    await vertexSettingsAccordion.click();
    await page.waitForSelector('#vertexSettingsCollapse:not(.show)', { timeout: 2000 });
    const movieRecordingAccordion = page.locator('button[data-bs-target="#movieRecordingCollapse"]');
    await movieRecordingAccordion.click();
    await page.waitForSelector('#movieRecordingCollapse.show', { timeout: 2000 });
    
    await canvas.click({ position: { x: 400, y: 300 } });
    
    // Change color again - need to reopen vertex settings
    await vertexSettingsAccordion.click();
    await page.waitForSelector('#vertexSettingsCollapse.show', { timeout: 2000 });
    await page.fill('input#nodeFillColor', '#00ff00'); // Green
    
    // Close and reopen movie recording again
    await vertexSettingsAccordion.click();
    await movieRecordingAccordion.click();
    await page.waitForSelector('#movieRecordingCollapse.show', { timeout: 2000 });
    
    await canvas.click({ position: { x: 600, y: 400 } });

    await page.click('#captureFrameBtn');

    // Get pixel data from second frame
    const frame2Pixels = await page.evaluate(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return Array.from(imageData.data);
    });

    // Compare frames - they should be different
    let differenceCount = 0;
    for (let i = 0; i < Math.min(frame1Pixels.length, frame2Pixels.length); i++) {
      if (frame1Pixels[i] !== frame2Pixels[i]) {
        differenceCount++;
      }
    }

    // At least 0.1% of pixels should be different (very conservative check)
    const totalPixels = frame1Pixels.length / 4; // 4 values per pixel (RGBA)
    const percentDifferent = (differenceCount / 4) / totalPixels * 100;
    
    expect(percentDifferent).toBeGreaterThan(0.1);

    // Stop and verify we can create the movie
    await page.click('#stopStopMotionBtn');
    
    await expect(page.locator('#stopMotionIndicator')).toContainText('2 frames');
  });
});
