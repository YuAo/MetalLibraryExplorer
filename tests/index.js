'use strict'

const assert = require('assert').strict;
const path = require('path');
const http = require('http');
const express = require('express');
const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const os = require('os');
const fs = require('fs');

(async function runTests() {
    const distDirectory = path.resolve(__dirname, '../dist');
    
    const app = express();
    app.use(express.static(distDirectory));
    const server = http.createServer(app).listen(8000);
    
    console.log("Server started on port 8000");

    const screen = {
        width: 1440,
        height: 900
    };
    const tempDir = await new Promise((resolve, reject) => {
        fs.mkdtemp(path.join(os.tmpdir(), 'foo-'), (err, dir) => {
            if (err) {
                reject(err);
            } else {
                resolve(dir);
            }
        });
    });
    console.log('Downloads to: ' + tempDir);
    
    const driver = await new Builder().forBrowser('chrome')
    .setChromeOptions(
        new chrome.Options()
        .addArguments("--headless=new")
        .windowSize(screen)
        .setUserPreferences({'download.default_directory': tempDir})
    )
    .build();
    
    try {
        console.log('Running tests...');
        await driver.get('http://127.0.0.1:8000/');
        
        await (async () => {
            console.log('- for test.metallib');
            await driver.wait(until.elementLocated(By.css('header input')), 3000);
            await driver.findElement(By.css('header input')).sendKeys(path.resolve(__dirname, 'fixture/test.metallib'));
            await driver.wait(until.elementLocated(By.css('.library-info')), 3000);
            const title = await driver.findElement(By.css('.library-info .file-name')).getText();
            assert.deepEqual(title, 'test.metallib');
            const items = await driver.findElements(By.css('.function-info'))
            assert.deepEqual(items.length, 8);
            await items[0].findElement(By.css('a')).click();
            await driver.wait(until.elementLocated(By.css('.assembly-name')), 3000);
            await driver.wait(until.elementLocated(By.css('.assembly-code')), 3000);
            const assemblyTitle = await driver.findElement(By.css('.assembly-name')).getText();
            assert.deepEqual(assemblyTitle, 'bouncingBallCompute.ll');
            await driver.findElement(By.css('.download-button')).click();
            await new Promise((resolve, reject) => {
                setTimeout(() => {
                    resolve();
                }, 3000);
            });
            const downloadedFile = path.resolve(tempDir, 'test.metallib.ll.zip');
            assert.deepEqual(fs.existsSync(downloadedFile), true);
        })();
        
        await (async () => {
            console.log('- for failure.metallib');
            await driver.findElement(By.css('header input')).sendKeys(path.resolve(__dirname, 'fixture/failure.metallib'));
            await driver.wait(until.elementLocated(By.css('.error-message')), 3000);
            const errorMessage = await driver.findElement(By.css('.error-message')).getText();
            assert.deepEqual(errorMessage, 'Metallib parse failed: invalidHeader');
        })();

        await (async () => {
            console.log('- for empty.metallib');
            await driver.findElement(By.css('header input')).sendKeys(path.resolve(__dirname, 'fixture/empty.metallib'));
            await driver.wait(until.elementLocated(By.css('.library-info')), 3000);
            const title = await driver.findElement(By.css('.library-info .file-name')).getText();
            assert.deepEqual(title, 'empty.metallib');
            const items = await driver.findElements(By.css('.function-info'))
            assert.deepEqual(items.length, 0);
        })();
    } finally {
        server.close();
        await driver.quit();
    }
})().then(() => {
    console.log("Test Success!");
}, (error) => {
    console.error(error);
    process.exit(-1);
});
